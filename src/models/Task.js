const mongoose = require('mongoose');
const { taskStatus, taskPriority } = require('../shared/enums');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ''
    },
    status: {
      type: String,
      enum: Object.values(taskStatus),
      default: taskStatus.OPEN
    },
    priority: {
      type: String,
      enum: Object.values(taskPriority),
      default: taskPriority.MEDIUM
    },
    dueDate: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null
    },
    tags: [String],
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate || this.status === taskStatus.COMPLETED) return false;
  return new Date() > this.dueDate;
});

taskSchema.index({ creator: 1, status: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ team: 1 });
taskSchema.index({ title: 'text', description: 'text' });

taskSchema.pre('save', function () {
  if (this.isModified('status')) {
    this.completedAt = this.status === taskStatus.COMPLETED ? new Date() : null;
  }
});

module.exports = mongoose.model('Task', taskSchema);
