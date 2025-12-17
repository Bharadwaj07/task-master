const { teamService, taskService } = require('../services');
const { teamRoles } = require('../shared/enums');
const { pagination } = require('../shared/constants');

const createTeam = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const team = await teamService.createTeam({
      name,
      description,
      owner: req.userId
    });

    await teamService.createTeamMember({
      team: team._id,
      user: req.userId,
      role: teamRoles.OWNER
    });

    res.status(201).json({
      message: 'Team created',
      team
    });
  } catch (error) {
    next(error);
  }
};

const getTeams = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || pagination.DEFAULT_PAGE;
    const limit = Math.min(
      parseInt(req.query.limit) || pagination.DEFAULT_LIMIT,
      pagination.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const memberships = await teamService.findUserMemberships(req.userId);
    const teamIds = memberships.map(m => m.team);

    const query = { _id: { $in: teamIds }, isActive: true };

    const [teams, total] = await Promise.all([
      teamService.findTeams(query, { skip, limit, sort: { createdAt: -1 } }),
      teamService.countTeams(query)
    ]);

    res.json({
      teams,
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

const getTeamById = async (req, res, next) => {
  try {
    const team = await teamService.findTeamById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const membership = await teamService.findMembership(team._id, req.userId);

    if (!membership) {
      return res.status(403).json({ message: 'Not a member of this team' });
    }

    const members = await teamService.findTeamMembers(team._id);

    res.json({
      team,
      members,
      userRole: membership.role
    });
  } catch (error) {
    next(error);
  }
};

const updateTeam = async (req, res, next) => {
  try {
    const { name, description, avatar } = req.body;

    const team = await teamService.findTeamByIdRaw(req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const membership = await teamService.findMembership(team._id, req.userId);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedTeam = await teamService.updateTeam(team, { name, description, avatar });

    res.json({
      message: 'Team updated',
      team: updatedTeam
    });
  } catch (error) {
    next(error);
  }
};

const deleteTeam = async (req, res, next) => {
  try {
    const team = await teamService.findTeamByIdRaw(req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Only owner can delete team' });
    }

    await teamService.deleteTeam(team);

    res.json({ message: 'Team deleted' });
  } catch (error) {
    next(error);
  }
};

const inviteMember = async (req, res, next) => {
  try {
    const { email, role = teamRoles.MEMBER } = req.body;

    const team = await teamService.findTeamByIdRaw(req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const membership = await teamService.findMembership(team._id, req.userId);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Not authorized to invite' });
    }

    const token = await teamService.createInvitation(team._id, email, role, req.userId);

    res.status(201).json({
      message: 'Invitation sent',
      inviteToken: token
    });
  } catch (error) {
    next(error);
  }
};

const acceptInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;

    const invitation = await teamService.findValidInvitation(token);

    if (!invitation) {
      return res.status(400).json({ message: 'Invalid or expired invitation' });
    }

    if (invitation.email !== req.user.email) {
      return res.status(400).json({ message: 'Invitation is for a different email' });
    }

    const existingMember = await teamService.findMembership(invitation.team._id, req.userId);

    if (existingMember) {
      return res.status(400).json({ message: 'Already a member of this team' });
    }

    await teamService.createTeamMember({
      team: invitation.team._id,
      user: req.userId,
      role: invitation.role
    });

    await teamService.acceptInvitation(invitation);

    const io = req.app.get('io');
    io.to(`team:${invitation.team._id}`).emit('team:member-joined', {
      teamId: invitation.team._id,
      user: req.user
    });

    res.json({
      message: 'Joined team successfully',
      team: invitation.team
    });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    const team = await teamService.findTeamByIdRaw(req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const requesterMembership = await teamService.findMembership(team._id, req.userId);

    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const memberToRemove = await teamService.findMembership(team._id, memberId);

    if (!memberToRemove) {
      return res.status(404).json({ message: 'Member not found' });
    }

    if (memberToRemove.role === 'owner') {
      return res.status(400).json({ message: 'Cannot remove team owner' });
    }

    await teamService.deleteMember(memberToRemove);

    res.json({ message: 'Member removed' });
  } catch (error) {
    next(error);
  }
};

const leaveTeam = async (req, res, next) => {
  try {
    const team = await teamService.findTeamByIdRaw(req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.owner.toString() === req.userId.toString()) {
      return res
        .status(400)
        .json({ message: 'Owner cannot leave team. Transfer ownership or delete team.' });
    }

    await teamService.findAndDeleteMember(team._id, req.userId);

    res.json({ message: 'Left team successfully' });
  } catch (error) {
    next(error);
  }
};

const getTeamTasks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || pagination.DEFAULT_PAGE;
    const limit = Math.min(
      parseInt(req.query.limit) || pagination.DEFAULT_LIMIT,
      pagination.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const membership = await teamService.findMembership(req.params.id, req.userId);

    if (!membership) {
      return res.status(403).json({ message: 'Not a member of this team' });
    }

    const query = { team: req.params.id, isArchived: false };

    if (req.query.status) {
      query.status = req.query.status;
    }

    const [tasks, total] = await Promise.all([
      taskService.findTeamTasks(query, { skip, limit, sort: { createdAt: -1 } }),
      taskService.countTasks(query)
    ]);

    res.json({
      tasks,
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

module.exports = {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  inviteMember,
  acceptInvitation,
  removeMember,
  leaveTeam,
  getTeamTasks
};
