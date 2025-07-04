// Copy this file to config.js and update with your actual values
module.exports = {
  // Database
  MONGODB_URI: 'mongodb://localhost:27017/complaint_app',

  // JWT
  JWT_SECRET: 'your_super_secret_jwt_key_here',
  JWT_EXPIRE: '7d',

  // Email Configuration (using Gmail as example)
  EMAIL_HOST: 'smtp.gmail.com',
  EMAIL_PORT: 587,
  EMAIL_USER: 'your_email@gmail.com',
  EMAIL_PASS: 'your_app_password',

  // WhatsApp Business API Configuration
  // 1. Go to https://developers.facebook.com/
  // 2. Create app and add WhatsApp product
  // 3. Get credentials from WhatsApp > Getting Started
  WHATSAPP_TOKEN: 'your_whatsapp_business_api_token', // Permanent Access Token from Meta
  WHATSAPP_VERIFY_TOKEN: 'your_custom_verify_token', // Any string you choose for webhook verification
  WHATSAPP_PHONE_NUMBER_ID: 'your_phone_number_id', // Phone Number ID from WhatsApp API Setup

  // Server Configuration
  PORT: 5000,
  NODE_ENV: 'development',

  // File Upload
  MAX_FILE_SIZE: 5000000,

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 900000,
  RATE_LIMIT_MAX_REQUESTS: 100
}; 