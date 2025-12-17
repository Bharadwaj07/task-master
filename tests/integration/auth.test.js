const request = require('supertest');
const express = require('express');
const authRoutes = require('../../src/routes/auth');
const { User } = require('../../src/models');
const errorHandler = require('../../src/middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

process.env.JWT_SECRET = 'test-secret';

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    const validUser = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123'
    };

    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);
      
      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Registration successful');
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('john@example.com');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should return 400 for duplicate email', async () => {
      await User.create(validUser);
      
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email already registered');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' });
      
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: 'invalid' });
      
      expect(res.status).toBe(400);
    });

    it('should return 400 for short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, password: '123' });
      
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('john@example.com');
    });

    it('should return 401 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'password123'
        });
      
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'wrongpassword'
        });
      
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for deactivated account', async () => {
      await User.updateOne(
        { email: 'john@example.com' },
        { isActive: false }
      );
      
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });
      
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Account is deactivated');
    });

    it('should update lastLogin on successful login', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });
      
      const user = await User.findOne({ email: 'john@example.com' });
      expect(user.lastLogin).toBeInstanceOf(Date);
    });
  });

  describe('GET /api/auth/profile', () => {
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
    });

    it('should get profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('john@example.com');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/auth/profile');
      
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken');
      
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/auth/profile', () => {
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
    });

    it('should update profile', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Jane',
          bio: 'Updated bio'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.user.firstName).toBe('Jane');
      expect(res.body.user.bio).toBe('Updated bio');
    });
  });

  describe('PUT /api/auth/password', () => {
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
    });

    it('should change password with correct current password', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password changed successfully');
      
      // Verify new password works
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'newpassword123'
        });
      
      expect(loginRes.status).toBe(200);
    });

    it('should return 400 for incorrect current password', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Current password is incorrect');
    });
  });

  describe('POST /api/auth/logout', () => {
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
    });

    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });
});
