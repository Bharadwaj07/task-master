const request = require('supertest');
const express = require('express');
const commentRoutes = require('../../src/routes/comments');
const { User, Task, Comment } = require('../../src/models');
const errorHandler = require('../../src/middleware/errorHandler');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.set('io', { to: () => ({ emit: jest.fn() }) });
app.use('/api/comments', commentRoutes);
app.use(errorHandler);

process.env.JWT_SECRET = 'test-secret';

describe('Comment Routes', () => {
  let user, token, task;

  beforeEach(async () => {
    user = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123'
    });
    token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

    task = await Task.create({
      title: 'Test Task',
      creator: user._id
    });
  });

  describe('POST /api/comments/tasks/:taskId', () => {
    it('should create a comment', async () => {
      const res = await request(app)
        .post(`/api/comments/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'This is a comment' });
      
      expect(res.status).toBe(201);
      expect(res.body.comment.content).toBe('This is a comment');
      expect(res.body.comment.author._id).toBe(user._id.toString());
    });

    it('should create a reply comment', async () => {
      const parentComment = await Comment.create({
        content: 'Parent comment',
        task: task._id,
        author: user._id
      });

      const res = await request(app)
        .post(`/api/comments/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'Reply comment',
          parentComment: parentComment._id
        });
      
      expect(res.status).toBe(201);
      expect(res.body.comment.parentComment).toBe(parentComment._id.toString());
    });

    it('should return 400 for empty content', async () => {
      const res = await request(app)
        .post(`/api/comments/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '' });
      
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .post(`/api/comments/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Comment' });
      
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/comments/tasks/:taskId', () => {
    beforeEach(async () => {
      const comment1 = await Comment.create({
        content: 'Comment 1',
        task: task._id,
        author: user._id
      });

      await Comment.create([
        { content: 'Comment 2', task: task._id, author: user._id },
        { content: 'Reply to 1', task: task._id, author: user._id, parentComment: comment1._id }
      ]);
    });

    it('should get comments for task', async () => {
      const res = await request(app)
        .get(`/api/comments/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.comments).toHaveLength(2); // Only parent comments
    });

    it('should include replies in comments', async () => {
      const res = await request(app)
        .get(`/api/comments/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`);
      
      const commentWithReply = res.body.comments.find(c => c.content === 'Comment 1');
      expect(commentWithReply.replies).toHaveLength(1);
      expect(commentWithReply.replies[0].content).toBe('Reply to 1');
    });
  });

  describe('PUT /api/comments/:id', () => {
    let comment;

    beforeEach(async () => {
      comment = await Comment.create({
        content: 'Original comment',
        task: task._id,
        author: user._id
      });
    });

    it('should update comment', async () => {
      const res = await request(app)
        .put(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Updated comment' });
      
      expect(res.status).toBe(200);
      expect(res.body.comment.content).toBe('Updated comment');
      expect(res.body.comment.isEdited).toBe(true);
    });

    it('should return 403 for non-author', async () => {
      const otherUser = await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'password123'
      });
      const otherToken = jwt.sign({ userId: otherUser._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .put(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ content: 'Hacked' });
      
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    let comment;

    beforeEach(async () => {
      comment = await Comment.create({
        content: 'Test comment',
        task: task._id,
        author: user._id
      });
    });

    it('should soft delete comment', async () => {
      const res = await request(app)
        .delete(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Comment deleted');
      
      const deletedComment = await Comment.findById(comment._id);
      expect(deletedComment.isDeleted).toBe(true);
    });

    it('should return 403 for non-author', async () => {
      const otherUser = await User.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'password123'
      });
      const otherToken = jwt.sign({ userId: otherUser._id }, process.env.JWT_SECRET);

      const res = await request(app)
        .delete(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${otherToken}`);
      
      expect(res.status).toBe(403);
    });
  });
});
