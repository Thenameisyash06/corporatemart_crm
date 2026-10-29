const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/dashboard/stats
 * Aggregate department-wise active queues, total deal values, and counts
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [
      totalDeals,
      pendingBdmHandover,
      pendingAccounts,
      accountsRejected,
      pendingLegal,
      legalRejected,
      inOperations,
      completedServices,
      pendingRmHandover,
      closedDeals,
      pendingBalanceVerifications,
      financialAggregates,
    ] = await Promise.all([
      prisma.deal.count(),
      prisma.deal.count({ where: { stage: 'STAGE_03_BDM_HANDOVER_PENDING' } }),
      prisma.deal.count({ where: { stage: 'STAGE_04_ACCOUNTS_VERIFICATION' } }),
      prisma.deal.count({ where: { stage: 'STAGE_04_ACCOUNTS_REJECTED' } }),
      prisma.deal.count({ where: { stage: 'STAGE_05_LEGAL_VERIFICATION' } }),
      prisma.deal.count({ where: { stage: 'STAGE_05_LEGAL_REJECTED' } }),
      prisma.deal.count({ where: { stage: 'STAGE_06_OPERATIONS_PROCESSING' } }),
      prisma.deal.count({ where: { stage: 'STAGE_07_SERVICE_COMPLETED' } }),
      prisma.deal.count({ where: { stage: 'STAGE_08_FINAL_DOCS_DELIVERED' } }),
      prisma.deal.count({ where: { stage: 'CLOSED' } }),
      prisma.payment.count({ where: { status: 'PENDING_VERIFICATION', trancheNumber: { gt: 1 } } }),
      prisma.deal.aggregate({
        _sum: {
          totalAmount: true,
          amountReceived: true,
          pendingAmount: true,
        },
      }),
    ]);

    return res.json({
      counts: {
        totalDeals,
        pendingBdmHandover,
        pendingAccounts,
        accountsRejected,
        pendingLegal,
        legalRejected,
        inOperations,
        completedServices,
        pendingRmHandover,
        closedDeals,
        pendingBalanceVerifications,
      },
      financials: {
        totalDealValue: financialAggregates._sum.totalAmount || 0,
        totalCollected: financialAggregates._sum.amountReceived || 0,
        totalPending: financialAggregates._sum.pendingAmount || 0,
      },
      bdmMetrics: await (async () => {
        if (req.user.role === 'BDM') {
          const bdmUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, fullName: true, salesTarget: true },
          });

          const bdmDealsAgg = await prisma.deal.aggregate({
            where: {
              OR: [
                { bdmId: req.user.id },
                { coBdms: { some: { id: req.user.id } } },
              ],
            },
            _sum: {
              totalAmount: true,
              amountReceived: true,
              pendingAmount: true,
            },
            _count: {
              id: true,
            },
          });

          const target = parseFloat(bdmUser?.salesTarget) || 500000;
          const achievement = parseFloat(bdmDealsAgg._sum.totalAmount) || 0;
          const received = parseFloat(bdmDealsAgg._sum.amountReceived) || 0;
          const pending = Math.max(0, target - achievement);
          const progressPercent = target > 0 ? Math.min(100, Math.round((achievement / target) * 100)) : 0;

          return {
            target,
            achievement,
            pending,
            received,
            progressPercent,
            totalDeals: bdmDealsAgg._count.id || 0,
          };
        }
        return null;
      })(),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: 'Failed to aggregate dashboard metrics.' });
  }
});

module.exports = router;
