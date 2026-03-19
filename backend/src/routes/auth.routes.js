const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const {
  signup, login, getMe, updateProfile, changePassword,
  signupValidation, loginValidation
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 5,
  message: { success: false, message: 'Too many password change attempts. Please try again in 1 hour.' }
});

// Public routes
router.post('/signup', authLimiter, signupValidation, signup);
router.post('/login', authLimiter, loginValidation, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, passwordLimiter, changePassword);

module.exports = router;
