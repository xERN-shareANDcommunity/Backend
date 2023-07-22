import moment = require('moment');

// model
import User from '../models/user';
import UserGroup from '../models/userGroup';
import Group from '../models/group';
import GroupSchedule from '../models/groupSchedule';
import PersonalSchedule from '../models/personalSchedule';

// error
import ApiError from '../errors/apiError';
import {
  DataFormatError, userErrors, groupErrors, scheduleErrors,
} from '../errors';

// validator
import {
  validateGroupSchema, validateGroupIdSchema,
  validateScheduleIdSchema, validateGroupScheduleSchema, validateScheduleDateScehma,
} from '../utils/validators';

async function createGroup(req, res, next) {
  try {
    const { error } = validateGroupSchema(req.body);
    if (error) return next(new DataFormatError());

    const { nickname } = req;
    const { name } = req.body;
    const user = await User.findOne({ where: { nickname } });

    const group = await Group.create({ name, member: 1, leader: user?.userId });

    if (user) {
      await user.addGroup(group);
    }

    return res.status(200).json({ message: 'Successfully create group' });
  } catch (err) {
    return next(new ApiError());
  }
}

async function getGroupList(req, res, next) {
  try {
    const { nickname } = req;
    const user = await User.findOne({ where: { nickname } });
    const groupList = await user.getGroups();
    return res.status(200).json({ groupList });
  } catch (err) {
    return next(new ApiError());
  }
}

async function deleteGroup(req, res, next) {
  try {
    const { error } = validateScheduleIdSchema(req.params);
    if (error) return next(new DataFormatError());

    const { id } = req.params;
    const group = await Group.findByPk(id);

    if (!group) {
      return next(new groupErrors.GroupNotFoundError());
    }

    const user = await User.findOne({ where: { nickname: req.nickname } });
    if (!user) {
      return next(new userErrors.UserNotFoundError());
    }

    if (group.leader !== user.userId) {
      return next(new scheduleErrors.UnauthorizedError());
    }

    await group.destroy();
    return res.status(204).json({ message: 'Successfully delete group' });
  } catch (err) {
    return next(new ApiError());
  }
}

async function patchGroup(req, res, next) {
  try {
    const { error } = validateScheduleIdSchema(req.params);
    if (error) return next(new DataFormatError());

    const { id } = req.params;
    const { newLeaderId } = req.body;
    const group = await Group.findByPk(id);
    if (!group) {
      return next(new groupErrors.GroupNotFoundError());
    }

    group.leader = newLeaderId;
    await group.save();

    return res.status(200).json({ message: 'Successfully update group leader' });
  } catch (err) {
    return next(new ApiError());
  }
}

async function deleteGroupUser(req, res, next) {
  try {
    const { error } = validateScheduleIdSchema(req.params);
    if (error) return next(new DataFormatError());

    const user = await User.findOne({ where: { nickname: req.nickname } });
    if (!user) {
      return next(new userErrors.UserNotFoundError());
    }
    const { userId } = user;
    const { id: groupId } = req.params;

    const group = await Group.findByPk(groupId);
    if (!group) {
      return next(new groupErrors.GroupNotFoundError());
    }

    if (group.leader === userId) {
      return next(new scheduleErrors.UnauthorizedError());
    }

    await UserGroup.destroy({
      where: {
        userId, groupId,
      },
    });
    return res.status(204).json({ message: 'Successfully delete group user' });
  } catch (err) {
    return next(new ApiError());
  }
}

async function getGroupSchedule(req, res, next) {
  try {
    const { error } = validateScheduleIdSchema(req.params);
    if (error) return next(new DataFormatError());

    const { id: groupId } = req.params;
    const group = await Group.findByPk(groupId);
    if (!group) {
      return next(new groupErrors.GroupNotFoundError());
    }

    const { error: queryError } = validateScheduleDateScehma(req.query);
    if (queryError) return next(new DataFormatError());

    const { startDateTime, endDateTime } = req.query;
    const start = moment.utc(startDateTime).toDate();
    const end = moment.utc(endDateTime).toDate();
    const groupEvent = await GroupSchedule.getSchedule([group.groupId], start, end);
    const users = (await group.getUsers()).map((user) => user.userId);
    const userEvent = await PersonalSchedule.getSchedule(users, start, end);
    const event: {
      nonRecurrenceSchedule: Array<GroupSchedule>;
      recurrenceSchedule: Array<GroupSchedule>;
    } = {
      nonRecurrenceSchedule: [
        ...userEvent.nonRecurrenceSchedule,
        ...groupEvent.nonRecurrenceSchedule,
      ],
      recurrenceSchedule: [
        ...userEvent.recurrenceSchedule,
        ...groupEvent.recurrenceSchedule,
      ],
    };

    return res.status(200).json(event);
  } catch (err) {
    return next(new ApiError());
  }
}

