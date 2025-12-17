const { userService } = require('../services');
const { pagination } = require('../shared/constants');

const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || pagination.DEFAULT_PAGE;
    const limit = Math.min(
      parseInt(req.query.limit) || pagination.DEFAULT_LIMIT,
      pagination.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const query = { isActive: true };

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    const [users, total] = await Promise.all([
      userService.findUsers(query, { skip, limit, sort: { createdAt: -1 } }),
      userService.countUsers(query)
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.findUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUserById };
