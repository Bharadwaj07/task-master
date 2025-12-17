const mongoose = require('mongoose');
const { teamRoles } = require('../shared/enums');

const teamInvitationSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    role: {
      type: String,
      enum: [teamRoles.ADMIN, teamRoles.MEMBER],
      default: teamRoles.MEMBER
    },
    token: {
      type: String,
      required: true,
      unique: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    acceptedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
teamInvitationSchema.index({ team: 1, email: 1 });
teamInvitationSchema.index({ token: 1 });
teamInvitationSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('TeamInvitation', teamInvitationSchema);
