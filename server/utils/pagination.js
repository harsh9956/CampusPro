/**
 * Standard Pagination Utility for CampusPro
 * Enforces production-safe limits and consistent pagination response structure
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Extracts and sanitizes pagination parameters from request query
 * @param {Object} queryObj - req.query
 * @param {Object} [defaults] - optional custom default values
 * @returns {{ page: number, limit: number, skip: number }}
 */
const getPaginationParams = (queryObj = {}, defaults = {}) => {
  const defaultPage = defaults.defaultPage || DEFAULT_PAGE;
  const defaultLimit = defaults.defaultLimit || DEFAULT_LIMIT;
  const maxLimit = defaults.maxLimit || MAX_LIMIT;

  let page = parseInt(queryObj.page, 10);
  if (isNaN(page) || page < 1) {
    page = defaultPage;
  }

  let limit = parseInt(queryObj.limit || queryObj.pageSize, 10);
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  } else if (limit > maxLimit) {
    limit = maxLimit;
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Builds consistent pagination metadata and response payload
 * @param {Array} data - List of items for current page
 * @param {number} total - Total document count matching query
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object}
 */
const formatPaginationResponse = (data = [], total = 0, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) => {
  const safeTotal = Math.max(0, parseInt(total, 10) || 0);
  const safeLimit = Math.max(1, parseInt(limit, 10) || DEFAULT_LIMIT);
  const safePage = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
  const totalPages = Math.ceil(safeTotal / safeLimit) || 1;

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: safeTotal,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrevious: safePage > 1,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1
    }
  };
};

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  getPaginationParams,
  formatPaginationResponse
};
