const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { auth: authConstants } = require('../shared/constants');

const generateToken = userId => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || authConstants.JWT_EXPIRES_IN
  });
};

const findUserByEmail = async email => {
  return User.findOne({ email });
};

const findUserByEmailWithPassword = async email => {
  return User.findOne({ email }).select('+password');
};

const findUserByIdWithPassword = async userId => {
  return User.findById(userId).select('+password');
};

const createUser = async userData => {
  return User.create(userData);
};

const updateUserById = async (userId, updates) => {
  return User.findByIdAndUpdate(userId, updates, { new: true });
};

const updateUserLastLogin = async user => {
  user.lastLogin = new Date();
  return user.save();
};

const updateUserPassword = async (user, newPassword) => {
  user.password = newPassword;
  return user.save();
};

module.exports = {
  generateToken,
  findUserByEmail,
  findUserByEmailWithPassword,
  findUserByIdWithPassword,
  createUser,
  updateUserById,
  updateUserLastLogin,
  updateUserPassword
};
