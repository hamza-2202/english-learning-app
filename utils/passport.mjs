import GoogleStrategy from "passport-google-oauth20"
import FacebookStrategy from "passport-facebook"
import passport from "passport";
import { User } from "../models/user.model.mjs";

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/v1/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.findOne({ email: profile.emails[0].value });
      if (!user) {
        user = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          provider: 'google'
        });
        await user.save();
      } else {
        user.googleId = profile.id;
        user.provider = 'google';
        await user.save();
      }
    }
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: '/api/v1/auth/facebook/callback',
  profileFields: ['id', 'emails', 'name']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ facebookId: profile.id });
    if (!user) {
      user = await User.findOne({ email: profile.emails[0]?.value });
      if (!user) {
        user = new User({
          facebookId: profile.id,
          email: profile.emails[0].value,
          name: `${profile.name.givenName} ${profile.name.familyName}`,
          provider: 'facebook'
        });
        await user.save();
      } else {
        user.facebookId = profile.id;
        user.provider = 'facebook';
        await user.save();
      }
    }
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

// Serialize user (minimal data stored in session)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;