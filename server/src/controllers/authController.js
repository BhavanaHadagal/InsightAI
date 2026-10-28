const crypto = require('crypto');
const env = require('../config/env');
const { sendPasswordResetEmail } = require('../services/emailService');
const { findUserByEmail, createUser, findUserById } = require('../services/dataStorage');
const { createAuthToken } = require('../utils/token');

// Registration
const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Create user
    const user = await createUser({
      name: name.trim(),
      email: normalizedEmail,
      password,
      isEmailVerified: false,
    });

    // Establish authenticated session with session regeneration
    req.login(user, (err) => {
      if (err) return next(err);

      req.session.regenerate((regenErr) => {
        if (regenErr) return next(regenErr);

        req.session.passport = { user: user._id || user.id };
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          const token = createAuthToken(user._id || user.id);
          return res.status(201).json({
            success: true,
            message: 'Registration successful.',
            user: user.toJSON ? user.toJSON() : user,
            token,
          });
        });
      });
    });
  } catch (error) {
    next(error);
  }
};

// Login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail, true);

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended. Please contact support.',
      });
    }

    // Regenerate session upon login for security against session fixation
    req.login(user, (err) => {
      if (err) return next(err);

      req.session.regenerate((regenErr) => {
        if (regenErr) return next(regenErr);

        req.session.passport = { user: user._id || user.id };
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          const token = createAuthToken(user._id || user.id);
          return res.status(200).json({
            success: true,
            message: 'Login successful.',
            user: user.toJSON ? user.toJSON() : user,
            token,
          });
        });
      });
    });
  } catch (error) {
    next(error);
  }
};

// Logout
const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    if (req.session) {
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('Session destroy error:', destroyErr);
        }
        res.clearCookie('connect.sid', { path: '/' });
        return res.status(200).json({
          success: true,
          message: 'Logged out successfully.',
        });
      });
    } else {
      res.clearCookie('connect.sid', { path: '/' });
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.',
      });
    }
  });
};

// Get current authenticated user
const getMe = (req, res) => {
  if (!req.user) {
    return res.status(200).json({
      success: true,
      user: null,
    });
  }
  return res.status(200).json({
    success: true,
    user: req.user.toJSON ? req.user.toJSON() : req.user,
  });
};

// Forgot Password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, password reset instructions have been sent.',
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    const emailResult = await sendPasswordResetEmail(normalizedEmail, rawToken);

    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, password reset instructions have been sent.',
      ...(emailResult.devMode ? { devResetUrl: emailResult.resetUrl, devNote: emailResult.message } : {}),
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password
const resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await findUserById(req.session?.passport?.user);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset session invalid or expired.',
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    req.login(user, (err) => {
      if (err) return next(err);
      req.session.regenerate((regenErr) => {
        if (regenErr) return next(regenErr);
        req.session.passport = { user: user._id || user.id };
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          return res.status(200).json({
            success: true,
            message: 'Password reset successful. You are now logged in.',
            user: user.toJSON ? user.toJSON() : user,
          });
        });
      });
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
};
