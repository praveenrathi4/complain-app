# WhatsApp Business API Setup Guide

## Prerequisites
- Facebook account
- Business phone number (can be your personal number for testing)
- Domain with HTTPS (for webhooks)

## Step 1: Create Meta Developer Account

1. **Visit Meta for Developers**: https://developers.facebook.com/
2. **Sign in** with your Facebook account
3. **Click "Create App"** or use existing app
4. **Choose "Business"** as app type
5. **Fill in app details**:
   - App Name: "Complaint Management System"
   - App Contact Email: Your email
   - Business Account: Your business account

## Step 2: Add WhatsApp Product

1. **In your app dashboard**:
   - Go to "Products" section
   - Find "WhatsApp" and click "Set up"

2. **Configure WhatsApp Business Account**:
   - Click "Add phone number"
   - Enter your business phone number
   - Choose "Business" as number type
   - Verify your phone number via SMS/call

## Step 3: Get API Credentials

### Get Access Token
1. Go to **WhatsApp** → **Getting Started**
2. Copy your **Permanent Access Token**
3. This token never expires, keep it secure

### Get Phone Number ID
1. Go to **WhatsApp** → **API Setup**
2. Copy your **Phone Number ID** (looks like: 123456789012345)

### Create Verify Token
1. Create any custom string (e.g., "my_whatsapp_verify_token_2024")
2. Remember this for webhook configuration

## Step 4: Configure Environment Variables

Add these to your backend environment variables (Render dashboard):

```env
WHATSAPP_TOKEN=your_permanent_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token_here
```

## Step 5: Test WhatsApp Integration

### Test Message Format
Your verification messages will look like:
```
Hello John! 👋

Your verification code for Complaint Management System is:

*123456*

This code will expire in 10 minutes.

If you didn't request this code, please ignore this message.
```

## Step 6: Webhook Setup (Optional)

For receiving messages, set up webhook:

1. **In WhatsApp dashboard**:
   - Go to **Configuration** → **Webhook**
   - Set Webhook URL: `https://your-backend-url.com/api/whatsapp/webhook`
   - Set Verify Token: Your custom verify token
   - Subscribe to messages

2. **Webhook events to subscribe**:
   - `messages`
   - `message_deliveries`
   - `message_reads`

## Troubleshooting

### Common Issues:

1. **"Invalid phone number"**
   - Ensure phone number includes country code (e.g., +1234567890)
   - Remove spaces and special characters

2. **"Authentication failed"**
   - Check your access token is correct
   - Ensure token has proper permissions

3. **"Phone number not found"**
   - Verify phone number is registered with WhatsApp
   - Check number format includes country code

### Testing Tips:

1. **Use your own number** for testing
2. **Test with different country codes**
3. **Check message delivery** in WhatsApp dashboard
4. **Monitor API calls** in Meta developer dashboard

## Security Best Practices

1. **Never commit tokens** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate tokens** if compromised
4. **Monitor API usage** regularly
5. **Set up alerts** for unusual activity

## Cost Considerations

- **WhatsApp Business API** has usage-based pricing
- **Free tier**: 1,000 conversations/month
- **Additional costs**: Based on message volume
- **Monitor usage** in Meta developer dashboard

## Support Resources

- **Meta Developer Documentation**: https://developers.facebook.com/docs/whatsapp
- **WhatsApp Business API Guide**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **Community Support**: Meta Developer Community forums

## Next Steps

After setup:
1. Test phone verification in your app
2. Monitor message delivery
3. Set up webhooks for advanced features
4. Configure message templates for better deliverability 