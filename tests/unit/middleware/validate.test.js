const { validationResult } = require('express-validator');
const validate = require('../../../src/middleware/validate');

jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}));

describe('Validate Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should call next if no validation errors', () => {
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
    
    validate(mockReq, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 400 with errors if validation fails', () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [
        { msg: 'Email is required' },
        { msg: 'Password is required' }
      ]
    });
    
    validate(mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Validation error',
      errors: ['Email is required', 'Password is required']
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
