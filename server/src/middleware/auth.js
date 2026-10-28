const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  // Check session fallback
  if (req.session && req.session.passport && req.session.passport.user) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in.',
  });
};

const optionalAuth = (req, res, next) => {
  next();
};

module.exports = {
  ensureAuthenticated,
  optionalAuth,
};

