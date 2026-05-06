/**
 * Role-based access control middleware factory.
 * Usage: authorize('admin') or authorize('admin', 'teacher')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Access forbidden' });
    }
    next();
  };
}

module.exports = authorize;
