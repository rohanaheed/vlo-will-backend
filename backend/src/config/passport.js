const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const bcrypt = require('bcrypt');
const { config } = require('./index');
const { db } = require('./database');
const { generateUUID } = require('../utils/helpers');
const logger = require('../utils/logger');
const { ROLE_IDS } = require('../db/seeds/001_roles');

// Local Strategy - for email/password login
const localStrategy = new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
  },
  async (email, password, done) => {
    try {
      // Find user by email
      const user = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', email.toLowerCase())
        .executeTakeFirst();

      if (!user) {
        logger.warn(`Login attempt failed: User not found - ${email}`);
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Check if user is active
      if (!user.is_active) {
        logger.warn(`Login attempt failed: User inactive - ${email}`);
        return done(null, false, { message: 'Account is deactivated' });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        logger.warn(`Login attempt failed: Invalid password - ${email}`);
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Remove sensitive data
      const { password_hash, ...userWithoutPassword } = user;
      
      logger.info(`User logged in successfully: ${email}`);
      return done(null, userWithoutPassword);
    } catch (error) {
      logger.error('Error in local strategy:', error);
      return done(error);
    }
  }
);

// JWT Strategy - for protected routes
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwt.secret,
};

const jwtStrategy = new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    // Find user by ID from JWT payload
    const user = await db
      .selectFrom('users')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .select([
        'users.id',
        'users.email',
        'users.name',
        'users.is_active',
        'users.is_email_verified',
        'users.role_id',
        'users.created_at',
        'users.updated_at',
        'roles.name as role_name',
      ])
      .where('users.id', '=', payload.sub)
      .executeTakeFirst();

    if (!user) {
      logger.warn(`JWT validation failed: User not found - ${payload.sub}`);
      return done(null, false);
    }

    if (!user.is_active) {
      logger.warn(`JWT validation failed: User inactive - ${payload.sub}`);
      return done(null, false);
    }

    return done(null, user);
  } catch (error) {
    logger.error('Error in JWT strategy:', error);
    return done(error, false);
  }
});

// Initialize passport strategies
const initializePassport = () => {
  passport.use('local', localStrategy);
  passport.use('jwt', jwtStrategy);

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await db
        .selectFrom('users')
        .leftJoin('roles', 'users.role_id', 'roles.id')
        .select([
          'users.id',
          'users.email',
          'users.name',
          'users.is_active',
          'users.role_id',
          'roles.name as role_name',
        ])
        .where('users.id', '=', id)
        .executeTakeFirst();

      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  logger.info('Passport strategies initialized');
};

module.exports = {
  passport,
  initializePassport,
};
