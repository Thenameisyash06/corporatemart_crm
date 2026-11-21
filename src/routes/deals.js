const express = require('express');
const router = express.Router();
const multer = require('multer');
const prisma = require('../lib/prisma');
const { uploadFile } = require('../lib/storage');
const { authenticateToken, requireRoles } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/**
 * Generate human-friendly Deal Code: CM-2026-0001 (Collision-safe)
 */
async function generateDealCode() {
  const currentYear = new Date().getFullYear();
  const prefix = `CM-${currentYear}-`;

  // Find the highest existing deal sequence for the current year
  const latestDeal = await prisma.deal.findFirst({
    where: { dealCode: { startsWith: prefix } },
    orderBy: { dealCode: 'desc' },
    select: { dealCode: true },
  });

  let nextSeq = 1;
  if (latestDeal && latestDeal.dealCode) {
    const parts = latestDeal.dealCode.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  // Ensure collision safety in case of concurrent creations or deleted records
  while (true) {
    const candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    const exists = await prisma.deal.findUnique({
      where: { dealCode: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
    nextSeq++;
  }
}

/**
 * Helper to record audit log entry
 */

/**
 * Helper to resolve operations user ID (supports UUID, email, or mock ID with auto-provisioning)
 */
async function resolveOpsUserId(input) {
  if (!input || input === '' || input === 'null' || input === 'UNASSIGNED') {
    return null;
  }

  const mockMap = {
    'mock-priya-sharma': { email: 'priya.sharma@corporatemart.com', name: 'Priya Sharma (ROC & Incorporation Specialist)' },
    'mock-amit-patel': { email: 'amit.patel@corporatemart.com', name: 'Amit Patel (Financial & Pitch Specialist)' },
    'mock-rahul-nair': { email: 'rahul.nair@corporatemart.com', name: 'Rahul Nair (Tech Lead & Full Stack)' },
    'mock-siddharth-rawat': { email: 'siddharth.rawat@corporatemart.com', name: 'Siddharth Rawat (GeM & Tender Specialist)' },
  };

  if (mockMap[input]) {
    const spec = mockMap[input];
    let user = await prisma.user.findUnique({ where: { email: spec.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: spec.email,
          fullName: spec.name,
          role: 'OPERATIONS',
          passwordHash: 'ops123',
          phone: '+919876543220',
        },
      });
    }
    return user.id;
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
  if (isUuid) {
    const user = await prisma.user.findUnique({
      where: { id: input },
      select: { id: true },
    });
    return user ? user.id : null;
  }

  if (typeof input === 'string' && input.includes('@')) {
    const user = await prisma.user.findUnique({
      where: { email: input },
      select: { id: true },
    });
    return user ? user.id : null;
  }

  if (typeof input === 'string' && input.length >= 3) {
    const userByName = await prisma.user.findFirst({
      where: {
        fullName: { contains: input, mode: 'insensitive' },
        role: 'OPERATIONS',
      },
      select: { id: true },
    });
    if (userByName) return userByName.id;
  }

  return null;
}

async function recordAuditLog({ dealId, userId, action, fromStage, toStage, remarks }) {
  try {
    await prisma.auditLog.create({
      data: {
        dealId,
        userId,
        action,
        fromStage,
        toStage,
        remarks,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// -----------------------------------------------------------------------------
// GET /api/deals - List deals with filtering by role and stage
// -----------------------------------------------------------------------------
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { stage, roleFilter, search } = req.query;
    const conditions = [];

    if (stage) {
      conditions.push({ stage });
    }

    // Role-specific queues & RBAC
    if (req.user.role === 'BDM' || roleFilter === 'BDM') {
      conditions.push({
        OR: [
          { bdmId: req.user.id },
          { coBdms: { some: { id: req.user.id } } },
        ],
      });
    } else if (roleFilter === 'ACCOUNTS') {
      conditions.push({
        OR: [
          { stage: { in: ['STAGE_04_ACCOUNTS_VERIFICATION', 'STAGE_04_ACCOUNTS_REJECTED'] } },
          { payments: { some: { status: 'PENDING_VERIFICATION' } } },
        ],
      });
    } else if (roleFilter === 'LEGAL') {
      conditions.push({
        stage: { in: ['STAGE_05_LEGAL_VERIFICATION', 'STAGE_05_LEGAL_REJECTED'] },
      });
    } else if (roleFilter === 'OPERATIONS') {
      conditions.push({
        stage: { in: ['STAGE_06_OPERATIONS_PROCESSING', 'STAGE_07_SERVICE_COMPLETED'] },
      });
    } else if (roleFilter === 'RM') {
      // RM has full visibility across all deals from BDM form creation through operations to closure
      if (stage) {
        conditions.push({ stage });
      }
    }

    // Search by client company name, contact, dealCode, BDM names
    if (search && search.trim()) {
      conditions.push({
        OR: [
          { dealCode: { contains: search.trim(), mode: 'insensitive' } },
          { client: { companyName: { contains: search.trim(), mode: 'insensitive' } } },
          { client: { clientName: { contains: search.trim(), mode: 'insensitive' } } },
          { client: { email: { contains: search.trim(), mode: 'insensitive' } } },
          { bdm: { fullName: { contains: search.trim(), mode: 'insensitive' } } },
          { coBdms: { some: { fullName: { contains: search.trim(), mode: 'insensitive' } } } },
        ],
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const isAll = req.query.limit === 'all' || req.query.all === 'true';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const defaultLimit = roleFilter && roleFilter !== 'BDM' ? 100 : 10;
    const limit = isAll ? undefined : Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = isAll ? undefined : (page - 1) * limit;

    const [total, deals] = await Promise.all([
      prisma.deal.count({ where }),
      prisma.deal.findMany({
        where,
        take: limit,
        skip,
        include: {
          client: {
            include: { directors: true },
          },
          bdm: {
            select: { id: true, fullName: true, email: true },
          },
          coBdms: {
            select: { id: true, fullName: true, email: true },
          },
          assignedAccountsUser: {
            select: { id: true, fullName: true, email: true },
          },
          assignedLegalUser: {
            select: { id: true, fullName: true, email: true },
          },
          assignedOpsUser: {
            select: { id: true, fullName: true, email: true },
          },
          services: {
            include: {
              assignedOpsUser: { select: { id: true, fullName: true, email: true } },
            },
          },
          payments: true,
          documents: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = isAll ? 1 : Math.max(1, Math.ceil(total / (limit || 20)));

    return res.json({
      deals,
      pagination: {
        page: isAll ? 1 : page,
        limit: isAll ? total : limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Fetch deals error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve deals.' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/deals/:id - Fetch full deal dossier
// -----------------------------------------------------------------------------
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: {
        client: {
          include: { directors: true },
        },
        bdm: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        coBdms: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        assignedAccountsUser: {
          select: { id: true, fullName: true, email: true },
        },
        assignedLegalUser: {
          select: { id: true, fullName: true, email: true },
        },
        assignedOpsUser: {
          select: { id: true, fullName: true, email: true },
        },
        accountsVerifiedBy: {
          select: { id: true, fullName: true, email: true },
        },
        legalVerifiedBy: {
          select: { id: true, fullName: true, email: true },
        },
        services: {
          include: {
            assignedOpsUser: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        payments: {
          include: {
            verifiedBy: {
              select: { id: true, fullName: true },
            },
          },
          orderBy: { trancheNumber: 'asc' },
        },
        documents: {
          include: {
            uploadedByUser: {
              select: { id: true, fullName: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        renewals: true,
        auditLogs: {
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    // In CRM: if logged in as BDM (leader or team member), can only view personal deal details
    if (req.user.role === 'BDM') {
      const isPersonal = deal.bdmId === req.user.id || (deal.coBdms && deal.coBdms.some((b) => b.id === req.user.id));
      if (!isPersonal) {
        return res.status(403).json({ error: 'Access denied: You can only view your own personal deal details.' });
      }
    }

    return res.json({ deal });
  } catch (error) {
    console.error('Fetch deal error:', error);
    return res.status(500).json({ error: 'Failed to fetch deal details.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/deals - Stages 01-03: BDM Creates Deal & Initial Client Info
// -----------------------------------------------------------------------------
router.post('/', authenticateToken, requireRoles('BDM', 'ADMIN'), async (req, res) => {
  try {
    const {
      companyName,
      clientName,
      clientEmail,
      clientPhone,
      gstStatus,
      gstin,
      panNumber,
      billingAddress,
      address,
      city,
      state,
      pincode,
      consultantName,
      industry,
      sector,
      remarks,
      paymentRemarks,
      accountName, // Account in which payment is received
      receivingAccount,
      cashCollectorName, // Name of person who collected cash (if CASH)
      coBdmIds, // Array of BDM user IDs associated with this deal
      directors, // Array of { name, din, pan, email, phone }
      services,  // Array of { serviceName, standardAmount, serviceFee, govtFee }
      standardAmount,
      totalAmount,
      amountReceived,
      paymentType, // FULL_PAYMENT or PART_PAYMENT
      paymentMode,
      transactionReference,
      paymentDate,
    } = req.body;

    // Validation
    if (!companyName || !clientName || !clientEmail || !clientPhone) {
      return res.status(400).json({ error: 'Company Name, Client Name, Email, and Phone are mandatory.' });
    }

    if (!panNumber || !panNumber.trim()) {
      return res.status(400).json({ error: 'Company PAN number is mandatory.' });
    }

    if (!services || services.length === 0) {
      return res.status(400).json({ error: 'At least one service line item must be selected.' });
    }

    const selectedAccount = (accountName || receivingAccount || 'Corporatemart private limited').trim();
    const isCashPayment = paymentMode === 'CASH';

    if (isCashPayment && (!cashCollectorName || !cashCollectorName.trim())) {
      return res.status(400).json({ error: 'For Cash payment, the name of the person who collected the cash is mandatory.' });
    }

    // Validation: Standard amount cannot be exceeded by deal amount
    for (const s of services) {
      const std = parseFloat(s.standardAmount) || 0;
      const deal = parseFloat(s.dealAmount !== undefined ? s.dealAmount : s.serviceFee) || 0;
      if (std > 0 && deal > std) {
        return res.status(400).json({
          error: `Deal amount (₹${deal.toLocaleString('en-IN')}) cannot be greater than standard amount (₹${std.toLocaleString('en-IN')}) for service "${s.serviceName}".`,
        });
      }
    }

    const totalVal = parseFloat(totalAmount) || 0;
    const receivedVal = parseFloat(amountReceived) || 0;
    const pendingVal = Math.max(0, totalVal - receivedVal);
    const standardVal = parseFloat(standardAmount) || totalVal;

    if (totalVal <= 0) {
      return res.status(400).json({ error: 'Total deal amount must be greater than zero.' });
    }

    if (receivedVal <= 0) {
      return res.status(400).json({ error: 'Amount received must be greater than zero.' });
    }

    const dealCode = await generateDealCode();

    // Transaction to create Client, Directors, Deal, Services, and Initial Payment
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Client
      const client = await tx.client.create({
        data: {
          companyName: companyName.trim().toUpperCase(),
          clientName: clientName.trim().toUpperCase(),
          email: clientEmail.trim().toUpperCase(),
          phone: clientPhone.trim(),
          gstStatus: Boolean(gstStatus),
          gstin: gstin ? gstin.trim().toUpperCase() : null,
          panNumber: panNumber.trim().toUpperCase(),
          billingAddress: (address || billingAddress || '').trim().toUpperCase() || null,
          city: city ? city.trim().toUpperCase() : null,
          state: state ? state.trim().toUpperCase() : null,
          pincode: pincode ? pincode.trim() : null,
          consultantName: consultantName ? consultantName.trim().toUpperCase() : null,
          industry: industry ? industry.trim().toUpperCase() : null,
          sector: sector ? sector.trim().toUpperCase() : null,
        },
      });

      // 2. Create Directors
      if (directors && Array.isArray(directors) && directors.length > 0) {
        await tx.director.createMany({
          data: directors
            .filter((d) => d.name && d.name.trim().length > 0)
            .map((d) => ({
              clientId: client.id,
              name: d.name.trim().toUpperCase(),
              din: d.din ? d.din.trim().toUpperCase() : null,
              pan: d.pan ? d.pan.trim().toUpperCase() : null,
              email: d.email ? d.email.trim().toUpperCase() : null,
              phone: d.phone ? d.phone.trim() : null,
            })),
        });
      }

      // 3. Create Deal Record with associated co-BDMs
      const validCoBdmIds = Array.isArray(coBdmIds)
        ? coBdmIds.filter((id) => id && typeof id === 'string' && id !== req.user.id)
        : [];

      // Accounts and Legal have one dedicated member each (no assignment needed)
      const soleAccountsUser = await tx.user.findFirst({ where: { role: 'ACCOUNTS' } });
      const soleLegalUser = await tx.user.findFirst({ where: { role: 'LEGAL' } });

      const deal = await tx.deal.create({
        data: {
          dealCode,
          clientId: client.id,
          bdmId: req.user.id,
          stage: 'STAGE_04_ACCOUNTS_VERIFICATION',
          assignedAccountsUserId: soleAccountsUser?.id || null,
          assignedLegalUserId: soleLegalUser?.id || null,
          standardAmount: standardVal,
          totalAmount: totalVal,
          amountReceived: receivedVal,
          pendingAmount: pendingVal,
          receivingAccount: selectedAccount.toUpperCase(),
          paymentType: paymentType || (pendingVal > 0 ? 'PART_PAYMENT' : 'FULL_PAYMENT'),
          isBdmEntryComplete: true,
          bdmHandoverAt: new Date(),
          remarks: (paymentRemarks || remarks || '').trim().toUpperCase() || null,
          coBdms: validCoBdmIds.length > 0 ? { connect: validCoBdmIds.map((id) => ({ id })) } : undefined,
        },
      });

      // 4. Create Service line items with standard and deal amounts
      await tx.dealService.createMany({
        data: services.map((s) => ({
          dealId: deal.id,
          serviceName: s.serviceName ? s.serviceName.trim().toUpperCase() : s.serviceName,
          standardAmount: s.standardAmount ? parseFloat(s.standardAmount) : null,
          serviceFee: parseFloat(s.serviceFee || s.dealAmount) || 0,
          govtFee: s.gstAmount !== undefined ? parseFloat(s.gstAmount) : (s.govtFee ? parseFloat(s.govtFee) : null),
          status: 'PENDING',
        })),
      });

      // 5. Create Payment record for initial tranche with payment remarks, account, and cash info
      const finalTxRef = isCashPayment
        ? (transactionReference && transactionReference.trim() ? transactionReference.trim().toUpperCase() : `CASH: COLLECTED BY ${cashCollectorName.trim().toUpperCase()}`)
        : (transactionReference && transactionReference.trim() ? transactionReference.trim().toUpperCase() : `${(paymentMode || 'Online').toUpperCase()} - ${selectedAccount.toUpperCase()}`);

      await tx.payment.create({
        data: {
          dealId: deal.id,
          trancheNumber: 1,
          amount: receivedVal,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMode: paymentMode || 'UPI',
          transactionReference: finalTxRef,
          paymentProofUrl: isCashPayment ? null : '', // Empty string if awaiting proof upload, null if cash
          accountName: selectedAccount.toUpperCase(),
          cashCollectorName: isCashPayment ? cashCollectorName.trim().toUpperCase() : null,
          status: 'PENDING_VERIFICATION',
          remarks: (paymentRemarks || remarks || '').trim().toUpperCase() || null,
        },
      });

      return deal;
    });

    await recordAuditLog({
      dealId: result.id,
      userId: req.user.id,
      action: 'DEAL_CREATED',
      fromStage: null,
      toStage: 'STAGE_04_ACCOUNTS_VERIFICATION',
      remarks: `Deal ${dealCode} initialized by BDM ${req.user.fullName} and forwarded to Accounts verification queue. Total: ₹${totalVal}, Received: ₹${receivedVal}.`,
    });

    return res.status(201).json({
      message: 'Deal created successfully.',
      dealId: result.id,
      dealCode,
    });
  } catch (error) {
    console.error('Deal creation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create deal record.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/deals/:id/resubmit (and legacy /:id/handover) - Resubmit Rejected Deal to Accounts
// -----------------------------------------------------------------------------
const handleDealResubmit = async (req, res) => {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: { client: { include: { directors: true } }, services: true, payments: true, documents: true },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    // Validation Enforcements:
    if (!deal.client.companyName || !deal.client.clientName || !deal.client.phone) {
      return res.status(400).json({ error: 'Incomplete client details. Company, Contact Name, and Phone are required.' });
    }

    if (!deal.services || deal.services.length === 0) {
      return res.status(400).json({ error: 'At least one service must be attached before submission.' });
    }

    if (!deal.client.panNumber) {
      return res.status(400).json({ error: 'Company PAN number is mandatory before submission.' });
    }

    // Gate Enforcement: Only Company PAN photo/document is strictly mandatory
    const hasCompanyPanDoc = deal.documents.some((d) => d.documentType === 'COMPANY_PAN' || d.documentType === 'KYC_PAN') || Boolean(deal.client.companyPanUrl);
    if (!hasCompanyPanDoc) {
      return res.status(400).json({ error: 'Company PAN card image/document must be uploaded before submission.' });
    }

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        isBdmEntryComplete: true,
        bdmHandoverAt: new Date(),
        stage: 'STAGE_04_ACCOUNTS_VERIFICATION',
        currentDiscrepancy: null,
      },
    });

    await recordAuditLog({
      dealId: deal.id,
      userId: req.user.id,
      action: 'RESUBMIT_TO_ACCOUNTS',
      fromStage: deal.stage,
      toStage: 'STAGE_04_ACCOUNTS_VERIFICATION',
      remarks: `BDM ${req.user.fullName} resubmitted file to Accounts for verification.`,
    });

    return res.json({ message: 'File successfully forwarded to Accounts for verification.', deal: updated });
  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({ error: 'Failed to complete submission.' });
  }
};

router.post('/:id/resubmit', authenticateToken, requireRoles('BDM', 'ADMIN'), handleDealResubmit);
router.post('/:id/handover', authenticateToken, requireRoles('BDM', 'ADMIN'), handleDealResubmit);

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// POST /api/deals/:id/accounts-verify - Stage 04: Accounts Verification Gate
// -----------------------------------------------------------------------------
router.post('/:id/accounts-verify', authenticateToken, requireRoles('ACCOUNTS', 'ADMIN'), async (req, res) => {
  try {
    const { action, notes, transactionRemark } = req.body; // action: 'APPROVE' or 'REJECT'

    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: { payments: true },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    if (action === 'APPROVE') {
      const dealRemarkUpdate = transactionRemark && transactionRemark.trim() ? transactionRemark.trim() : undefined;

      // Mark payments verified & move to Legal
      await prisma.$transaction([
        prisma.payment.updateMany({
          where: { dealId: deal.id },
          data: {
            status: 'VERIFIED',
            verifiedById: req.user.id,
            verifiedAt: new Date(),
            verificationNotes: notes || 'Verified by Accounts.',
            ...(dealRemarkUpdate ? { remarks: dealRemarkUpdate } : {}),
          },
        }),
        prisma.deal.update({
          where: { id: deal.id },
          data: {
            isAccountsVerified: true,
            accountsVerifiedAt: new Date(),
            accountsVerifiedById: req.user.id,
            accountsNotes: notes || null,
            ...(dealRemarkUpdate ? { remarks: dealRemarkUpdate } : {}),
            stage: 'STAGE_05_LEGAL_VERIFICATION',
            currentDiscrepancy: null,
          },
        }),
        // Also auto-verify company pan document if attached
        prisma.document.updateMany({
          where: {
            dealId: deal.id,
            documentType: 'COMPANY_PAN',
          },
          data: {
            isVerified: true,
            verifiedByRole: 'ACCOUNTS',
          },
        }),
      ]);

      await recordAuditLog({
        dealId: deal.id,
        userId: req.user.id,
        action: 'ACCOUNTS_APPROVED',
        fromStage: deal.stage,
        toStage: 'STAGE_05_LEGAL_VERIFICATION',
        remarks: `Accounts ${req.user.fullName} verified payment, PAN, and forwarded file to Legal. Notes: ${notes || 'N/A'}${dealRemarkUpdate ? ` | Txn Remark: "${dealRemarkUpdate}"` : ''}`,
      });

      return res.json({ message: 'Accounts verification approved. File forwarded to Legal queue.' });
    } else if (action === 'REJECT') {
      if (!notes) {
        return res.status(400).json({ error: 'Discrepancy reason is mandatory when returning a file to BDM.' });
      }

      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          stage: 'STAGE_04_ACCOUNTS_REJECTED',
          currentDiscrepancy: notes,
          accountsNotes: notes,
        },
      });

      await recordAuditLog({
        dealId: deal.id,
        userId: req.user.id,
        action: 'ACCOUNTS_REJECTED',
        fromStage: deal.stage,
        toStage: 'STAGE_04_ACCOUNTS_REJECTED',
        remarks: `Returned to BDM by Accounts: ${notes}`,
      });

      return res.json({ message: 'File returned to BDM for discrepancy correction.' });
    } else {
      return res.status(400).json({ error: 'Invalid action. Must be APPROVE or REJECT.' });
    }
  } catch (error) {
    console.error('Accounts verify error:', error);
    return res.status(500).json({ error: 'Failed to process Accounts verification.' });
  }
});

// -----------------------------------------------------------------------------
// PATCH /api/deals/:id/transaction-remark - Accounts / Admin updates deal transaction remark
// -----------------------------------------------------------------------------
router.patch('/:id/transaction-remark', authenticateToken, requireRoles('ACCOUNTS', 'ADMIN', 'BDM'), async (req, res) => {
  try {
    const { transactionRemark } = req.body;
    if (transactionRemark === undefined) {
      return res.status(400).json({ error: 'Transaction remark is required.' });
    }

    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: { payments: { orderBy: { trancheNumber: 'asc' } } },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    const trimmed = (transactionRemark || '').trim();

    // Update deal remarks
    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        remarks: trimmed || null,
      },
      include: {
        client: true,
        payments: true,
        documents: true,
      },
    });

    // Also sync to initial payment tranche remarks if available
    if (deal.payments.length > 0) {
      await prisma.payment.update({
        where: { id: deal.payments[0].id },
        data: {
          remarks: trimmed || null,
        },
      });
    }

    await recordAuditLog({
      dealId: deal.id,
      userId: req.user.id,
      action: 'TRANSACTION_REMARK_UPDATED',
      fromStage: deal.stage,
      toStage: deal.stage,
      remarks: `Transaction remark updated by ${req.user.fullName} (${req.user.role}): "${trimmed || 'None'}"`,
    });

    return res.json({ message: 'Transaction remark saved successfully.', deal: updated });
  } catch (error) {
    console.error('Update transaction remark error:', error);
    return res.status(500).json({ error: 'Failed to update transaction remark.' });
  }
});

// -----------------------------------------------------------------------------
// PATCH /api/deals/:id/pan - Accounts / Admin updates client PAN number
// -----------------------------------------------------------------------------
router.patch('/:id/pan', authenticateToken, requireRoles('ACCOUNTS', 'ADMIN', 'BDM', 'LEGAL'), async (req, res) => {
  try {
    const { panNumber } = req.body;
    if (!panNumber || !panNumber.trim()) {
      return res.status(400).json({ error: 'Valid PAN number is required.' });
    }

    const formattedPan = panNumber.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(formattedPan)) {
      return res.status(400).json({ error: 'Invalid PAN format. Must be 10 characters (e.g. ABCDE1234F).' });
    }

    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: { client: true },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    const updatedClient = await prisma.client.update({
      where: { id: deal.clientId },
      data: {
        panNumber: formattedPan,
      },
    });

    await recordAuditLog({
      dealId: deal.id,
      userId: req.user.id,
      action: 'CLIENT_PAN_UPDATED',
      fromStage: deal.stage,
      toStage: deal.stage,
      remarks: `Company PAN updated to "${formattedPan}" by ${req.user.fullName} (${req.user.role}).`,
    });

    return res.json({ message: 'Company PAN updated successfully.', client: updatedClient });
  } catch (error) {
    console.error('Update PAN error:', error);
    return res.status(500).json({ error: 'Failed to update PAN number.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/deals/:id/balance-payment - BDM Logs Part-Payment Balance Tranche
// -----------------------------------------------------------------------------
router.post(
  '/:id/balance-payment',
  authenticateToken,
  requireRoles('BDM', 'ADMIN'),
  upload.single('file'),
  async (req, res) => {
    try {
      const {
        amount,
        paymentMode,
        transactionReference,
        paymentDate,
        notes,
        accountName,
        cashCollectorName,
      } = req.body;
      const file = req.file;
      const isCash = paymentMode === 'CASH';

      const selectedAccount = (accountName || 'Corporatemart private limited').trim();

      if (!file) {
        return res.status(400).json({ error: 'Payment screenshot / proof is mandatory. Please attach the payment screenshot.' });
      }

      if (isCash) {
        if (!cashCollectorName || !cashCollectorName.trim()) {
          return res.status(400).json({ error: 'For Cash payment, the name of the person who collected the cash is mandatory.' });
        }
      }

      const paymentVal = parseFloat(amount);
      if (isNaN(paymentVal) || paymentVal <= 0) {
        return res.status(400).json({ error: 'Valid payment amount greater than zero is required.' });
      }

      const finalTxRef = isCash
        ? (transactionReference && transactionReference.trim() ? transactionReference.trim() : `Cash: Collected by ${cashCollectorName.trim()}`)
        : (transactionReference && transactionReference.trim() ? transactionReference.trim() : `Balance: ${paymentMode || 'Payment'} - ${selectedAccount}`);

      const deal = await prisma.deal.findUnique({
        where: { id: req.params.id },
        include: { payments: true },
      });

      if (!deal) {
        return res.status(404).json({ error: 'Deal not found.' });
      }

      const currentPending = parseFloat(deal.pendingAmount) || 0;
      if (currentPending <= 0) {
        return res.status(400).json({ error: 'This deal already has zero pending balance.' });
      }

      // Check if there is already an unverified payment tranche
      const pendingTranche = deal.payments.find((p) => p.status === 'PENDING_VERIFICATION');
      if (pendingTranche) {
        return res.status(400).json({
          error: `Payment Tranche #${pendingTranche.trancheNumber} is currently pending Accounts verification. Please wait for Accounts to review before submitting another tranche.`,
        });
      }

      const nextTrancheNumber = (deal.payments.length || 0) + 1;

      // 1. Upload payment proof to storage if file present
      let uploadResult = null;
      if (file) {
        uploadResult = await uploadFile({
          dealCode: deal.dealCode,
          fileBuffer: file.buffer,
          fileName: file.originalname,
          mimeType: file.mimetype,
          subfolder: 'payments',
        });
      }

      // 2. Database transaction: Create payment tranche and document record (if file present)
      const result = await prisma.$transaction(async (tx) => {
        let docRecord = null;
        if (uploadResult && file) {
          docRecord = await tx.document.create({
            data: {
              dealId: deal.id,
              title: `Payment Proof - Tranche #${nextTrancheNumber} (₹${paymentVal})`,
              documentType: 'PAYMENT_PROOF',
              fileUrl: uploadResult.path,
              fileName: file.originalname,
              fileSize: file.size,
              mimeType: file.mimetype,
              uploadedByUserId: req.user.id,
              isVerified: false,
            },
          });
        }

        // Payment record
        const paymentRecord = await tx.payment.create({
          data: {
            dealId: deal.id,
            trancheNumber: nextTrancheNumber,
            amount: paymentVal,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            paymentMode: paymentMode || 'UPI',
            transactionReference: finalTxRef,
            paymentProofUrl: uploadResult ? uploadResult.path : null,
            accountName: selectedAccount,
            cashCollectorName: isCash ? cashCollectorName.trim() : null,
            status: 'PENDING_VERIFICATION',
            remarks: notes ? notes.trim() : null,
            verificationNotes: null,
          },
        });

        return { docRecord, paymentRecord };
      });

      await recordAuditLog({
        dealId: deal.id,
        userId: req.user.id,
        action: 'BALANCE_PAYMENT_LOGGED',
        fromStage: deal.stage,
        toStage: deal.stage,
        remarks: `BDM ${req.user.fullName} logged Tranche #${nextTrancheNumber} balance payment of ₹${paymentVal} (Mode: ${paymentMode}, Ref: ${finalTxRef}, Account: ${selectedAccount}). Forwarded to Accounts for verification.`,
      });

      return res.status(201).json({
        message: `Tranche #${nextTrancheNumber} balance payment of ₹${paymentVal} recorded. Awaiting Accounts verification.`,
        payment: result.paymentRecord,
      });
    } catch (error) {
      console.error('Balance payment error:', error);
      return res.status(500).json({ error: `Failed to record balance payment: ${error.message}` });
    }
  }
);

// -----------------------------------------------------------------------------
// POST /api/deals/:id/verify-balance-payment - Accounts Verifies Balance Tranche
// -----------------------------------------------------------------------------
router.post(
  '/:id/verify-balance-payment',
  authenticateToken,
  requireRoles('ACCOUNTS', 'ADMIN'),
  async (req, res) => {
    try {
      const { paymentId, action, notes } = req.body; // action: 'APPROVE' or 'REJECT'

      const deal = await prisma.deal.findUnique({
        where: { id: req.params.id },
        include: { payments: true },
      });

      if (!deal) {
        return res.status(404).json({ error: 'Deal not found.' });
      }

      // Find the payment to verify
      let paymentToVerify = null;
      if (paymentId) {
        paymentToVerify = deal.payments.find((p) => p.id === paymentId);
      } else {
        paymentToVerify = deal.payments.find((p) => p.status === 'PENDING_VERIFICATION' && p.trancheNumber > 1);
      }

      if (!paymentToVerify) {
        return res.status(404).json({ error: 'No balance payment tranche awaiting verification.' });
      }

      if (action === 'APPROVE') {
        const paymentAmount = parseFloat(paymentToVerify.amount);
        const currentAmountReceived = parseFloat(deal.amountReceived) || 0;
        const totalDealAmount = parseFloat(deal.totalAmount) || 0;

        const newAmountReceived = currentAmountReceived + paymentAmount;
        const newPendingAmount = Math.max(0, totalDealAmount - newAmountReceived);
        const isFullyPaid = newPendingAmount === 0;

        await prisma.$transaction([
          prisma.payment.update({
            where: { id: paymentToVerify.id },
            data: {
              status: 'VERIFIED',
              verifiedById: req.user.id,
              verifiedAt: new Date(),
              verificationNotes: notes || 'Balance payment verified in bank credit.',
            },
          }),
          prisma.deal.update({
            where: { id: deal.id },
            data: {
              amountReceived: newAmountReceived,
              pendingAmount: newPendingAmount,
              paymentType: isFullyPaid ? 'FULL_PAYMENT' : 'PART_PAYMENT',
            },
          }),
        ]);

        await recordAuditLog({
          dealId: deal.id,
          userId: req.user.id,
          action: 'BALANCE_PAYMENT_VERIFIED',
          fromStage: deal.stage,
          toStage: deal.stage,
          remarks: `Accounts ${req.user.fullName} verified balance payment Tranche #${paymentToVerify.trancheNumber} of ₹${paymentAmount}. Deal now ₹${newAmountReceived}/₹${totalDealAmount} paid. Part-payment lock released. ${notes || ''}`,
        });

        return res.json({
          message: `Balance payment of ₹${paymentAmount} verified! Total received: ₹${newAmountReceived}. Part-payment lock released for Operations.`,
          pendingAmount: newPendingAmount,
          isFullyPaid,
        });
      } else if (action === 'REJECT') {
        if (!notes) {
          return res.status(400).json({ error: 'Rejection reason is mandatory.' });
        }

        await prisma.payment.update({
          where: { id: paymentToVerify.id },
          data: {
            status: 'REJECTED',
            verifiedById: req.user.id,
            verifiedAt: new Date(),
            verificationNotes: notes,
          },
        });

        await recordAuditLog({
          dealId: deal.id,
          userId: req.user.id,
          action: 'BALANCE_PAYMENT_REJECTED',
          fromStage: deal.stage,
          toStage: deal.stage,
          remarks: `Accounts ${req.user.fullName} rejected balance payment Tranche #${paymentToVerify.trancheNumber}: ${notes}`,
        });

        return res.json({ message: 'Balance payment tranche rejected. BDM notified.' });
      } else {
        return res.status(400).json({ error: 'Invalid action. Must be APPROVE or REJECT.' });
      }
    } catch (error) {
      console.error('Verify balance payment error:', error);
      return res.status(500).json({ error: 'Failed to verify balance payment.' });
    }
  }
);

// -----------------------------------------------------------------------------
// PATCH /api/deals/:id/assign - Department Claim or Manager Assignment
// -----------------------------------------------------------------------------
router.patch('/:id/assign', authenticateToken, async (req, res) => {
  try {
    const { department, userId } = req.body; // department: 'ACCOUNTS' | 'LEGAL' | 'OPERATIONS'
    const targetUserId = userId || req.user.id; // If not provided, user claims for themselves

    if (department === 'ACCOUNTS' || department === 'LEGAL') {
      return res.status(400).json({ error: `${department} has a single dedicated member and does not require assignment to other members.` });
    }

    if (department !== 'OPERATIONS') {
      return res.status(400).json({ error: 'Assignment is only applicable for Operations department.' });
    }

    // Role permission check:
    // A user can claim for themselves if they belong to that department or ADMIN.
    // Assigning to someone else requires ADMIN or being a member of that department.
    if (req.user.role !== 'ADMIN' && req.user.role !== department) {
      return res.status(403).json({ error: `You do not have permission to assign deals in ${department}.` });
    }

    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    // Find the target user
    let assigneeName = 'Unassigned';
    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, fullName: true, role: true },
      });
      if (!targetUser) {
        return res.status(404).json({ error: 'Target user not found.' });
      }
      assigneeName = targetUser.fullName;
    }

    const updateData = {};
    if (department === 'ACCOUNTS') {
      updateData.assignedAccountsUserId = targetUserId || null;
    } else if (department === 'LEGAL') {
      updateData.assignedLegalUserId = targetUserId || null;
    } else if (department === 'OPERATIONS') {
      updateData.assignedOpsUserId = targetUserId || null;
    }

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: updateData,
      include: {
        assignedAccountsUser: { select: { id: true, fullName: true, email: true } },
        assignedLegalUser: { select: { id: true, fullName: true, email: true } },
        assignedOpsUser: { select: { id: true, fullName: true, email: true } },
      },
    });

    await recordAuditLog({
      dealId: deal.id,
      userId: req.user.id,
      action: 'DEAL_ASSIGNMENT_UPDATED',
      fromStage: deal.stage,
      toStage: deal.stage,
      remarks: `${req.user.fullName} updated ${department} assignment for deal ${deal.dealCode} to "${assigneeName}".`,
    });

    return res.json({
      message: `${department} assignment updated to ${assigneeName}.`,
      deal: updated,
    });
  } catch (error) {
    console.error('Deal assignment error:', error);
    return res.status(500).json({ error: 'Failed to update deal assignment.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/deals/:id/legal-verify - Stage 05: Legal Verification Gate
// -----------------------------------------------------------------------------
router.post('/:id/legal-verify', authenticateToken, requireRoles('LEGAL', 'ADMIN'), async (req, res) => {
  try {
    const { action, notes } = req.body; // action: 'APPROVE' or 'REJECT'

    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    if (action === 'APPROVE') {
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          isLegalVerified: true,
          legalVerifiedAt: new Date(),
          legalVerifiedById: req.user.id,
          legalNotes: notes || null,
          stage: 'STAGE_06_OPERATIONS_PROCESSING',
          operationsStartedAt: new Date(),
          currentDiscrepancy: null,
        },
      });

      await recordAuditLog({
        dealId: deal.id,
        userId: req.user.id,
        action: 'LEGAL_APPROVED',
        fromStage: deal.stage,
        toStage: 'STAGE_06_OPERATIONS_PROCESSING',
        remarks: `Legal team ${req.user.fullName} cleared compliance and documents. Forwarded to Operations. ${notes || ''}`,
      });

      return res.json({ message: 'Legal scrutiny passed. File forwarded to Operations queue.' });
    } else if (action === 'REJECT') {
      if (!notes) {
        return res.status(400).json({ error: 'Deficiency reason is mandatory when raising a legal query.' });
      }

      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          stage: 'STAGE_05_LEGAL_REJECTED',
          currentDiscrepancy: notes,
          legalNotes: notes,
        },
      });

      await recordAuditLog({
        dealId: deal.id,
        userId: req.user.id,
        action: 'LEGAL_REJECTED',
        fromStage: deal.stage,
        toStage: 'STAGE_05_LEGAL_REJECTED',
        remarks: `Legal deficiency raised by ${req.user.fullName}: ${notes}`,
      });

      return res.json({ message: 'Legal deficiency raised. File returned to BDM/Client.' });
    } else {
      return res.status(400).json({ error: 'Invalid action. Must be APPROVE or REJECT.' });
    }
  } catch (error) {
    console.error('Legal verify error:', error);
    return res.status(500).json({ error: 'Failed to process Legal verification.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/deals/:id/legal-agreement - Upload Legal Service Agreement
// Stored in Supabase/Storage vault & queued for automatic client email after handover
// -----------------------------------------------------------------------------
router.post(
  '/:id/legal-agreement',
  authenticateToken,
  requireRoles('LEGAL', 'ADMIN'),
  upload.single('file'),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Please select an agreement file to upload.' });
      }

      const deal = await prisma.deal.findUnique({
        where: { id: req.params.id },
        include: { client: true },
      });

      if (!deal) {
        return res.status(404).json({ error: 'Deal not found.' });
      }

      // 1. Upload to Storage in agreements subfolder
      const uploadResult = await uploadFile({
        dealCode: deal.dealCode,
        fileBuffer: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
        subfolder: 'agreements',
      });

      // 2. Save Document record in Documents Vault
      const docRecord = await prisma.document.create({
        data: {
          dealId: deal.id,
          title: `Legal Service Agreement - ${deal.client?.companyName || deal.dealCode}`,
          documentType: 'LEGAL_AGREEMENT',
          fileUrl: uploadResult.path,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedByUserId: req.user.id,
          isVerified: true,
          verifiedByRole: 'LEGAL',
        },
      });

      // 3. Link legalAgreementUrl on Deal
      const updatedDeal = await prisma.deal.update({
        where: { id: deal.id },
        data: {
          legalAgreementUrl: uploadResult.path,
        },
        include: {
          client: { include: { directors: true } },
          documents: true,
          services: true,
          payments: true,
        },
      });

      await recordAuditLog({
        dealId: deal.id,
        userId: req.user.id,
        action: 'LEGAL_AGREEMENT_UPLOADED',
        fromStage: deal.stage,
        toStage: deal.stage,
        remarks: `Legal associate ${req.user.fullName} uploaded Legal Service Agreement ("${file.originalname}"). Saved in storage vault for client email handover dispatch (${deal.client?.email || 'N/A'}).`,
      });

      return res.status(201).json({
        message: 'Legal Agreement uploaded successfully and stored in vault.',
        document: docRecord,
        deal: updatedDeal,
      });
    } catch (error) {
      console.error('Upload legal agreement error:', error);
      return res.status(500).json({ error: `Failed to upload legal agreement: ${error.message}` });
    }
  }
);

// -----------------------------------------------------------------------------
// PATCH /api/deals/:id/services/:serviceId - Stage 06: Ops Milestone / Service Amount Update
// -----------------------------------------------------------------------------
router.patch('/:id/services/:serviceId', authenticateToken, requireRoles('OPERATIONS', 'ADMIN', 'BDM', 'RM', 'ACCOUNTS', 'LEGAL'), async (req, res) => {
  try {
    const { assignedOpsUserId, status, govApplicationNumber, notes, completedAt, targetCompletionDate, serviceFee, dealAmount } = req.body;

    const updateData = {};
    if (assignedOpsUserId !== undefined) {
      updateData.assignedOpsUserId = await resolveOpsUserId(assignedOpsUserId);
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (govApplicationNumber !== undefined) {
      updateData.govApplicationNumber = govApplicationNumber;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (targetCompletionDate !== undefined) {
      updateData.targetCompletionDate = targetCompletionDate ? new Date(targetCompletionDate) : null;
    }
    if (completedAt !== undefined) {
      updateData.completedAt = completedAt ? new Date(completedAt) : null;
    }
    if (serviceFee !== undefined || dealAmount !== undefined) {
      const feeVal = parseFloat(serviceFee !== undefined ? serviceFee : dealAmount);
      if (!isNaN(feeVal) && feeVal >= 0) {
        updateData.serviceFee = feeVal;
      }
    }

    const updatedService = await prisma.dealService.update({
      where: { id: req.params.serviceId },
      data: updateData,
      include: {
        assignedOpsUser: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    let newDealTotal = null;
    if (updateData.serviceFee !== undefined) {
      const allServices = await prisma.dealService.findMany({
        where: { dealId: req.params.id },
      });
      newDealTotal = allServices.reduce((sum, s) => sum + (parseFloat(s.serviceFee) || 0), 0);
      await prisma.deal.update({
        where: { id: req.params.id },
        data: { totalAmount: newDealTotal },
      });
    }

    const feeMsg = updateData.serviceFee !== undefined
      ? ` Deal Amount updated to ₹${updateData.serviceFee.toLocaleString('en-IN')}.${newDealTotal !== null ? ` New Deal Total: ₹${newDealTotal.toLocaleString('en-IN')}.` : ''}`
      : '';

    await recordAuditLog({
      dealId: req.params.id,
      userId: req.user.id,
      action: 'SERVICE_MILESTONE_UPDATED',
      remarks: `Service "${updatedService.serviceName}" updated.${updateData.status ? ` Status: ${updatedService.status}.` : ''}${feeMsg}`,
    });

    return res.json({ message: 'Service updated.', service: updatedService, totalAmount: newDealTotal });
  } catch (error) {
    console.error('Service update error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update service milestone.' });
  }
});

// -----------------------------------------------------------------------------
// PATCH /api/deals/:id/deal-amount - Direct Update to Total Deal Amount
// -----------------------------------------------------------------------------
router.patch('/:id/deal-amount', authenticateToken, requireRoles('BDM', 'ADMIN', 'RM', 'ACCOUNTS', 'OPERATIONS', 'LEGAL'), async (req, res) => {
  try {
    const { totalAmount, remarks } = req.body;
    const newTotal = parseFloat(totalAmount);
    if (isNaN(newTotal) || newTotal <= 0) {
      return res.status(400).json({ error: 'Valid total deal amount greater than zero is required.' });
    }

    const currentDeal = await prisma.deal.findUnique({
      where: { id: req.params.id },
    });
    if (!currentDeal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    const updatedDeal = await prisma.deal.update({
      where: { id: req.params.id },
      data: { totalAmount: newTotal },
      include: {
        client: { include: { directors: true } },
        bdm: { select: { id: true, fullName: true, email: true } },
        coBdms: { select: { id: true, fullName: true, email: true } },
        services: { include: { assignedOpsUser: { select: { id: true, fullName: true, email: true } } } },
        documents: true,
        payments: true,
        auditLogs: { include: { user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });

    await recordAuditLog({
      dealId: req.params.id,
      userId: req.user.id,
      action: 'DEAL_AMOUNT_UPDATED',
      remarks: `Total Deal Amount updated from ₹${Number(currentDeal.totalAmount).toLocaleString('en-IN')} to ₹${newTotal.toLocaleString('en-IN')}.${remarks ? ` Note: ${remarks}` : ''}`,
    });

    return res.json({ message: 'Deal amount updated successfully.', deal: updatedDeal });
  } catch (error) {
    console.error('Update deal amount error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update deal amount.' });
  }
});

router.post('/:id/service-complete', authenticateToken, requireRoles('OPERATIONS', 'ADMIN'), async (req, res) => {
  try {
    const { outcomeNotes } = req.body;

    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: { documents: true, services: true },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    // Check if ALL individual services are COMPLETED
    const incompleteServices = (deal.services || []).filter((s) => s.status !== 'COMPLETED');
    if (incompleteServices.length > 0) {
      return res.status(400).json({
        error: `Cannot complete deal. All ${deal.services.length} services must be completed by operations first (${incompleteServices.length} still in progress).`,
      });
    }

    // Check if deliverable certificate is uploaded
    const hasDeliverable = deal.documents.some((d) => d.documentType === 'FINAL_DELIVERABLE_CERTIFICATE');
    if (!hasDeliverable) {
      return res.status(400).json({ error: 'Please upload the final deliverable/certificate before completing the service.' });
    }

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stage: 'STAGE_07_SERVICE_COMPLETED',
        serviceCompletedAt: new Date(),
        serviceOutcomeNotes: outcomeNotes || null,
      },
    });

    await recordAuditLog({
      dealId: deal.id,
      userId: req.user.id,
      action: 'SERVICE_COMPLETED',
      fromStage: deal.stage,
      toStage: 'STAGE_07_SERVICE_COMPLETED',
      remarks: `Operations executive ${req.user.fullName} confirmed service outcome and verified final deliverables. ${outcomeNotes || ''}`,
    });

    return res.json({ message: 'Service successfully marked as completed.', deal: updated });
  } catch (error) {
    console.error('Service complete error:', error);
    return res.status(500).json({ error: 'Failed to mark service complete.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/deals/:id/final-delivery - Stage 08: Deliver Documents to Client
// -----------------------------------------------------------------------------
router.post('/:id/final-delivery', authenticateToken, requireRoles('OPERATIONS', 'ADMIN'), async (req, res) => {
  try {
    const { deliveryProof } = req.body;

    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    // Part-Payment Safeguard: If balance is pending, prevent dispatch unless overridden
    if (parseFloat(deal.pendingAmount) > 0) {
      return res.status(400).json({
        error: `PART-PAYMENT LOCK: Pending amount of ₹${deal.pendingAmount} must be cleared by Accounts before final deliverables can be released to the client.`,
      });
    }

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stage: 'STAGE_08_FINAL_DOCS_DELIVERED',
        finalDocsDeliveredAt: new Date(),
        finalDeliveryProof: deliveryProof || 'Email dispatched with certificate attachments.',
      },
    });

    await recordAuditLog({
      dealId: deal.id,
      userId: req.user.id,
      action: 'FINAL_DOCS_DELIVERED',
      fromStage: deal.stage,
      toStage: 'STAGE_08_FINAL_DOCS_DELIVERED',
      remarks: `Deliverables dispatched to client. Proof: ${deliveryProof || 'N/A'}. Handover pending with RM.`,
    });

    return res.json({ message: 'Deliverables marked as delivered to client. Ready for RM Handover.', deal: updated });
  } catch (error) {
    console.error('Final delivery error:', error);
    return res.status(500).json({ error: 'Failed to record delivery.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/deals/:id/rm-handover - Stage 09: RM Client Handover & Renewals
// -----------------------------------------------------------------------------
router.post('/:id/rm-handover', authenticateToken, requireRoles('RM', 'ADMIN'), async (req, res) => {
  try {
    const { notes, renewals } = req.body; // renewals: Array of { serviceName, dueDate, remindAt, notes }

    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: { services: true },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    // Verify all individual services are completed before closing deal
    const incompleteServices = (deal.services || []).filter((s) => s.status !== 'COMPLETED');
    if (incompleteServices.length > 0) {
      return res.status(400).json({
        error: `Cannot close deal workflow. All individual services must be completed by operations first (${incompleteServices.length} still in progress).`,
      });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create renewal reminders if any
      if (renewals && Array.isArray(renewals) && renewals.length > 0) {
        await tx.renewalReminder.createMany({
          data: renewals.map((r) => ({
            dealId: deal.id,
            clientId: deal.clientId,
            serviceName: r.serviceName,
            dueDate: new Date(r.dueDate),
            remindAt: r.remindAt ? new Date(r.remindAt) : new Date(r.dueDate),
            status: 'UPCOMING',
            assignedRmId: req.user.id,
            notes: r.notes || null,
          })),
        });
      }

      // 2. Close CRM Workflow
      await tx.deal.update({
        where: { id: deal.id },
        data: {
          stage: 'CLOSED',
          rmHandoverAt: new Date(),
          rmHandoverNotes: notes || 'Client handover confirmed. Next steps communicated.',
          closedAt: new Date(),
        },
      });
    });

    await recordAuditLog({
      dealId: deal.id,
      userId: req.user.id,
      action: 'WORKFLOW_CLOSED',
      fromStage: deal.stage,
      toStage: 'CLOSED',
      remarks: `Relationship Manager ${req.user.fullName} completed client handover and closed the workflow. ${notes || ''}`,
    });

    return res.json({ message: 'Client handover completed. Workflow successfully closed!' });
  } catch (error) {
    console.error('RM handover error:', error);
    return res.status(500).json({ error: 'Failed to complete RM handover.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/deals/:id/rm-communication - RM Client Communication for Services
// -----------------------------------------------------------------------------
router.post('/:id/rm-communication', authenticateToken, requireRoles('RM', 'ADMIN'), async (req, res) => {
  try {
    const { serviceId, channel, notes, communicationType } = req.body;
    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: { services: true },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    let serviceName = 'General Service';
    let serviceStatus = '';
    if (serviceId) {
      const svc = deal.services.find((s) => s.id === serviceId);
      if (!svc) {
        return res.status(404).json({ error: 'Service not found in this deal.' });
      }
      serviceName = svc.serviceName;
      serviceStatus = svc.status;
    }

    const typeDesc = communicationType || (serviceStatus === 'COMPLETED' ? 'Completion & Delivery' : 'Detail Acquisition / Status Update');

    await recordAuditLog({
      dealId: deal.id,
      userId: req.user.id,
      action: 'RM_CLIENT_COMMUNICATION',
      remarks: `RM ${req.user.fullName} communicated with client via ${channel || 'WhatsApp / Direct'} regarding service "${serviceName}" [Type: ${typeDesc}]. Notes: ${notes || 'Client communication recorded.'}`,
    });

    return res.json({ message: 'Client communication recorded in CRM.' });
  } catch (error) {
    console.error('RM communication error:', error);
    return res.status(500).json({ error: 'Failed to record communication.' });
  }
});

// -----------------------------------------------------------------------------
// DELETE /api/deals/:id - Delete a Deal and all its related records
// -----------------------------------------------------------------------------
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found.' });
    }

    // Admins and BDM owners can delete
    if (req.user.role !== 'ADMIN' && req.user.id !== deal.bdmId && req.user.role !== 'BDM') {
      return res.status(403).json({ error: 'Permission denied. Only Admins or BDMs can delete deals.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated payments
      await tx.payment.deleteMany({ where: { dealId: id } });

      // 2. Delete associated documents
      await tx.document.deleteMany({ where: { dealId: id } });

      // 3. Delete associated services
      await tx.dealService.deleteMany({ where: { dealId: id } });

      // 4. Delete associated renewal reminders
      await tx.renewalReminder.deleteMany({ where: { dealId: id } });

      // 5. Delete associated audit logs
      await tx.auditLog.deleteMany({ where: { dealId: id } });

      // 6. Delete deal itself (Prisma automatically disconnects many-to-many coBdms)
      await tx.deal.delete({ where: { id } });
    });

    return res.json({ message: `Deal ${deal.dealCode} deleted successfully.` });
  } catch (error) {
    console.error('Delete deal error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete deal.' });
  }
});

module.exports = router;
