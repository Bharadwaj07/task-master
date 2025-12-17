const request = require('supertest');
const express = require('express');
const { User, Task, Team, TeamMember } = require('../../src/models');
const errorHandler = require('../../src/middleware/errorHandler');

const authRoutes = require('../../src/routes/auth');
const taskRoutes = require('../../src/routes/tasks');
const teamRoutes = require('../../src/routes/teams');

const app = express();
app.use(express.json());
app.set('io', { to: () => ({ emit: jest.fn() }) });
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use(errorHandler);

process.env.JWT_SECRET = 'test-secret';

describe('E2E: Task Assignment Flow', () => {
  let ownerToken, memberToken, ownerId, memberId, teamId;

  beforeEach(async () => {
    // Create team owner
    const ownerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Owner',
        lastName: 'User',
        email: 'owner@example.com',
        password: 'password123'
      });
    ownerToken = ownerRes.body.token;
    ownerId = ownerRes.body.user._id;

    // Create team member
    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Member',
        lastName: 'User',
        email: 'member@example.com',
        password: 'password123'
      });
    memberToken = memberRes.body.token;
    memberId = memberRes.body.user._id;

    // Create team
    const teamRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Test Team' });
    teamId = teamRes.body.team._id;

    // Invite and add member
    const inviteRes = await request(app)
      .post(`/api/teams/${teamId}/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'member@example.com' });

    await request(app)
      .post(`/api/teams/join/${inviteRes.body.inviteToken}`)
      .set('Authorization', `Bearer ${memberToken}`);
  });

  it('should assign tasks to team members', async () => {
    // 1. Owner creates task and assigns to member
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Assigned Task',
        description: 'Do this work',
        team: teamId,
        assignee: memberId
      });
    
    expect(taskRes.status).toBe(201);
    expect(taskRes.body.task.assignee._id).toBe(memberId);
    const taskId = taskRes.body.task._id;

    // 2. Member sees task in my-tasks
    const myTasksRes = await request(app)
      .get('/api/tasks/my-tasks')
      .set('Authorization', `Bearer ${memberToken}`);
    
    expect(myTasksRes.status).toBe(200);
    expect(myTasksRes.body.tasks).toHaveLength(1);
    expect(myTasksRes.body.tasks[0].title).toBe('Assigned Task');

    // 3. Member updates task status
    const updateRes = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'in-progress' });
    
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.task.status).toBe('in-progress');

    // 4. Member completes task
    const completeRes = await request(app)
      .patch(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${memberToken}`);
    
    expect(completeRes.status).toBe(200);

    // 5. Owner can see completed task
    const teamTasksRes = await request(app)
      .get(`/api/teams/${teamId}/tasks?status=completed`)
      .set('Authorization', `Bearer ${ownerToken}`);
    
    expect(teamTasksRes.status).toBe(200);
    expect(teamTasksRes.body.tasks).toHaveLength(1);
  });

  it('should reassign tasks between members', async () => {
    // Create another member
    const member2Res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Member2',
        lastName: 'User',
        email: 'member2@example.com',
        password: 'password123'
      });
    const member2Token = member2Res.body.token;
    const member2Id = member2Res.body.user._id;

    // Add to team
    const inviteRes = await request(app)
      .post(`/api/teams/${teamId}/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'member2@example.com' });

    await request(app)
      .post(`/api/teams/join/${inviteRes.body.inviteToken}`)
      .set('Authorization', `Bearer ${member2Token}`);

    // 1. Create task assigned to member1
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Reassignable Task',
        team: teamId,
        assignee: memberId
      });
    const taskId = taskRes.body.task._id;

    // 2. Owner reassigns to member2
    const reassignRes = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ assignee: member2Id });
    
    expect(reassignRes.status).toBe(200);
    expect(reassignRes.body.task.assignee._id).toBe(member2Id);

    // 3. Member1 no longer sees it
    const member1Tasks = await request(app)
      .get('/api/tasks/my-tasks')
      .set('Authorization', `Bearer ${memberToken}`);
    
    expect(member1Tasks.body.tasks).toHaveLength(0);

    // 4. Member2 now sees it
    const member2Tasks = await request(app)
      .get('/api/tasks/my-tasks')
      .set('Authorization', `Bearer ${member2Token}`);
    
    expect(member2Tasks.body.tasks).toHaveLength(1);
  });

  it('should handle unassigned tasks', async () => {
    // 1. Create unassigned task
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Unassigned Task',
        team: teamId
      });
    
    expect(taskRes.status).toBe(201);
    expect(taskRes.body.task.assignee).toBeNull();

    // 2. Visible in team tasks
    const teamTasksRes = await request(app)
      .get(`/api/teams/${teamId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`);
    
    expect(teamTasksRes.body.tasks).toHaveLength(1);

    // 3. Not in any member's my-tasks
    const myTasksRes = await request(app)
      .get('/api/tasks/my-tasks')
      .set('Authorization', `Bearer ${memberToken}`);
    
    expect(myTasksRes.body.tasks).toHaveLength(0);
  });
});
