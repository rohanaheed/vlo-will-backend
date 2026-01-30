const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Generate UUID v4
 * @returns {string} UUID
 */
const generateUUID = () => uuidv4();

/**
 * Generate random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Hex token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a token for storage
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Remove sensitive fields from object
 * @param {Object} obj - Object to sanitize
 * @param {Array} fields - Fields to remove
 * @returns {Object} Sanitized object
 */
const omitFields = (obj, fields = ['password_hash', 'password']) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  fields.forEach((field) => {
    delete result[field];
  });
  return result;
};

/**
 * Pick specific fields from object
 * @param {Object} obj - Source object
 * @param {Array} fields - Fields to pick
 * @returns {Object} Object with only specified fields
 */
const pickFields = (obj, fields) => {
  if (!obj || typeof obj !== 'object') return {};
  
  return fields.reduce((result, field) => {
    if (obj.hasOwnProperty(field)) {
      result[field] = obj[field];
    }
    return result;
  }, {});
};

/**
 * Convert string to slug
 * @param {string} str - String to convert
 * @returns {string} Slug
 */
const slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Format full name
 * @param {string} firstName - First name
 * @param {string} middleName - Middle name (optional)
 * @param {string} lastName - Last name
 * @returns {string} Full name
 */
const formatFullName = (firstName, middleName, lastName) => {
  return [firstName, middleName, lastName]
    .filter(Boolean)
    .map((name) => capitalize(name.trim()))
    .join(' ');
};

/**
 * Parse boolean from string
 * @param {*} value - Value to parse
 * @returns {boolean} Boolean value
 */
const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retries (default: 3)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @returns {Promise<*>} Function result
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
};

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} True if empty
 */
const isEmpty = (obj) => {
  if (!obj) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

module.exports = {
  generateUUID,
  generateToken,
  hashToken,
  omitFields,
  pickFields,
  slugify,
  capitalize,
  formatFullName,
  parseBoolean,
  sleep,
  retryWithBackoff,
  deepClone,
  isEmpty,
};
