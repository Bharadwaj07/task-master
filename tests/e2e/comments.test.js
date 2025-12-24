const request = require('supertest');
const express = require('express');
const { User, Task, Comment } = require('../../src/models');
const errorHandler = require('../../src/middleware/errorHandler');

const authRoutes = require('../../src/routes/auth');
const taskRoutes = require('../../src/routes/tasks');
const commentRoutes = require('../../src/routes/comments');

const app = express();
app.use(express.json());
app.set('io', { to: () => ({ emit: jest.fn() }) });
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use(errorHandler);

process.env.JWT_SECRET = 'test-secret';

describe('E2E: Comments and Discussion Flow', () => {
  let userToken, taskId;

  beforeEach(async () => {
    // Register user
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      });
    userToken = registerRes.body.token;

    // Create task
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Discussion Task',
        description: 'A task for discussion'
      });
    taskId = taskRes.body.task._id;
  });

  it('should support threaded comment discussions', async () => {
    // 1. Add parent comment
    const comment1Res = await request(app)
      .post(`/api/comments/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'This is the first comment' });
    
    expect(comment1Res.status).toBe(201);
    const parentCommentId = comment1Res.body.comment._id;

    // 2. Add reply to parent comment
    const replyRes = await request(app)
      .post(`/api/comments/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        content: 'This is a reply',
        parentComment: parentCommentId
      });
    
    expect(replyRes.status).toBe(201);
    expect(replyRes.body.comment.parentComment).toBe(parentCommentId);

    // 3. Add another comment
    await request(app)
      .post(`/api/comments/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'Another top-level comment' });

    // 4. Get all comments (should show 2 parent comments with 1 reply)
    const commentsRes = await request(app)
      .get(`/api/comments/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(commentsRes.status).toBe(200);
    expect(commentsRes.body.comments).toHaveLength(2);
    
    const parentComment = commentsRes.body.comments.find(
      c => c._id === parentCommentId
    );
    expect(parentComment.replies).toHaveLength(1);
    expect(parentComment.replies[0].content).toBe('This is a reply');
  });

  it('should support editing and deleting comments', async () => {
    // 1. Create comment
    const createRes = await request(app)
      .post(`/api/comments/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'Original content' });
    
    const commentId = createRes.body.comment._id;

    // 2. Edit comment
    const editRes = await request(app)
      .put(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'Edited content' });
    
    expect(editRes.status).toBe(200);
    expect(editRes.body.comment.content).toBe('Edited content');
    expect(editRes.body.comment.isEdited).toBe(true);

    // 3. Delete comment
    const deleteRes = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(deleteRes.status).toBe(200);

    // 4. Verify comment is soft-deleted (not shown in list)
    const commentsRes = await request(app)
      .get(`/api/comments/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(commentsRes.body.comments).toHaveLength(0);
  });

  it('should handle multi-user discussion', async () => {
    // Register second user
    const user2Res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'password123'
      });
    const user2Token = user2Res.body.token;

    // 1. User 1 comments
    await request(app)
      .post(`/api/comments/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'Comment from John' });

    // 2. User 2 comments
    await request(app)
      .post(`/api/comments/tasks/${taskId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ content: 'Comment from Jane' });

    // 3. User 1 replies
    const commentsRes = await request(app)
      .get(`/api/comments/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    const janeComment = commentsRes.body.comments.find(
      c => c.content === 'Comment from Jane'
    );

    await request(app)
      .post(`/api/comments/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        content: 'John replying to Jane',
        parentComment: janeComment._id
      });

    // 4. Verify discussion structure
    const finalRes = await request(app)
      .get(`/api/comments/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(finalRes.body.comments).toHaveLength(2);
    const janeCommentWithReply = finalRes.body.comments.find(
      c => c.content === 'Comment from Jane'
    );
    expect(janeCommentWithReply.replies).toHaveLength(1);
  });
});
