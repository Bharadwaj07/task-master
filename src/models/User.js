const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { userRoles } = require('../shared/enums');
const { auth } = require('../shared/constants');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: auth.PASSWORD_MIN_LENGTH,
      select: false
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      maxlength: 500,
      default: ''
    },
    role: {
      type: String,
      enum: Object.values(userRoles),
      default: userRoles.USER
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(auth.SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);
