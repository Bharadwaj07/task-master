const fs = require('fs').promises;
const { Attachment, Task, Comment } = require('../models');

const findTaskById = async taskId => {
  return Task.findById(taskId);
};

const findCommentById = async commentId => {
  return Comment.findById(commentId);
};

const createAttachment = async attachmentData => {
  const attachment = await Attachment.create(attachmentData);
  await attachment.populate('uploadedBy');
  return attachment;
};

const findAttachmentsByTask = async taskId => {
  return Attachment.find({ task: taskId }).populate('uploadedBy').sort({ createdAt: -1 });
};

const findAttachmentById = async attachmentId => {
  return Attachment.findById(attachmentId);
};

const deleteAttachment = async attachment => {
  await fs.unlink(attachment.path).catch(() => {});
  return attachment.deleteOne();
};

const deleteFile = async filePath => {
  return fs.unlink(filePath).catch(() => {});
};

module.exports = {
  findTaskById,
  findCommentById,
  createAttachment,
  findAttachmentsByTask,
  findAttachmentById,
  deleteAttachment,
  deleteFile
};
