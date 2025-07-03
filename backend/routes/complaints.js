const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const emailService = require('../services/emailService');
const whatsappService = require('../services/whatsappService');

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF, and TXT files are allowed.'));
    }
  }
});

// Create new complaint
router.post('/', protect, upload.array('attachments', 5), [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('category').isIn([
    'product_quality', 'service_issue', 'delivery_problem', 'billing_issue',
    'technical_support', 'customer_service', 'warranty_claim', 'other'
  ]).withMessage('Invalid category'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
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

    const { title, description, category, priority, location, tags } = req.body;

    // Process attachments if any
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // In production, you'd upload to cloud storage (AWS S3, Cloudinary, etc.)
        // For now, we'll just store the file info
        attachments.push({
          filename: `${Date.now()}_${file.originalname}`,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          url: `/uploads/${Date.now()}_${file.originalname}` // This would be the actual URL after upload
        });
      }
    }

    // Create complaint
    const complaint = await Complaint.create({
      title,
      description,
      category,
      priority: priority || 'medium',
      customer: req.user._id,
      location: location ? JSON.parse(location) : undefined,
      tags: tags ? JSON.parse(tags) : [],
      attachments,
      metadata: {
        source: 'web',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Add initial timeline entry
    complaint.addTimelineEntry('created', 'Complaint submitted by customer', req.user._id);
    await complaint.save();

    // Populate customer details
    await complaint.populate('customer', 'name email phone');

    // Send email notification
    if (complaint.customer.email && complaint.communication.emailNotifications) {
      try {
        await emailService.sendComplaintNotification(
          complaint.customer.email,
          complaint.customer.name,
          complaint,
          true
        );
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
    }

    // Send WhatsApp notification
    if (complaint.customer.phone && complaint.communication.whatsappNotifications) {
      try {
        await whatsappService.sendComplaintConfirmation(
          complaint.customer.phone,
          complaint.customer.name,
          complaint
        );
      } catch (whatsappError) {
        console.error('Failed to send WhatsApp notification:', whatsappError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: {
        complaint
      }
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating complaint'
    });
  }
});

// Get all complaints (with filtering and pagination)
router.get('/', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    // Role-based filtering
    if (req.user.role === 'customer') {
      query.customer = req.user._id;
    } else if (req.user.role === 'dealer') {
      query.$or = [
        { dealer: req.user._id },
        { assignedTo: req.user._id }
      ];
    }

    // Apply filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { complaintId: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const complaints = await Complaint.find(query)
      .populate('customer', 'name email phone businessName')
      .populate('assignedTo', 'name email')
      .populate('dealer', 'name email businessName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Complaint.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        complaints,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching complaints'
    });
  }
});

// Get single complaint by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('customer', 'name email phone businessName address')
      .populate('assignedTo', 'name email phone')
      .populate('dealer', 'name email businessName')
      .populate('comments.author', 'name role')
      .populate('timeline.performedBy', 'name role');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check permissions
    const canView = req.user.role === 'admin' ||
      complaint.customer._id.toString() === req.user._id.toString() ||
      (complaint.assignedTo && complaint.assignedTo._id.toString() === req.user._id.toString()) ||
      (complaint.dealer && complaint.dealer._id.toString() === req.user._id.toString());

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this complaint'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        complaint
      }
    });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching complaint'
    });
  }
});

// Update complaint status
router.put('/:id/status', protect, authorize('admin', 'dealer'), [
  body('status').isIn(['pending', 'in_progress', 'resolved', 'closed', 'escalated']).withMessage('Invalid status'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters')
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

    const { status, comment } = req.body;

    const complaint = await Complaint.findById(req.params.id)
      .populate('customer', 'name email phone');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Update status
    const oldStatus = complaint.status;
    complaint.updateStatus(status, req.user._id, comment);

    // Add comment if provided
    if (comment) {
      complaint.addComment(req.user._id, comment, false);
    }

    await complaint.save();

    // Send notifications
    if (complaint.customer.email && complaint.communication.emailNotifications) {
      try {
        await emailService.sendComplaintNotification(
          complaint.customer.email,
          complaint.customer.name,
          complaint,
          false
        );
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
    }

    if (complaint.customer.phone && complaint.communication.whatsappNotifications) {
      try {
        const updateMessage = comment || `Status changed from ${oldStatus} to ${status}`;
        await whatsappService.sendComplaintUpdate(
          complaint.customer.phone,
          complaint.customer.name,
          complaint,
          updateMessage
        );
      } catch (whatsappError) {
        console.error('Failed to send WhatsApp notification:', whatsappError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Complaint status updated successfully',
      data: {
        complaint
      }
    });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating complaint status'
    });
  }
});

