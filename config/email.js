const nodemailer = require('nodemailer');

class EmailConfig {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    const config = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    this.transporter = nodemailer.createTransport(config);

    // Verify connection configuration
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email server connection verified');
    } catch (error) {
      console.error('Email server connection failed:', error.message);
    }
  }

  getTransporter() {
    return this.transporter;
  }

  getDefaultOptions() {
    return {
      from: {
        name: process.env.FROM_NAME || 'Perks Marketplace',
        address: process.env.FROM_EMAIL || 'noreply@perksmarketplace.com'
      },
      replyTo: process.env.REPLY_TO_EMAIL || process.env.FROM_EMAIL
    };
  }

  // Email templates configuration
  getTemplates() {
    return {
      welcome: {
        subject: 'Welcome to Perks Marketplace',
        template: 'welcome'
      },
      leadNotification: {
        subject: 'New Lead Submission',
        template: 'lead-notification'
      },
      partnerSubmission: {
        subject: 'New Partner Application',
        template: 'partner-submission'
      },
      passwordReset: {
        subject: 'Password Reset Request',
        template: 'password-reset'
      },
      partnerApproval: {
        subject: 'Your Partnership Application has been Approved',
        template: 'partner-approval'
      }
    };
  }

  // Email sending limits and configuration
  getSendingLimits() {
    return {
      maxPerHour: 100,
      maxPerDay: 1000,
      retryAttempts: 3,
      retryDelay: 5000 // 5 seconds
    };
  }
}

module.exports = new EmailConfig();