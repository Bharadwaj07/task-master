const jwt = require('jsonwebtoken');
const { User } = require('../models');

const socketHandler = io => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', socket => {
    console.log(`User connected: ${socket.userId}`);

    socket.join(`user:${socket.userId}`);

    socket.on('task:join', taskId => {
      socket.join(`task:${taskId}`);
    });

    socket.on('task:leave', taskId => {
      socket.leave(`task:${taskId}`);
    });

    socket.on('team:join', teamId => {
      socket.join(`team:${teamId}`);
    });

    socket.on('team:leave', teamId => {
      socket.leave(`team:${teamId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};

module.exports = socketHandler;
