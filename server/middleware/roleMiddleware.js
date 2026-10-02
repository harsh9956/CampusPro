const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid Bearer token.',
        code: 'UNAUTHORIZED'
      });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const allowedRoles = roles.flat().map((r) => String(r).toUpperCase());

    const isAuthorized =
      allowedRoles.includes(userRole) ||
      (allowedRoles.includes('ADMIN') && userRole === 'SUPER_ADMIN');

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role (${userRole}) is not authorized to access this resource`,
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
  authorize: authorizeRoles
};
