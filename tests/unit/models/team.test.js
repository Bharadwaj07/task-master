const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let Team, User;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  Team = require('../../../src/models/Team');
  User = require('../../../src/models/User');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Team.deleteMany({});
  await User.deleteMany({});
});

describe('Team Model', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123'
    });
  });

  describe('validation', () => {
    it('should create a team with valid data', async () => {
      const team = await Team.create({
        name: 'Test Team',
        owner: testUser._id
      });
      
      expect(team._id).toBeDefined();
      expect(team.name).toBe('Test Team');
      expect(team.isActive).toBe(true);
    });

    it('should require name', async () => {
      await expect(Team.create({ owner: testUser._id })).rejects.toThrow();
    });

    it('should require owner', async () => {
      await expect(Team.create({ name: 'Test Team' })).rejects.toThrow();
    });

    it('should trim name', async () => {
      const team = await Team.create({
        name: '  Test Team  ',
        owner: testUser._id
      });
      
      expect(team.name).toBe('Test Team');
    });
  });

  describe('default values', () => {
    it('should set default isActive to true', async () => {
      const team = await Team.create({
        name: 'Test Team',
        owner: testUser._id
      });
      
      expect(team.isActive).toBe(true);
    });

    it('should set default description to empty string', async () => {
      const team = await Team.create({
        name: 'Test Team',
        owner: testUser._id
      });
      
      expect(team.description).toBe('');
    });
  });
});
