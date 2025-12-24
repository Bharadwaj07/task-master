const request = require('supertest');
const express = require('express');
const taskRoutes = require('../../src/routes/tasks');
const { User, Task } = require('../../src/models');
const errorHandler = require('../../src/middleware/errorHandler');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.set('io', { to: () => ({ emit: jest.fn() }) });
app.use('/api/tasks', taskRoutes);
app.use(errorHandler);

process.env.JWT_SECRET = 'test-secret';

describe('Task Routes', () => {
  let user, token;

  beforeEach(async () => {
    user = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123'
    });
    token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  });

  describe('POST /api/tasks', () => {
    it('should create a task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Task',
          description: 'Test description',
          priority: 'high'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.task.title).toBe('Test Task');
      expect(res.body.task.priority).toBe('high');
      expect(res.body.task.creator._id).toBe(user._id.toString());
    });

    it('should return 400 for missing title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No title' });
      
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Task',
          status: 'invalid'
        });
      
      expect(res.status).toBe(400);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test Task' });
      
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      await Task.create([
        { title: 'Task 1', creator: user._id, status: 'open', priority: 'low' },
        { title: 'Task 2', creator: user._id, status: 'completed', priority: 'high' },
        { title: 'Task 3', creator: user._id, status: 'open', priority: 'medium' }
      ]);
    });

    it('should get all tasks', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(3);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter tasks by status', async () => {
      const res = await request(app)
        .get('/api/tasks?status=open')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(2);
      expect(res.body.tasks.every(t => t.status === 'open')).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      const res = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(1);
      expect(res.body.tasks[0].priority).toBe('high');
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.pages).toBe(2);
    });
  });

  describe('GET /api/tasks/my-tasks', () => {
    beforeEach(async () => {
      const otherUser = await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'password123'
      });

      await Task.create([
        { title: 'Assigned to me', creator: otherUser._id, assignee: user._id },
        { title: 'Not assigned to me', creator: otherUser._id, assignee: otherUser._id },
        { title: 'Created by me', creator: user._id }
      ]);
    });

    it('should get tasks assigned to current user', async () => {
      const res = await request(app)
        .get('/api/tasks/my-tasks')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(1);
      expect(res.body.tasks[0].title).toBe('Assigned to me');
    });
  });

  describe('GET /api/tasks/:id', () => {
    let task;

    beforeEach(async () => {
      task = await Task.create({
        title: 'Test Task',
        description: 'Test description',
        creator: user._id
      });
    });

    it('should get task by id', async () => {
      const res = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.task.title).toBe('Test Task');
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid id format', async () => {
      const res = await request(app)
        .get('/api/tasks/invalidid')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    let task;

    beforeEach(async () => {
      task = await Task.create({
        title: 'Test Task',
        description: 'Test description',
        creator: user._id
      });
    });

    it('should update task', async () => {
      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Task',
          status: 'in-progress'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.task.title).toBe('Updated Task');
      expect(res.body.task.status).toBe('in-progress');
    });

    it('should return 403 for non-owner/non-assignee', async () => {
      const otherUser = await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'password123'
      });
      const otherToken = jwt.sign({ userId: otherUser._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hacked' });
      
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    let task;

    beforeEach(async () => {
      task = await Task.create({
        title: 'Test Task',
        creator: user._id
      });
    });

    it('should delete task', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Task deleted');
      
      const deletedTask = await Task.findById(task._id);
      expect(deletedTask).toBeNull();
    });

    it('should return 403 for non-creator', async () => {
      const otherUser = await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'password123'
      });
      const otherToken = jwt.sign({ userId: otherUser._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${otherToken}`);
      
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/tasks/:id/complete', () => {
    let task;

    beforeEach(async () => {
      task = await Task.create({
        title: 'Test Task',
        creator: user._id
      });
    });

    it('should mark task as complete', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${task._id}/complete`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe('completed');
      expect(res.body.task.completedAt).toBeDefined();
    });
  });
});
