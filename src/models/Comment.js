const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

commentSchema.index({ task: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

commentSchema.pre('save', function () {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
  }
});

module.exports = mongoose.model('Comment', commentSchema);
