const express = require('express');
const { body } = require('express-validator');
const { login, profile, register, registerTenant } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Login route
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], login);

// User registration route (requires invitation token)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('invitationToken').isLength({ min: 1 }).withMessage('Invitation token is required')
], register);

// Tenant registration route (self-service organization creation)
router.post('/register-tenant', [
  body('organizationName').isLength({ min: 1 }).withMessage('Organization name is required'),
  body('adminEmail').isEmail().normalizeEmail(),
  body('adminPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], registerTenant);

// Get user profile
router.get('/profile', authenticate, profile);

module.exports = router;
