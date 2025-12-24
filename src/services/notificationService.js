const { Notification } = require('../models');
const { notificationTypes } = require('../shared/enums');

const findNotifications = async (query, { skip, limit, sort }) => {
  return Notification.find(query).populate('sender').skip(skip).limit(limit).sort(sort);
};

const countNotifications = async query => {
  return Notification.countDocuments(query);
};

const findNotificationById = async (notificationId, recipientId) => {
  return Notification.findOne({ _id: notificationId, recipient: recipientId });
};

const markNotificationAsRead = async notification => {
  notification.isRead = true;
  notification.readAt = new Date();
  return notification.save();
};

const markAllNotificationsAsRead = async recipientId => {
  return Notification.updateMany(
    { recipient: recipientId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

const deleteNotification = async (notificationId, recipientId) => {
  return Notification.findOneAndDelete({ _id: notificationId, recipient: recipientId });
};

const createNotification = async (io, data) => {
  const { recipient, sender, type, title, message, resourceType, resourceId } = data;

  const notification = await Notification.create({
    recipient,
    sender,
    type,
    title,
    message,
    resourceType,
    resourceId
  });

  await notification.populate('sender');

  // Emit to recipient's personal room
  io.to(`user:${recipient}`).emit('notification:new', { notification });

  return notification;
};

const notifyTaskAssigned = async (io, task, assignerId) => {
  if (!task.assignee || task.assignee.toString() === assignerId.toString()) return;

  await createNotification(io, {
    recipient: task.assignee,
    sender: assignerId,
    type: notificationTypes.TASK_ASSIGNED,
    title: 'Task Assigned',
    message: `You have been assigned to task: ${task.title}`,
    resourceType: 'task',
    resourceId: task._id
  });
};

const notifyTaskUpdated = async (io, task, updaterId, watchers = []) => {
  const recipients = watchers.filter(w => w.toString() !== updaterId.toString());

  for (const recipient of recipients) {
    await createNotification(io, {
      recipient,
      sender: updaterId,
      type: notificationTypes.TASK_UPDATED,
      title: 'Task Updated',
      message: `Task "${task.title}" has been updated`,
      resourceType: 'task',
      resourceId: task._id
    });
  }
};

const notifyTaskComment = async (io, task, comment, authorId) => {
  const recipients = [task.creator, task.assignee].filter(
    r => r && r.toString() !== authorId.toString()
  );

  for (const recipient of recipients) {
    await createNotification(io, {
      recipient,
      sender: authorId,
      type: notificationTypes.TASK_COMMENTED,
      title: 'New Comment',
      message: `New comment on task: ${task.title}`,
      resourceType: 'task',
      resourceId: task._id
    });
  }
};

module.exports = {
  findNotifications,
  countNotifications,
  findNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotification,
  notifyTaskAssigned,
  notifyTaskUpdated,
  notifyTaskComment
};
