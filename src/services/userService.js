const { User } = require('../models');

const findUsers = async (query, { skip, limit, sort }) => {
  return User.find(query).skip(skip).limit(limit).sort(sort);
};

const countUsers = async query => {
  return User.countDocuments(query);
};

const findUserById = async userId => {
  return User.findById(userId);
};

module.exports = {
  findUsers,
  countUsers,
  findUserById
};
