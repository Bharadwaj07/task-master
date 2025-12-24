const mongoose = require('mongoose');
const { teamRoles } = require('../shared/enums');

const teamMemberSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: Object.values(teamRoles),
      default: teamRoles.MEMBER
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index
teamMemberSchema.index({ team: 1, user: 1 }, { unique: true });
teamMemberSchema.index({ user: 1 });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
