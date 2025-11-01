const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');

class EmailService {
  constructor() {
    this.transporter = emailConfig.getTransporter();
    this.defaultOptions = emailConfig.getDefaultOptions();
    this.templates = emailConfig.getTemplates();
  }

  // Check if email service is properly configured
  isConfigured() {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  // Send email verification
  async sendEmailVerification(email, name, token) {
    if (!this.isConfigured()) {
      console.log('Email service not configured, skipping email verification');
      return;
    }

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    const mailOptions = {
      ...this.defaultOptions,
      to: email,
      subject: 'Verify Your Email - Perks Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Perks Marketplace, ${name}!</h2>
          <p>Thank you for signing up. Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            If you didn't create an account with us, you can safely ignore this email.
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email verification sent to ${email}`);
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordReset(email, name, token) {
    if (!this.isConfigured()) {
      console.log('Email service not configured, skipping password reset email');
      return;
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const mailOptions = {
      ...this.defaultOptions,
      to: email,
      subject: 'Password Reset Request - Perks Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  // Send welcome email (after email verification)
  async sendWelcomeEmail(email, name) {
    if (!this.isConfigured()) {
      return;
    }

    const mailOptions = {
      ...this.defaultOptions,
      to: email,
      subject: 'Welcome to Perks Marketplace!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Perks Marketplace, ${name}!</h2>
          <p>Your email has been verified and your account is now active.</p>
          <p>You can now access exclusive perks and deals for remote teams, freelancers, and founders.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/perks" 
               style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Browse Perks
            </a>
          </div>
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>Happy browsing!</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  // Add these methods to the existing EmailService class

  // Send lead notification to admin/sales team
  async sendLeadNotification(lead) {
    if (!this.isConfigured()) {
      console.log('Email service not configured, skipping lead notification');
      return;
    }

    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : ['admin@perksmarketplace.com'];

    const mailOptions = {
      ...this.defaultOptions,
      to: adminEmails,
      subject: `New Lead Submission - ${lead.name}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🎯 New Lead Submission</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Contact Information</h3>
          <p><strong>Name:</strong> ${lead.name}</p>
          <p><strong>Email:</strong> ${lead.email}</p>
          ${lead.phone ? `<p><strong>Phone:</strong> ${lead.phone}</p>` : ''}
          ${lead.company?.name ? `<p><strong>Company:</strong> ${lead.company.name}</p>` : ''}
          ${lead.company?.size ? `<p><strong>Company Size:</strong> ${lead.company.size}</p>` : ''}
          ${lead.company?.industry ? `<p><strong>Industry:</strong> ${lead.company.industry}</p>` : ''}
        </div>
        
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Lead Details</h3>
          <p><strong>Lead Score:</strong> ${lead.leadScore}/100</p>
          <p><strong>Source:</strong> ${lead.source}</p>
          <p><strong>Priority:</strong> ${lead.priority}</p>
          ${lead.perkName ? `<p><strong>Interested Perk:</strong> ${lead.perkName}</p>` : ''}
          ${lead.budget?.range && lead.budget.range !== 'not-specified' ? `<p><strong>Budget:</strong> ${lead.budget.range}</p>` : ''}
          ${lead.timeline && lead.timeline !== 'flexible' ? `<p><strong>Timeline:</strong> ${lead.timeline}</p>` : ''}
        </div>
        
        ${lead.message ? `
          <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Message</h3>
            <p>${lead.message}</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.ADMIN_URL}/leads/${lead._id}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Lead in Admin Panel
          </a>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4>Tracking Information</h4>
          <p><strong>Location:</strong> ${lead.location?.city ? `${lead.location.city}, ${lead.location.country}` : 'Unknown'}</p>
          <p><strong>Submitted:</strong> ${new Date(lead.createdAt).toLocaleString()}</p>
          ${lead.utmParams?.source ? `<p><strong>UTM Source:</strong> ${lead.utmParams.source}</p>` : ''}
          ${lead.utmParams?.campaign ? `<p><strong>UTM Campaign:</strong> ${lead.utmParams.campaign}</p>` : ''}
        </div>
      </div>
    `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Lead notification sent for lead ${lead._id}`);
    } catch (error) {
      console.error('Error sending lead notification:', error);
      throw error;
    }
  }

  // Send lead confirmation to the lead submitter
  async sendLeadConfirmation(lead) {
    if (!this.isConfigured()) {
      return;
    }

    const mailOptions = {
      ...this.defaultOptions,
      to: lead.email,
      subject: 'Thank you for your interest - Perks Marketplace',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for your interest, ${lead.name}!</h2>
        
        <p>We've received your inquiry and our team will get back to you shortly.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>What happens next?</h3>
          <ul>
            <li>Our team will review your submission within 24 hours</li>
            <li>We'll reach out via your preferred contact method</li>
            <li>We'll provide personalized recommendations based on your needs</li>
          </ul>
        </div>
        
        ${lead.perkName ? `
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Your Interest</h3>
            <p>You expressed interest in: <strong>${lead.perkName}</strong></p>
            <p>We'll make sure to provide you with detailed information about this offering.</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/perks" 
             style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Browse More Perks
          </a>
        </div>
        
        <p>If you have any immediate questions, feel free to reply to this email or contact us directly.</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This email was sent because you submitted an inquiry on our website. 
          If you didn't make this request, you can safely ignore this email.
        </p>
      </div>
    `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Lead confirmation sent to ${lead.email}`);
    } catch (error) {
      console.error('Error sending lead confirmation:', error);
    }
  }

  // Send lead assignment notification
  async sendLeadAssignment(lead, assignee) {
    if (!this.isConfigured()) {
      return;
    }

    const mailOptions = {
      ...this.defaultOptions,
      to: assignee.email,
      subject: `Lead Assigned: ${lead.name} - ${lead.company?.name || 'Individual'}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>📋 Lead Assigned to You</h2>
        
        <p>Hello ${assignee.name},</p>
        <p>A new lead has been assigned to you for follow-up.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Lead Information</h3>
          <p><strong>Name:</strong> ${lead.name}</p>
          <p><strong>Email:</strong> ${lead.email}</p>
          ${lead.phone ? `<p><strong>Phone:</strong> ${lead.phone}</p>` : ''}
          ${lead.company?.name ? `<p><strong>Company:</strong> ${lead.company.name}</p>` : ''}
          <p><strong>Lead Score:</strong> ${lead.leadScore}/100</p>
          <p><strong>Priority:</strong> ${lead.priority}</p>
        </div>
        
        ${lead.message ? `
          <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Lead Message</h3>
            <p>${lead.message}</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.ADMIN_URL}/leads/${lead._id}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Lead Details
          </a>
        </div>
        
        <p>Please follow up with this lead as soon as possible.</p>
      </div>
    `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Lead assignment notification sent to ${assignee.email}`);
    } catch (error) {
      console.error('Error sending lead assignment notification:', error);
    }
  }

  // Send lead conversion notification
  async sendLeadConversion(lead) {
    if (!this.isConfigured()) {
      return;
    }

    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : ['admin@perksmarketplace.com'];

    const mailOptions = {
      ...this.defaultOptions,
      to: adminEmails,
      subject: `🎉 Lead Converted: ${lead.name} - ${lead.conversionValue ? `$${lead.conversionValue}` : 'Success!'}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🎉 Lead Conversion Success!</h2>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3>Conversion Details</h3>
          <p><strong>Lead:</strong> ${lead.name} (${lead.email})</p>
          ${lead.company?.name ? `<p><strong>Company:</strong> ${lead.company.name}</p>` : ''}
          ${lead.conversionValue ? `<p><strong>Value:</strong> $${lead.conversionValue}</p>` : ''}
          ${lead.conversionType ? `<p><strong>Type:</strong> ${lead.conversionType}</p>` : ''}
          <p><strong>Converted:</strong> ${new Date(lead.convertedAt).toLocaleString()}</p>
          ${lead.assignedTo ? `<p><strong>Handled by:</strong> ${lead.assignedTo.name}</p>` : ''}
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Lead Journey</h3>
          <p><strong>Source:</strong> ${lead.source}</p>
          <p><strong>Initial Score:</strong> ${lead.leadScore}/100</p>
          <p><strong>Days to Convert:</strong> ${Math.floor((new Date(lead.convertedAt) - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24))}</p>
          <p><strong>Contact Attempts:</strong> ${lead.contactAttempts}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.ADMIN_URL}/leads/${lead._id}" 
             style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Conversion Details
          </a>
        </div>
      </div>
    `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Lead conversion notification sent for lead ${lead._id}`);
    } catch (error) {
      console.error('Error sending lead conversion notification:', error);
    }
  }

  // Send follow-up reminder
  async sendFollowUpReminder(leads, assignee) {
    if (!this.isConfigured() || !leads.length) {
      return;
    }

    const mailOptions = {
      ...this.defaultOptions,
      to: assignee.email,
      subject: `⏰ Follow-up Reminder - ${leads.length} lead${leads.length > 1 ? 's' : ''} need${leads.length === 1 ? 's' : ''} attention`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>⏰ Follow-up Reminder</h2>
        
        <p>Hello ${assignee.name},</p>
        <p>You have ${leads.length} lead${leads.length > 1 ? 's' : ''} that need${leads.length === 1 ? 's' : ''} follow-up:</p>
        
        ${leads.map(lead => `
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ff9800;">
            <h4>${lead.name} - ${lead.company?.name || 'Individual'}</h4>
            <p><strong>Email:</strong> ${lead.email}</p>
            <p><strong>Score:</strong> ${lead.leadScore}/100</p>
            <p><strong>Days since last contact:</strong> ${Math.floor((Date.now() - new Date(lead.lastContactedAt || lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))}</p>
            ${lead.nextFollowUpAt ? `<p><strong>Scheduled for:</strong> ${new Date(lead.nextFollowUpAt).toLocaleDateString()}</p>` : ''}
          </div>
        `).join('')}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.ADMIN_URL}/leads?assignedTo=${assignee._id}&needsFollowUp=true" 
             style="background-color: #ff9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review All Follow-ups
          </a>
        </div>
      </div>
    `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Follow-up reminder sent to ${assignee.email} for ${leads.length} leads`);
    } catch (error) {
      console.error('Error sending follow-up reminder:', error);
    }
  }

}

module.exports = new EmailService();