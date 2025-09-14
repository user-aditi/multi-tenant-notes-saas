const express = require('express');
const { upgradeTenant, downgradeTenant } = require('../controllers/tenantController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and tenant isolation
router.use(authenticate);

// Upgrade tenant (admin only)
router.post('/:slug/upgrade', requireRole('admin'), upgradeTenant);

router.post('/:slug/downgrade', requireRole('admin'), downgradeTenant);

module.exports = router;
