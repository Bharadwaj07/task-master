const jwt = require('jsonwebtoken');
const { User, Team, TeamMember, Task } = require('../src/models');

const testUsers = {
  user1: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'password123'
  },
  user2: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    password: 'password123'
  }
};

const createTestUser = async (userData = testUsers.user1) => {
  const user = await User.create(userData);
  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  return { user, token };
};

const createTestTeam = async (owner) => {
  const team = await Team.create({
    name: 'Test Team',
    description: 'A test team',
    owner: owner._id
  });
  
  await TeamMember.create({
    team: team._id,
    user: owner._id,
    role: 'owner'
  });
  
  return team;
};

const createTestTask = async (creator, options = {}) => {
  const task = await Task.create({
    title: options.title || 'Test Task',
    description: options.description || 'Test description',
    creator: creator._id,
    assignee: options.assignee || null,
    team: options.team || null,
    status: options.status || 'open',
    priority: options.priority || 'medium',
    dueDate: options.dueDate || null
  });
  return task;
};

module.exports = {
  testUsers,
  createTestUser,
  createTestTeam,
  createTestTask
};