async function postGroupSchedule(req, res, next) {
  try {
    const { error } = validateGroupScheduleSchema(req.body);
    if (error) return next(new DataFormatError());

    const {
      groupId,
      title,
      content,
      startDateTime,
      endDateTime,
      recurrence,
      freq,
      interval,
      byweekday,
      until,
    } = req.body;

    await GroupSchedule.create({
      groupId,
      title,
      content,
      startDateTime,
      endDateTime,
      recurrence,
      freq,
      interval,
      byweekday,
      until,
      possible: null,
      impossible: null,
    });
    return res.status(201).json({ message: 'Successfully create group schedule' });
  } catch (err) {
    return next(new ApiError());
  }
}

async function putGroupSchedule(req, res, next) {
  try {
    const { error: paramError } = validateScheduleIdSchema(req.params);
    if (paramError) return next(new DataFormatError());

    const { error: bodyError } = validateGroupScheduleSchema(req.body);
    if (bodyError) return next(new DataFormatError());

    const { id } = req.params;
    const schedule = await GroupSchedule.findOne({ where: { id } });

    if (!schedule) {
      return next(new scheduleErrors.ScheduleNotFoundError());
    }

    await GroupSchedule.update(req.body, { where: { id } });
    return res.status(201).json({ message: 'Successfully modify group schedule' });
  } catch (err) {
    return next(new ApiError());
  }
}

async function deleteGroupSchedule(req, res, next) {
  try {
    const { error } = validateScheduleIdSchema(req.params);
    if (error) return next(new DataFormatError());

    const { id } = req.params;
    const schedule = await GroupSchedule.findOne({ where: { id } });

    if (!schedule) {
      return next(new scheduleErrors.ScheduleNotFoundError());
    }

    await schedule.destroy();

    return res.status(204).json({ message: 'Successfully delete group schedule' });
  } catch (err) {
    return next(new ApiError());
  }
}

async function postInviteLink(req, res, next) {
  try {
    const { error } = validateGroupIdSchema(req.params);
    if (error) return next(new DataFormatError());

    const { group_id: groupId } = req.params;
    const group = await Group.findOne({ where: { groupId } });

    if (!group) {
      return next(new groupErrors.GroupNotFoundError());
    }

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const codeLength = 12;
    let inviteCode = '';
    let duplicate = null;

    while (true) {
      inviteCode = '';
      for (let i = 0; i < codeLength; i += 1) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        inviteCode += characters.charAt(randomIndex);
      }
      // eslint-disable-next-line no-await-in-loop
      duplicate = await Group.findOne({ where: { inviteCode } });
      if (!duplicate) {
        break;
      }
    }
    const inviteExp = new Date();
    inviteExp.setDate(new Date().getDate() + 1);
    await group.update({ inviteCode, inviteExp });
    return res.status(200).json({
      inviteCode,
      exp: inviteExp,
    });
  } catch (err) {
    return next(new ApiError());
  }
}

async function getInvitation(req, res, next) {
  try {
    const { error } = validateGroupSchema(req.params);
    if (error) return next(new DataFormatError());

    const { inviteCode } = req.params;
    const group = await Group.findOne({ where: { inviteCode } });
    if (!group) {
      return next(new groupErrors.GroupNotFoundError());
    }
    if (group.inviteExp < new Date()) {
      return next(new groupErrors.ExpiredCodeError());
    }
    return res.status(200).json({ group });
  } catch (err) {
    return next(new ApiError());
  }
}

async function postGroupJoin(req, res, next) {
  try {
    const { error } = validateGroupSchema(req.params);
    if (error) return next(new DataFormatError());

    const { inviteCode } = req.params;
    const group = await Group.findOne({ where: { inviteCode } });
    if (!group) {
      return next(new groupErrors.GroupNotFoundError());
    }
    if (group.inviteExp < new Date()) {
      return next(new groupErrors.ExpiredCodeError());
    }

    const { nickname } = req;
    const user = await User.findOne({ where: { nickname } });
    if (await user.hasGroup(group)) {
      return next(new groupErrors.InvalidGroupJoinError());
    }

    await user.addGroup(group);
    await group.update({ member: (group.member + 1) });

    return res.status(200).json({ message: 'Successfully joined the group.' });
  } catch (err) {
    return next(new ApiError());
  }
}

export {
  createGroup,
  getGroupList,
  deleteGroup,
  patchGroup,
  deleteGroupUser,
  getGroupSchedule,
  postGroupSchedule,
  putGroupSchedule,
  deleteGroupSchedule,
  postInviteLink,
  getInvitation,
  postGroupJoin,
};
