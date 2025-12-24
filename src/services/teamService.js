const { v4: uuidv4 } = require('uuid');
const { Team, TeamMember, TeamInvitation } = require('../models');
const { team: teamConstants } = require('../shared/constants');

const createTeam = async teamData => {
  const team = await Team.create(teamData);
  await team.populate('owner');
  return team;
};

const createTeamMember = async memberData => {
  return TeamMember.create(memberData);
};

const findTeamById = async teamId => {
  return Team.findById(teamId).populate('owner');
};

const findTeamByIdRaw = async teamId => {
  return Team.findById(teamId);
};

const findTeams = async (query, { skip, limit, sort }) => {
  return Team.find(query).populate('owner').skip(skip).limit(limit).sort(sort);
};

const countTeams = async query => {
  return Team.countDocuments(query);
};

const findUserMemberships = async userId => {
  return TeamMember.find({ user: userId }).select('team');
};

const findMembership = async (teamId, userId) => {
  return TeamMember.findOne({ team: teamId, user: userId });
};

const findTeamMembers = async teamId => {
  return TeamMember.find({ team: teamId }).populate('user');
};

const updateTeam = async (team, updates) => {
  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      team[key] = updates[key];
    }
  });
  await team.save();
  await team.populate('owner');
  return team;
};

const deleteTeam = async team => {
  await TeamMember.deleteMany({ team: team._id });
  await TeamInvitation.deleteMany({ team: team._id });
  return team.deleteOne();
};

const createInvitation = async (teamId, email, role, invitedBy) => {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + teamConstants.INVITATION_EXPIRES_IN);

  await TeamInvitation.create({
    team: teamId,
    email,
    role,
    token,
    invitedBy,
    expiresAt
  });

  return token;
};

const findValidInvitation = async token => {
  return TeamInvitation.findOne({
    token,
    expiresAt: { $gt: new Date() },
    acceptedAt: null
  }).populate('team');
};

const acceptInvitation = async invitation => {
  invitation.acceptedAt = new Date();
  return invitation.save();
};

const deleteMember = async member => {
  return member.deleteOne();
};

const findAndDeleteMember = async (teamId, userId) => {
  return TeamMember.findOneAndDelete({ team: teamId, user: userId });
};

module.exports = {
  createTeam,
  createTeamMember,
  findTeamById,
  findTeamByIdRaw,
  findTeams,
  countTeams,
  findUserMemberships,
  findMembership,
  findTeamMembers,
  updateTeam,
  deleteTeam,
  createInvitation,
  findValidInvitation,
  acceptInvitation,
  deleteMember,
  findAndDeleteMember
};
