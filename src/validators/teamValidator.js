const { body, param } = require('express-validator');
const { teamRoles } = require('../shared/enums');

exports.createTeam = [
  body('name').trim().notEmpty().withMessage('Team name is required'),
  body('description').optional().trim()
];

exports.updateTeam = [
  param('id').isMongoId(),
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim()
];

exports.inviteMember = [
  param('id').isMongoId(),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn([teamRoles.ADMIN, teamRoles.MEMBER])
];
