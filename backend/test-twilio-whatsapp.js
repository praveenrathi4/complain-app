const twilioWhatsAppService = require('./services/twilioWhatsAppService');

// Test Twilio WhatsApp configuration
async function testTwilioWhatsApp() {
  console.log('🧪 Testing Twilio WhatsApp Configuration...\n');

  // Check if service is configured
  if (!twilioWhatsAppService.isConfigured()) {
    console.log('❌ Twilio credentials not configured!');
    console.log('Please set the following environment variables:');
    console.log('- TWILIO_ACCOUNT_SID');
    console.log('- TWILIO_AUTH_TOKEN');
    console.log('- TWILIO_WHATSAPP_NUMBER');
    console.log('\n📖 Follow the setup guide: TWILIO_SETUP.md');
    return;
  }

  console.log('✅ Twilio credentials found');
  console.log(`📱 WhatsApp Number: ${twilioWhatsAppService.whatsappNumber}`);
  console.log(`🔑 Account SID: ${twilioWhatsAppService.accountSid.substring(0, 20)}...`);
  console.log(`🔐 Auth Token: ${twilioWhatsAppService.authToken.substring(0, 20)}...\n`);

  // Test sending a message
  const testPhone = process.argv[2]; // Get phone number from command line
  if (!testPhone) {
    console.log('📞 To test sending a message, run:');
    console.log('node test-twilio-whatsapp.js +1234567890');
    console.log('(Replace with your actual phone number)');
    console.log('\n💡 Make sure to include country code (e.g., +1 for US)');
    return;
  }

  console.log(`📤 Sending test message to ${testPhone}...`);

  try {
    const result = await twilioWhatsAppService.sendVerificationMessage(
      testPhone,
      'Test User',
      '123456'
    );
    
    if (result) {
      console.log('✅ Test message sent successfully!');
      console.log(`📱 Message SID: ${result.sid}`);
      console.log('📱 Check your WhatsApp for the verification message');
      console.log('\n💡 If you don\'t receive the message:');
      console.log('1. Check your phone number format (+country code)');
      console.log('2. Ensure WhatsApp is installed on your phone');
      console.log('3. Check Twilio Console for message status');
    } else {
      console.log('❌ Failed to send test message');
    }
  } catch (error) {
    console.log('❌ Error sending test message:');
    console.log(error.message);
    
    if (error.code) {
      console.log(`🔍 Error Code: ${error.code}`);
    }
    
    if (error.moreInfo) {
      console.log(`📖 More Info: ${error.moreInfo}`);
    }
    
    console.log('\n🔧 Common solutions:');
    console.log('1. Check your Twilio credentials');
    console.log('2. Ensure WhatsApp is enabled in Twilio Console');
    console.log('3. Verify phone number format includes country code');
    console.log('4. Check Twilio account balance');
  }
}

// Run the test
testTwilioWhatsApp().catch(console.error); 