const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const env = require('./env');
const { findUserById, findUserByEmail, createUser } = require('../services/dataStorage');

passport.serializeUser((user, done) => {
  done(null, user._id || user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await findUserById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Configure Google OAuth Strategy if credentials are provided
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          const isGoogleEmailVerified = profile.emails?.[0]?.verified === true;
          const googleId = profile.id;
          const displayName = profile.displayName || profile.name?.givenName || 'Google User';
          const avatar = profile.photos?.[0]?.value || '';

          if (!email) {
            return done(new Error('Google profile did not provide an email address'), null);
          }

          let user = await findUserByEmail(email);
          if (user) {
            if (isGoogleEmailVerified) {
              user.googleId = googleId;
              user.isEmailVerified = true;
              if (!user.avatar && avatar) {
                user.avatar = avatar;
              }
              await user.save();
              return done(null, user);
            } else {
              return done(
                new Error('An account with this email exists, but the Google email is not verified.'),
                null
              );
            }
          }

          const newUser = await createUser({
            name: displayName,
            email,
            googleId,
            avatar,
            isEmailVerified: isGoogleEmailVerified,
          });

          return done(null, newUser);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
  console.log('Google OAuth strategy configured successfully.');
} else {
  console.log('Google OAuth credentials not provided. (Add GOOGLE_CLIENT_ID to server/.env to enable)');
}

module.exports = passport;
