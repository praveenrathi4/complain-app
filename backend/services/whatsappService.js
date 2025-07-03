const axios = require('axios');

// Import config (fallback if .env doesn't exist)
let config;
try {
  config = require('../config');
} catch (err) {
  config = {};
}

class WhatsAppService {
  constructor() {
    this.token = process.env.WHATSAPP_TOKEN || config.WHATSAPP_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || config.WHATSAPP_PHONE_NUMBER_ID;
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || config.WHATSAPP_VERIFY_TOKEN;
    this.baseUrl = 'https://graph.facebook.com/v18.0';
  }

  async sendMessage(to, message, messageType = 'text') {
    if (!this.token || !this.phoneNumberId) {
      console.warn('WhatsApp credentials not configured');
      return null;
    }

    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      
      let messageData;
      
      switch (messageType) {
        case 'text':
          messageData = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: {
              body: message
            }
          };
          break;
          
        case 'template':
          messageData = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'template',
            template: {
              name: message.templateName,
              language: {
                code: message.languageCode || 'en'
              },
              components: message.components || []
            }
          };
          break;
          
        default:
          throw new Error('Unsupported message type');
      }

      const response = await axios.post(url, messageData, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('WhatsApp message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error.response?.data || error.message);
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

  // Handle webhook verification
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log('WhatsApp webhook verified successfully');
      return challenge;
    } else {
      console.error('Failed to verify WhatsApp webhook');
      return null;
    }
  }

  // Process incoming messages
  processIncomingMessage(body) {
    try {
      if (!body.entry || !body.entry[0] || !body.entry[0].changes || !body.entry[0].changes[0]) {
        return null;
      }

      const change = body.entry[0].changes[0];
      
      if (change.field !== 'messages') {
        return null;
      }

      const value = change.value;
      
      if (!value.messages || value.messages.length === 0) {
        return null;
      }

      const message = value.messages[0];
      const contact = value.contacts ? value.contacts[0] : null;

      return {
        messageId: message.id,
        from: message.from,
        timestamp: message.timestamp,
        type: message.type,
        text: message.text ? message.text.body : null,
        contact: contact ? {
          name: contact.profile ? contact.profile.name : null,
          waId: contact.wa_id
        } : null
      };
    } catch (error) {
      console.error('Error processing incoming WhatsApp message:', error);
      return null;
    }
  }

  // Send auto-reply with complaint submission instructions
  async sendAutoReply(phone, name) {
    const message = `Hello ${name || 'there'}! 👋\n\nWelcome to our Complaint Management System!\n\nTo submit a complaint, please:\n1. Visit our website or app\n2. Register/Login to your account\n3. Fill out the complaint form\n\nOr reply with *HELP* for more assistance.\n\nThank you! 🙏`;
    
    return await this.sendMessage(phone, message);
  }

  // Send help message
  async sendHelpMessage(phone) {
    const message = `📞 *How can we help you?*\n\n🔹 Submit complaint: Use our app/website\n🔹 Check status: Login to your account\n🔹 Urgent issues: Reply with *URGENT*\n🔹 Speak to agent: Reply with *AGENT*\n\nFor immediate assistance, you can also email us or call our support line.\n\nThank you! 🙏`;
    
    return await this.sendMessage(phone, message);
  }

  // Mark message as read
  async markAsRead(messageId) {
    if (!this.token || !this.phoneNumberId) {
      return null;
    }

    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      
      const data = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      };

      const response = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to mark WhatsApp message as read:', error.response?.data || error.message);
      return null;
    }
  }
}

module.exports = new WhatsAppService(); 