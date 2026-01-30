// Base API Error
class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 Bad Request
class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details = null) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

// 400 Validation Error
class ValidationError extends ApiError {
  constructor(details, message = 'Validation failed') {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

// 401 Unauthorized
class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, 'AUTHENTICATION_ERROR', message);
  }
}

// 403 Forbidden
class ForbiddenError extends ApiError {
  constructor(message = 'Access denied') {
    super(403, 'AUTHORIZATION_ERROR', message);
  }
}

// 404 Not Found
class NotFoundError extends ApiError {
  constructor(resource = 'Resource', message = null) {
    super(404, 'NOT_FOUND', message || `${resource} not found`);
  }
}

// 409 Conflict
class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(409, 'CONFLICT', message);
  }
}

// 429 Too Many Requests
class TooManyRequestsError extends ApiError {
  constructor(message = 'Too many requests, please try again later') {
    super(429, 'RATE_LIMIT_EXCEEDED', message);
  }
}

// 500 Internal Server Error
class InternalError extends ApiError {
  constructor(message = 'Internal server error') {
    super(500, 'INTERNAL_ERROR', message);
    this.isOperational = false;
  }
}

// 503 Service Unavailable
class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporarily unavailable') {
    super(503, 'SERVICE_UNAVAILABLE', message);
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalError,
  ServiceUnavailableError,
};
