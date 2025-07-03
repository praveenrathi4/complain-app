const express = require('express');
const whatsappService = require('../services/whatsappService');
const User = require('../models/User');

const router = express.Router();

// Webhook verification (GET)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verificationResult = whatsappService.verifyWebhook(mode, token, challenge);

  if (verificationResult) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Webhook event handler (POST)
router.post('/webhook', async (req, res) => {
  try {
    const incomingMessage = whatsappService.processIncomingMessage(req.body);

    if (incomingMessage) {
      console.log('Received WhatsApp message:', incomingMessage);

      // Mark message as read
      await whatsappService.markAsRead(incomingMessage.messageId);

      // Process the message
      await processIncomingMessage(incomingMessage);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Process incoming WhatsApp messages
async function processIncomingMessage(message) {
  try {
    const { from, text, contact } = message;

    // Find user by phone number
    const user = await User.findOne({ 
      $or: [
        { phone: from },
        { whatsappNumber: from }
      ]
    });

    const userName = contact?.name || user?.name || 'there';

    if (!text) {
      return; // Skip non-text messages for now
    }

    const messageText = text.toLowerCase().trim();

    // Handle different message types
    switch (messageText) {
      case 'help':
      case 'menu':
        await whatsappService.sendHelpMessage(from);
        break;

      case 'urgent':
        await whatsappService.sendMessage(
          from,
          `Hello ${userName}! 🚨\n\nFor urgent issues, please:\n1. Call our emergency hotline\n2. Use our app to submit an urgent complaint\n3. Or email us with "URGENT" in the subject\n\nWe'll prioritize your request immediately!`
        );
        break;

      case 'agent':
      case 'human':
        await whatsappService.sendMessage(
          from,
          `Hello ${userName}! 👨‍💼\n\nConnecting you with a human agent...\n\nPlease note:\n• Our agents are available 9 AM - 6 PM\n• For immediate assistance, use our app\n• You can also email us directly\n\nThank you for your patience!`
        );
        break;

      case 'status':
        if (user) {
          await whatsappService.sendMessage(
            from,
            `Hello ${userName}! 📊\n\nTo check your complaint status:\n1. Open our app/website\n2. Login to your account\n3. Go to "My Complaints"\n\nOr provide your complaint ID here and I'll help you check!`
          );
        } else {
          await whatsappService.sendMessage(
            from,
            `Hello! 📊\n\nTo check complaint status, please:\n1. Register on our app/website\n2. Login to your account\n3. View "My Complaints"\n\nNeed help getting started? Just ask!`
          );
        }
        break;

      default:
        // Check if message contains complaint ID pattern
        const complaintIdPattern = /CMP-\d{6}-\d{4}/i;
        const complaintIdMatch = messageText.match(complaintIdPattern);

        if (complaintIdMatch) {
          const complaintId = complaintIdMatch[0].toUpperCase();
          // Here you would lookup the complaint and provide status
          await whatsappService.sendMessage(
            from,
            `Checking status for complaint ${complaintId}...\n\nFor detailed information, please login to our app/website.\n\nNeed immediate assistance? Reply with *URGENT*`
          );
        } else {
          // Default auto-reply
          await whatsappService.sendAutoReply(from, userName);
        }
        break;
    }
  } catch (error) {
    console.error('Error processing incoming message:', error);
  }
}

// Send test message (for testing purposes - remove in production)
router.post('/send-test', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone and message are required'
      });
    }

    const result = await whatsappService.sendMessage(phone, message);

    res.status(200).json({
      success: true,
      message: 'Test message sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send test message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test message'
    });
  }
});

// Get WhatsApp configuration status
router.get('/config', (req, res) => {
  const isConfigured = !!(
    whatsappService.token &&
    whatsappService.phoneNumberId &&
    whatsappService.verifyToken
  );

  res.status(200).json({
    success: true,
    data: {
      isConfigured,
      phoneNumberId: whatsappService.phoneNumberId ? 
        whatsappService.phoneNumberId.substring(0, 10) + '...' : 
        'Not configured'
    }
  });
});

module.exports = router; 