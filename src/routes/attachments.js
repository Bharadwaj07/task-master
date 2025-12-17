const express = require('express');
const router = express.Router();
const { attachmentController } = require('../controllers');
const { auth, upload } = require('../middleware');

router.post('/', auth, upload.single('file'), attachmentController.uploadAttachment);
router.get('/tasks/:taskId', auth, attachmentController.getAttachments);
router.get('/:id/download', auth, attachmentController.downloadAttachment);
router.delete('/:id', auth, attachmentController.deleteAttachment);

module.exports = router;
