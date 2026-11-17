const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const prisma = require('../lib/prisma');
const { uploadFile, getSignedUrl, BUCKET_NAME, supabase } = require('../lib/storage');
const { authenticateToken, requireRoles } = require('../middleware/auth');

// -----------------------------------------------------------------------------
// MULTER CONFIGURATION FOR QUOTATION UPLOAD (PDF & WORD ONLY)
// -----------------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const validExts = ['.pdf', '.doc', '.docx'];
    if (validExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file format (${ext}). Only PDF (.pdf) and Word (.doc, .docx) quotation documents are allowed.`));
    }
  },
});

// -----------------------------------------------------------------------------
// LEAD MANAGEMENT SYSTEM (LMS) CONFIGURATION & MASTER LISTS
// -----------------------------------------------------------------------------
const LEADERS_LIST = [
  'Jayesh Rohit',
  'Neel Boda',
  'Shashank Singhal',
  'Yash Rathod',
  'Vishishtta Dixit',
  'Management',
];

const BDMS_LIST = [
  'Sarika Jayesh',
  'Jayesh Rohit',
  'Neel Boda',
  'Shashank Singhal',
  'Krishna Parmar',
  'Akash Chauhan',
  'Bhavin Manghani',
  'Mauli Koshti',
  'Vishishta Dixit',
  'Mitali Shah',
  'Akash Rawal',
  'Darshak Fichadiya',
  'Manish Chauhan',
  'Vairagi Shah',
  'Pandya Parimal',
  'Rathod Mehul',
  'Neeraj Trivedi',
  'Parikh Kirtikumar Bhogilal',
  'Panchal Kunal',
  'Yash Rathod',
  'Pankaj Solanki',
  'Rahul Sharma',
];

const CLOSER_STATUS_LIST = [
  'Self Closer',
  'Lead Sharing',
];

const CLIENT_STATUS_LIST = [
  'Hot',
  'Warm',
  'Lost',
];

const SOURCING_STATUS_LIST = [
  'Dialer',
  'Mail',
  'Rohit Lead',
  'CA/Consultant',
  'Self Sourcing',
];

const MEETING_STATUS_LIST = [
  'Google/Team Meet',
  'Conference Call',
  'Document Received',
  'Physical Meeting',
];

const LEAD_STAGES_LIST = [
  'OPEN',
  'FOLLOW_UP',
  'MEETING_SCHEDULED',
  'DOCUMENT_COLLECTED',
  'CLOSED_WON',
  'CLOSED_LOST',
];

const EXACT_10_DIGIT_PHONE_REGEX = /^[6-9]\d{9}$/;

/**
 * Access Control Helper: Checks if a user has permission to access a specific lead
 */
function userCanAccessLead(lead, user) {
  if (!user || !lead) return false;
  if (user.role === 'ADMIN') return true;

  const userName = (user.fullName || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
  const bdm1 = (lead.bdmName1 || '').toLowerCase();
  const bdm2 = (lead.bdmName2 || '').toLowerCase();
  const leader = (lead.leaderName || '').toLowerCase();
  const isCreator = lead.createdById === user.id;

  if (isCreator) return true;
  if (bdm1 && (bdm1.includes(userName) || userName.includes(bdm1))) return true;
  if (bdm2 && (bdm2.includes(userName) || userName.includes(bdm2))) return true;
  if ((lead.closerStatus || '').includes('Lead Sharing') && (leader.includes(userName) || userName.includes(leader))) return true;

  return false;
}

// -----------------------------------------------------------------------------
// AUTOMATIC TABLE INITIALIZATION (PostgreSQL)
// -----------------------------------------------------------------------------
let tableReady = false;
async function ensureLeadsTable() {
  if (tableReady) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "leads" (
        "id" TEXT PRIMARY KEY,
        "companyName" TEXT NOT NULL,
        "directorName" TEXT,
        "mobileNo" TEXT NOT NULL,
        "emailId" TEXT,
        "leaderName" TEXT NOT NULL,
        "bdmName1" TEXT NOT NULL,
        "bdmName2" TEXT,
        "closerStatus" TEXT NOT NULL,
        "sourcingStatus" TEXT NOT NULL,
        "meetingStatus" TEXT NOT NULL,
        "meetingDate" TIMESTAMP(3),
        "clientStatus" TEXT NOT NULL DEFAULT 'Warm',
        "expectedDateOfCloser" TIMESTAMP(3),
        "leadStatus" TEXT NOT NULL DEFAULT 'OPEN',
        "dealValue" DECIMAL(12, 2),
        "remarks" TEXT,
        "quotationFileUrl" TEXT,
        "quotationFileName" TEXT,
        "quotationFileSize" INTEGER,
        "createdById" TEXT,
        "followUps" JSONB DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure columns exist on previously created tables
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE "leads" ADD COLUMN "quotationFileUrl" TEXT;
        EXCEPTION WHEN duplicate_column THEN END;
        BEGIN
          ALTER TABLE "leads" ADD COLUMN "quotationFileName" TEXT;
        EXCEPTION WHEN duplicate_column THEN END;
        BEGIN
          ALTER TABLE "leads" ADD COLUMN "quotationFileSize" INTEGER;
        EXCEPTION WHEN duplicate_column THEN END;
        BEGIN
          ALTER TABLE "leads" ADD COLUMN "clientStatus" TEXT DEFAULT 'Warm';
        EXCEPTION WHEN duplicate_column THEN END;
        BEGIN
          ALTER TABLE "leads" ADD COLUMN "meetingDate" TIMESTAMP(3);
        EXCEPTION WHEN duplicate_column THEN END;
        BEGIN
          ALTER TABLE "leads" ADD COLUMN "followUps" JSONB DEFAULT '[]'::jsonb;
        EXCEPTION WHEN duplicate_column THEN END;
      END $$;
    `);

    tableReady = true;
  } catch (err) {
    console.error('[LMS] Warning: Could not ensure leads table via raw SQL:', err.message);
  }
}

