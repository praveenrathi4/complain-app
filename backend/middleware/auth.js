const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Import config (fallback if .env doesn't exist)
let config;
try {
  config = require('../config');
} catch (err) {
  config = {};
}

// Protect routes
const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
  
  try {
    const jwtSecret = process.env.JWT_SECRET || config.JWT_SECRET;
    const decoded = jwt.verify(token, jwtSecret);
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No user found with this token'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user owns resource or is admin
const ownerOrAdmin = (req, res, next) => {
  if (req.user.role === 'admin' || req.user._id.toString() === req.params.userId) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this resource'
    });
  }
};

// Generate JWT token
const generateToken = (id) => {
  const jwtSecret = process.env.JWT_SECRET || config.JWT_SECRET;
  const jwtExpire = process.env.JWT_EXPIRE || config.JWT_EXPIRE || '7d';
  
  return jwt.sign({ id }, jwtSecret, {
    expiresIn: jwtExpire
  });
};

module.exports = {
  protect,
  authorize,
  ownerOrAdmin,
  generateToken
}; 