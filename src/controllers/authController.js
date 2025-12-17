const { authService } = require('../services');

const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await authService.createUser({ firstName, lastName, email, password });
    const token = authService.generateToken(user._id);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await authService.findUserByEmailWithPassword(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    await authService.updateUserLastLogin(user);
    const token = authService.generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, bio, avatar } = req.body;
    const updates = {};

    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await authService.updateUserById(req.userId, updates);

    res.json({
      message: 'Profile updated',
      user
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await authService.findUserByIdWithPassword(req.userId);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    await authService.updateUserPassword(user, newPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getProfile, updateProfile, changePassword, logout };
