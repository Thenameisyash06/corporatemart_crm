const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken, requireRoles } = require('../middleware/auth');

/**
 * GET /api/dashboard/stats
 * Aggregate department-wise active queues, total deal values, and counts
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const isBdmUser = req.user.role === 'BDM';
    const dealWhere = isBdmUser
      ? {
          OR: [
            { bdmId: req.user.id },
            { coBdms: { some: { id: req.user.id } } },
          ],
        }
      : {};

    const [
      totalDeals,
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
      verifiedPaymentsAgg,
    ] = await Promise.all([
      prisma.deal.count({ where: dealWhere }),
      prisma.deal.count({ where: { ...dealWhere, stage: 'STAGE_04_ACCOUNTS_VERIFICATION' } }),
      prisma.deal.count({ where: { ...dealWhere, stage: 'STAGE_04_ACCOUNTS_REJECTED' } }),
      prisma.deal.count({ where: { ...dealWhere, stage: 'STAGE_05_LEGAL_VERIFICATION' } }),
      prisma.deal.count({ where: { ...dealWhere, stage: 'STAGE_05_LEGAL_REJECTED' } }),
      prisma.deal.count({ where: { ...dealWhere, stage: 'STAGE_06_OPERATIONS_PROCESSING' } }),
      prisma.deal.count({ where: { ...dealWhere, stage: 'STAGE_07_SERVICE_COMPLETED' } }),
      prisma.deal.count({ where: { ...dealWhere, stage: 'STAGE_08_FINAL_DOCS_DELIVERED' } }),
      prisma.deal.count({ where: { ...dealWhere, stage: 'CLOSED' } }),
      prisma.payment.count({
        where: {
          status: 'PENDING_VERIFICATION',
          trancheNumber: { gt: 1 },
          ...(isBdmUser ? { deal: dealWhere } : {}),
        },
      }),
      prisma.deal.aggregate({
        where: dealWhere,
        _sum: {
          totalAmount: true,
          amountReceived: true,
          pendingAmount: true,
        },
      }),
      prisma.payment.aggregate({
        where: {
          status: 'VERIFIED',
          ...(isBdmUser ? { deal: dealWhere } : {}),
        },
        _sum: { amount: true },
      }),
    ]);

    const totalCollected = Number(verifiedPaymentsAgg._sum.amount || 0);
    const totalDealValue = Number(financialAggregates._sum.totalAmount || 0);
    const totalPending = Math.max(0, totalDealValue - totalCollected);

    return res.json({
      counts: {
        totalDeals,
        pendingBdmHandover: 0,
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
        totalDealValue,
        totalCollected,
        totalPending,
      },
      bdmMetrics: await (async () => {
        if (req.user.role === 'BDM') {
          const bdmUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, fullName: true, salesTarget: true },
          });

          // Only accounts-verified payments (initial payment after accounts verify and balance payments after accounts verify) count towards achievement
          const bdmVerifiedPaymentsAgg = await prisma.payment.aggregate({
            where: {
              status: 'VERIFIED',
              deal: {
                OR: [
                  { bdmId: req.user.id },
                  { coBdms: { some: { id: req.user.id } } },
                ],
              },
            },
            _sum: {
              amount: true,
            },
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
          const achievement = parseFloat(bdmVerifiedPaymentsAgg._sum.amount) || 0;
          const pending = Math.max(0, target - achievement);
          const progressPercent = target > 0 ? Math.min(100, Math.round((achievement / target) * 100)) : 0;

          return {
            target,
            achievement,
            pending,
            received: achievement,
            progressPercent,
            totalDeals: bdmDealsAgg._count.id || 0,
          };
        }
        return null;
      })(),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: error.message || 'Failed to aggregate dashboard metrics.' });
  }
});

/**
 * GET /api/dashboard/admin-overview
 * Comprehensive executive analytics for Admin:
 * - Summary Financials & Conversion rates
 * - BDM Performance matrix & targets
 * - Accounts Verification queue & workloads
 * - Legal Scrutiny workload & approvals
 * - Operations Services delivery & completion rates
 * - RM relationships & renewals
 * - Stage-wise distribution & recent pipeline deals
 */
