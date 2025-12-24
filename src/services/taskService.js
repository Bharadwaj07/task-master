const { Task } = require('../models');
const { taskStatus } = require('../shared/enums');

const createTask = async taskData => {
  const task = await Task.create(taskData);
  await task.populate(['creator', 'assignee', 'team']);
  return task;
};

const findTasks = async (query, { skip, limit, sort }) => {
  return Task.find(query)
    .populate(['creator', 'assignee', 'team'])
    .skip(skip)
    .limit(limit)
    .sort(sort);
};

const countTasks = async query => {
  return Task.countDocuments(query);
};

const findTaskById = async taskId => {
  return Task.findById(taskId).populate(['creator', 'assignee', 'team']);
};

const findTaskByIdRaw = async taskId => {
  return Task.findById(taskId);
};

const updateTask = async (task, updates) => {
  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      task[key] = updates[key];
    }
  });
  await task.save();
  await task.populate(['creator', 'assignee', 'team']);
  return task;
};

const deleteTask = async task => {
  return task.deleteOne();
};

const markTaskComplete = async task => {
  task.status = taskStatus.COMPLETED;
  await task.save();
  await task.populate(['creator', 'assignee', 'team']);
  return task;
};

const findMyTasks = async (query, { skip, limit, sort }) => {
  return Task.find(query).populate(['creator', 'team']).skip(skip).limit(limit).sort(sort);
};

const findTeamTasks = async (query, { skip, limit, sort }) => {
  return Task.find(query).populate(['creator', 'assignee']).skip(skip).limit(limit).sort(sort);
};

module.exports = {
  createTask,
  findTasks,
  countTasks,
  findTaskById,
  findTaskByIdRaw,
  updateTask,
  deleteTask,
  markTaskComplete,
  findMyTasks,
  findTeamTasks
};
