const express = require('express');
const { z } = require('zod');
const passport = require('passport');
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const { createAuthToken } = require('../utils/token');
const env = require('../config/env');

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters long'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters long'),
  }),
});

// Routes
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', getMe);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

// Google OAuth
router.get('/google', (req, res, next) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env.',
    });
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
});

router.get(
  '/google/callback',
  (req, res, next) => {
    const clientBase = (env.CLIENT_URL || 'https://insight-ai-pi-three.vercel.app').replace(/\/$/, '');
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${clientBase}/login?error=oauth_not_configured`);
    }
    passport.authenticate('google', {
      failureRedirect: `${clientBase}/login?error=oauth_failed`,
      session: true,
    })(req, res, next);
  },
  (req, res) => {
    const userId = req.user._id || req.user.id;
    const token = createAuthToken(userId);
    const clientBase = (env.CLIENT_URL || 'https://insight-ai-pi-three.vercel.app').replace(/\/$/, '');

    // Regenerate session upon OAuth success for security
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error after OAuth:', err);
        return res.redirect(`${clientBase}/dashboard?token=${token}`);
      }
      req.session.passport = { user: userId };
      req.session.save(() => {
        // Successful authentication, redirect with token for cross-domain support
        res.redirect(`${clientBase}/dashboard?token=${token}`);
      });
    });
  }
);

module.exports = router;

