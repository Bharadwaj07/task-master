const { attachmentService } = require('../services');

const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { taskId, commentId } = req.body;

    if (taskId) {
      const task = await attachmentService.findTaskById(taskId);
      if (!task) {
        await attachmentService.deleteFile(req.file.path);
        return res.status(404).json({ message: 'Task not found' });
      }
    }

    if (commentId) {
      const comment = await attachmentService.findCommentById(commentId);
      if (!comment) {
        await attachmentService.deleteFile(req.file.path);
        return res.status(404).json({ message: 'Comment not found' });
      }
    }

    const attachment = await attachmentService.createAttachment({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      task: taskId || null,
      comment: commentId || null,
      uploadedBy: req.userId
    });

    res.status(201).json({
      message: 'File uploaded',
      attachment
    });
  } catch (error) {
    if (req.file) {
      await attachmentService.deleteFile(req.file.path);
    }
    next(error);
  }
};

const getAttachments = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const attachments = await attachmentService.findAttachmentsByTask(taskId);

    res.json({ attachments });
  } catch (error) {
    next(error);
  }
};

const deleteAttachment = async (req, res, next) => {
  try {
    const attachment = await attachmentService.findAttachmentById(req.params.id);

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    if (attachment.uploadedBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await attachmentService.deleteAttachment(attachment);

    res.json({ message: 'Attachment deleted' });
  } catch (error) {
    next(error);
  }
};

const downloadAttachment = async (req, res, next) => {
  try {
    const attachment = await attachmentService.findAttachmentById(req.params.id);

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    res.download(attachment.path, attachment.originalName);
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadAttachment, getAttachments, deleteAttachment, downloadAttachment };
