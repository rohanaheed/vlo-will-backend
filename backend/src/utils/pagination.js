/**
 * Parse pagination parameters from request query
 * @param {Object} query - Request query object
 * @param {Object} options - Default options
 * @returns {Object} Parsed pagination params
 */
const parsePaginationParams = (query, options = {}) => {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100,
  } = options;

  let page = parseInt(query.page, 10) || defaultPage;
  let limit = parseInt(query.limit, 10) || defaultLimit;

  // Ensure positive values
  page = Math.max(1, page);
  limit = Math.max(1, Math.min(limit, maxLimit));

  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
};

/**
 * Calculate pagination metadata
 * @param {number} totalItems - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
const calculatePagination = (totalItems, page, limit) => {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  };
};

/**
 * Parse sort parameters from request query
 * @param {Object} query - Request query object
 * @param {Array} allowedFields - Allowed sort fields
 * @param {Object} options - Default options
 * @returns {Object} Sort configuration
 */
const parseSortParams = (query, allowedFields = [], options = {}) => {
  const {
    defaultSortBy = 'created_at',
    defaultSortOrder = 'desc',
  } = options;

  let sortBy = query.sortBy || defaultSortBy;
  let sortOrder = (query.sortOrder || defaultSortOrder).toLowerCase();

  // Validate sort field
  if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
    sortBy = defaultSortBy;
  }

  // Validate sort order
  if (!['asc', 'desc'].includes(sortOrder)) {
    sortOrder = defaultSortOrder;
  }

  return {
    sortBy,
    sortOrder,
  };
};

/**
 * Apply pagination to Kysely query
 * @param {Object} query - Kysely query builder
 * @param {Object} pagination - Pagination params
 * @returns {Object} Modified query
 */
const applyPagination = (query, pagination) => {
  return query.limit(pagination.limit).offset(pagination.offset);
};

/**
 * Apply sorting to Kysely query
 * @param {Object} query - Kysely query builder
 * @param {Object} sort - Sort params
 * @param {string} tableAlias - Table alias (optional)
 * @returns {Object} Modified query
 */
const applySort = (query, sort, tableAlias = null) => {
  const column = tableAlias ? `${tableAlias}.${sort.sortBy}` : sort.sortBy;
  return query.orderBy(column, sort.sortOrder);
};

module.exports = {
  parsePaginationParams,
  calculatePagination,
  parseSortParams,
  applyPagination,
  applySort,
};
