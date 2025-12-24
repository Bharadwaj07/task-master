const express = require('express');
const router = express.Router();
const { commentController } = require('../controllers');
const { commentValidator } = require('../validators');
const { auth, validate } = require('../middleware');

router.post(
  '/tasks/:taskId',
  auth,
  commentValidator.createComment,
  validate,
  commentController.createComment
);
router.get('/tasks/:taskId', auth, commentController.getComments);
router.put('/:id', auth, commentValidator.updateComment, validate, commentController.updateComment);
router.delete('/:id', auth, commentController.deleteComment);

module.exports = router;
