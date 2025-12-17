const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let Task, User;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  Task = require('../../../src/models/Task');
  User = require('../../../src/models/User');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Task.deleteMany({});
  await User.deleteMany({});
});

describe('Task Model', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123'
    });
  });

  const getValidTaskData = (userId) => ({
    title: 'Test Task',
    description: 'Test description',
    creator: userId
  });

  describe('validation', () => {
    it('should create a task with valid data', async () => {
      const task = await Task.create(getValidTaskData(testUser._id));
      
      expect(task._id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe('open');
      expect(task.priority).toBe('medium');
    });

    it('should require title', async () => {
      const taskData = { ...getValidTaskData(testUser._id), title: undefined };
      
      await expect(Task.create(taskData)).rejects.toThrow();
    });

    it('should require creator', async () => {
      const taskData = { ...getValidTaskData(testUser._id), creator: undefined };
      
      await expect(Task.create(taskData)).rejects.toThrow();
    });

    it('should validate status enum', async () => {
      const taskData = { ...getValidTaskData(testUser._id), status: 'invalid' };
      
      await expect(Task.create(taskData)).rejects.toThrow();
    });

    it('should validate priority enum', async () => {
      const taskData = { ...getValidTaskData(testUser._id), priority: 'invalid' };
      
      await expect(Task.create(taskData)).rejects.toThrow();
    });
  });

  describe('default values', () => {
    it('should set default status to open', async () => {
      const task = await Task.create(getValidTaskData(testUser._id));
      
      expect(task.status).toBe('open');
    });

    it('should set default priority to medium', async () => {
      const task = await Task.create(getValidTaskData(testUser._id));
      
      expect(task.priority).toBe('medium');
    });

    it('should set default isArchived to false', async () => {
      const task = await Task.create(getValidTaskData(testUser._id));
      
      expect(task.isArchived).toBe(false);
    });
  });

  describe('completedAt hook', () => {
    it('should set completedAt when status changes to completed', async () => {
      const task = await Task.create(getValidTaskData(testUser._id));
      
      task.status = 'completed';
      await task.save();
      
      expect(task.completedAt).toBeInstanceOf(Date);
    });

    it('should clear completedAt when status changes from completed', async () => {
      const task = await Task.create({
        ...getValidTaskData(testUser._id),
        status: 'completed'
      });
      
      task.status = 'open';
      await task.save();
      
      expect(task.completedAt).toBeNull();
    });
  });

  describe('isOverdue virtual', () => {
    it('should return false if no due date', async () => {
      const task = await Task.create(getValidTaskData(testUser._id));
      
      expect(task.isOverdue).toBe(false);
    });

    it('should return false if due date is in future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const task = await Task.create({
        ...getValidTaskData(testUser._id),
        dueDate: futureDate
      });
      
      expect(task.isOverdue).toBe(false);
    });

    it('should return true if due date is in past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      
      const task = await Task.create({
        ...getValidTaskData(testUser._id),
        dueDate: pastDate
      });
      
      expect(task.isOverdue).toBe(true);
    });

    it('should return false if completed even if overdue', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      
      const task = await Task.create({
        ...getValidTaskData(testUser._id),
        dueDate: pastDate,
        status: 'completed'
      });
      
      expect(task.isOverdue).toBe(false);
    });
  });

  describe('tags', () => {
    it('should accept array of tags', async () => {
      const task = await Task.create({
        ...getValidTaskData(testUser._id),
        tags: ['frontend', 'urgent', 'bug']
      });
      
      expect(task.tags).toHaveLength(3);
      expect(task.tags).toContain('frontend');
    });
  });
});
