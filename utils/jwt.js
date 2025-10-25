const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');

class JWTUtils {
  // Generate access and refresh tokens
  generateTokens(payload) {
    const accessToken = authConfig.generateAccessToken(payload);
    const refreshToken = authConfig.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken
    };
  }

  // Generate only access token
  generateAccessToken(payload) {
    return authConfig.generateAccessToken(payload);
  }

  // Generate only refresh token
  generateRefreshToken(payload) {
    return authConfig.generateRefreshToken(payload);
  }

  // Verify access token
  verifyAccessToken(token) {
    try {
      return authConfig.verifyAccessToken(token);
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      return authConfig.verifyRefreshToken(token);
    } catch (error) {
      throw new Error(`Refresh token verification failed: ${error.message}`);
    }
  }

  // Decode token without verification
  decodeToken(token) {
    return authConfig.decodeToken(token);
  }

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  // Check if token is expired
  isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  // Get token expiration time
  getTokenExpiration(token) {
    try {
      const decoded = this.decodeToken(token);
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  // Get time until token expires (in seconds)
  getTimeUntilExpiration(token) {
    try {
      const decoded = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return Math.max(0, decoded.exp - currentTime);
    } catch (error) {
      return 0;
    }
  }

  // Generate a secure random token (for password reset, etc.)
  generateSecureToken(length = 32) {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }

  // Create a signed URL token for file access
  createSignedUrlToken(filePath, expiresIn = '1h') {
    const payload = {
      filePath,
      purpose: 'file_access'
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }

  // Verify signed URL token
  verifySignedUrlToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid file access token');
    }
  }

  // Create API key token (long-lived)
  createApiKeyToken(payload, expiresIn = '365d') {
    return jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn,
      issuer: 'perks-marketplace-api'
    });
  }

  // Generate JWT for email verification
  generateEmailVerificationToken(email, userId) {
    const payload = {
      email,
      userId,
      purpose: 'email_verification'
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: '24h' 
    });
  }

  // Generate JWT for password reset
  generatePasswordResetToken(email, userId) {
    const payload = {
      email,
      userId,
      purpose: 'password_reset'
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: '1h' 
    });
  }

  // Verify special purpose tokens
  verifyPurposeToken(token, expectedPurpose) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.purpose !== expectedPurpose) {
        throw new Error('Invalid token purpose');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }
}

module.exports = new JWTUtils();