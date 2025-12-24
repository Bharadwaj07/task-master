const { body } = require('express-validator');
const { auth } = require('../shared/constants');

exports.register = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: auth.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${auth.PASSWORD_MIN_LENGTH} characters`)
];

exports.login = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

exports.updateProfile = [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('bio').optional().isLength({ max: 500 })
];

exports.changePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: auth.PASSWORD_MIN_LENGTH })
    .withMessage(`New password must be at least ${auth.PASSWORD_MIN_LENGTH} characters`)
];
