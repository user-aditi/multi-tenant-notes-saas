const express = require('express');
const { body } = require('express-validator');
const { 
  createNote, 
  getNotes, 
  getNote, 
  updateNote, 
  deleteNote 
} = require('../controllers/notesController');
const { authenticate, tenantIsolation } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and tenant isolation to all routes
router.use(authenticate);
router.use(tenantIsolation);

// Note validation rules
const noteValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('content').optional().isLength({ max: 10000 }).withMessage('Content must be less than 10,000 characters')
];

// Routes
router.post('/', noteValidation, createNote);
router.get('/', getNotes);
router.get('/:id', getNote);
router.put('/:id', noteValidation, updateNote);
router.delete('/:id', deleteNote);

module.exports = router;
