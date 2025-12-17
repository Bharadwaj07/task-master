const express = require('express');
const router = express.Router();
const { taskController } = require('../controllers');
const { taskValidator } = require('../validators');
const { auth, validate } = require('../middleware');

router.post('/', auth, taskValidator.createTask, validate, taskController.createTask);
router.get('/', auth, taskValidator.getTasks, validate, taskController.getTasks);
router.get('/my-tasks', auth, taskController.getMyTasks);
router.get('/:id', auth, taskValidator.getTaskById, validate, taskController.getTaskById);
router.put('/:id', auth, taskValidator.updateTask, validate, taskController.updateTask);
router.delete('/:id', auth, taskController.deleteTask);
router.patch('/:id/complete', auth, taskController.markComplete);

module.exports = router;