router.get('/admin-overview', authenticateToken, requireRoles('ADMIN'), async (req, res) => {
  try {
    const [
      totalDeals,
      totalClients,
      dealAggregates,
      stageCounts,
      bdms,
      accountsUsers,
      legalUsers,
      opsUsers,
      rmUsers,
      allDealsForStage,
      recentDeals,
      verifiedPaymentsAgg,
    ] = await Promise.all([
      prisma.deal.count(),
      prisma.client.count(),
      prisma.deal.aggregate({
        _sum: {
          totalAmount: true,
          amountReceived: true,
          pendingAmount: true,
        },
        _avg: {
          totalAmount: true,
        },
      }),
      prisma.deal.groupBy({
        by: ['stage'],
        _count: { id: true },
        _sum: {
          totalAmount: true,
          amountReceived: true,
          pendingAmount: true,
        },
      }),
      prisma.user.findMany({
        where: { role: 'BDM' },
        include: {
          dealsCreated: {
            select: {
              id: true,
              dealCode: true,
              stage: true,
              totalAmount: true,
              amountReceived: true,
              pendingAmount: true,
              isAccountsVerified: true,
              payments: {
                select: {
                  id: true,
                  amount: true,
                  status: true,
                  trancheNumber: true,
                },
              },
              createdAt: true,
            },
          },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.user.findMany({
        where: { role: 'ACCOUNTS' },
        include: {
          assignedAccountsDeals: { select: { id: true, stage: true } },
          dealsAccounts: { select: { id: true } },
          paymentsVerified: { select: { id: true, amount: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.user.findMany({
        where: { role: 'LEGAL' },
        include: {
          assignedLegalDeals: { select: { id: true, stage: true } },
          dealsLegal: { select: { id: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.user.findMany({
        where: { role: 'OPERATIONS' },
        include: {
          assignedServices: {
            select: {
              id: true,
              status: true,
              serviceFee: true,
              serviceName: true,
              govApplicationNumber: true,
            },
          },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.user.findMany({
        where: { role: 'RM' },
        include: {
          renewalsAssigned: { select: { id: true, status: true, serviceName: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.deal.findMany({
        select: {
          id: true,
          dealCode: true,
          stage: true,
          totalAmount: true,
          amountReceived: true,
          pendingAmount: true,
          paymentType: true,
          receivingAccount: true,
          currentDiscrepancy: true,
          isAccountsVerified: true,
          isLegalVerified: true,
          createdAt: true,
          client: {
            select: {
              id: true,
              companyName: true,
              clientName: true,
              phone: true,
              email: true,
              city: true,
              state: true,
              gstin: true,
              panNumber: true,
            },
          },
          bdm: {
            select: { id: true, fullName: true, email: true },
          },
          coBdms: {
            select: { id: true, fullName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.deal.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { companyName: true, clientName: true, phone: true } },
          bdm: { select: { fullName: true } },
        },
      }),
      prisma.payment.aggregate({
        where: { status: 'VERIFIED' },
        _sum: { amount: true },
      }),
    ]);

    // 1. Format BDM Performance
    const bdmPerformance = bdms.map((b) => {
      const deals = b.dealsCreated || [];
      // Achievement / Collected: only payments verified by Accounts (initial tranche after accounts verify and balance payments after accounts verify)
      const totalCollected = deals.reduce((sum, d) => {
        const verifiedPayments = (d.payments || [])
          .filter((p) => p.status === 'VERIFIED')
          .reduce((pSum, p) => pSum + Number(p.amount || 0), 0);
        return sum + verifiedPayments;
      }, 0);

      // Booked Revenue: only deals verified by accounts (or past accounts verification)
      const verifiedDeals = deals.filter((d) => d.isAccountsVerified || !['STAGE_04_ACCOUNTS_VERIFICATION', 'STAGE_04_ACCOUNTS_REJECTED'].includes(d.stage));
      const totalRevenue = verifiedDeals.reduce((sum, d) => sum + Number(d.totalAmount || 0), 0);
      const totalPending = Math.max(0, totalRevenue - totalCollected);
      const target = Number(b.salesTarget || 500000);
      const achievementPercent = target > 0 ? Math.round((totalCollected / target) * 100) : 0;
      const closedDeals = deals.filter((d) => d.stage === 'CLOSED');
      const activeDeals = deals.filter((d) => d.stage !== 'CLOSED');

      return {
        id: b.id,
        fullName: b.fullName,
        email: b.email,
        phone: b.phone,
        salesTarget: target,
        dealsCount: deals.length,
        totalRevenue,
        totalCollected,
        totalPending,
        achievementPercent,
        closedDealsCount: closedDeals.length,
        activeDealsCount: activeDeals.length,
        avgDealSize: verifiedDeals.length > 0 ? Math.round(totalRevenue / verifiedDeals.length) : 0,
        isActive: b.isActive,
      };
    });

    // 2. Format Accounts Performance & Workload
    const accountsPerformance = accountsUsers.map((acc) => {
      const totalVerifiedAmount = acc.paymentsVerified.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      return {
        id: acc.id,
        fullName: acc.fullName,
        email: acc.email,
        phone: acc.phone,
        assignedDealsCount: acc.assignedAccountsDeals.length,
        dealsVerifiedCount: acc.dealsAccounts.length,
        paymentsVerifiedCount: acc.paymentsVerified.length,
        totalVerifiedAmount,
      };
    });

    // 3. Format Legal Performance & Workload
    const legalPerformance = legalUsers.map((leg) => ({
      id: leg.id,
      fullName: leg.fullName,
      email: leg.email,
      phone: leg.phone,
      assignedDealsCount: leg.assignedLegalDeals.length,
      dealsVerifiedCount: leg.dealsLegal.length,
    }));

    // 4. Format Operations Performance & Services Delivery
    const opsPerformance = opsUsers.map((op) => {
      const services = op.assignedServices || [];
      const completed = services.filter((s) => s.status === 'COMPLETED').length;
      const inProgress = services.filter((s) =>
        ['IN_PROGRESS', 'GOVT_SUBMITTED', 'QUERY_RAISED'].includes(s.status)
      ).length;
      const pending = services.filter((s) =>
        ['PENDING', 'ASSIGNED'].includes(s.status)
      ).length;
      const totalFee = services.reduce((sum, s) => sum + Number(s.serviceFee || 0), 0);

      return {
        id: op.id,
        fullName: op.fullName,
        email: op.email,
        phone: op.phone,
        totalServices: services.length,
        completedServices: completed,
        inProgressServices: inProgress,
        pendingServices: pending,
        totalFee,
        completionRate: services.length > 0 ? Math.round((completed / services.length) * 100) : 0,
      };
    });

    // 5. Format RM Performance
    const rmPerformance = rmUsers.map((rm) => {
      const renewals = rm.renewalsAssigned || [];
      return {
        id: rm.id,
        fullName: rm.fullName,
        email: rm.email,
        phone: rm.phone,
        renewalsCount: renewals.length,
      };
    });

    // 6. Stage Map
    const stageMap = {};
    stageCounts.forEach((s) => {
      stageMap[s.stage] = {
        count: s._count.id,
        totalAmount: Number(s._sum.totalAmount || 0),
        amountReceived: Number(s._sum.amountReceived || 0),
        pendingAmount: Number(s._sum.pendingAmount || 0),
      };
    });

    const totalRevenue = Number(dealAggregates._sum.totalAmount || 0);
    const totalCollected = Number(verifiedPaymentsAgg._sum.amount || 0);
    const totalPending = Math.max(0, totalRevenue - totalCollected);

    return res.json({
      summary: {
        totalDeals,
        totalClients,
        totalRevenue,
        totalCollected,
        totalPending,
        avgDealSize: Number(dealAggregates._avg.totalAmount || 0),
        collectionRate: totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0,
      },
      stageMap,
      bdmPerformance,
      accountsPerformance,
      legalPerformance,
      opsPerformance,
      rmPerformance,
      allDeals: allDealsForStage,
      recentDeals,
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch admin overview.' });
  }
});

/**
 * GET /api/dashboard/clients
 * Master client directory with aggregated deals, billing and contact info
 */
router.get('/clients', authenticateToken, requireRoles('ADMIN', 'BDM', 'RM'), async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (req.user.role === 'BDM') {
      where.deals = {
        some: {
          OR: [
            { bdmId: req.user.id },
            { coBdms: { some: { id: req.user.id } } },
          ],
        },
      };
    }

    if (search) {
      where.AND = [
        ...(where.deals ? [{ deals: where.deals }] : []),
        {
          OR: [
            { companyName: { contains: search, mode: 'insensitive' } },
            { clientName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { gstin: { contains: search, mode: 'insensitive' } },
            { panNumber: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
      delete where.deals;
    }

    const clients = await prisma.client.findMany({
      where,
      take: 200,
      include: {
        directors: true,
        deals: {
          select: {
            id: true,
            dealCode: true,
            stage: true,
            totalAmount: true,
            amountReceived: true,
            pendingAmount: true,
            createdAt: true,
            bdm: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const clientsFormatted = clients.map((c) => {
      const deals = c.deals || [];
      const totalAmount = deals.reduce((sum, d) => sum + Number(d.totalAmount || 0), 0);
      const amountReceived = deals.reduce((sum, d) => sum + Number(d.amountReceived || 0), 0);
      const pendingAmount = deals.reduce((sum, d) => sum + Number(d.pendingAmount || 0), 0);

      return {
        id: c.id,
        companyName: c.companyName,
        clientName: c.clientName,
        email: c.email,
        phone: c.phone,
        gstStatus: c.gstStatus,
        gstin: c.gstin,
        panNumber: c.panNumber,
        city: c.city,
        state: c.state,
        consultantName: c.consultantName,
        industry: c.industry,
        sector: c.sector,
        createdAt: c.createdAt,
        directorsCount: (c.directors || []).length,
        directors: c.directors,
        dealsCount: deals.length,
        totalAmount,
        amountReceived,
        pendingAmount,
        deals,
      };
    });

    return res.json({ clients: clientsFormatted });
  } catch (error) {
    console.error('Fetch clients error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch clients.' });
  }
});

module.exports = router;
