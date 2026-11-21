const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Department user login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account.' });
    }

    // Support bcrypt hashes with fallback to direct match for initial seed data
    let isPasswordValid = false;
    if (user.passwordHash && (user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$'))) {
      const bcrypt = require('bcryptjs');
      isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    } else {
      isPasswordValid = user.passwordHash === password;
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        leaderName: user.leaderName,
        salesTarget: user.salesTarget,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error during login.' });
  }
});

/**
 * GET /api/auth/me
 * Fetch currently logged in user info
 */
router.get('/me', authenticateToken, async (req, res) => {
  return res.json({ user: req.user });
});

/**
 * GET /api/auth/users
 * Fetch team members (e.g. for assigning Ops executives or RMs)
 */
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { role } = req.query;
    const where = { isActive: true };
    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return res.json({ users });
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

module.exports = router;
