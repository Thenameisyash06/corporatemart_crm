const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticateToken, requireRoles } = require('../middleware/auth');

/**
 * GET /api/users
 * Returns list of active users, optionally filtered by role
 * e.g. GET /api/users?role=BDM
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
        leaderName: true,
        salesTarget: true,
        isActive: true,
        createdAt: true,
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
 * POST /api/users
 * Admin creates a new team member / employee
 */
router.post('/', authenticateToken, requireRoles('ADMIN'), async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      salesTarget,
      role = 'BDM',
      isLeader = false,
      leaderName,
      memberIds = [],
    } = req.body;

    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Employee full name must be at least 2 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'A valid corporate email address is required (e.g. name@corporatemart.com).' });
    }

    if (!password || password.trim().length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (phone && phone.trim()) {
      const digits = phone.replace(/\D/g, '');
      const isValidPhone = digits.length === 10 ? /^[6-9]\d{9}$/.test(digits) : digits.length === 12 && digits.startsWith('91') ? /^91[6-9]\d{9}$/.test(digits) : false;
      if (!isValidPhone) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number (e.g. +91 98765 43210).' });
      }
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = fullName.trim();

    // Check if email already in use
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return res.status(400).json({ error: 'An employee with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);
    const assignedLeaderName = isLeader ? cleanName : (leaderName ? leaderName.trim() : 'Management');
    const parsedTarget = salesTarget !== undefined && !isNaN(parseFloat(salesTarget)) ? parseFloat(salesTarget) : 500000;

    const newUser = await prisma.user.create({
      data: {
        fullName: cleanName,
        email: cleanEmail,
        phone: phone ? phone.trim() : null,
        passwordHash,
        role: role || 'BDM',
        leaderName: assignedLeaderName,
        salesTarget: parsedTarget,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        leaderName: true,
        salesTarget: true,
        isActive: true,
      },
    });

    // If newly created user is a leader and memberIds are specified, assign those members to this leader
    if (isLeader && Array.isArray(memberIds) && memberIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: memberIds }, role: 'BDM' },
        data: { leaderName: cleanName },
      });
    }

    return res.status(201).json({
      message: 'New employee created successfully.',
      user: newUser,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create employee.' });
  }
});

/**
 * PUT /api/users/:id
 * Admin updates employee details
 */
router.put('/:id', authenticateToken, requireRoles('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      email,
      phone,
      password,
      salesTarget,
      isLeader = false,
      leaderName,
      memberIds = [],
    } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const updateData = {};

    if (fullName !== undefined) {
      if (!fullName || fullName.trim().length < 2) {
        return res.status(400).json({ error: 'Employee full name must be at least 2 characters.' });
      }
      updateData.fullName = fullName.trim();
    }
    const cleanName = updateData.fullName || user.fullName;
    const oldName = user.fullName;

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'A valid corporate email address is required.' });
      }
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail !== user.email) {
        const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (existing && existing.id !== id) {
          return res.status(400).json({ error: 'This email is already in use by another user.' });
        }
        updateData.email = cleanEmail;
      }
    }

    if (phone !== undefined) {
      if (phone && phone.trim()) {
        const digits = phone.replace(/\D/g, '');
        const isValidPhone = digits.length === 10 ? /^[6-9]\d{9}$/.test(digits) : digits.length === 12 && digits.startsWith('91') ? /^91[6-9]\d{9}$/.test(digits) : false;
        if (!isValidPhone) {
          return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
        }
      }
      updateData.phone = phone ? phone.trim() : null;
    }

    if (password && password.trim()) {
      if (password.trim().length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    if (salesTarget !== undefined && !isNaN(parseFloat(salesTarget))) {
      updateData.salesTarget = parseFloat(salesTarget);
    }

    // Leader / Member hierarchy logic
    if (isLeader) {
      updateData.leaderName = cleanName;

      // Update members under this leader
      if (Array.isArray(memberIds)) {
        // 1. Assign selected members
        if (memberIds.length > 0) {
          await prisma.user.updateMany({
            where: { id: { in: memberIds }, role: 'BDM' },
            data: { leaderName: cleanName },
          });
        }

        // 2. Unassign previous members not in memberIds
        await prisma.user.updateMany({
          where: {
            leaderName: oldName,
            id: { notIn: [...memberIds, id] },
            role: 'BDM',
          },
          data: { leaderName: 'Management' },
        });
      } else if (cleanName !== oldName) {
        // Name changed, update all existing team members' leaderName
        await prisma.user.updateMany({
          where: { leaderName: oldName, role: 'BDM' },
          data: { leaderName: cleanName },
        });
      }
    } else {
      // User is a member
      const wasLeader = user.leaderName === user.fullName;
      if (wasLeader) {
        // Demoting leader to member: reassign their team members to Management
        await prisma.user.updateMany({
          where: { leaderName: oldName, id: { not: id }, role: 'BDM' },
          data: { leaderName: 'Management' },
        });
      }
      updateData.leaderName = leaderName ? leaderName.trim() : 'Management';
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        leaderName: true,
        salesTarget: true,
        isActive: true,
      },
    });

    return res.json({
      message: 'Employee updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update employee.' });
  }
});

/**
 * DELETE /api/users/:id
 * Admin removes an employee
 */
router.delete('/:id', authenticateToken, requireRoles('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self (Master Admin)
    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot remove your own active administrator account.' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // If user was a leader, reassign their team members to Management
    await prisma.user.updateMany({
      where: { leaderName: user.fullName, id: { not: id } },
      data: { leaderName: 'Management' },
    });

    // Check if user has deals created
    const dealsCount = await prisma.deal.count({ where: { bdmId: id } });

    if (dealsCount > 0) {
      // Soft-delete to preserve foreign key constraints for historical deals
      await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          email: `removed_${Date.now()}_${user.email}`,
        },
      });
    } else {
      // Hard delete if no deal references
      await prisma.user.delete({ where: { id } });
    }

    return res.json({ message: `Employee "${user.fullName}" removed successfully.` });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: error.message || 'Failed to remove employee.' });
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

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only administrators are authorized to modify sales targets.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { salesTarget: parseFloat(salesTarget) },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        leaderName: true,
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
