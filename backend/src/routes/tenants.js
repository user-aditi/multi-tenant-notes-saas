const express = require('express');
const { upgradeTenant } = require('../controllers/tenantController');
const { authenticate, requireRole, tenantIsolation } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and tenant isolation
router.use(authenticate);
router.use(tenantIsolation);

// Upgrade tenant (admin only)
router.post('/:slug/upgrade', requireRole('admin'), upgradeTenant);

module.exports = router;
