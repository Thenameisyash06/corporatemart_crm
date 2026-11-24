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

    const cleanEmail = email.toLowerCase().trim();
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // Support email aliases for Accounts & Legal roles
    if (!user && (cleanEmail === 'akash.prajapati@corporatemart.com' || cleanEmail === 'akash.accounts@corporatemart.com' || cleanEmail === 'akash@corporatemart.com')) {
      user = await prisma.user.findFirst({ where: { role: 'ACCOUNTS' } });
    }
    if (!user && (cleanEmail === 'ronak.donga@corporatemart.com' || cleanEmail === 'ronak.legal@corporatemart.com' || cleanEmail === 'ronak@corporatemart.com')) {
      user = await prisma.user.findFirst({ where: { role: 'LEGAL' } });
    }

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
 * Fetch currently logged in user info with full profile details
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        leaderName: true,
        salesTarget: true,
        createdAt: true,
        isActive: true,
      },
    });
    return res.json({ user: user || req.user });
  } catch (err) {
    return res.json({ user: req.user });
  }
});

/**
 * POST /api/auth/change-password
 * Allows any authenticated user from any portal to change their password
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current password and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Verify current password against stored hash or plaintext seed
    const bcrypt = require('bcryptjs');
    let isCurrentValid = false;
    if (user.passwordHash && (user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$'))) {
      isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    } else {
      isCurrentValid = user.passwordHash === currentPassword;
    }

    if (!isCurrentValid) {
      return res.status(401).json({ error: 'Incorrect current password. Please try again.' });
    }

    // Hash the new password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword.trim(), salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return res.json({
      message: 'Password updated successfully! Please use your new password next time you sign in.',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update password.' });
  }
});

/**
 * PUT /api/auth/profile
 * Update user basic details (e.g. phone)
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { phone } = req.body;
    const updates = {};
    if (phone !== undefined) {
      updates.phone = phone ? phone.trim() : null;
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updates,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        leaderName: true,
        salesTarget: true,
        createdAt: true,
      },
    });

    return res.json({ message: 'Profile details updated successfully.', user: updated });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
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
