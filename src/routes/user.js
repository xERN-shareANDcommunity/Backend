const express = require('express');
const { createToken } = require('../middleware/token');
const {
  putUserProfile,
  putUserSchedule,
  getUserPersonalMonthSchedule,
  getUserPersonalDaySchedule,
} = require('../controllers/user');
const { postPersonalSchedule, deletePersonalSchedule } = require('../controllers/calendar');

const router = express.Router();

router.put('/profile', putUserProfile, createToken);
router.put('/calendar', putUserSchedule);
router.get('/:user_id/calendar', getUserPersonalMonthSchedule);
router.get('/:user_id/calendar/todo', getUserPersonalDaySchedule);
router.post('/calendar', postPersonalSchedule);
router.delete('/calendar', deletePersonalSchedule);
module.exports = router;
