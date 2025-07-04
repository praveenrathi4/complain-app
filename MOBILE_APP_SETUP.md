# Mobile App Setup Guide

## 🚀 React Native + Expo Mobile App

This guide will help you set up the Android and iOS mobile apps for your complaint management system.

## Prerequisites

### 1. **Install Node.js**
- Download from: https://nodejs.org/
- Install LTS version (18.x or higher)
- Verify installation: `node --version` and `npm --version`

### 2. **Install Expo CLI**
```bash
npm install -g @expo/cli
```

### 3. **Install Development Tools**

#### For Android:
- **Android Studio**: https://developer.android.com/studio
- **Android SDK**: Install via Android Studio
- **Java Development Kit (JDK)**: Version 11 or higher

#### For iOS (Mac only):
- **Xcode**: Download from Mac App Store
- **iOS Simulator**: Comes with Xcode

## Step 1: Install Dependencies

Navigate to the mobile directory and install dependencies:

```bash
cd mobile
npm install
```

## Step 2: Configure Environment

Create a `.env` file in the mobile directory:

```env
API_URL=https://complain-app-backend.onrender.com/api
EXPO_PUBLIC_API_URL=https://complain-app-backend.onrender.com/api
```

## Step 3: Update App Configuration

### Update `app.json`:
1. Change `bundleIdentifier` for iOS
2. Change `package` for Android
3. Update `projectId` in EAS section

### For iOS:
```json
"bundleIdentifier": "com.yourcompany.complaintmanagement"
```

### For Android:
```json
"package": "com.yourcompany.complaintmanagement"
```

## Step 4: Development

### Start Development Server:
```bash
npm start
```

### Run on Device/Simulator:
```bash
# Android
npm run android

# iOS
npm run ios

# Web (for testing)
npm run web
```

## Step 5: Testing

### Test on Physical Device:
1. Install **Expo Go** app on your phone
2. Scan QR code from development server
3. App will load on your device

### Test on Simulator:
1. **Android**: Open Android Studio → AVD Manager
2. **iOS**: Open Xcode → Simulator

## Step 6: Building for Production

### Install EAS CLI:
```bash
npm install -g @expo/eas-cli
```

### Login to Expo:
```bash
eas login
```

### Configure EAS:
```bash
eas build:configure
```

### Build Apps:

#### Android APK:
```bash
eas build --platform android --profile preview
```

#### Android App Bundle (for Play Store):
```bash
eas build --platform android --profile production
```

#### iOS (requires Apple Developer account):
```bash
eas build --platform ios --profile production
```

## Step 7: Publishing

### Android (Google Play Store):
1. **Create Google Play Console account**
2. **Upload APK/AAB** from EAS build
3. **Fill app details** and screenshots
4. **Submit for review**

### iOS (App Store):
1. **Create Apple Developer account** ($99/year)
2. **Upload IPA** from EAS build
3. **Fill app details** in App Store Connect
4. **Submit for review**

## App Features

### ✅ **Authentication**
- Login/Register with email verification
- Phone verification via WhatsApp
- Secure token storage

### ✅ **Complaint Management**
- Create new complaints
- Upload photos and location
- Track complaint status
- View complaint history

### ✅ **Push Notifications**
- Complaint status updates
- New complaint confirmations
- WhatsApp message notifications

### ✅ **Offline Support**
- Cache complaint data
- Queue actions when offline
- Sync when back online

## File Structure

```
mobile/
├── src/
│   ├── screens/           # App screens
│   ├── components/        # Reusable components
│   ├── context/          # React Context
│   ├── services/         # API services
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── assets/               # Images, fonts, etc.
├── App.tsx              # Main app component
├── app.json             # Expo configuration
└── package.json         # Dependencies
```

## Development Tips

### 1. **Hot Reload**
- Changes reflect immediately
- No need to rebuild app

### 2. **Debugging**
- Use React Native Debugger
- Console logs in Expo DevTools
- Network requests in browser

### 3. **Testing**
- Test on multiple devices
- Test different screen sizes
- Test offline functionality

## Common Issues

### 1. **Metro bundler issues**
```bash
npm start --reset-cache
```

### 2. **Build failures**
- Check all dependencies installed
- Verify environment variables
- Check Expo account login

### 3. **Permission issues**
- Check app.json permissions
- Test on physical device
- Verify camera/location access

## Publishing Checklist

### Before Publishing:

✅ **App Icon** - 1024x1024 PNG  
✅ **Splash Screen** - App loading screen  
✅ **Screenshots** - Multiple device sizes  
✅ **App Description** - Clear and compelling  
✅ **Privacy Policy** - Required for both stores  
✅ **Terms of Service** - Legal requirements  
✅ **App Store Categories** - Choose relevant ones  
✅ **Keywords** - For app store search  
✅ **Testing** - Test on multiple devices  

### Store Requirements:

#### Google Play Store:
- **Content Rating** - Complete questionnaire
- **App Bundle** - Use AAB format
- **Target API** - API level 30+
- **64-bit Support** - Required for new apps

#### Apple App Store:
- **App Review** - 1-7 days
- **Screenshots** - iPhone and iPad sizes
- **App Store Connect** - Complete all sections
- **TestFlight** - Beta testing available

## Cost Breakdown

### Development (One-time):
- **Apple Developer Account**: $99/year
- **Google Play Console**: $25 (one-time)
- **EAS Build Credits**: ~$10-50/month

### Ongoing:
- **App Store Fees**: 15-30% of revenue
- **Backend Hosting**: ~$20-50/month
- **WhatsApp API**: ~$0.005 per message

## Next Steps

1. **Complete screen implementations**
2. **Add image upload functionality**
3. **Implement push notifications**
4. **Add offline support**
5. **Test thoroughly**
6. **Submit to app stores**

## Support Resources

- **Expo Documentation**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **App Store Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Play Console**: https://support.google.com/googleplay/android-developer

The mobile app will provide the same functionality as your web app but with native performance and better user experience! 