// -----------------------------------------------------------------------------
// GET /api/leads/meta - Returns Master Configuration Lists
// -----------------------------------------------------------------------------
router.get('/meta', authenticateToken, (req, res) => {
  return res.json({
    leaders: LEADERS_LIST,
    bdms: BDMS_LIST,
    closerStatuses: CLOSER_STATUS_LIST,
    clientStatuses: CLIENT_STATUS_LIST,
    sourcingStatuses: SOURCING_STATUS_LIST,
    meetingStatuses: MEETING_STATUS_LIST,
    leadStages: LEAD_STAGES_LIST,
  });
});

// -----------------------------------------------------------------------------
// GET /api/leads - Fetch Leads with Filtering & Analytics
// -----------------------------------------------------------------------------
router.get('/', authenticateToken, requireRoles('BDM', 'ADMIN'), async (req, res) => {
  try {
    await ensureLeadsTable();

    const {
      scope, // 'my' | 'all'
      leaderName,
      bdmName,
      closerStatus,
      clientStatus,
      sourcingStatus,
      meetingStatus,
      leadStatus,
      search,
    } = req.query;

    const isAdmin = req.user.role === 'ADMIN';
    const isBdmOnly = req.user.role === 'BDM';

    // Build SQL Query conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // RBAC: If BDM and scope is 'my' (or default for BDM), strictly restrict to:
    // 1. Their own leads (as BDM-1, BDM-2, or creator)
    // 2. Leads where closerStatus = 'Lead Sharing' and the user is the assigned Leader
    if (isBdmOnly || scope === 'my') {
      const userFullName = (req.user.fullName || '').replace(/\s*\([^)]*\)/g, '').trim();
      const targetBdm = (!isBdmOnly && req.query.myBdmName && req.query.myBdmName.trim()) 
        ? req.query.myBdmName.trim() 
        : userFullName;
      const targetLeader = (!isBdmOnly && req.query.myLeaderName && req.query.myLeaderName.trim())
        ? req.query.myLeaderName.trim()
        : userFullName;

      conditions.push(`(
        "bdmName1" ILIKE $${paramIndex} 
        OR "bdmName2" ILIKE $${paramIndex}
        OR ("createdById" = $${paramIndex + 1} AND ("bdmName1" ILIKE $${paramIndex} OR "bdmName1" = '' OR "bdmName1" IS NULL))
        OR ("closerStatus" ILIKE '%Lead Sharing%' AND ("leaderName" ILIKE $${paramIndex} OR "leaderName" ILIKE $${paramIndex + 2}))
      )`);
      params.push(`%${targetBdm}%`, req.user.id, `%${targetLeader}%`);
      paramIndex += 3;
    } else if (bdmName && bdmName !== 'ALL') {
      conditions.push(`("bdmName1" = $${paramIndex} OR "bdmName2" = $${paramIndex})`);
      params.push(bdmName);
      paramIndex++;
    }

    if (leaderName && leaderName !== 'ALL') {
      conditions.push(`"leaderName" = $${paramIndex}`);
      params.push(leaderName);
      paramIndex++;
    }

    if (closerStatus && closerStatus !== 'ALL') {
      conditions.push(`"closerStatus" = $${paramIndex}`);
      params.push(closerStatus);
      paramIndex++;
    }

    if (clientStatus && clientStatus !== 'ALL') {
      conditions.push(`"clientStatus" ILIKE $${paramIndex}`);
      params.push(clientStatus);
      paramIndex++;
    }

    if (sourcingStatus && sourcingStatus !== 'ALL') {
      conditions.push(`"sourcingStatus" = $${paramIndex}`);
      params.push(sourcingStatus);
      paramIndex++;
    }

    if (meetingStatus && meetingStatus !== 'ALL') {
      conditions.push(`"meetingStatus" = $${paramIndex}`);
      params.push(meetingStatus);
      paramIndex++;
    }

    if (leadStatus && leadStatus !== 'ALL') {
      conditions.push(`"leadStatus" = $${paramIndex}`);
      params.push(leadStatus);
      paramIndex++;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(`("companyName" ILIKE $${paramIndex} OR "directorName" ILIKE $${paramIndex} OR "mobileNo" ILIKE $${paramIndex} OR "emailId" ILIKE $${paramIndex} OR "remarks" ILIKE $${paramIndex})`);
      params.push(q);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM "leads" ${whereClause} ORDER BY "createdAt" DESC`;

    const leads = await prisma.$queryRawUnsafe(sql, ...params);

    // Compute Analytics on the fetched dataset
    const now = new Date();
    const analytics = {
      totalLeads: leads.length,
      byMeetingStatus: {},
      bySourcingStatus: {},
      byCloserStatus: {},
      byClientStatus: { Hot: 0, Warm: 0, Lost: 0 },
      byLeader: {},
      byBdm: {},
      byStage: {},
      upcomingEdcCount: 0,
      overdueEdcCount: 0,
      totalEstimatedValue: 0,
      activeFunnelValue: 0,
      hotFunnelValue: 0,
      warmFunnelValue: 0,
      lostFunnelValue: 0,
      convertedFunnelValue: 0,
      bdmFunnel: {},
    };

    // Initialize counts with 0 for all standard options
    MEETING_STATUS_LIST.forEach((s) => (analytics.byMeetingStatus[s] = 0));
    SOURCING_STATUS_LIST.forEach((s) => (analytics.bySourcingStatus[s] = 0));
    CLOSER_STATUS_LIST.forEach((s) => (analytics.byCloserStatus[s] = 0));
    LEADERS_LIST.forEach((l) => (analytics.byLeader[l] = 0));
    BDMS_LIST.forEach((b) => {
      analytics.bdmFunnel[b] = { count: 0, totalValue: 0, hotValue: 0, warmValue: 0, lostValue: 0 };
    });

    leads.forEach((l) => {
      // Client status
      const rawCs = (l.clientStatus || 'Warm').toLowerCase();
      if (l.clientStatus) {
        const cs = l.clientStatus.charAt(0).toUpperCase() + l.clientStatus.slice(1).toLowerCase();
        analytics.byClientStatus[cs] = (analytics.byClientStatus[cs] || 0) + 1;
      }
      // Meeting status
      if (l.meetingStatus) {
        analytics.byMeetingStatus[l.meetingStatus] = (analytics.byMeetingStatus[l.meetingStatus] || 0) + 1;
      }
      // Sourcing status
      if (l.sourcingStatus) {
        analytics.bySourcingStatus[l.sourcingStatus] = (analytics.bySourcingStatus[l.sourcingStatus] || 0) + 1;
      }
      // Closer status
      if (l.closerStatus) {
        analytics.byCloserStatus[l.closerStatus] = (analytics.byCloserStatus[l.closerStatus] || 0) + 1;
      }
      // Leader
      if (l.leaderName) {
        analytics.byLeader[l.leaderName] = (analytics.byLeader[l.leaderName] || 0) + 1;
      }
      // BDM
      if (l.bdmName1) {
        analytics.byBdm[l.bdmName1] = (analytics.byBdm[l.bdmName1] || 0) + 1;
      }
      // Stage
      const stage = l.leadStatus || 'OPEN';
      analytics.byStage[stage] = (analytics.byStage[stage] || 0) + 1;

      // Deal value and Funnel aggregation
      const val = l.dealValue ? parseFloat(l.dealValue) || 0 : 0;
      if (val > 0) {
        analytics.totalEstimatedValue += val;
        if (rawCs === 'hot') analytics.hotFunnelValue += val;
        else if (rawCs === 'warm') analytics.warmFunnelValue += val;
        else if (rawCs === 'lost') analytics.lostFunnelValue += val;

        if (stage === 'CLOSED_WON') {
          analytics.convertedFunnelValue += val;
        } else if (stage !== 'CLOSED_LOST') {
          analytics.activeFunnelValue += val;
        }
      }

      // Aggregate into bdmFunnel
      const bdm1 = (l.bdmName1 || '').trim();
      if (bdm1) {
        if (!analytics.bdmFunnel[bdm1]) {
          analytics.bdmFunnel[bdm1] = { count: 0, totalValue: 0, hotValue: 0, warmValue: 0, lostValue: 0 };
        }
        analytics.bdmFunnel[bdm1].count++;
        analytics.bdmFunnel[bdm1].totalValue += val;
        if (rawCs === 'hot') analytics.bdmFunnel[bdm1].hotValue += val;
        else if (rawCs === 'warm') analytics.bdmFunnel[bdm1].warmValue += val;
        else if (rawCs === 'lost') analytics.bdmFunnel[bdm1].lostValue += val;
      }

      // EDC Urgency
      if (l.expectedDateOfCloser) {
        const edcDate = new Date(l.expectedDateOfCloser);
        const diffDays = Math.ceil((edcDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0 && l.leadStatus !== 'CLOSED_WON' && l.leadStatus !== 'CLOSED_LOST') {
          analytics.overdueEdcCount++;
        } else if (diffDays >= 0 && diffDays <= 7 && l.leadStatus !== 'CLOSED_WON') {
          analytics.upcomingEdcCount++;
        }
      }
    });

    return res.json({
      leads,
      analytics,
      userRole: req.user.role,
      userName: req.user.fullName,
    });
  } catch (error) {
    console.error('[LMS] Fetch leads error:', error);
    return res.status(500).json({ error: 'Failed to retrieve LMS leads: ' + error.message });
  }
});

// -----------------------------------------------------------------------------
// POST /api/leads - Create a New Lead (WITH MANDATORY QUOTATION FILE & CLIENT STATUS)
// -----------------------------------------------------------------------------
router.post('/', authenticateToken, requireRoles('BDM', 'ADMIN'), upload.single('quotation'), async (req, res) => {
  try {
    await ensureLeadsTable();

    const {
      companyName,
      directorName,
      mobileNo,
      emailId,
      leaderName,
      bdmName1,
      bdmName2,
      closerStatus,
      clientStatus,
      sourcingStatus,
      meetingStatus,
      meetingDate,
      expectedDateOfCloser,
      leadStatus,
      dealValue,
      remarks,
    } = req.body;

    const file = req.file;

    // MANDATORY VALIDATION: Quotation file is required
    if (!file) {
      return res.status(400).json({
        error: 'Quotation file is mandatory. Please attach a quotation document in PDF (.pdf) or Word (.doc, .docx) format.',
      });
    }

    // Validate Required Text Fields
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'Company Name is mandatory.' });
    }
    const cleanPhone = (mobileNo || '').trim();
    if (!cleanPhone) {
      return res.status(400).json({ error: 'Mobile Number is mandatory.' });
    }
    if (!EXACT_10_DIGIT_PHONE_REGEX.test(cleanPhone)) {
      return res.status(400).json({
        error: 'Invalid mobile number. Must be exactly 10 digits without symbols, spaces, or country code (starting with 6-9).',
      });
    }

    // Duplicate check by mobile number
    const [existingPhoneLead] = await prisma.$queryRawUnsafe(
      `SELECT "id", "companyName" FROM "leads" WHERE "mobileNo" = $1 LIMIT 1`,
      cleanPhone
    );
    if (existingPhoneLead) {
      return res.status(400).json({
        error: `A lead with phone number ${cleanPhone} already exists (${existingPhoneLead.companyName}).`,
      });
    }

    if (!leaderName) {
      return res.status(400).json({ error: "Leader's Name is mandatory." });
    }
    if (!bdmName1) {
      return res.status(400).json({ error: "BDM's Name - I is mandatory." });
    }
    if (!closerStatus) {
      return res.status(400).json({ error: 'Closer Status is mandatory.' });
    }
    if (!sourcingStatus) {
      return res.status(400).json({ error: 'Sourcing Status is mandatory.' });
    }
    if (!meetingStatus) {
      return res.status(400).json({ error: 'Meeting Status is mandatory.' });
    }
    if (leadStatus && !LEAD_STAGES_LIST.includes(leadStatus)) {
      return res.status(400).json({
        error: `Invalid leadStatus "${leadStatus}". Allowed values: ${LEAD_STAGES_LIST.join(', ')}`,
      });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.pdf', '.doc', '.docx'];
    if (!validExtensions.includes(ext)) {
      return res.status(400).json({
        error: `Invalid file extension "${ext}". Quotation must be in PDF (.pdf) or Word (.doc, .docx) format.`,
      });
    }

    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const localDir = path.join(__dirname, '../../uploads/quotations');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const localFileName = `${Date.now()}_${cleanFileName}`;
    const localFilePath = path.join(localDir, localFileName);
    fs.writeFileSync(localFilePath, file.buffer);

    let quotationFileUrl = `/uploads/quotations/${localFileName}`;

    // Also attempt Supabase Storage upload
    try {
      const storagePath = `leads/quotations/${localFileName}`;
      const mimeType = ext === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype || mimeType,
          upsert: false,
        });

      if (!error && data?.path) {
        quotationFileUrl = data.path;
      }
    } catch (e) {
      console.warn('[LMS] Supabase storage upload skipped/failed, using local fallback:', e.message);
    }

    const rawClientStatus = (clientStatus || 'Warm').trim().toLowerCase();
    let finalClientStatus = 'Warm';
    if (rawClientStatus === 'hot') finalClientStatus = 'Hot';
    else if (rawClientStatus === 'lost') finalClientStatus = 'Lost';
    else if (rawClientStatus === 'warm') finalClientStatus = 'Warm';

    const id = crypto.randomUUID();
    const edc = expectedDateOfCloser ? new Date(expectedDateOfCloser) : null;
    const parsedMeetingDate = meetingDate ? new Date(meetingDate) : null;
    const finalStage = leadStatus || 'OPEN';
    const finalValue = dealValue ? parseFloat(dealValue) : null;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "leads" (
        "id", "companyName", "directorName", "mobileNo", "emailId",
        "leaderName", "bdmName1", "bdmName2", "closerStatus", "sourcingStatus",
        "meetingStatus", "meetingDate", "clientStatus", "expectedDateOfCloser", "leadStatus", "dealValue",
        "remarks", "quotationFileUrl", "quotationFileName", "quotationFileSize",
        "createdById", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())`,
      id,
      companyName.trim(),
      directorName ? directorName.trim() : null,
      mobileNo.trim(),
      emailId ? emailId.trim() : null,
      leaderName,
      bdmName1,
      bdmName2 && bdmName2.trim() ? bdmName2.trim() : null,
      closerStatus,
      sourcingStatus,
      meetingStatus,
      parsedMeetingDate,
      finalClientStatus,
      edc,
      finalStage,
      finalValue,
      remarks ? remarks.trim() : null,
      quotationFileUrl,
      file.originalname,
      file.size,
      req.user.id
    );

    const [created] = await prisma.$queryRawUnsafe(`SELECT * FROM "leads" WHERE "id" = $1`, id);

    return res.status(201).json({
      message: 'Lead created successfully with quotation document.',
      lead: created,
    });
  } catch (error) {
    console.error('[LMS] Create lead error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create lead.' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/leads/:id/quotation - Download or View Quotation Document
// -----------------------------------------------------------------------------
router.get('/:id/quotation', authenticateToken, async (req, res) => {
  try {
    await ensureLeadsTable();
    const { id } = req.params;

    const [lead] = await prisma.$queryRawUnsafe(`SELECT * FROM "leads" WHERE "id" = $1`, id);
    if (!lead || !lead.quotationFileUrl) {
      return res.status(404).json({ error: 'Quotation file not found for this lead.' });
    }

    // RBAC: Verify user has permission to access this lead's quotation
    if (!userCanAccessLead(lead, req.user)) {
      return res.status(403).json({ error: 'You are not authorized to view or download this quotation.' });
    }

    const filename = lead.quotationFileName || 'quotation';
    const isInline = req.query.inline === 'true';
    const isJsonAccept = req.headers.accept?.includes('application/json');

    // 1. Check local filesystem first
    if (lead.quotationFileUrl.startsWith('/uploads/')) {
      const fullPath = path.join(__dirname, '../..', lead.quotationFileUrl);
      if (fs.existsSync(fullPath)) {
        if (isInline) {
          res.setHeader('Content-Type', filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
          res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
          return fs.createReadStream(fullPath).pipe(res);
        }
        return res.download(fullPath, filename);
      }
    }

    // 2. Check local uploads folder for matching filename timestamp
    const localDir = path.join(__dirname, '../../uploads/quotations');
    if (fs.existsSync(localDir)) {
      const files = fs.readdirSync(localDir);
      const matched = files.find((f) => f.includes(lead.quotationFileName));
      if (matched) {
        const fullPath = path.join(localDir, matched);
        if (isInline) {
          res.setHeader('Content-Type', filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
          res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
          return fs.createReadStream(fullPath).pipe(res);
        }
        return res.download(path.join(localDir, matched), filename);
      }
    }

    // 3. Check Supabase Storage signed URL
    try {
      const signedUrl = await getSignedUrl(lead.quotationFileUrl);
      if (isInline && isJsonAccept) {
        return res.json({ signedUrl, fileName: filename });
      }
      return res.redirect(signedUrl);
    } catch (err) {
      console.error('[LMS] Signed URL error:', err);
      return res.status(500).json({ error: 'Could not access quotation from storage: ' + err.message });
    }
  } catch (error) {
    console.error('[LMS] Quotation retrieval error:', error);
    return res.status(500).json({ error: 'Failed to retrieve quotation: ' + error.message });
  }
});

// -----------------------------------------------------------------------------
// PATCH /api/leads/:id - Update Lead
// -----------------------------------------------------------------------------
router.patch('/:id', authenticateToken, requireRoles('BDM', 'ADMIN'), async (req, res) => {
  try {
    await ensureLeadsTable();

    const { id } = req.params;
    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM "leads" WHERE "id" = $1`, id);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const currentLead = existing[0];
    if (!userCanAccessLead(currentLead, req.user)) {
      return res.status(403).json({ error: 'You are not authorized to update this lead.' });
    }

    const {
      companyName,
      directorName,
      mobileNo,
      emailId,
      leaderName,
      bdmName1,
      bdmName2,
      closerStatus,
      clientStatus,
      sourcingStatus,
      meetingStatus,
      meetingDate,
      expectedDateOfCloser,
      leadStatus,
      dealValue,
      remarks,
    } = req.body;

    const updates = [];
    const params = [];
    let pIdx = 1;

    if (companyName !== undefined) {
      updates.push(`"companyName" = $${pIdx++}`);
      params.push(companyName.trim());
    }
    if (directorName !== undefined) {
      updates.push(`"directorName" = $${pIdx++}`);
      params.push(directorName ? directorName.trim() : null);
    }
    if (mobileNo !== undefined) {
      const cleanPhone = mobileNo.trim();
      if (!EXACT_10_DIGIT_PHONE_REGEX.test(cleanPhone)) {
        return res.status(400).json({
          error: 'Invalid mobile number. Must be exactly 10 digits without symbols, spaces, or country code (starting with 6-9).',
        });
      }
      updates.push(`"mobileNo" = $${pIdx++}`);
      params.push(cleanPhone);
    }
    if (emailId !== undefined) {
      updates.push(`"emailId" = $${pIdx++}`);
      params.push(emailId ? emailId.trim() : null);
    }
    if (leaderName !== undefined) {
      updates.push(`"leaderName" = $${pIdx++}`);
      params.push(leaderName);
    }
    if (bdmName1 !== undefined) {
      updates.push(`"bdmName1" = $${pIdx++}`);
      params.push(bdmName1);
    }
    if (bdmName2 !== undefined) {
      updates.push(`"bdmName2" = $${pIdx++}`);
      params.push(bdmName2 ? bdmName2.trim() : null);
    }
    if (closerStatus !== undefined) {
      updates.push(`"closerStatus" = $${pIdx++}`);
      params.push(closerStatus);
    }
    if (clientStatus !== undefined) {
      const raw = (clientStatus || 'Warm').trim().toLowerCase();
      let norm = 'Warm';
      if (raw === 'hot') norm = 'Hot';
      else if (raw === 'lost') norm = 'Lost';
      else if (raw === 'warm') norm = 'Warm';
      updates.push(`"clientStatus" = $${pIdx++}`);
      params.push(norm);
    }
    if (sourcingStatus !== undefined) {
      updates.push(`"sourcingStatus" = $${pIdx++}`);
      params.push(sourcingStatus);
    }
    if (meetingStatus !== undefined) {
      updates.push(`"meetingStatus" = $${pIdx++}`);
      params.push(meetingStatus);
    }
    if (meetingDate !== undefined) {
      updates.push(`"meetingDate" = $${pIdx++}`);
      params.push(meetingDate ? new Date(meetingDate) : null);
    }
    if (expectedDateOfCloser !== undefined) {
      updates.push(`"expectedDateOfCloser" = $${pIdx++}`);
      params.push(expectedDateOfCloser ? new Date(expectedDateOfCloser) : null);
    }
    if (leadStatus !== undefined) {
      if (!LEAD_STAGES_LIST.includes(leadStatus)) {
        return res.status(400).json({ error: `Invalid leadStatus "${leadStatus}". Allowed values: ${LEAD_STAGES_LIST.join(', ')}` });
      }
      updates.push(`"leadStatus" = $${pIdx++}`);
      params.push(leadStatus);
    }
    if (dealValue !== undefined) {
      updates.push(`"dealValue" = $${pIdx++}`);
      params.push(dealValue ? parseFloat(dealValue) : null);
    }
    if (remarks !== undefined) {
      updates.push(`"remarks" = $${pIdx++}`);
      params.push(remarks ? remarks.trim() : null);
    }

    updates.push(`"updatedAt" = NOW()`);

    params.push(id);
    const updateSql = `UPDATE "leads" SET ${updates.join(', ')} WHERE "id" = $${pIdx} RETURNING *`;

    const [updated] = await prisma.$queryRawUnsafe(updateSql, ...params);

    return res.json({
      message: 'Lead updated successfully.',
      lead: updated,
    });
  } catch (error) {
    console.error('[LMS] Update lead error:', error);
    return res.status(500).json({ error: 'Failed to update lead: ' + error.message });
  }
});

// -----------------------------------------------------------------------------
// POST /api/leads/:id/follow-up - Add Frozen Follow-up Status Entry
// -----------------------------------------------------------------------------
router.post('/:id/follow-up', authenticateToken, requireRoles('BDM', 'ADMIN'), async (req, res) => {
  try {
    await ensureLeadsTable();
    const { id } = req.params;
    const { date, status, remarks } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Follow-up date is mandatory.' });
    }
    if (!status) {
      return res.status(400).json({ error: 'Follow-up status is mandatory.' });
    }

    const validStatuses = ['Hot', 'Warm', 'Closed', 'Lost'];
    const matchedStatus = validStatuses.find((s) => s.toLowerCase() === status.trim().toLowerCase());
    if (!matchedStatus) {
      return res.status(400).json({ error: `Invalid status "${status}". Allowed: ${validStatuses.join(', ')}` });
    }

    const [lead] = await prisma.$queryRawUnsafe(`SELECT * FROM "leads" WHERE "id" = $1`, id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    if (!userCanAccessLead(lead, req.user)) {
      return res.status(403).json({ error: 'You are not authorized to add follow-up to this lead.' });
    }

    // New immutable/frozen entry
    const newEntry = {
      id: crypto.randomUUID(),
      date: date,
      status: matchedStatus,
      remarks: remarks && remarks.trim() ? remarks.trim() : null,
      addedAt: new Date().toISOString(),
      addedById: req.user.id,
      addedByName: req.user.fullName,
    };

    // Synchronize clientStatus and leadStatus accordingly
    let finalClientStatus = lead.clientStatus || 'Warm';
    let finalLeadStatus = lead.leadStatus || 'OPEN';

    if (['Hot', 'Warm', 'Lost'].includes(matchedStatus)) {
      finalClientStatus = matchedStatus;
    } else if (matchedStatus === 'Closed') {
      finalLeadStatus = 'CLOSED_WON';
    }

    // Atomic SQL JSONB append to prevent race conditions
    await prisma.$executeRawUnsafe(
      `UPDATE "leads" SET 
        "followUps" = COALESCE("followUps", '[]'::jsonb) || $1::jsonb,
        "clientStatus" = $2,
        "leadStatus" = $3,
        "updatedAt" = NOW()
      WHERE "id" = $4`,
      JSON.stringify([newEntry]),
      finalClientStatus,
      finalLeadStatus,
      id
    );

    const [updated] = await prisma.$queryRawUnsafe(`SELECT * FROM "leads" WHERE "id" = $1`, id);
    const updatedFollowUps = typeof updated.followUps === 'string' ? JSON.parse(updated.followUps) : (updated.followUps || []);

    return res.status(200).json({
      message: `Follow-up on ${date} (${matchedStatus}) recorded and frozen successfully.`,
      followUp: newEntry,
      followUps: updatedFollowUps,
      lead: updated,
    });
  } catch (error) {
    console.error('[LMS] Follow-up recording error:', error);
    return res.status(500).json({ error: 'Failed to record follow-up: ' + error.message });
  }
});

// -----------------------------------------------------------------------------
// DELETE /api/leads/:id - Delete a Lead
// -----------------------------------------------------------------------------
router.delete('/:id', authenticateToken, requireRoles('BDM', 'ADMIN'), async (req, res) => {
  try {
    await ensureLeadsTable();
    const { id } = req.params;

    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM "leads" WHERE "id" = $1`, id);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    // RBAC: BDM can only delete their own leads; Admin can delete any
    if (req.user.role === 'BDM' && existing[0].createdById !== req.user.id) {
      return res.status(403).json({ error: 'You are only authorized to delete leads you created.' });
    }

    await prisma.$executeRawUnsafe(`DELETE FROM "leads" WHERE "id" = $1`, id);

    return res.json({ message: 'Lead deleted successfully.', id });
  } catch (error) {
    console.error('[LMS] Delete lead error:', error);
    return res.status(500).json({ error: 'Failed to delete lead: ' + error.message });
  }
});

module.exports = router;
