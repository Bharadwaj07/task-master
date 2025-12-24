const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { authValidator } = require('../validators');
const { auth, validate } = require('../middleware');

router.post('/register', authValidator.register, validate, authController.register);
router.post('/login', authValidator.login, validate, authController.login);
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, authValidator.updateProfile, validate, authController.updateProfile);
router.put(
  '/password',
  auth,
  authValidator.changePassword,
  validate,
  authController.changePassword
);
router.post('/logout', auth, authController.logout);

module.exports = router;
