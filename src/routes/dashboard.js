const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken, requireRoles } = require('../middleware/auth');

// Lightweight TTL cache for dashboard stats (1 second debounce)
const statsCache = new Map();
const STATS_CACHE_TTL_MS = 1000;

/**
 * GET /api/dashboard/stats
 * Aggregate department-wise active queues, total deal values, and counts
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const isBdmUser = req.user.role === 'BDM';
    const cacheKey = `stats:${req.user.id}:${req.user.role}`;
    const cached = statsCache.get(cacheKey);
    if (!req.query.refresh && cached && (Date.now() - cached.timestamp < STATS_CACHE_TTL_MS)) {
      return res.json(cached.data);
    }

    let statsRow;
    if (isBdmUser) {
      const rows = await prisma.$queryRawUnsafe(`
        WITH bdm_deals AS (
          SELECT 
            d.id, 
            d.stage, 
            ((d."totalAmount" / 1.18) / ((SELECT COUNT(*) FROM "_DealCoBdms" WHERE "A" = d.id) + 1.0)) as "totalAmount", 
            ((d."amountReceived" / 1.18) / ((SELECT COUNT(*) FROM "_DealCoBdms" WHERE "A" = d.id) + 1.0)) as "amountReceived", 
            ((d."pendingAmount" / 1.18) / ((SELECT COUNT(*) FROM "_DealCoBdms" WHERE "A" = d.id) + 1.0)) as "pendingAmount"
          FROM "deals" d
          WHERE d."bdmId" = $1 OR d.id IN (SELECT "A" FROM "_DealCoBdms" WHERE "B" = $1)
        ),
        deal_stats AS (
          SELECT
            COUNT(*)::int as total_deals,
            COUNT(*) FILTER (WHERE stage = 'STAGE_04_ACCOUNTS_VERIFICATION')::int as pending_accounts,
            COUNT(*) FILTER (WHERE stage = 'STAGE_04_ACCOUNTS_REJECTED')::int as accounts_rejected,
            COUNT(*) FILTER (WHERE stage = 'STAGE_05_LEGAL_VERIFICATION')::int as pending_legal,
            COUNT(*) FILTER (WHERE stage = 'STAGE_05_LEGAL_REJECTED')::int as legal_rejected,
            COUNT(*) FILTER (WHERE stage = 'STAGE_06_OPERATIONS_PROCESSING')::int as in_operations,
            COUNT(*) FILTER (WHERE stage = 'STAGE_07_SERVICE_COMPLETED')::int as completed_services,
            COUNT(*) FILTER (WHERE stage = 'STAGE_08_FINAL_DOCS_DELIVERED')::int as pending_rm_handover,
            COUNT(*) FILTER (WHERE stage = 'CLOSED')::int as closed_deals,
            COALESCE(SUM("totalAmount"), 0)::float as total_deal_value,
            COALESCE(SUM("amountReceived"), 0)::float as amount_received,
            COALESCE(SUM("pendingAmount"), 0)::float as pending_amount
          FROM bdm_deals
        ),
        payment_stats AS (
          SELECT
            COUNT(*) FILTER (WHERE p.status = 'PENDING_VERIFICATION' AND p."trancheNumber" > 1)::int as pending_balance_verifications,
            COALESCE(SUM((p.amount / 1.18) / ((SELECT COUNT(*) FROM "_DealCoBdms" WHERE "A" = p."dealId") + 1.0)) FILTER (WHERE p.status = 'VERIFIED'), 0)::float as total_collected
          FROM "payments" p
          WHERE p."dealId" IN (SELECT id FROM bdm_deals)
        )
        SELECT 
          d.*,
          p.pending_balance_verifications,
          p.total_collected,
          u."salesTarget",
          u."fullName"
        FROM deal_stats d
        CROSS JOIN payment_stats p
        LEFT JOIN "users" u ON u.id = $1;
      `, req.user.id);
      statsRow = rows[0] || {};
    } else {
      const rows = await prisma.$queryRawUnsafe(`
        WITH all_deals AS (
          SELECT d.id, d.stage, d."totalAmount", d."amountReceived", d."pendingAmount"
          FROM "deals" d
        ),
        deal_stats AS (
          SELECT
            COUNT(*)::int as total_deals,
            COUNT(*) FILTER (WHERE stage = 'STAGE_04_ACCOUNTS_VERIFICATION')::int as pending_accounts,
            COUNT(*) FILTER (WHERE stage = 'STAGE_04_ACCOUNTS_REJECTED')::int as accounts_rejected,
            COUNT(*) FILTER (WHERE stage = 'STAGE_05_LEGAL_VERIFICATION')::int as pending_legal,
            COUNT(*) FILTER (WHERE stage = 'STAGE_05_LEGAL_REJECTED')::int as legal_rejected,
            COUNT(*) FILTER (WHERE stage = 'STAGE_06_OPERATIONS_PROCESSING')::int as in_operations,
            COUNT(*) FILTER (WHERE stage = 'STAGE_07_SERVICE_COMPLETED')::int as completed_services,
            COUNT(*) FILTER (WHERE stage = 'STAGE_08_FINAL_DOCS_DELIVERED')::int as pending_rm_handover,
            COUNT(*) FILTER (WHERE stage = 'CLOSED')::int as closed_deals,
            COALESCE(SUM("totalAmount"), 0)::float as total_deal_value,
            COALESCE(SUM("amountReceived"), 0)::float as amount_received,
            COALESCE(SUM("pendingAmount"), 0)::float as pending_amount
          FROM all_deals
        ),
        payment_stats AS (
          SELECT
            COUNT(*) FILTER (WHERE p.status = 'PENDING_VERIFICATION' AND p."trancheNumber" > 1)::int as pending_balance_verifications,
            COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'VERIFIED'), 0)::float as total_collected
          FROM "payments" p
        )
        SELECT 
          d.*,
          p.pending_balance_verifications,
          p.total_collected
        FROM deal_stats d
        CROSS JOIN payment_stats p;
      `);
      statsRow = rows[0] || {};
    }

    const totalDeals = statsRow.total_deals || 0;
    const pendingAccounts = statsRow.pending_accounts || 0;
    const accountsRejected = statsRow.accounts_rejected || 0;
    const pendingLegal = statsRow.pending_legal || 0;
    const legalRejected = statsRow.legal_rejected || 0;
    const inOperations = statsRow.in_operations || 0;
    const completedServices = statsRow.completed_services || 0;
    const pendingRmHandover = statsRow.pending_rm_handover || 0;
    const closedDeals = statsRow.closed_deals || 0;
    const pendingBalanceVerifications = statsRow.pending_balance_verifications || 0;

    const totalCollected = Math.round(Number(statsRow.total_collected || 0));
    const totalDealValue = Math.round(Number(statsRow.total_deal_value || 0));
    const totalPending = Math.round(Math.max(0, totalDealValue - totalCollected));

    let bdmMetrics = null;
    if (isBdmUser) {
      const target = Math.round(parseFloat(statsRow.salesTarget) || 500000);
      const achievement = Math.round(totalCollected);
      const pending = Math.round(Math.max(0, target - achievement));
      const progressPercent = target > 0 ? Math.min(100, Math.round((achievement / target) * 100)) : 0;
      bdmMetrics = {
        target,
        achievement,
        pending,
        received: achievement,
        progressPercent,
        totalDeals,
      };
    }

    const payload = {
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
      bdmMetrics,
    };

    statsCache.set(cacheKey, { timestamp: Date.now(), data: payload });
    return res.json(payload);
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
        where: { role: 'BDM', isActive: true },
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
              coBdms: {
                select: { id: true, fullName: true },
              },
              payments: {
                select: { id: true, amount: true, status: true },
              },
              createdAt: true,
            },
          },
          coBdmDeals: {
            select: {
              id: true,
              dealCode: true,
              stage: true,
              totalAmount: true,
              amountReceived: true,
              pendingAmount: true,
              isAccountsVerified: true,
              coBdms: {
                select: { id: true, fullName: true },
              },
              payments: {
                select: { id: true, amount: true, status: true },
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
          payments: {
            select: { id: true, amount: true, status: true },
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

    // 1. Format BDM Performance (deals divided equally among lead BDM and co-BDMs)
    const bdmPerformance = bdms.map((b) => {
      const primaryDeals = b.dealsCreated || [];
      const coDeals = b.coBdmDeals || [];

      // Combine all deals where user is primary or co-BDM
      const seenDealIds = new Set();
      const allMyDeals = [];
      primaryDeals.forEach((d) => {
        seenDealIds.add(d.id);
        allMyDeals.push(d);
      });
      coDeals.forEach((d) => {
        if (!seenDealIds.has(d.id)) {
          seenDealIds.add(d.id);
          allMyDeals.push(d);
        }
      });

      let totalRevenue = 0;
      let totalCollected = 0;
      let totalPending = 0;
      let closedDealsCount = 0;
      let activeDealsCount = 0;

      allMyDeals.forEach((d) => {
        const coCount = d.coBdms ? d.coBdms.length : 0;
        const splitCount = 1 + coCount;
        const splitFactor = 1 / splitCount;

        // Received amounts only counted after Accounts verification
        let dealVerifiedCollected = 0;
        if (d.payments && d.payments.length > 0) {
          dealVerifiedCollected = d.payments
            .filter((p) => p.status === 'VERIFIED')
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);
        } else if (d.isAccountsVerified || !['STAGE_01_PAYMENT_RECEIVED', 'STAGE_02_DOCUMENTS_COLLECTED', 'STAGE_04_ACCOUNTS_VERIFICATION', 'STAGE_04_ACCOUNTS_REJECTED'].includes(d.stage)) {
          dealVerifiedCollected = Number(d.amountReceived || 0);
        }

        // First remove 18% GST of total deal value, received amount, and pending amount
        const baseTotalRevenue = Number(d.totalAmount || 0) / 1.18;
        const baseVerifiedCollected = dealVerifiedCollected / 1.18;
        const basePending = Math.max(0, baseTotalRevenue - baseVerifiedCollected);

        // Then divide equally among primary BDM and co-BDMs (half each for 1 co-BDM)
        const myRevenue = baseTotalRevenue * splitFactor;
        const myCollected = baseVerifiedCollected * splitFactor;
        const myPending = basePending * splitFactor;

        totalRevenue += myRevenue;
        totalCollected += myCollected;
        totalPending += myPending;

        if (d.stage === 'CLOSED') closedDealsCount += 1;
        else activeDealsCount += 1;
      });

      const target = Number(b.salesTarget || 500000);
      const achievementPercent = target > 0 ? Math.round((totalCollected / target) * 100) : 0;

      return {
        id: b.id,
        fullName: b.fullName,
        email: b.email,
        phone: b.phone,
        leaderName: b.leaderName,
        salesTarget: target,
        dealsCount: allMyDeals.length,
        totalRevenue: Math.round(totalRevenue),
        totalCollected: Math.round(totalCollected),
        totalPending: Math.round(totalPending),
        achievementPercent,
        closedDealsCount,
        activeDealsCount,
        avgDealSize: allMyDeals.length > 0 ? Math.round(totalRevenue / allMyDeals.length) : 0,
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

    const totalRevenue = Math.round(Number(dealAggregates._sum.totalAmount || 0));
    const totalCollected = Math.round(Number(verifiedPaymentsAgg._sum.amount || 0));
    const totalPending = Math.round(Math.max(0, totalRevenue - totalCollected));

    return res.json({
      summary: {
        totalDeals,
        totalClients,
        totalRevenue,
        totalCollected,
        totalPending,
        avgDealSize: Math.round(Number(dealAggregates._avg.totalAmount || 0)),
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

/**
 * DELETE /api/dashboard/clients/:id
 * Remove a client from the database (Admin only, requires 0 active deals)
 */
router.delete('/clients/:id', authenticateToken, requireRoles('ADMIN'), async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { deals: true } } },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    if (client._count.deals > 0) {
      return res.status(400).json({
        error: `Cannot delete "${client.companyName}" because it still has ${client._count.deals} deal(s). Delete associated deals first.`,
      });
    }

    await prisma.client.delete({
      where: { id: req.params.id },
    });

    return res.json({ message: `Client "${client.companyName}" removed from database.` });
  } catch (error) {
    console.error('Delete client error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete client.' });
  }
});

module.exports = router;
