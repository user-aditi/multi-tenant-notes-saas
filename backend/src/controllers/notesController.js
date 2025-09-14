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

    const tenantQuery = 'SELECT subscription_plan FROM tenants WHERE slug = $1';
    const tenantResult = await pool.query(tenantQuery, [tenantSlug]);
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const subscriptionPlan = tenantResult.rows[0].subscription_plan;

    if (subscriptionPlan === 'free') {
      const countQuery = 'SELECT COUNT(*) FROM notes WHERE tenant_slug = $1';
      const countResult = await pool.query(countQuery, [tenantSlug]);
      const currentCount = parseInt(countResult.rows[0].count);

      if (currentCount >= 3) {
        return res.status(403).json({ 
          error: 'Note limit reached',
          message: 'Free plan allows a maximum of 3 notes. Please upgrade.',
          limit_reached: true
        });
      }
    }

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
    
    let query = `
      SELECT n.*, u.email as author_email 
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.tenant_slug = $1
    `;
    const queryParams = [tenantSlug];

    // If the user is a 'member', only show their own notes. Admins see all.
    if (userRole === 'member') {
      query += ' AND n.user_id = $2';
      queryParams.push(userId);
    }

    query += ' ORDER BY n.created_at DESC';
    
    const result = await pool.query(query, queryParams);
    
    const tenantQuery = 'SELECT * FROM tenants WHERE slug = $1';
    const tenantResult = await pool.query(tenantQuery, [tenantSlug]);
    const tenant = tenantResult.rows[0];
    
    const noteCountQuery = 'SELECT COUNT(*) FROM notes WHERE tenant_slug = $1';
    const noteCountResult = await pool.query(noteCountQuery, [tenantSlug]);
    const tenantNoteCount = parseInt(noteCountResult.rows[0].count);
    
    res.json({
      success: true,
      notes: result.rows,
      meta: {
        total: result.rows.length,
        subscription_plan: tenant.subscription_plan,
        limit_reached: tenant.subscription_plan === 'free' && tenantNoteCount >= 3,
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
    
    let query = `
      SELECT n.*, u.email as author_email 
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.id = $1 AND n.tenant_slug = $2
    `;
    const queryParams = [id, tenantSlug];

    if (userRole === 'member') {
      query += ' AND n.user_id = $3';
      queryParams.push(userId);
    }
    
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found or access denied' });
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
    
    let permissionClause = 'WHERE id = $1 AND tenant_slug = $2';
    const checkParams = [id, tenantSlug];

    if (userRole === 'member') {
      permissionClause += ' AND user_id = $3';
      checkParams.push(userId);
    }

    const checkResult = await pool.query(`SELECT id FROM notes ${permissionClause}`, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    const updateQuery = `
      UPDATE notes 
      SET title = $1, content = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [title, content, id]);
    
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
    
    let permissionClause = 'WHERE id = $1 AND tenant_slug = $2';
    const checkParams = [id, tenantSlug];

    if (userRole === 'member') {
      permissionClause += ' AND user_id = $3';
      checkParams.push(userId);
    }
    
    const checkResult = await pool.query(`SELECT id FROM notes ${permissionClause}`, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    const deleteQuery = 'DELETE FROM notes WHERE id = $1';
    await pool.query(deleteQuery, [id]);

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