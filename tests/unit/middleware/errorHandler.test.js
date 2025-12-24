const errorHandler = require('../../../src/middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    console.error = jest.fn();
  });

  it('should handle ValidationError', () => {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    error.errors = {
      email: { message: 'Email is invalid' },
      password: { message: 'Password too short' }
    };
    
    errorHandler(error, mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Validation error',
      errors: ['Email is invalid', 'Password too short']
    });
  });

  it('should handle duplicate key error (code 11000)', () => {
    const error = new Error('Duplicate');
    error.code = 11000;
    error.keyValue = { email: 'test@example.com' };
    
    errorHandler(error, mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'email already exists'
    });
  });

  it('should handle CastError', () => {
    const error = new Error('Cast error');
    error.name = 'CastError';
    
    errorHandler(error, mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Invalid ID format'
    });
  });

  it('should handle JsonWebTokenError', () => {
    const error = new Error('Invalid token');
    error.name = 'JsonWebTokenError';
    
    errorHandler(error, mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Invalid token'
    });
  });

  it('should handle TokenExpiredError', () => {
    const error = new Error('Token expired');
    error.name = 'TokenExpiredError';
    
    errorHandler(error, mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Token expired'
    });
  });

  it('should handle custom error with statusCode', () => {
    const error = new Error('Custom error');
    error.statusCode = 404;
    
    errorHandler(error, mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Custom error'
    });
  });

  it('should default to 500 for unknown errors', () => {
    const error = new Error('Unknown error');
    
    errorHandler(error, mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Unknown error'
    });
  });
});
