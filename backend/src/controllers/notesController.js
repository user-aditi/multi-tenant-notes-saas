const pool = require('../config/database');
const { validationResult } = require('express-validator');

const createNote = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content } = req.body;
    const userId = req.user.id;
    const tenantSlug = req.tenantSlug;

    // Check subscription limits for free plan
    const tenantQuery = 'SELECT subscription_plan FROM tenants WHERE slug = $1';
    const tenantResult = await pool.query(tenantQuery, [tenantSlug]);
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const subscriptionPlan = tenantResult.rows[0].subscription_plan;

    if (subscriptionPlan === 'free') {
      // Check current note count for THIS USER (not entire tenant)
      const countQuery = 'SELECT COUNT(*) FROM notes WHERE user_id = $1';
      const countResult = await pool.query(countQuery, [userId]);
      const currentCount = parseInt(countResult.rows[0].count);

      if (currentCount >= 3) {
        return res.status(403).json({ 
          error: 'Note limit reached',
          message: 'Free plan allows maximum 3 notes per user. Ask admin to upgrade to Pro plan.',
          limit_reached: true
        });
      }
    }

    // Create the note (belongs to the creating user)
    const insertQuery = `
      INSERT INTO notes (title, content, user_id, tenant_slug)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [title, content, userId, tenantSlug]);
    const newNote = result.rows[0];

    res.status(201).json({
      success: true,
      note: newNote
    });

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getNotes = async (req, res) => {
  try {
    const tenantSlug = req.tenantSlug;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query, queryParams;
    
    // Role-based note visibility
    if (userRole === 'admin') {
      // Option 1: Admins see ALL tenant notes
      query = `
        SELECT n.*, u.email as author_email 
        FROM notes n
        JOIN users u ON n.user_id = u.id
        WHERE n.tenant_slug = $1
        ORDER BY n.created_at DESC
      `;
      queryParams = [tenantSlug];
    } else {
      // Members see only THEIR OWN notes
      query = `
        SELECT n.*, u.email as author_email 
        FROM notes n
        JOIN users u ON n.user_id = u.id
        WHERE n.tenant_slug = $1 AND n.user_id = $2
        ORDER BY n.created_at DESC
      `;
      queryParams = [tenantSlug, userId];
    }
    
    const result = await pool.query(query, queryParams);
    
    // Get tenant info for subscription details
    const tenantQuery = 'SELECT * FROM tenants WHERE slug = $1';
    const tenantResult = await pool.query(tenantQuery, [tenantSlug]);
    const tenant = tenantResult.rows[0];
    
    // Calculate limit based on user's notes (not tenant's total)
    const userNoteCount = userRole === 'admin' ? result.rows.length : result.rows.length;
    
    res.json({
      success: true,
      notes: result.rows,
      meta: {
        total: result.rows.length,
        subscription_plan: tenant.subscription_plan,
        limit_reached: tenant.subscription_plan === 'free' && userNoteCount >= 3,
        user_role: userRole
      }
    });

  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getNote = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantSlug = req.tenantSlug;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query, queryParams;
    
    if (userRole === 'admin') {
      // Admins can see any note in their tenant
      query = `
        SELECT n.*, u.email as author_email 
        FROM notes n
        JOIN users u ON n.user_id = u.id
        WHERE n.id = $1 AND n.tenant_slug = $2
      `;
      queryParams = [id, tenantSlug];
    } else {
      // Members can only see their own notes
      query = `
        SELECT n.*, u.email as author_email 
        FROM notes n
        JOIN users u ON n.user_id = u.id
        WHERE n.id = $1 AND n.tenant_slug = $2 AND n.user_id = $3
      `;
      queryParams = [id, tenantSlug, userId];
    }
    
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({
      success: true,
      note: result.rows[0]
    });

  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateNote = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, content } = req.body;
    const tenantSlug = req.tenantSlug;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let checkQuery, checkParams;
    
    if (userRole === 'admin') {
      // Admins can edit any note in their tenant
      checkQuery = 'SELECT * FROM notes WHERE id = $1 AND tenant_slug = $2';
      checkParams = [id, tenantSlug];
    } else {
      // Members can only edit their own notes
      checkQuery = 'SELECT * FROM notes WHERE id = $1 AND tenant_slug = $2 AND user_id = $3';
      checkParams = [id, tenantSlug, userId];
    }
    
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    // Update the note
    const updateQuery = `
      UPDATE notes 
      SET title = $1, content = $2, updated_at = NOW()
      WHERE id = $3 AND tenant_slug = $4
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [title, content, id, tenantSlug]);

    res.json({
      success: true,
      note: result.rows[0]
    });

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantSlug = req.tenantSlug;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let checkQuery, checkParams;
    
    if (userRole === 'admin') {
      // Admins can delete any note in their tenant
      checkQuery = 'SELECT * FROM notes WHERE id = $1 AND tenant_slug = $2';
      checkParams = [id, tenantSlug];
    } else {
      // Members can only delete their own notes
      checkQuery = 'SELECT * FROM notes WHERE id = $1 AND tenant_slug = $2 AND user_id = $3';
      checkParams = [id, tenantSlug, userId];
    }
    
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    // Delete the note
    const deleteQuery = 'DELETE FROM notes WHERE id = $1 AND tenant_slug = $2';
    await pool.query(deleteQuery, [id, tenantSlug]);

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote
};
