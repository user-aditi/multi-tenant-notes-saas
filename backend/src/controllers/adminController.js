const pool = require('../config/database');
const { generateToken } = require('../utils/auth');
const crypto = require('crypto');

// Get all users in tenant (admin only)
const getUsers = async (req, res) => {
  try {
    const tenantSlug = req.user.tenant_slug;
    
    // Get users in the same tenant
    const usersQuery = `
      SELECT id, email, role, created_at 
      FROM users 
      WHERE tenant_slug = $1 
      ORDER BY created_at DESC
    `;
    const usersResult = await pool.query(usersQuery, [tenantSlug]);
    
    // Get pending invitations
    const invitationsQuery = `
      SELECT id, email, role, token, expires_at, created_at
      FROM tenant_invitations 
      WHERE tenant_slug = $1 AND accepted_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
    `;
    const invitationsResult = await pool.query(invitationsQuery, [tenantSlug]);
    
    res.json({
      success: true,
      users: usersResult.rows,
      invitations: invitationsResult.rows
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Invite user (admin only)
const inviteUser = async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    const inviterUserId = req.user.id;
    const tenantSlug = req.user.tenant_slug;
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Check if invitation already exists
    const existingInvite = await pool.query(
      'SELECT id FROM tenant_invitations WHERE email = $1 AND tenant_slug = $2 AND accepted_at IS NULL',
      [email, tenantSlug]
    );
    if (existingInvite.rows.length > 0) {
      return res.status(400).json({ error: 'Invitation already sent to this email' });
    }
    
    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Create invitation
    const insertQuery = `
      INSERT INTO tenant_invitations (tenant_slug, email, role, invited_by, token, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      tenantSlug, email, role, inviterUserId, token, expiresAt
    ]);
    
    res.status(201).json({
      success: true,
      invitation: result.rows[0],
      inviteLink: `${process.env.FRONTEND_URL}/register?invite=${token}`
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove user (admin only)
const removeUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantSlug = req.user.tenant_slug;
    
    // Check if user exists and belongs to same tenant
    const userQuery = 'SELECT id, role FROM users WHERE id = $1 AND tenant_slug = $2';
    const userResult = await pool.query(userQuery, [userId, tenantSlug]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const targetUser = userResult.rows[0];
    
    // Prevent admin from deleting themselves
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Delete user (cascade will handle notes)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    
    res.json({
      success: true,
      message: 'User removed successfully'
    });
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getUsers,
  inviteUser,
  removeUser
};
