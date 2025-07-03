const nodemailer = require('nodemailer');

// Import config (fallback if .env doesn't exist)
let config;
try {
  config = require('../config');
} catch (err) {
  config = {};
}

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || config.EMAIL_HOST,
      port: process.env.EMAIL_PORT || config.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || config.EMAIL_USER,
        pass: process.env.EMAIL_PASS || config.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendEmail(to, subject, html, text) {
    try {
      const mailOptions = {
        from: `"Complaint Management System" <${process.env.EMAIL_USER || config.EMAIL_USER}>`,
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendVerificationEmail(email, name, verificationToken) {
    const subject = 'Verify Your Email Address';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; }
            .verification-code { 
              font-size: 32px; 
              font-weight: bold; 
              color: #007bff; 
              text-align: center; 
              padding: 20px;
              background-color: white;
              border: 2px dashed #007bff;
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Email Verification</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Thank you for registering with our Complaint Management System. Please verify your email address by entering the following verification code:</p>
              
              <div class="verification-code">
                ${verificationToken}
              </div>
              
              <p>This code will expire in 10 minutes for security reasons.</p>
              <p>If you didn't create an account with us, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2024 Complaint Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const text = `Hello ${name}! Your verification code is: ${verificationToken}. This code will expire in 10 minutes.`;
    
    return await this.sendEmail(email, subject, html, text);
  }

  async sendPasswordResetEmail(email, name, resetToken) {
    const subject = 'Password Reset Request';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; }
            .reset-code { 
              font-size: 32px; 
              font-weight: bold; 
              color: #dc3545; 
              text-align: center; 
              padding: 20px;
              background-color: white;
              border: 2px dashed #dc3545;
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>We received a request to reset your password. Please use the following code to reset your password:</p>
              
              <div class="reset-code">
                ${resetToken}
              </div>
              
              <p>This code will expire in 10 minutes for security reasons.</p>
              <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>© 2024 Complaint Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const text = `Hello ${name}! Your password reset code is: ${resetToken}. This code will expire in 10 minutes.`;
    
    return await this.sendEmail(email, subject, html, text);
  }

  async sendComplaintNotification(email, name, complaint, isNewComplaint = true) {
    const subject = isNewComplaint ? 
      `New Complaint Submitted - ${complaint.complaintId}` : 
      `Complaint Update - ${complaint.complaintId}`;
      
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Complaint ${isNewComplaint ? 'Submitted' : 'Updated'}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; }
            .complaint-details { 
              background-color: white; 
              padding: 15px; 
              border-left: 4px solid #28a745; 
              margin: 15px 0; 
            }
            .status-badge { 
              display: inline-block; 
              padding: 5px 10px; 
              border-radius: 15px; 
              color: white; 
              font-size: 12px; 
              text-transform: uppercase; 
            }
            .status-pending { background-color: #ffc107; }
            .status-in_progress { background-color: #007bff; }
            .status-resolved { background-color: #28a745; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Complaint ${isNewComplaint ? 'Submitted' : 'Updated'}</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>${isNewComplaint ? 
                'Your complaint has been successfully submitted and received.' : 
                'There has been an update to your complaint.'}</p>
              
              <div class="complaint-details">
                <h3>Complaint Details</h3>
                <p><strong>Complaint ID:</strong> ${complaint.complaintId}</p>
                <p><strong>Title:</strong> ${complaint.title}</p>
                <p><strong>Category:</strong> ${complaint.category.replace(/_/g, ' ').toUpperCase()}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${complaint.status}">${complaint.status.replace(/_/g, ' ')}</span></p>
                <p><strong>Priority:</strong> ${complaint.priority.toUpperCase()}</p>
                <p><strong>Submitted:</strong> ${new Date(complaint.createdAt).toLocaleDateString()}</p>
              </div>
              
              <p>We'll keep you updated on the progress of your complaint. You can track your complaint status anytime using your complaint ID.</p>
            </div>
            <div class="footer">
              <p>© 2024 Complaint Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const text = `Hello ${name}! Your complaint ${complaint.complaintId} has been ${isNewComplaint ? 'submitted' : 'updated'}. Current status: ${complaint.status}`;
    
    return await this.sendEmail(email, subject, html, text);
  }
}

module.exports = new EmailService(); 