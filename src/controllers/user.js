const moment = require('moment');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const PersonalSchedule = require('../models/personalSchedule');
const ApiError = require('../errors/apiError');
const DuplicateUserError = require('../errors/auth/DuplicateUserError');
const DataFormatError = require('../errors/DataFormatError');

const {
  validateJoinSchema,
  validateScheduleSchema,
} = require('../utils/validators');
const { UserNotFoundError } = require('../errors');

async function getUserProfile(req, res, next) {
  try {
    const { nickname } = req;
    const user = await User.findOne({ where: { nickname } });
    return res.status(200).json({ user });
  } catch (err) {
    return next(new ApiError());
  }
}

async function putUserProfile(req, res, next) {
  try {
    const { error } = validateJoinSchema(req.body);
    if (error) return next(new DataFormatError());

    const user = await User.findOne({ where: { nickname: req.nickname } });
    const { nickname, password } = req.body;
    const duplicate = await User.findAll({
      where: {
        [Op.and]: [
          { nickname },
          { userId: { [Op.not]: user.userId } },
        ],
      },
    });
    if (duplicate.length > 0) {
      return next(new DuplicateUserError());
    }
    await user.update({
      nickname,
      password: await bcrypt.hash(password, 12),
    });
    req.nickname = nickname;
    next();
  } catch (err) {
    return next(new ApiError());
  }
}

async function getUserPersonalSchedule(req, res, next) {
  try {
    const { error } = validateScheduleSchema(req.body);
    if (error) return next(new DataFormatError());

    const user = await User.findOne({ where: { nickname: req.nickname } });
    if (!user) {
      return next(new UserNotFoundError());
    }

    const { startDateTime, endDateTime } = req.body;
    const start = moment.utc(startDateTime).toDate();
    const end = moment.utc(endDateTime).toDate();
    const schedule = await PersonalSchedule.getSchedule(user.userId, start, end);
    if (schedule === null) throw new ApiError();
    return res.status(200).json(schedule);
  } catch (err) {
    return next(new ApiError());
  }
}

async function putUserSchedule(req, res, next) {
  try {
    const { error } = validateScheduleSchema(req.body);
    if (error) return next(new DataFormatError());
    const user = await User.findOne({ where: { nickname: req.nickname } });
    if (!user) {
      return next(new UserNotFoundError());
    }
    const { userId } = user;

    await PersonalSchedule.update(req.body, { where: { id: userId } });
    return res.status(201).json({ message: 'Successfully Modified.' });
  } catch (err) {
    return next(new ApiError());
  }
}

module.exports = {
  getUserProfile,
  putUserProfile,
  getUserPersonalSchedule,
  putUserSchedule,
};
