const { Comment, Task } = require('../models');

const findTaskById = async taskId => {
  return Task.findById(taskId);
};

const createComment = async commentData => {
  const comment = await Comment.create(commentData);
  await comment.populate('author');
  return comment;
};

const findComments = async (query, { skip, limit, sort }) => {
  return Comment.find(query).populate('author').skip(skip).limit(limit).sort(sort);
};

const countComments = async query => {
  return Comment.countDocuments(query);
};

const findReplies = async parentCommentId => {
  return Comment.find({
    parentComment: parentCommentId,
    isDeleted: false
  })
    .populate('author')
    .sort({ createdAt: 1 });
};

const findCommentById = async commentId => {
  return Comment.findById(commentId);
};

const updateComment = async (comment, content) => {
  comment.content = content;
  await comment.save();
  await comment.populate('author');
  return comment;
};

const softDeleteComment = async comment => {
  comment.isDeleted = true;
  return comment.save();
};

module.exports = {
  findTaskById,
  createComment,
  findComments,
  countComments,
  findReplies,
  findCommentById,
  updateComment,
  softDeleteComment
};
