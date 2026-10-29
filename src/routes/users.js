const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/users
 * Returns list of active users, optionally filtered by role
 * e.g. GET /api/users?role=ACCOUNTS
 */
router.get('/', authenticateToken, async (req, res) => {
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
        email: true,
        fullName: true,
        role: true,
        phone: true,
        salesTarget: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return res.json({ users });
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

/**
 * PATCH /api/users/:id/sales-target
 * Update sales target for a user (BDM or Admin)
 */
router.patch('/:id/sales-target', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { salesTarget } = req.body;

    if (salesTarget === undefined || isNaN(parseFloat(salesTarget)) || parseFloat(salesTarget) < 0) {
      return res.status(400).json({ error: 'Valid positive sales target amount is required.' });
    }

    // Permission check: Admin or the user themselves
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      return res.status(403).json({ error: 'Not authorized to modify this user target.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { salesTarget: parseFloat(salesTarget) },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        salesTarget: true,
      },
    });

    return res.json({ message: 'Sales target updated successfully.', user: updated });
  } catch (error) {
    console.error('Update sales target error:', error);
    return res.status(500).json({ error: 'Failed to update sales target.' });
  }
});

module.exports = router;
