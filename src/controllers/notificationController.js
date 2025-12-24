const { notificationService } = require('../services');
const { pagination } = require('../shared/constants');

const getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || pagination.DEFAULT_PAGE;
    const limit = Math.min(
      parseInt(req.query.limit) || pagination.DEFAULT_LIMIT,
      pagination.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const query = { recipient: req.userId };

    if (req.query.unread === 'true') {
      query.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      notificationService.findNotifications(query, { skip, limit, sort: { createdAt: -1 } }),
      notificationService.countNotifications(query),
      notificationService.countNotifications({ recipient: req.userId, isRead: false })
    ]);

    res.json({
      notifications,
      unreadCount,
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

const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.findNotificationById(req.params.id, req.userId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notificationService.markNotificationAsRead(notification);

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllNotificationsAsRead(req.userId);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const notification = await notificationService.deleteNotification(req.params.id, req.userId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification };
