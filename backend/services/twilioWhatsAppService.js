const twilio = require('twilio');

// Import config (fallback if .env doesn't exist)
let config;
try {
  config = require('../config');
} catch (err) {
  config = {};
}

class TwilioWhatsAppService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || config.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN || config.TWILIO_AUTH_TOKEN;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || config.TWILIO_WHATSAPP_NUMBER;
    
    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
    }
  }

  async sendMessage(to, message) {
    if (!this.client || !this.whatsappNumber) {
      console.warn('Twilio credentials not configured');
      return null;
    }

    try {
      // Format phone number for WhatsApp
      const formattedNumber = this.formatPhoneNumber(to);
      
      const response = await this.client.messages.create({
        body: message,
        from: `whatsapp:${this.whatsappNumber}`,
        to: `whatsapp:${formattedNumber}`
      });

      console.log('Twilio WhatsApp message sent successfully:', response.sid);
      return response;
    } catch (error) {
      console.error('Failed to send Twilio WhatsApp message:', error.message);
      throw error;
    }
  }

  async sendVerificationMessage(phone, name, verificationCode) {
    const message = `Hello ${name}! 👋\n\nYour verification code for Complaint Management System is:\n\n*${verificationCode}*\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this message.`;
    
    return await this.sendMessage(phone, message);
  }

  async sendComplaintConfirmation(phone, name, complaint) {
    const message = `Hello ${name}! ✅\n\nYour complaint has been successfully submitted.\n\n📋 *Complaint Details:*\n• ID: ${complaint.complaintId}\n• Title: ${complaint.title}\n• Category: ${complaint.category.replace(/_/g, ' ')}\n• Status: ${complaint.status}\n• Priority: ${complaint.priority}\n\nWe'll keep you updated on the progress. Thank you for contacting us!`;
    
    return await this.sendMessage(phone, message);
  }

  async sendComplaintUpdate(phone, name, complaint, updateMessage) {
    const message = `Hello ${name}! 🔄\n\n*Update on your complaint:*\n\n📋 Complaint ID: ${complaint.complaintId}\n📝 Status: ${complaint.status}\n\n💬 *Update:*\n${updateMessage}\n\nThank you for your patience!`;
    
    return await this.sendMessage(phone, message);
  }

  async sendComplaintResolved(phone, name, complaint) {
    const message = `Hello ${name}! ✅\n\n*Great news!* Your complaint has been resolved.\n\n📋 Complaint ID: ${complaint.complaintId}\n📝 Title: ${complaint.title}\n⏰ Resolved on: ${new Date(complaint.actualResolutionDate).toLocaleDateString()}\n\nWe hope we've addressed your concerns satisfactorily. Thank you for choosing us!`;
    
    return await this.sendMessage(phone, message);
  }

  // Format phone number for WhatsApp
  formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present (assuming +1 for US/Canada)
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }
    
    // Add + prefix
    return '+' + cleaned;
  }

  // Check if service is configured
  isConfigured() {
    return !!(this.accountSid && this.authToken && this.whatsappNumber);
  }
}

module.exports = new TwilioWhatsAppService(); 