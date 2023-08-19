const express = require('express');

const {
  createGroup,
  getGroupDetail,
  deleteGroup,
  patchGroup,
  getGroupSchedule,
  postGroupSchedule,
  putGroupSchedule,
  deleteGroupSchedule,
  getSingleGroupSchedule,
  postInviteLink,
  getInvitation,
  postGroupJoin,
  getEventProposal,
  postGroupPost,
  getGroupList,
  getSinglePost,
  getGroupPosts,
  putGroupPost,
  deleteGroupPost,
  postPostComment,
  putPostComment,
  deletePostComment,
} = require('../controllers/group');

const router = express.Router();

// Group
router.post('/', createGroup);
router.get('/', getGroupList);
router.get('/:group_id', getGroupDetail);
router.delete('/:group_id', deleteGroup);
router.patch('/:group_id', patchGroup);
router.post('/:group_id/invite-link', postInviteLink);
router.get('/invite-link/:inviteCode', getInvitation);
router.post('/join/:inviteCode', postGroupJoin);

// Schedule
router.post('/:group_id/calendar', postGroupSchedule);
router.get('/calendar/:schedule_id', getSingleGroupSchedule);
router.put('/calendar/:schedule_id', putGroupSchedule);
router.delete('/calendar/:schedule_id', deleteGroupSchedule);
router.get('/:group_id/calendar', getGroupSchedule);
router.get('/:group_id/proposal', getEventProposal);

// Post
router.post('/:group_id/post', postGroupPost);
router.get('/:group_id/post/:post_id', getSinglePost);
router.get('/:group_id/post', getGroupPosts);
router.put('/:group_id/post/:post_id', putGroupPost);
router.delete('/:group_id/post/:post_id', deleteGroupPost);
router.post('/:group_id/post/:post_id/comment', postPostComment);
router.put('/:group_id/post/:post_id/comment/:comment_id', putPostComment);
router.delete('/:group_id/post/:post_id/comment/:comment_id', deletePostComment);

module.exports = router;
