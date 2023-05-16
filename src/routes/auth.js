const express = require('express');

const {
  getNaverUserInfo, joinSocialUser, join, login, logout,
} = require('../controllers/auth');
const { createToken, verifyToken, renewToken } = require('../middleware/token');
const { getUserInfo } = require('../controllers/user');

const router = express.Router();

router.post('/join', join, createToken);

router.post('/login', login, createToken);

router.delete('/logout', verifyToken, logout);

router.post('/naver', getNaverUserInfo, joinSocialUser, createToken);

// GET api/auth/google
// router.post('/google', joinSocialUser, createToken);

router.get('/token/refresh', renewToken);

router.get('/token/verify', verifyToken, getUserInfo);

module.exports = router;
