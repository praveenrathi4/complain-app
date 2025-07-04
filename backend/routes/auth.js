const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, generateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const whatsappService = require('../services/whatsappService');
const crypto = require('crypto');

const router = express.Router();

// Temporary storage for pending registrations
const pendingRegistrations = new Map();

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, businessName, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Check if email is already pending verification
    if (pendingRegistrations.has(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email verification already pending. Please check your email.'
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(3).toString('hex').toUpperCase();

    // Store registration data temporarily
    const registrationData = {
      name,
      email,
      phone,
      password,
      role: role || 'customer',
      businessName,
      address,
      verificationToken,
      createdAt: new Date()
    };

    // Store with email as key (will be cleaned up after verification or timeout)
    pendingRegistrations.set(email, registrationData);

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, name, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      pendingRegistrations.delete(email);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    // Clean up pending registrations older than 10 minutes
    setTimeout(() => {
      pendingRegistrations.delete(email);
    }, 10 * 60 * 1000);

    res.status(200).json({
      success: true,
      message: 'Please check your email for verification code to complete registration.',
      needsVerification: true,
      email: email
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          businessName: user.businessName
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { email, verificationToken } = req.body;

    // Find pending registration
    const registrationData = pendingRegistrations.get(email);
    if (!registrationData) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found for this email'
      });
    }

    // Check if verification token matches
    if (registrationData.verificationToken !== verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Check if registration is not expired (10 minutes)
    const now = new Date();
    const registrationTime = new Date(registrationData.createdAt);
    if (now - registrationTime > 10 * 60 * 1000) {
      pendingRegistrations.delete(email);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please register again.'
      });
    }

    // Create user in database
    const user = await User.create({
      name: registrationData.name,
      email: registrationData.email,
      phone: registrationData.phone,
      password: registrationData.password,
      role: registrationData.role,
      businessName: registrationData.businessName,
      address: registrationData.address,
      isEmailVerified: true // Mark as verified since we verified before creation
    });

    // Remove from pending registrations
    pendingRegistrations.delete(email);

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully. Registration completed!',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified
        }
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed'
    });
  }
});

// Resend verification email
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(email, user.name, verificationToken);

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending verification email'
    });
  }
});

// Forgot password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send password reset email
    await emailService.sendPasswordResetEmail(email, user.name, resetToken);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending password reset email'
    });
  }
});

// Reset password
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('resetToken').isLength({ min: 6, max: 6 }).withMessage('Reset token must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, resetToken, newPassword } = req.body;

    const user = await User.findOne({
      email,
      passwordResetToken: resetToken,
      passwordResetExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
});

// Get current user profile
router.get('/profile', protect, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// Update user profile
router.put('/profile', protect, [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('phone').optional().isMobilePhone().withMessage('Please enter a valid phone number'),
  body('businessName').optional().trim().isLength({ max: 100 }).withMessage('Business name cannot exceed 100 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, phone, businessName, address, whatsappNumber } = req.body;

    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (businessName) user.businessName = businessName;
    if (address) user.address = address;
    if (whatsappNumber) user.whatsappNumber = whatsappNumber;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// Change password
router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    });
  }
});

module.exports = router; 