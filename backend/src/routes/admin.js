const express = require('express');
const { body } = require('express-validator');
const { getUsers, inviteUser, removeUser } = require('../controllers/adminController');
const { authenticate, requireRole, tenantIsolation } = require('../middleware/auth');

const router = express.Router();

// Apply authentication, tenant isolation, and admin role to all routes
router.use(authenticate);
router.use(tenantIsolation);
router.use(requireRole('admin'));

// Get all users in tenant
router.get('/users', getUsers);

// Invite user
router.post('/invite-user', [
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member'])
], inviteUser);

// Remove user
router.delete('/users/:userId', removeUser);

module.exports = router;
