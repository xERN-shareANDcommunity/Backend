const express = require('express');

const {
  getNaverUserInfo, getGoogleUserInfo, joinSocialUser,
  join, login, logout,
} = require('../controllers/auth');

const {
  createToken, verifyToken, renewToken,
} = require('../middleware/token');

const {
  withdrawal,
} = require('../controllers/user');

const router = express.Router();

router.post('/join', join, createToken);
router.post('/login', login, createToken);
router.delete('/logout', verifyToken, logout);
router.post('/naver', getNaverUserInfo, joinSocialUser, createToken);
router.post('/google', getGoogleUserInfo, createToken);
router.get('/token/refresh', renewToken);
router.get('/token/verify', verifyToken, (req, res) => { res.status(200).end(); });
router.delete('/withdrawal/:user_id', withdrawal);

module.exports = router;
