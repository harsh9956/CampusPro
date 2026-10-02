const mongoose = require('mongoose');

/**
 * Middleware generator to validate MongoDB ObjectIds in request parameters.
 * Automatically checks specified parameter names (defaulting to ['id'])
 * and returns standard 400 Bad Request with code 'INVALID_ID' if malformed.
 *
 * @param  {...string} paramNames - Names of parameters to check (e.g. 'id', 'driveId')
 * @returns {import('express').RequestHandler}
 */
const validateObjectId = (...paramNames) => {
  const paramsToCheck = paramNames.length > 0 ? paramNames : ['id'];

  return (req, res, next) => {
    for (const param of paramsToCheck) {
      const value = req.params[param];
      if (value !== undefined && value !== null && value !== '') {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          return res.status(400).json({
            success: false,
            message: `Invalid ID format for parameter '${param}'. Must be a valid 24-character hexadecimal ObjectId.`,
            code: 'INVALID_ID',
            details: { [param]: `Invalid ObjectId format: '${value}'` }
          });
        }
      }
    }
    next();
  };
};

module.exports = { validateObjectId };
