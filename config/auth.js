const jwt = require('jsonwebtoken');

class AuthConfig {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;

    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      throw new Error('JWT secrets must be defined in environment variables');
    }
  }

  generateAccessToken(payload) {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'perks-marketplace',
      audience: 'perks-marketplace-users'
    });
  }

  generateRefreshToken(payload) {
    return jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.jwtRefreshExpiresIn,
      issuer: 'perks-marketplace',
      audience: 'perks-marketplace-users'
    });
  }

  verifyAccessToken(token) {
    return jwt.verify(token, this.jwtSecret, {
      issuer: 'perks-marketplace',
      audience: 'perks-marketplace-users'
    });
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, this.jwtRefreshSecret, {
      issuer: 'perks-marketplace',
      audience: 'perks-marketplace-users'
    });
  }

  decodeToken(token) {
    return jwt.decode(token);
  }

  getBcryptRounds() {
    return this.bcryptRounds;
  }

  // Password policy configuration
  getPasswordPolicy() {
    return {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    };
  }

  // Session configuration
  getSessionConfig() {
    return {
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
    };
  }
}

module.exports = new AuthConfig();