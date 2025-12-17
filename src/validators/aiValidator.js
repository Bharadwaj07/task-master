const { body } = require('express-validator');

exports.generateDescription = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('context').optional().trim()
];

exports.summarizeTask = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('comments').optional().isArray()
];
