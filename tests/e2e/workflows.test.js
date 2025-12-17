const request = require('supertest');
const express = require('express');
const { User, Task, Team, TeamMember, Comment } = require('../../src/models');
const errorHandler = require('../../src/middleware/errorHandler');

// Routes
const authRoutes = require('../../src/routes/auth');
const taskRoutes = require('../../src/routes/tasks');
const teamRoutes = require('../../src/routes/teams');
const commentRoutes = require('../../src/routes/comments');

// Setup app
const app = express();
app.use(express.json());
app.set('io', { to: () => ({ emit: jest.fn() }) });
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/comments', commentRoutes);
app.use(errorHandler);

process.env.JWT_SECRET = 'test-secret';

describe('E2E: Complete User Workflow', () => {
  describe('User Registration and Authentication Flow', () => {
    it('should complete full registration, login, and profile update flow', async () => {
      // 1. Register
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'password123'
        });
      
      expect(registerRes.status).toBe(201);
      const { token: registerToken } = registerRes.body;

      // 2. Get Profile
      const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${registerToken}`);
      
      expect(profileRes.status).toBe(200);
      expect(profileRes.body.user.email).toBe('john@example.com');

      // 3. Update Profile
      const updateRes = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${registerToken}`)
        .send({ bio: 'I am a developer' });
      
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.user.bio).toBe('I am a developer');

      // 4. Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${registerToken}`);
      
      expect(logoutRes.status).toBe(200);

      // 5. Login again
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });
      
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
    });
  });

  describe('Task Management Flow', () => {
    let token, userId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'password123'
        });
      token = res.body.token;
      userId = res.body.user._id;
    });

    it('should complete full task lifecycle', async () => {
      // 1. Create task
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Complete project',
          description: 'Finish the task master project',
          priority: 'high',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
      
      expect(createRes.status).toBe(201);
      const taskId = createRes.body.task._id;

      // 2. Get task
      const getRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(getRes.status).toBe(200);
      expect(getRes.body.task.title).toBe('Complete project');

      // 3. Update task status
      const updateRes = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'in-progress' });
      
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.task.status).toBe('in-progress');

      // 4. Add comment
      const commentRes = await request(app)
        .post(`/api/comments/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Started working on this' });
      
      expect(commentRes.status).toBe(201);

      // 5. Get comments
      const getCommentsRes = await request(app)
        .get(`/api/comments/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(getCommentsRes.status).toBe(200);
      expect(getCommentsRes.body.comments).toHaveLength(1);

      // 6. Mark complete
      const completeRes = await request(app)
        .patch(`/api/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.task.status).toBe('completed');
      expect(completeRes.body.task.completedAt).toBeDefined();

      // 7. Get my tasks (should show completed)
      const myTasksRes = await request(app)
        .get('/api/tasks/my-tasks?status=completed')
        .set('Authorization', `Bearer ${token}`);
      
      expect(myTasksRes.status).toBe(200);
    });
  });

  describe('Team Collaboration Flow', () => {
    let user1Token, user2Token, user1Id, user2Id;

    beforeEach(async () => {
      // Create first user
      const res1 = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'password123'
        });
      user1Token = res1.body.token;
      user1Id = res1.body.user._id;

      // Create second user
      const res2 = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          password: 'password123'
        });
      user2Token = res2.body.token;
      user2Id = res2.body.user._id;
    });

    it('should complete team creation and collaboration flow', async () => {
      // 1. User 1 creates team
      const createTeamRes = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Development Team',
          description: 'Our dev team'
        });
      
      expect(createTeamRes.status).toBe(201);
      const teamId = createTeamRes.body.team._id;

      // 2. User 1 invites User 2
      const inviteRes = await request(app)
        .post(`/api/teams/${teamId}/invite`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          email: 'jane@example.com',
          role: 'member'
        });
      
      expect(inviteRes.status).toBe(201);
      const inviteToken = inviteRes.body.inviteToken;

      // 3. User 2 accepts invitation
      const acceptRes = await request(app)
        .post(`/api/teams/join/${inviteToken}`)
        .set('Authorization', `Bearer ${user2Token}`);
      
      expect(acceptRes.status).toBe(200);

      // 4. User 1 creates task in team
      const createTaskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Team task',
          description: 'A task for the team',
          team: teamId,
          assignee: user2Id
        });
      
      expect(createTaskRes.status).toBe(201);
      const taskId = createTaskRes.body.task._id;

      // 5. User 2 can see team tasks
      const teamTasksRes = await request(app)
        .get(`/api/teams/${teamId}/tasks`)
        .set('Authorization', `Bearer ${user2Token}`);
      
      expect(teamTasksRes.status).toBe(200);
      expect(teamTasksRes.body.tasks).toHaveLength(1);

      // 6. User 2 comments on task
      const commentRes = await request(app)
        .post(`/api/comments/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'I will start working on this' });
      
      expect(commentRes.status).toBe(201);

      // 7. User 2 updates task
      const updateRes = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ status: 'in-progress' });
      
      expect(updateRes.status).toBe(200);

      // 8. Get team details
      const teamDetailsRes = await request(app)
        .get(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${user1Token}`);
      
      expect(teamDetailsRes.status).toBe(200);
      expect(teamDetailsRes.body.members).toHaveLength(2);
    });
  });

  describe('Task Filtering and Search Flow', () => {
    let token;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'password123'
        });
      token = res.body.token;

      // Create multiple tasks
      const tasks = [
        { title: 'Bug fix', priority: 'urgent', status: 'open' },
        { title: 'Feature development', priority: 'high', status: 'in-progress' },
        { title: 'Documentation', priority: 'low', status: 'open' },
        { title: 'Code review', priority: 'medium', status: 'completed' },
        { title: 'Testing', priority: 'high', status: 'open' }
      ];

      for (const task of tasks) {
        await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${token}`)
          .send(task);
      }
    });

    it('should filter tasks by status', async () => {
      const res = await request(app)
        .get('/api/tasks?status=open')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(3);
      expect(res.body.tasks.every(t => t.status === 'open')).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      const res = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(2);
    });

    it('should paginate correctly', async () => {
      const page1 = await request(app)
        .get('/api/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);
      
      expect(page1.status).toBe(200);
      expect(page1.body.tasks).toHaveLength(2);
      expect(page1.body.pagination.total).toBe(5);
      expect(page1.body.pagination.pages).toBe(3);

      const page2 = await request(app)
        .get('/api/tasks?page=2&limit=2')
        .set('Authorization', `Bearer ${token}`);
      
      expect(page2.body.tasks).toHaveLength(2);
    });

    it('should combine multiple filters', async () => {
      const res = await request(app)
        .get('/api/tasks?status=open&priority=high')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(1);
      expect(res.body.tasks[0].title).toBe('Testing');
    });
  });
});
