const { taskService } = require('../services');
const { pagination } = require('../shared/constants');

const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, assignee, team, tags } = req.body;

    const task = await taskService.createTask({
      title,
      description,
      status,
      priority,
      dueDate,
      assignee,
      team,
      tags,
      creator: req.userId
    });

    if (assignee && assignee !== req.userId.toString()) {
      const io = req.app.get('io');
      io.to(`user:${assignee}`).emit('task:assigned', { task });
    }

    res.status(201).json({
      message: 'Task created',
      task
    });
  } catch (error) {
    next(error);
  }
};

const getTasks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || pagination.DEFAULT_PAGE;
    const limit = Math.min(
      parseInt(req.query.limit) || pagination.DEFAULT_LIMIT,
      pagination.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const query = { isArchived: false };

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    if (req.query.assignee) {
      query.assignee = req.query.assignee;
    }

    if (req.query.team) {
      query.team = req.query.team;
    }

    if (req.query.assignedToMe === 'true') {
      query.assignee = req.userId;
    }

    if (req.query.createdByMe === 'true') {
      query.creator = req.userId;
    }

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    let sort = { createdAt: -1 };
    if (req.query.sortBy) {
      const order = req.query.order === 'asc' ? 1 : -1;
      sort = { [req.query.sortBy]: order };
    }

    const [tasks, total] = await Promise.all([
      taskService.findTasks(query, { skip, limit, sort }),
      taskService.countTasks(query)
    ]);

    res.json({
      tasks,
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

const getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.findTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, assignee, team, tags } = req.body;

    const task = await taskService.findTaskByIdRaw(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isCreator = task.creator.toString() === req.userId.toString();
    const isAssignee = task.assignee?.toString() === req.userId.toString();

    if (!isCreator && !isAssignee) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const oldAssignee = task.assignee?.toString();

    const updatedTask = await taskService.updateTask(task, {
      title,
      description,
      status,
      priority,
      dueDate,
      assignee,
      team,
      tags
    });

    const io = req.app.get('io');

    if (assignee && assignee !== oldAssignee && assignee !== req.userId.toString()) {
      io.to(`user:${assignee}`).emit('task:assigned', { task: updatedTask });
    }

    io.to(`task:${updatedTask._id}`).emit('task:updated', { task: updatedTask });

    res.json({
      message: 'Task updated',
      task: updatedTask
    });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const task = await taskService.findTaskByIdRaw(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.creator.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await taskService.deleteTask(task);

    res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

const markComplete = async (req, res, next) => {
  try {
    const task = await taskService.findTaskByIdRaw(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const completedTask = await taskService.markTaskComplete(task);

    const io = req.app.get('io');
    io.to(`task:${completedTask._id}`).emit('task:completed', { task: completedTask });

    res.json({
      message: 'Task marked as complete',
      task: completedTask
    });
  } catch (error) {
    next(error);
  }
};

const getMyTasks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || pagination.DEFAULT_PAGE;
    const limit = Math.min(
      parseInt(req.query.limit) || pagination.DEFAULT_LIMIT,
      pagination.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const query = {
      assignee: req.userId,
      isArchived: false
    };

    if (req.query.status) {
      query.status = req.query.status;
    }

    const [tasks, total] = await Promise.all([
      taskService.findMyTasks(query, { skip, limit, sort: { dueDate: 1, createdAt: -1 } }),
      taskService.countTasks(query)
    ]);

    res.json({
      tasks,
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

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  markComplete,
  getMyTasks
};
