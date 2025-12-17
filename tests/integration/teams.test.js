const request = require('supertest');
const express = require('express');
const teamRoutes = require('../../src/routes/teams');
const { User, Team, TeamMember, TeamInvitation } = require('../../src/models');
const errorHandler = require('../../src/middleware/errorHandler');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.set('io', { to: () => ({ emit: jest.fn() }) });
app.use('/api/teams', teamRoutes);
app.use(errorHandler);

process.env.JWT_SECRET = 'test-secret';

describe('Team Routes', () => {
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

  describe('POST /api/teams', () => {
    it('should create a team', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Team',
          description: 'A test team'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.team.name).toBe('Test Team');
      expect(res.body.team.owner._id).toBe(user._id.toString());
      
      // Verify team member was created
      const membership = await TeamMember.findOne({
        team: res.body.team._id,
        user: user._id
      });
      expect(membership).toBeDefined();
      expect(membership.role).toBe('owner');
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name' });
      
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/teams', () => {
    beforeEach(async () => {
      const team1 = await Team.create({ name: 'Team 1', owner: user._id });
      const team2 = await Team.create({ name: 'Team 2', owner: user._id });
      
      await TeamMember.create([
        { team: team1._id, user: user._id, role: 'owner' },
        { team: team2._id, user: user._id, role: 'owner' }
      ]);
    });

    it('should get user teams', async () => {
      const res = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.teams).toHaveLength(2);
    });

    it('should not include teams user is not member of', async () => {
      const otherUser = await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'password123'
      });
      const otherTeam = await Team.create({ name: 'Other Team', owner: otherUser._id });
      await TeamMember.create({ team: otherTeam._id, user: otherUser._id, role: 'owner' });

      const res = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.body.teams).toHaveLength(2);
      expect(res.body.teams.every(t => t.name !== 'Other Team')).toBe(true);
    });
  });

  describe('GET /api/teams/:id', () => {
    let team;

    beforeEach(async () => {
      team = await Team.create({
        name: 'Test Team',
        owner: user._id
      });
      await TeamMember.create({
        team: team._id,
        user: user._id,
        role: 'owner'
      });
    });

    it('should get team by id', async () => {
      const res = await request(app)
        .get(`/api/teams/${team._id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.team.name).toBe('Test Team');
      expect(res.body.members).toHaveLength(1);
      expect(res.body.userRole).toBe('owner');
    });

    it('should return 403 for non-member', async () => {
      const otherUser = await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'password123'
      });
      const otherToken = jwt.sign({ userId: otherUser._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .get(`/api/teams/${team._id}`)
        .set('Authorization', `Bearer ${otherToken}`);
      
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/teams/:id/invite', () => {
    let team;

    beforeEach(async () => {
      team = await Team.create({
        name: 'Test Team',
        owner: user._id
      });
      await TeamMember.create({
        team: team._id,
        user: user._id,
        role: 'owner'
      });
    });

    it('should create invitation', async () => {
      const res = await request(app)
        .post(`/api/teams/${team._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'newmember@example.com',
          role: 'member'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.inviteToken).toBeDefined();
      
      const invitation = await TeamInvitation.findOne({
        team: team._id,
        email: 'newmember@example.com'
      });
      expect(invitation).toBeDefined();
    });

    it('should return 403 for non-admin', async () => {
      const memberUser = await User.create({
        firstName: 'Member',
        lastName: 'User',
        email: 'member@example.com',
        password: 'password123'
      });
      await TeamMember.create({
        team: team._id,
        user: memberUser._id,
        role: 'member'
      });
      const memberToken = jwt.sign({ userId: memberUser._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .post(`/api/teams/${team._id}/invite`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: 'new@example.com' });
      
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/teams/join/:token', () => {
    let team, inviteToken;

    beforeEach(async () => {
      team = await Team.create({
        name: 'Test Team',
        owner: user._id
      });
      await TeamMember.create({
        team: team._id,
        user: user._id,
        role: 'owner'
      });

      const invitation = await TeamInvitation.create({
        team: team._id,
        email: 'jane@example.com',
        role: 'member',
        token: 'test-invite-token',
        invitedBy: user._id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      inviteToken = invitation.token;
    });

    it('should accept invitation', async () => {
      const newUser = await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'password123'
      });
      const newToken = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .post(`/api/teams/join/${inviteToken}`)
        .set('Authorization', `Bearer ${newToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Joined team successfully');
      
      const membership = await TeamMember.findOne({
        team: team._id,
        user: newUser._id
      });
      expect(membership).toBeDefined();
      expect(membership.role).toBe('member');
    });

    it('should return 400 for wrong email', async () => {
      const wrongUser = await User.create({
        firstName: 'Wrong',
        lastName: 'User',
        email: 'wrong@example.com',
        password: 'password123'
      });
      const wrongToken = jwt.sign({ userId: wrongUser._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .post(`/api/teams/join/${inviteToken}`)
        .set('Authorization', `Bearer ${wrongToken}`);
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invitation is for a different email');
    });

    it('should return 400 for expired invitation', async () => {
      await TeamInvitation.updateOne(
        { token: inviteToken },
        { expiresAt: new Date(Date.now() - 1000) }
      );

      const newUser = await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'password123'
      });
      const newToken = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .post(`/api/teams/join/${inviteToken}`)
        .set('Authorization', `Bearer ${newToken}`);
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired invitation');
    });
  });

  describe('DELETE /api/teams/:id', () => {
    let team;

    beforeEach(async () => {
      team = await Team.create({
        name: 'Test Team',
        owner: user._id
      });
      await TeamMember.create({
        team: team._id,
        user: user._id,
        role: 'owner'
      });
    });

    it('should delete team as owner', async () => {
      const res = await request(app)
        .delete(`/api/teams/${team._id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Team deleted');
      
      const deletedTeam = await Team.findById(team._id);
      expect(deletedTeam).toBeNull();
    });

    it('should return 403 for non-owner', async () => {
      const adminUser = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'password123'
      });
      await TeamMember.create({
        team: team._id,
        user: adminUser._id,
        role: 'admin'
      });
      const adminToken = jwt.sign({ userId: adminUser._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .delete(`/api/teams/${team._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(403);
    });
  });
});
