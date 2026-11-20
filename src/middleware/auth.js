const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'corporatemart_crm_super_secret_jwt_key_2026';

// In-memory cache for user verification to eliminate redundant DB hits per request (60s TTL)
const userCache = new Map();
const USER_CACHE_TTL_MS = 60 * 1000;

/**
 * Authentication middleware that verifies JWT bearer token
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fast-path: Check in-memory cache to save 50-150ms DB round-trip on polling / repeated queries
    const cached = userCache.get(decoded.userId);
    if (cached && cached.expiresAt > Date.now()) {
      req.user = cached.user;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        salesTarget: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      userCache.delete(decoded.userId);
      return res.status(403).json({ error: 'User account is inactive or no longer exists.' });
    }

    userCache.set(decoded.userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Role-Based Access Control middleware
 * @param {string[]} allowedRoles
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // ADMIN always has full bypass access
    if (req.user.role === 'ADMIN' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}. Current role: ${req.user.role}`,
    });
  };
}

module.exports = {
  authenticateToken,
  requireRoles,
  JWT_SECRET,
};
