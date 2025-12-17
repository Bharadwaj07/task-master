const { body, param, query } = require('express-validator');
const { taskStatus, taskPriority } = require('../shared/enums');

exports.createTask = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('status').optional().isIn(Object.values(taskStatus)),
  body('priority').optional().isIn(Object.values(taskPriority)),
  body('dueDate').optional().isISO8601(),
  body('assignee').optional().isMongoId(),
  body('team').optional().isMongoId(),
  body('tags').optional().isArray()
];

exports.updateTask = [
  param('id').isMongoId(),
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('status').optional().isIn(Object.values(taskStatus)),
  body('priority').optional().isIn(Object.values(taskPriority)),
  body('dueDate').optional(),
  body('assignee').optional(),
  body('team').optional(),
  body('tags').optional().isArray()
];

exports.getTaskById = [param('id').isMongoId()];

exports.getTasks = [
  query('status').optional().isIn(Object.values(taskStatus)),
  query('priority').optional().isIn(Object.values(taskPriority)),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];
