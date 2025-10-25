const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const authConfig = require('../config/auth');

class PasswordUtils {
  constructor() {
    this.saltRounds = authConfig.getBcryptRounds();
    this.passwordPolicy = authConfig.getPasswordPolicy();
  }

  // Hash password
  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(this.saltRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  // Compare password with hash
  async comparePassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error(`Password comparison failed: ${error.message}`);
    }
  }

  // Validate password against policy
  validatePassword(password) {
    const errors = [];
    const policy = this.passwordPolicy;

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    // Check against common passwords
    if (this.isCommonPassword(password)) {
      errors.push('Password is too common, please choose a stronger password');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generate secure random password
  generateSecurePassword(length = 12) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '@$!%*?&';
    
    let password = '';
    
    // Ensure at least one character from each required category
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(numbers);
    password += this.getRandomChar(symbols);
    
    // Fill the rest randomly
    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(allChars);
    }
    
    // Shuffle the password
    return this.shuffleString(password);
  }

  // Generate password reset token
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Hash password reset token
  hashResetToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Calculate password strength score (0-100)
  calculatePasswordStrength(password) {
    let score = 0;
    
    if (!password) return 0;
    
    // Length bonus
    score += Math.min(password.length * 4, 25);
    
    // Character variety bonus
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/[0-9]/.test(password)) score += 5;
    if (/[@$!%*?&]/.test(password)) score += 10;
    if (/[^A-Za-z0-9@$!%*?&]/.test(password)) score += 5;
    
    // Pattern penalties
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/123|abc|qwe/i.test(password)) score -= 10; // Sequential patterns
    
    // Common password penalty
    if (this.isCommonPassword(password)) score -= 20;
    
    return Math.max(0, Math.min(100, score));
  }

  // Get password strength description
  getPasswordStrengthDescription(password) {
    const score = this.calculatePasswordStrength(password);
    
    if (score < 30) return { level: 'weak', color: 'red', description: 'Weak password' };
    if (score < 60) return { level: 'medium', color: 'orange', description: 'Medium strength' };
    if (score < 80) return { level: 'strong', color: 'yellow', description: 'Strong password' };
    return { level: 'very-strong', color: 'green', description: 'Very strong password' };
  }

  // Check if password was breached (simple implementation)
  async isPasswordBreached(password) {
    // In a real implementation, you might check against HaveIBeenPwned API
    // For now, just check against common passwords
    return this.isCommonPassword(password);
  }

  // Encrypt password for storage (additional layer)
  encryptPassword(password) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.PASSWORD_ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.update(password, 'utf8', 'hex');
    const encrypted = cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  // Decrypt password
  decryptPassword(encryptedPassword) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.PASSWORD_ENCRYPTION_KEY || 'default-key', 'salt', 32);
    
    const [ivHex, encrypted] = encryptedPassword.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.update(encrypted, 'hex', 'utf8');
    return decipher.final('utf8');
  }

  // Helper methods
  getRandomChar(charset) {
    return charset.charAt(Math.floor(Math.random() * charset.length));
  }

  shuffleString(str) {
    return str.split('').sort(() => Math.random() - 0.5).join('');
  }

  isCommonPassword(password) {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123', 
      'password123', 'admin', 'letmein', 'welcome', 'monkey',
      'dragon', 'master', 'shadow', 'superman', 'michael',
      'football', 'baseball', 'liverpool', 'jordan', 'princess'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }

  // Generate password hash with timing attack protection
  async secureHashPassword(password) {
    try {
      // Add a small random delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      const salt = await bcrypt.genSalt(this.saltRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error(`Secure password hashing failed: ${error.message}`);
    }
  }

  // Secure password comparison with timing attack protection
  async secureComparePassword(password, hash) {
    try {
      // Add a small random delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error(`Secure password comparison failed: ${error.message}`);
    }
  }
}

module.exports = new PasswordUtils();