const { body, param } = require('express-validator');

exports.createComment = [
  param('taskId').isMongoId(),
  body('content').trim().notEmpty().withMessage('Comment content is required'),
  body('parentComment').optional().isMongoId()
];

exports.updateComment = [
  param('id').isMongoId(),
  body('content').trim().notEmpty().withMessage('Comment content is required')
];
