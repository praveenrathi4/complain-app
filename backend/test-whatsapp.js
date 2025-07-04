const whatsappService = require('./services/whatsappService');

// Test WhatsApp configuration
async function testWhatsApp() {
  console.log('🧪 Testing WhatsApp Business API Configuration...\n');

  // Check if credentials are configured
  if (!whatsappService.token || !whatsappService.phoneNumberId) {
    console.log('❌ WhatsApp credentials not configured!');
    console.log('Please set the following environment variables:');
    console.log('- WHATSAPP_TOKEN');
    console.log('- WHATSAPP_PHONE_NUMBER_ID');
    console.log('- WHATSAPP_VERIFY_TOKEN');
    return;
  }

  console.log('✅ WhatsApp credentials found');
  console.log(`📱 Phone Number ID: ${whatsappService.phoneNumberId}`);
  console.log(`🔑 Token: ${whatsappService.token.substring(0, 20)}...`);
  console.log(`🔐 Verify Token: ${whatsappService.verifyToken}\n`);

  // Test sending a message
  const testPhone = process.argv[2]; // Get phone number from command line
  if (!testPhone) {
    console.log('📞 To test sending a message, run:');
    console.log('node test-whatsapp.js +1234567890');
    console.log('(Replace with your actual phone number)');
    return;
  }

  console.log(`📤 Sending test message to ${testPhone}...`);

  try {
    const result = await whatsappService.sendVerificationMessage(
      testPhone,
      'Test User',
      '123456'
    );
    
    if (result) {
      console.log('✅ Test message sent successfully!');
      console.log('📱 Check your WhatsApp for the verification message');
    } else {
      console.log('❌ Failed to send test message');
    }
  } catch (error) {
    console.log('❌ Error sending test message:');
    console.log(error.message);
    
    if (error.response?.data) {
      console.log('API Error Details:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testWhatsApp().catch(console.error); 