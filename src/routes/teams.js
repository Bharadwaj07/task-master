const express = require('express');
const router = express.Router();
const { teamController } = require('../controllers');
const { teamValidator } = require('../validators');
const { auth, validate } = require('../middleware');

router.post('/', auth, teamValidator.createTeam, validate, teamController.createTeam);
router.get('/', auth, teamController.getTeams);
router.get('/:id', auth, teamController.getTeamById);
router.put('/:id', auth, teamValidator.updateTeam, validate, teamController.updateTeam);
router.delete('/:id', auth, teamController.deleteTeam);

router.post('/:id/invite', auth, teamValidator.inviteMember, validate, teamController.inviteMember);
router.post('/join/:token', auth, teamController.acceptInvitation);
router.delete('/:id/members/:memberId', auth, teamController.removeMember);
router.post('/:id/leave', auth, teamController.leaveTeam);

router.get('/:id/tasks', auth, teamController.getTeamTasks);

module.exports = router;
