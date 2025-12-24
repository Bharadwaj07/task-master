const jwt = require('jsonwebtoken');

// Mock the User model
jest.mock('../../../src/models/User', () => ({
  findById: jest.fn()
}));

const { auth, optionalAuth, adminOnly } = require('../../../src/middleware/auth');
const User = require('../../../src/models/User');

describe('Auth Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('auth', () => {
    it('should return 401 if no authorization header', async () => {
      await auth(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Access denied. No token provided.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', async () => {
      mockReq.headers.authorization = 'Basic sometoken';
      
      await auth(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 for invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalidtoken';
      
      await auth(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid token.'
      });
    });

    it('should return 401 if user not found', async () => {
      const token = jwt.sign({ userId: 'someid' }, 'test-secret');
      mockReq.headers.authorization = `Bearer ${token}`;
      User.findById.mockResolvedValue(null);
      
      await auth(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User not found.'
      });
    });

    it('should return 401 if user is not active', async () => {
      const token = jwt.sign({ userId: 'someid' }, 'test-secret');
      mockReq.headers.authorization = `Bearer ${token}`;
      User.findById.mockResolvedValue({ _id: 'someid', isActive: false });
      
      await auth(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Account is deactivated.'
      });
    });

    it('should call next and attach user for valid token', async () => {
      const mockUser = { _id: 'someid', isActive: true };
      const token = jwt.sign({ userId: 'someid' }, 'test-secret');
      mockReq.headers.authorization = `Bearer ${token}`;
      User.findById.mockResolvedValue(mockUser);
      
      await auth(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBe(mockUser);
      expect(mockReq.userId).toBe(mockUser._id);
    });
  });

  describe('optionalAuth', () => {
    it('should call next without user if no token', async () => {
      await optionalAuth(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });

    it('should attach user if valid token provided', async () => {
      const mockUser = { _id: 'someid', isActive: true };
      const token = jwt.sign({ userId: 'someid' }, 'test-secret');
      mockReq.headers.authorization = `Bearer ${token}`;
      User.findById.mockResolvedValue(mockUser);
      
      await optionalAuth(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBe(mockUser);
    });

    it('should continue without user for invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalidtoken';
      
      await optionalAuth(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });
  });

  describe('adminOnly', () => {
    it('should return 403 if no user', () => {
      mockReq.user = null;
      
      adminOnly(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Access denied. Admin privileges required.'
      });
    });

    it('should return 403 if user is not admin', () => {
      mockReq.user = { role: 'user' };
      
      adminOnly(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should call next if user is admin', () => {
      mockReq.user = { role: 'admin' };
      
      adminOnly(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
