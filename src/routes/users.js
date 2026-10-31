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

    // Auto-seed operations specialists if querying OPERATIONS
    if (role === 'OPERATIONS') {
      const defaultSpecialists = [
        { fullName: 'Priya Sharma (ROC & Incorporation Specialist)', email: 'priya.sharma@corporatemart.com', role: 'OPERATIONS', passwordHash: 'ops123', phone: '+919876543220' },
        { fullName: 'Amit Patel (Financial & Pitch Specialist)', email: 'amit.patel@corporatemart.com', role: 'OPERATIONS', passwordHash: 'ops123', phone: '+919876543221' },
        { fullName: 'Rahul Nair (Tech Lead & Full Stack)', email: 'rahul.nair@corporatemart.com', role: 'OPERATIONS', passwordHash: 'ops123', phone: '+919876543222' },
        { fullName: 'Siddharth Rawat (GeM & Tender Specialist)', email: 'siddharth.rawat@corporatemart.com', role: 'OPERATIONS', passwordHash: 'ops123', phone: '+919876543223' },
      ];
      for (const spec of defaultSpecialists) {
        try {
          const exists = await prisma.user.findUnique({ where: { email: spec.email } });
          if (!exists) {
            await prisma.user.create({ data: spec });
          }
        } catch (e) { /* ignore collision */ }
      }
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
