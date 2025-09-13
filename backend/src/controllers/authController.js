const pool = require('../config/database');
const { comparePassword, generateToken, hashPassword } = require('../utils/auth');
const { validationResult } = require('express-validator');

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get tenant information
    const tenantQuery = 'SELECT * FROM tenants WHERE slug = $1';
    const tenantResult = await pool.query(tenantQuery, [user.tenant_slug]);
    
    if (tenantResult.rows.length === 0) {
      return res.status(500).json({ error: 'Tenant not found' });
    }

    const tenant = tenantResult.rows[0];

    // Generate JWT token
    const token = generateToken({ 
      userId: user.id, 
      email: user.email,
      role: user.role,
      tenantSlug: user.tenant_slug
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant: {
          slug: tenant.slug,
          name: tenant.name,
          subscription_plan: tenant.subscription_plan
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const profile = async (req, res) => {
  try {
    const user = req.user;
    
    // Get fresh tenant information
    const tenantQuery = 'SELECT * FROM tenants WHERE slug = $1';
    const tenantResult = await pool.query(tenantQuery, [user.tenant_slug]);
    
    if (tenantResult.rows.length === 0) {
      return res.status(500).json({ error: 'Tenant not found' });
    }

    const tenant = tenantResult.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant: {
          slug: tenant.slug,
          name: tenant.name,
          subscription_plan: tenant.subscription_plan
        }
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Self-service tenant registration (NEW)
const registerTenant = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      organizationName, 
      adminEmail, 
      adminPassword 
    } = req.body;

    // Generate unique tenant slug from organization name
    let baseSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Ensure slug is unique by adding random suffix if needed
    let tenantSlug = baseSlug;
    let attempts = 0;
    while (attempts < 10) {
      const existingTenant = await pool.query('SELECT id FROM tenants WHERE slug = $1', [tenantSlug]);
      if (existingTenant.rows.length === 0) break;
      
      tenantSlug = baseSlug + '-' + Math.random().toString(36).substr(2, 4);
      attempts++;
    }

    if (attempts >= 10) {
      return res.status(400).json({ error: 'Unable to generate unique organization URL. Please try a different name.' });
    }

    // Check if admin email already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Create tenant
      const tenantQuery = `
        INSERT INTO tenants (name, slug, subscription_plan, status)
        VALUES ($1, $2, 'free', 'active')
        RETURNING *
      `;
      const tenantResult = await pool.query(tenantQuery, [organizationName, tenantSlug]);
      const tenant = tenantResult.rows[0];

      // Create admin user
      const hashedPassword = await hashPassword(adminPassword);
      const userQuery = `
        INSERT INTO users (email, password, role, tenant_slug)
        VALUES ($1, $2, 'admin', $3)
        RETURNING id, email, role, tenant_slug
      `;
      const userResult = await pool.query(userQuery, [adminEmail, hashedPassword, tenantSlug]);
      const adminUser = userResult.rows[0];

      // Commit transaction
      await pool.query('COMMIT');

      // Generate JWT token for immediate login
      const token = generateToken({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        tenantSlug: adminUser.tenant_slug
      });

      res.status(201).json({
        success: true,
        token,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          tenant: {
            slug: tenant.slug,
            name: tenant.name,
            subscription_plan: tenant.subscription_plan
          }
        },
        message: `Welcome to ${organizationName}! Your workspace is ready.`
      });

    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Tenant registration error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
};

// Register user with invitation token (simplified)
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, invitationToken } = req.body;

    if (!invitationToken) {
      return res.status(400).json({ error: 'Invitation token required' });
    }

    // Verify invitation token
    const inviteQuery = `
      SELECT i.*, t.name as tenant_name, t.subscription_plan 
      FROM tenant_invitations i
      JOIN tenants t ON i.tenant_slug = t.slug
      WHERE i.token = $1 AND i.expires_at > NOW() AND i.accepted_at IS NULL
    `;
    const inviteResult = await pool.query(inviteQuery, [invitationToken]);
    
    if (inviteResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    const invitation = inviteResult.rows[0];

    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Account already exists' });
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const insertQuery = `
      INSERT INTO users (email, password, role, tenant_slug)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, role, tenant_slug
    `;
    
    const result = await pool.query(insertQuery, [
      email, 
      hashedPassword, 
      invitation.role, 
      invitation.tenant_slug
    ]);
    const user = result.rows[0];

    // Mark invitation as accepted
    await pool.query(
      'UPDATE tenant_invitations SET accepted_at = NOW() WHERE token = $1',
      [invitationToken]
    );

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantSlug: user.tenant_slug
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant: {
          slug: invitation.tenant_slug,
          name: invitation.tenant_name,
          subscription_plan: invitation.subscription_plan
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

module.exports = { login, profile, register, registerTenant };
