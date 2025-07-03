const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true
  },
  title: {
    type: String,
    required: [true, 'Complaint title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Complaint description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'product_quality',
      'service_issue',
      'delivery_problem',
      'billing_issue',
      'technical_support',
      'customer_service',
      'warranty_claim',
      'other'
    ]
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'closed', 'escalated'],
    default: 'pending'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    isInternal: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  timeline: [{
    action: {
      type: String,
      required: true
    },
    description: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  estimatedResolutionDate: Date,
  actualResolutionDate: Date,
  satisfactionRating: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    ratedAt: Date
  },
  communication: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    whatsappNotifications: {
      type: Boolean,
      default: false
    },
    smsNotifications: {
      type: Boolean,
      default: false
    }
  },
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'whatsapp', 'email', 'phone'],
      default: 'web'
    },
    ipAddress: String,
    userAgent: String,
    deviceInfo: String
  }
}, {
  timestamps: true
});

// Index for better query performance
complaintSchema.index({ complaintId: 1 });
complaintSchema.index({ customer: 1 });
complaintSchema.index({ assignedTo: 1 });
complaintSchema.index({ dealer: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ priority: 1 });
complaintSchema.index({ createdAt: -1 });

// Generate complaint ID before saving
complaintSchema.pre('save', async function(next) {
  if (!this.complaintId) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, new Date().getMonth(), 1),
        $lt: new Date(year, new Date().getMonth() + 1, 1)
      }
    });
    
    this.complaintId = `CMP-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Add timeline entry
complaintSchema.methods.addTimelineEntry = function(action, description, performedBy) {
  this.timeline.push({
    action,
    description,
    performedBy,
    timestamp: new Date()
  });
};

// Add comment
complaintSchema.methods.addComment = function(author, message, isInternal = false) {
  this.comments.push({
    author,
    message,
    isInternal,
    createdAt: new Date()
  });
};

// Update status with timeline
complaintSchema.methods.updateStatus = function(newStatus, performedBy, description) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  this.addTimelineEntry(
    'status_change',
    description || `Status changed from ${oldStatus} to ${newStatus}`,
    performedBy
  );
  
  if (newStatus === 'resolved') {
    this.actualResolutionDate = new Date();
  }
};

module.exports = mongoose.model('Complaint', complaintSchema); 