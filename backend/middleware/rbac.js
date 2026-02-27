/**
 * Role-Based Access Control middleware
 * Usage: rbac('admin') or rbac('student', 'moderator', 'admin')
 */
export function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `This action requires one of: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}