// Add comment to complaint
router.post('/:id/comments', protect, [
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters'),
  body('isInternal').optional().isBoolean().withMessage('isInternal must be a boolean')
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

    const { message, isInternal = false } = req.body;

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check permissions
    const canComment = req.user.role === 'admin' ||
      complaint.customer.toString() === req.user._id.toString() ||
      (complaint.assignedTo && complaint.assignedTo.toString() === req.user._id.toString()) ||
      (complaint.dealer && complaint.dealer.toString() === req.user._id.toString());

    if (!canComment) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to comment on this complaint'
      });
    }

    // Only staff can add internal comments
    if (isInternal && req.user.role === 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Customers cannot add internal comments'
      });
    }

    complaint.addComment(req.user._id, message, isInternal);
    complaint.addTimelineEntry('comment_added', 'Comment added to complaint', req.user._id);
    await complaint.save();

    await complaint.populate('comments.author', 'name role');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        comment: complaint.comments[complaint.comments.length - 1]
      }
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding comment'
    });
  }
});

// Rate complaint (customer satisfaction)
router.post('/:id/rating', protect, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().trim().isLength({ max: 500 }).withMessage('Feedback cannot exceed 500 characters')
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

    const { rating, feedback } = req.body;

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Only the customer can rate their complaint
    if (complaint.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the customer can rate this complaint'
      });
    }

    // Can only rate resolved or closed complaints
    if (!['resolved', 'closed'].includes(complaint.status)) {
      return res.status(400).json({
        success: false,
        message: 'Can only rate resolved or closed complaints'
      });
    }

    complaint.satisfactionRating = {
      rating,
      feedback,
      ratedAt: new Date()
    };

    complaint.addTimelineEntry('rated', `Customer rated complaint ${rating}/5 stars`, req.user._id);
    await complaint.save();

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      data: {
        rating: complaint.satisfactionRating
      }
    });
  } catch (error) {
    console.error('Rate complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rating complaint'
    });
  }
});

// Assign complaint to dealer/agent
router.put('/:id/assign', protect, authorize('admin'), [
  body('assignedTo').isMongoId().withMessage('Invalid user ID')
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

    const { assignedTo } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    const assignee = await User.findById(assignedTo);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    if (!assignee) {
      return res.status(404).json({
        success: false,
        message: 'Assignee not found'
      });
    }

    if (!['dealer', 'admin'].includes(assignee.role)) {
      return res.status(400).json({
        success: false,
        message: 'Can only assign to dealers or admins'
      });
    }

    complaint.assignedTo = assignedTo;
    if (assignee.role === 'dealer') {
      complaint.dealer = assignedTo;
    }

    complaint.addTimelineEntry('assigned', `Complaint assigned to ${assignee.name}`, req.user._id);
    await complaint.save();

    res.status(200).json({
      success: true,
      message: 'Complaint assigned successfully',
      data: {
        complaint
      }
    });
  } catch (error) {
    console.error('Assign complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning complaint'
    });
  }
});

// Get complaint statistics (for dashboard)
router.get('/stats/dashboard', protect, authorize('admin', 'dealer'), async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    // Calculate date range
    let dateRange = {};
    const now = new Date();
    
    switch (timeframe) {
      case '7d':
        dateRange = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateRange = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateRange = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
        break;
      default:
        dateRange = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }

    const stats = await Complaint.aggregate([
      {
        $match: {
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
          escalated: { $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] } },
          avgRating: { $avg: '$satisfactionRating.rating' }
        }
      }
    ]);

    const categoryStats = await Complaint.aggregate([
      {
        $match: {
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          total: 0,
          pending: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0,
          escalated: 0,
          avgRating: 0
        },
        categoryStats
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
});

module.exports = router; 