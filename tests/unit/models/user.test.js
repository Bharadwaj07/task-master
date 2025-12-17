const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let User;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  User = require('../../../src/models/User');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('User Model', () => {
  const validUserData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'password123'
  };

  describe('validation', () => {
    it('should create a user with valid data', async () => {
      const user = await User.create(validUserData);
      
      expect(user._id).toBeDefined();
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.role).toBe('user');
      expect(user.isActive).toBe(true);
    });

    it('should require firstName', async () => {
      const userData = { ...validUserData, firstName: undefined };
      
      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should require lastName', async () => {
      const userData = { ...validUserData, lastName: undefined };
      
      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should require email', async () => {
      const userData = { ...validUserData, email: undefined };
      
      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should require password', async () => {
      const userData = { ...validUserData, password: undefined };
      
      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      await User.create(validUserData);
      
      await expect(User.create(validUserData)).rejects.toThrow();
    });

    it('should lowercase email', async () => {
      const user = await User.create({
        ...validUserData,
        email: 'JOHN@EXAMPLE.COM'
      });
      
      expect(user.email).toBe('john@example.com');
    });
  });

  describe('password hashing', () => {
    it('should hash password before saving', async () => {
      const user = await User.create(validUserData);
      const userWithPassword = await User.findById(user._id).select('+password');
      
      expect(userWithPassword.password).not.toBe('password123');
      expect(userWithPassword.password.startsWith('$2')).toBe(true);
    });

    it('should not rehash password if not modified', async () => {
      const user = await User.create(validUserData);
      const userWithPassword = await User.findById(user._id).select('+password');
      const originalHash = userWithPassword.password;
      
      userWithPassword.firstName = 'Jane';
      await userWithPassword.save();
      
      expect(userWithPassword.password).toBe(originalHash);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const user = await User.create(validUserData);
      const userWithPassword = await User.findById(user._id).select('+password');
      
      const isMatch = await userWithPassword.comparePassword('password123');
      
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const user = await User.create(validUserData);
      const userWithPassword = await User.findById(user._id).select('+password');
      
      const isMatch = await userWithPassword.comparePassword('wrongpassword');
      
      expect(isMatch).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should remove password from JSON output', async () => {
      const user = await User.create(validUserData);
      const userWithPassword = await User.findById(user._id).select('+password');
      const json = userWithPassword.toJSON();
      
      expect(json.password).toBeUndefined();
    });

    it('should remove __v from JSON output', async () => {
      const user = await User.create(validUserData);
      const json = user.toJSON();
      
      expect(json.__v).toBeUndefined();
    });
  });

  describe('virtual fullName', () => {
    it('should return full name', async () => {
      const user = await User.create(validUserData);
      
      expect(user.fullName).toBe('John Doe');
    });
  });
});
