const { commentService } = require('../services');
const { pagination } = require('../shared/constants');

const createComment = async (req, res, next) => {
  try {
    const { content, parentComment } = req.body;
    const { taskId } = req.params;

    const task = await commentService.findTaskById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const comment = await commentService.createComment({
      content,
      task: taskId,
      author: req.userId,
      parentComment: parentComment || null
    });

    const io = req.app.get('io');
    io.to(`task:${taskId}`).emit('comment:created', { comment });

    res.status(201).json({
      message: 'Comment added',
      comment
    });
  } catch (error) {
    next(error);
  }
};

const getComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const page = parseInt(req.query.page) || pagination.DEFAULT_PAGE;
    const limit = Math.min(
      parseInt(req.query.limit) || pagination.DEFAULT_LIMIT,
      pagination.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const query = { task: taskId, isDeleted: false, parentComment: null };

    const [comments, total] = await Promise.all([
      commentService.findComments(query, { skip, limit, sort: { createdAt: -1 } }),
      commentService.countComments(query)
    ]);

    const commentsWithReplies = await Promise.all(
      comments.map(async comment => {
        const replies = await commentService.findReplies(comment._id);
        return { ...comment.toObject(), replies };
      })
    );

    res.json({
      comments: commentsWithReplies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    const comment = await commentService.findCommentById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedComment = await commentService.updateComment(comment, content);

    const io = req.app.get('io');
    io.to(`task:${updatedComment.task}`).emit('comment:updated', { comment: updatedComment });

    res.json({
      message: 'Comment updated',
      comment: updatedComment
    });
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const comment = await commentService.findCommentById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await commentService.softDeleteComment(comment);

    const io = req.app.get('io');
    io.to(`task:${comment.task}`).emit('comment:deleted', { commentId: comment._id });

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createComment, getComments, updateComment, deleteComment };
