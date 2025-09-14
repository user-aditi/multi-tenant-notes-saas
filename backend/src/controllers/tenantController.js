const pool = require('../config/database');

const upgradeTenant = async (req, res) => {
  try {
    const { slug } = req.params;
    const userTenantSlug = req.user.tenant_slug;

    // Ensure admin can only upgrade their own tenant
    if (slug !== userTenantSlug) {
      return res.status(403).json({ 
        error: 'Access denied. Can only upgrade your own tenant.' 
      });
    }

    // Check if tenant exists
    const tenantQuery = 'SELECT * FROM tenants WHERE slug = $1';
    const tenantResult = await pool.query(tenantQuery, [slug]);
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantResult.rows[0];

    if (tenant.subscription_plan === 'pro') {
      return res.status(400).json({ 
        error: 'Tenant is already on Pro plan',
        current_plan: 'pro'
      });
    }

    // Upgrade to pro
    const updateQuery = `
      UPDATE tenants 
      SET subscription_plan = 'pro', updated_at = NOW()
      WHERE slug = $1
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [slug]);

    res.json({
      success: true,
      message: 'Tenant successfully upgraded to Pro plan',
      user: { ...req.user, tenant: result.rows[0] } 
    });

  } catch (error) {
    console.error('Upgrade tenant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- ADD THIS NEW FUNCTION ---
const downgradeTenant = async (req, res) => {
  try {
    const { slug } = req.params;
    const userTenantSlug = req.user.tenant_slug;

    // Ensure admin can only downgrade their own tenant
    if (slug !== userTenantSlug) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Check current plan
    const tenantQuery = 'SELECT subscription_plan FROM tenants WHERE slug = $1';
    const tenantResult = await pool.query(tenantQuery, [slug]);
    if (tenantResult.rows[0].subscription_plan === 'free') {
      return res.status(400).json({ error: 'Tenant is already on the Free plan.' });
    }

    // Check note count for the entire tenant
    const noteCountQuery = 'SELECT COUNT(*) FROM notes WHERE tenant_slug = $1';
    const noteCountResult = await pool.query(noteCountQuery, [slug]);
    const noteCount = parseInt(noteCountResult.rows[0].count, 10);

    // Enforce the downgrade rule
    if (noteCount > 3) {
      return res.status(403).json({
        error: `Cannot downgrade with ${noteCount} notes. Please delete notes to bring the total to 3 or less.`,
        needs_action: true
      });
    }

    // Proceed with downgrade
    const updateQuery = `
      UPDATE tenants 
      SET subscription_plan = 'free', updated_at = NOW()
      WHERE slug = $1
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [slug]);

    res.json({
      success: true,
      message: 'Tenant successfully downgraded to the Free plan.',
      user: { ...req.user, tenant: result.rows[0] }
    });

  } catch (error) {
    console.error('Downgrade tenant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  upgradeTenant,
  downgradeTenant
};
