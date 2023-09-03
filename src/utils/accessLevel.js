// Model
const UserGroup = require('../models/userGroup');

// Error
const {
  UnauthorizedError, ApiError,
} = require('../errors');

function isMine(user, content) {
  if (user.userId == content.userId) {
    return true;
  }
  return false;
}

async function getAccessLevel(user, group) {
  try {
    const association = await UserGroup.findOne({
      where: {
        userId: user.userId,
        groupId: group.groupId,
      },
    });
    if (!association) {
      throw new UnauthorizedError();
    }
    return association.accessLevel;
  } catch (err) {
    throw new ApiError();
  }
}

module.exports = {
  isMine,
  getAccessLevel,
};