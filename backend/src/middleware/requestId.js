const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to add unique request ID to each request
 * Uses X-Request-ID header if provided, otherwise generates new UUID
 */
const requestIdMiddleware = (req, res, next) => {
  // Use existing request ID from header or generate new one
  const requestId = req.get('X-Request-ID') || uuidv4();
  
  // Attach to request object
  req.requestId = requestId;
  
  // Add to response headers
  res.set('X-Request-ID', requestId);
  
  next();
};

module.exports = requestIdMiddleware;
