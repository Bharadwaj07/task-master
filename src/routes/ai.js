const express = require('express');
const router = express.Router();
const { aiController } = require('../controllers');
const { aiValidator } = require('../validators');
const { auth, validate } = require('../middleware');

router.post(
  '/generate-description',
  auth,
  aiValidator.generateDescription,
  validate,
  aiController.generateTaskDescription
);
router.post(
  '/summarize-task',
  auth,
  aiValidator.summarizeTask,
  validate,
  aiController.summarizeTask
);

module.exports = router;
