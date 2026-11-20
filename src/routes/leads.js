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
  'Vishishta Dixit',
  'Yash Rathod',
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
  'Panchal Kunal',
  'Yash Rathod',
  'Pankaj Solanki',
  'Rishi Hemnani',
  'Vinay Raj',
  'Himanshu Goswami',
  'Jimit Panchal',
];

const BDM_LEADER_MAP = {
  'Sarika Jayesh': 'Jayesh Rohit',
  'Jayesh Rohit': 'Jayesh Rohit',
  'Neel Boda': 'Neel Boda',
  'Shashank Singhal': 'Shashank Singhal',
  'Krishna Parmar': 'Vishishta Dixit',
  'Akash Chauhan': 'Vishishta Dixit',
  'Bhavin Manghani': 'Shashank Singhal',
  'Mauli Koshti': 'Shashank Singhal',
  'Vishishta Dixit': 'Vishishta Dixit',
  'Mitali Shah': 'Management',
  'Akash Rawal': 'Jayesh Rohit',
  'Darshak Fichadiya': 'Jayesh Rohit',
  'Manish Chauhan': 'Vishishta Dixit',
  'Vairagi Shah': 'Yash Rathod',
  'Pandya Parimal': 'Yash Rathod',
  'Rathod Mehul': 'Yash Rathod',
  'Panchal Kunal': 'Shashank Singhal',
  'Yash Rathod': 'Yash Rathod',
  'Pankaj Solanki': 'Management',
  'Rishi Hemnani': 'Yash Rathod',
  'Vinay Raj': 'Vishishta Dixit',
  'Himanshu Goswami': 'Vishishta Dixit',
  'Jimit Panchal': 'Shashank Singhal',
};

const BDM_TARGET_MAP = {
  'Sarika Jayesh': 180000,
  'Jayesh Rohit': 200000,
  'Neel Boda': 1271,
  'Shashank Singhal': 240000,
  'Krishna Parmar': 140000,
  'Akash Chauhan': 148000,
  'Bhavin Manghani': 100000,
  'Mauli Koshti': 100000,
  'Vishishta Dixit': 240000,
  'Mitali Shah': 80000,
  'Akash Rawal': 2000,
  'Darshak Fichadiya': 60000,
  'Manish Chauhan': 100000,
  'Vairagi Shah': 280000,
  'Pandya Parimal': 105000,
  'Rathod Mehul': 3750,
  'Panchal Kunal': 96000,
  'Yash Rathod': 300000,
  'Pankaj Solanki': 200000,
  'Rishi Hemnani': 75000,
  'Vinay Raj': 62500,
  'Himanshu Goswami': 57500,
  'Jimit Panchal': 25000,
};

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
  if (leader && (leader.includes(userName) || userName.includes(leader))) return true;
  const bdm1Key = Object.keys(BDM_LEADER_MAP).find((b) => b.toLowerCase() === bdm1);
  if (bdm1Key && BDM_LEADER_MAP[bdm1Key]) {
    const ldrClean = BDM_LEADER_MAP[bdm1Key].toLowerCase();
    if (ldrClean.includes(userName) || userName.includes(ldrClean)) return true;
  }

  return false;
}

/**
 * Date Validation Helper: Validates that a date is not strictly in the past (before today in IST)
 */
function isBeforeToday(dateInput) {
  if (!dateInput) return false;
  let dateStr = '';
  if (typeof dateInput === 'string') {
    dateStr = dateInput.includes('T') ? dateInput.split('T')[0] : dateInput.trim();
  } else if (dateInput instanceof Date) {
    dateStr = dateInput.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return false;
  const targetDateOnly = dateStr.substring(0, 10);
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return targetDateOnly < todayStr;
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
        BEGIN
          ALTER TABLE "leads" ADD COLUMN "nextFollowUpDate" TIMESTAMP(3);
        EXCEPTION WHEN duplicate_column THEN END;
        BEGIN
          UPDATE "leads"
          SET "nextFollowUpDate" = (
            SELECT (elem->>'date')::timestamp
            FROM jsonb_array_elements("followUps") AS elem
            WHERE elem->>'date' IS NOT NULL AND elem->>'date' != ''
            ORDER BY (elem->>'date')::timestamp DESC
            LIMIT 1
          )
          WHERE "nextFollowUpDate" IS NULL AND "followUps" IS NOT NULL AND jsonb_array_length("followUps") > 0;
        EXCEPTION WHEN OTHERS THEN END;
        BEGIN
          UPDATE "leads"
          SET "nextFollowUpDate" = COALESCE("meetingDate", "expectedDateOfCloser", "createdAt")
          WHERE "nextFollowUpDate" IS NULL;
        EXCEPTION WHEN OTHERS THEN END;
        BEGIN
          ALTER TABLE "leads" ADD COLUMN "reassignmentHistory" JSONB DEFAULT '[]'::jsonb;
        EXCEPTION WHEN duplicate_column THEN END;
      END $$;
    `);

    // Ensure lead_notifications table exists for revocation and assignment alerts
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "lead_notifications" (
        "id" TEXT PRIMARY KEY,
        "targetBdmName" TEXT NOT NULL,
        "targetUserId" TEXT,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "leadId" TEXT,
        "companyName" TEXT,
        "reason" TEXT,
        "isRead" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "idx_lead_notif_target" ON "lead_notifications"("targetBdmName")
      `);
    } catch (e) {
      // Index might already exist
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "idx_lead_notif_created" ON "lead_notifications"("createdAt" DESC)
      `);
    } catch (e) {
      // Index might already exist
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "idx_leads_mobile_no_unique" ON "leads"("mobileNo")
      `);
    } catch (e) {
      // Index might already exist
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "leaderName" TEXT;
      `);
    } catch (e) {
      // Column might already exist
    }

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
      teamMember,
      todayMeetings,
      monthFilter, // 'ALL' | 'THIS_MONTH' | 'NEXT_MONTH'
    } = req.query;

    const isAdmin = req.user.role === 'ADMIN';
    const isBdmOnly = req.user.role === 'BDM';

    // Compute calendar bounds for This Month and Next Month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 to 11

    const startOfThisMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    const endOfThisMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const nextMonth = (currentMonth + 1) % 12;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const startOfNextMonth = new Date(nextYear, nextMonth, 1, 0, 0, 0, 0);
    const endOfNextMonth = new Date(nextYear, nextMonth + 1, 0, 23, 59, 59, 999);

    // Fetch all BDM and Leader data directly from the DB users table
    let dbUsers = [];
    try {
      dbUsers = await prisma.$queryRawUnsafe(`
        SELECT "id", "fullName", "leaderName", "salesTarget"::float as "salesTarget"
        FROM "users"
        WHERE "role" = 'BDM' AND "isActive" = true
      `);
    } catch (e) {
      console.warn('[LMS] Warning: could not query users table for BDMs:', e.message);
    }

    const dbBdmLeaderMap = {};
    const dbBdmTargetMap = {};
    const dbBdmsList = [];
    const dbLeadersSet = new Set(LEADERS_LIST);

    dbUsers.forEach((u) => {
      const cleanName = (u.fullName || '').replace(/\s*\([^)]*\)/g, '').trim();
      if (!cleanName) return;
      dbBdmsList.push(cleanName);
      if (u.salesTarget) dbBdmTargetMap[cleanName] = parseFloat(u.salesTarget);
      if (u.leaderName) {
        const cleanLeader = u.leaderName.replace(/\s*\([^)]*\)/g, '').trim();
        dbBdmLeaderMap[cleanName] = cleanLeader;
        dbLeadersSet.add(cleanLeader);
      }
    });

    const activeLeadersList = Array.from(dbLeadersSet);

    const userFullName = (req.user.fullName || '').replace(/\s*\([^)]*\)/g, '').trim();
    const matchedLeader = activeLeadersList.find((l) => {
      const cl = l.toLowerCase().trim();
      const cu = userFullName.toLowerCase().trim();
      return cu.includes(cl) || cl.includes(cu);
    });
    const targetLeader = req.query.myLeaderName && req.query.myLeaderName.trim()
      ? req.query.myLeaderName.trim()
      : (matchedLeader || null);

    // Get team members for targetLeader directly from the DB users table
    let myTeamMemberNames = [];
    if (targetLeader) {
      const tl = targetLeader.toLowerCase().trim();
      myTeamMemberNames = dbUsers
        .filter((u) => {
          const uLeader = (u.leaderName || dbBdmLeaderMap[u.fullName] || BDM_LEADER_MAP[u.fullName] || '').toLowerCase().trim();
          const uName = (u.fullName || '').replace(/\s*\([^)]*\)/g, '').toLowerCase().trim();
          return (uLeader === tl || uLeader.includes(tl) || tl.includes(uLeader)) && uName !== tl;
        })
        .map((u) => (u.fullName || '').replace(/\s*\([^)]*\)/g, '').trim());

      // Fallback to static mapping if needed
      if (myTeamMemberNames.length === 0) {
        Object.entries(BDM_LEADER_MAP).forEach(([bdm, ldr]) => {
          const cl = ldr.toLowerCase().trim();
          const cb = bdm.toLowerCase().trim();
          if ((cl === tl || cl.includes(tl) || tl.includes(cl)) && cb !== tl) {
            myTeamMemberNames.push(bdm);
          }
        });
      }
    }

    // Build SQL Query conditions (Separated into Scope vs Table Filters)
    const scopeConditions = [];
    const scopeParams = [];
    let scopeParamIndex = 1;

    // RBAC: If BDM and scope is 'my' (or default for BDM):
    // 1. Their own leads (as BDM-1, BDM-2, or creator)
    // 2. If user is an LMS Leader, include all team member leads from DB
    if (isBdmOnly || scope === 'my') {
      const targetBdm = (!isBdmOnly && req.query.myBdmName && req.query.myBdmName.trim()) 
        ? req.query.myBdmName.trim() 
        : userFullName;

      if (targetLeader) {
        let teamMemberSql = '';
        if (myTeamMemberNames.length > 0) {
          const placeholders = myTeamMemberNames.map((_, i) => `$${scopeParamIndex + 3 + i}`).join(', ');
          teamMemberSql = ` OR "bdmName1" IN (${placeholders}) OR "bdmName2" IN (${placeholders})`;
        }

        scopeConditions.push(`(
          "bdmName1" ILIKE $${scopeParamIndex} 
          OR "bdmName2" ILIKE $${scopeParamIndex}
          OR ("createdById" = $${scopeParamIndex + 1} AND ("bdmName1" ILIKE $${scopeParamIndex} OR "bdmName1" = '' OR "bdmName1" IS NULL))
          OR "leaderName" ILIKE $${scopeParamIndex + 2}${teamMemberSql}
        )`);
        scopeParams.push(`%${targetBdm}%`, req.user.id, `%${targetLeader}%`, ...myTeamMemberNames);
        scopeParamIndex += 3 + myTeamMemberNames.length;
      } else {
        // Regular BDM: strictly their own leads only
        scopeConditions.push(`(
          "bdmName1" ILIKE $${scopeParamIndex} 
          OR "bdmName2" ILIKE $${scopeParamIndex}
          OR ("createdById" = $${scopeParamIndex + 1} AND ("bdmName1" ILIKE $${scopeParamIndex} OR "bdmName1" = '' OR "bdmName1" IS NULL))
        )`);
        scopeParams.push(`%${targetBdm}%`, req.user.id);
        scopeParamIndex += 2;
      }
    }

    const scopeWhereClause = scopeConditions.length > 0 ? `WHERE ${scopeConditions.join(' AND ')}` : '';
    
    // 1. Fetch lightweight summary rows for 100% accurate full-dataset analytics across ALL months & BDM Cockpit tracker
    const summarySql = `
      SELECT 
        "id", "companyName", "bdmName1", "bdmName2", "leaderName", "createdById",
        "closerStatus", "sourcingStatus", "meetingStatus", "meetingDate", 
        "clientStatus", "leadStatus", "dealValue", "expectedDateOfCloser",
        "followUps", "nextFollowUpDate", "createdAt"
      FROM "leads" ${scopeWhereClause}
      ORDER BY "createdAt" DESC
    `;
    const summaryRows = await prisma.$queryRawUnsafe(summarySql, ...scopeParams);

    // Target month filter: strictly default to THIS_MONTH
    const targetMonth = (monthFilter === 'NEXT_MONTH') ? 'NEXT_MONTH' : 'THIS_MONTH';

    // Compute Analytics on the full summary dataset
    const analytics = {
      totalLeads: 0,
      byMeetingStatus: {},
      bySourcingStatus: {},
      byCloserStatus: {},
      byClientStatus: { Hot: 0, Warm: 0, Lost: 0 },
      byLeader: {},
      byBdm: {},
      byStage: {},
      upcomingEdcCount: 0,
      overdueEdcCount: 0,
      pendingFollowupsCount: 0,
      totalEstimatedValue: 0,
      activeFunnelValue: 0,
      hotFunnelValue: 0,
      warmFunnelValue: 0,
      lostFunnelValue: 0,
      convertedFunnelValue: 0,
      bdmFunnel: {},
      monthMeta: {
        thisMonthLabel: startOfThisMonth.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        nextMonthLabel: startOfNextMonth.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        activeFilter: targetMonth,
      },
      thisMonthCount: 0,
      nextMonthCount: 0,
      thisMonthFunnel: 0,
      nextMonthFunnel: 0,
      myThisMonthCount: 0,
      myNextMonthCount: 0,
      myThisMonthFunnel: 0,
      myNextMonthFunnel: 0,
      myThisMonthHot: 0,
      myNextMonthHot: 0,
      myThisMonthWarm: 0,
      myNextMonthWarm: 0,
    };

    // Initialize counts with 0 for all standard options
    MEETING_STATUS_LIST.forEach((s) => (analytics.byMeetingStatus[s] = 0));
    SOURCING_STATUS_LIST.forEach((s) => (analytics.bySourcingStatus[s] = 0));
    CLOSER_STATUS_LIST.forEach((s) => (analytics.byCloserStatus[s] = 0));
    const activeLeaders = activeLeadersList.length > 0 ? activeLeadersList : LEADERS_LIST;
    const activeBdms = dbBdmsList.length > 0 ? dbBdmsList : BDMS_LIST;
    activeLeaders.forEach((l) => {
      analytics.byLeader[l] = 0;
      if (!analytics.bdmFunnel[l]) {
        analytics.bdmFunnel[l] = { count: 0, totalValue: 0, hotValue: 0, warmValue: 0, lostValue: 0 };
      }
    });
    activeBdms.forEach((b) => {
      if (!analytics.bdmFunnel[b]) {
        analytics.bdmFunnel[b] = { count: 0, totalValue: 0, hotValue: 0, warmValue: 0, lostValue: 0 };
      }
    });

    const userFullNameClean = (req.user.fullName || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    const targetLeaderClean = (targetLeader || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    const leaderKey = targetLeaderClean || userFullNameClean;

    let myDirectCount = 0;
    let myDirectFunnel = 0;
    let myDirectHot = 0;
    let myDirectWarm = 0;
    const teamMembersMap = {};
    const activeSummaryRows = [];

    // Initialize ONLY this leader's team members from DB in teamMembersMap
    if (targetLeader) {
      myTeamMemberNames.forEach((bdm) => {
        teamMembersMap[bdm] = {
          name: bdm,
          salesTarget: dbBdmTargetMap[bdm] || BDM_TARGET_MAP[bdm] || 0,
          leads: [],
        };
      });
    }

    summaryRows.forEach((l) => {
      const val = l.dealValue ? parseFloat(l.dealValue) || 0 : 0;
      const stage = l.leadStatus || 'OPEN';
      const rawCs = (l.clientStatus || 'warm').toLowerCase();
      const bdm1 = (l.bdmName1 || '').trim();
      // Pending Follow-ups: active leads whose follow-up date exceeded current date
      if (stage !== 'CLOSED_WON' && stage !== 'CLOSED_LOST' && rawCs !== 'lost' && rawCs !== 'closed') {
        let fus = [];
        if (Array.isArray(l.followUps)) fus = l.followUps;
        else if (typeof l.followUps === 'string') {
          try { fus = JSON.parse(l.followUps); } catch {}
        }
        if (fus && fus.length > 0) {
          const sorted = [...fus].sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : (a.addedAt ? new Date(a.addedAt).getTime() : 0);
            const db = b.date ? new Date(b.date).getTime() : (b.addedAt ? new Date(b.addedAt).getTime() : 0);
            return db - da;
          });
          const latestFu = sorted[0];
          if (latestFu && latestFu.date && (latestFu.status || '').toLowerCase() !== 'closed' && (latestFu.status || '').toLowerCase() !== 'lost') {
            const todayStr = now.toISOString().split('T')[0];
            const fuDateStr = latestFu.date.includes('T') ? latestFu.date.split('T')[0] : latestFu.date;
            if (fuDateStr < todayStr) {
              analytics.pendingFollowupsCount++;
            }
          }
        }
      }

      // Personal direct leads vs leader shared team leads metrics
      const bdm1Lower = (l.bdmName1 || '').toLowerCase().trim();
      const bdm2Lower = (l.bdmName2 || '').toLowerCase().trim();
      const leadLeaderLower = (l.leaderName || '').toLowerCase().trim();

      const isOwnLead = isAdmin
        ? true
        : (
            bdm1Lower.includes(userFullNameClean) ||
            userFullNameClean.includes(bdm1Lower) ||
            bdm2Lower.includes(userFullNameClean) ||
            (l.createdById === req.user.id && (!l.bdmName1 || bdm1Lower.includes(userFullNameClean) || userFullNameClean.includes(bdm1Lower)))
          );

      // Check if lead belongs to a team member under this leader
      const assignedLeader = (dbBdmLeaderMap[l.bdmName1] || BDM_LEADER_MAP[l.bdmName1] || '').toLowerCase().trim();
      const isTeamLeadUnderMe = Boolean(
        targetLeader &&
        leaderKey &&
        (
          (leadLeaderLower.includes(leaderKey) || leaderKey.includes(leadLeaderLower)) ||
          (assignedLeader && (assignedLeader.includes(leaderKey) || leaderKey.includes(assignedLeader))) ||
          myTeamMemberNames.some((m) => m.toLowerCase() === bdm1Lower || m.toLowerCase() === bdm2Lower)
        )
      );
      const isCountedInMyFunnel = isAdmin || isOwnLead || isTeamLeadUnderMe;

      // Monthly categorization (This Month vs Next Month)
      const effDate = l.nextFollowUpDate
        ? new Date(l.nextFollowUpDate)
        : (l.meetingDate ? new Date(l.meetingDate) : (l.expectedDateOfCloser ? new Date(l.expectedDateOfCloser) : new Date(l.createdAt)));
      const isThisMonth = effDate >= startOfThisMonth && effDate <= endOfThisMonth;
      const isNextMonth = effDate >= startOfNextMonth && effDate <= endOfNextMonth;

      // Always populate monthly counters across the entire dataset so both tabs retain their numbers!
      if (isThisMonth) {
        analytics.thisMonthCount++;
        analytics.thisMonthFunnel += val;
        if (isCountedInMyFunnel) {
          analytics.myThisMonthCount++;
          analytics.myThisMonthFunnel += val;
          if (rawCs === 'hot') analytics.myThisMonthHot += val;
          else if (rawCs === 'warm') analytics.myThisMonthWarm += val;
        }
      } else if (isNextMonth) {
        analytics.nextMonthCount++;
        analytics.nextMonthFunnel += val;
        if (isCountedInMyFunnel) {
          analytics.myNextMonthCount++;
          analytics.myNextMonthFunnel += val;
          if (rawCs === 'hot') analytics.myNextMonthHot += val;
          else if (rawCs === 'warm') analytics.myNextMonthWarm += val;
        }
      }

      // Check if lead matches the active month tab view
      const matchesActiveMonth = targetMonth === 'NEXT_MONTH' ? isNextMonth : isThisMonth;

      // Check if lead matches table-level search and dropdown filters
      let matchesTableFilter = true;
      if (bdmName && bdmName !== 'ALL') {
        const b = bdmName.trim().toLowerCase();
        if ((l.bdmName1 || '').toLowerCase() !== b && (l.bdmName2 || '').toLowerCase() !== b) {
          matchesTableFilter = false;
        }
      }
      if (leaderName && leaderName !== 'ALL') {
        if ((l.leaderName || '').toLowerCase() !== leaderName.trim().toLowerCase()) {
          matchesTableFilter = false;
        }
      }
      if (closerStatus && closerStatus !== 'ALL') {
        if ((l.closerStatus || '').toLowerCase() !== closerStatus.trim().toLowerCase()) {
          matchesTableFilter = false;
        }
      }
      if (clientStatus && clientStatus !== 'ALL') {
        if (!l.clientStatus || !l.clientStatus.toLowerCase().includes(clientStatus.trim().toLowerCase())) {
          matchesTableFilter = false;
        }
      }
      if (sourcingStatus && sourcingStatus !== 'ALL') {
        if ((l.sourcingStatus || '').toLowerCase() !== sourcingStatus.trim().toLowerCase()) {
          matchesTableFilter = false;
        }
      }
      if (meetingStatus && meetingStatus !== 'ALL') {
        if ((l.meetingStatus || '').toLowerCase() !== meetingStatus.trim().toLowerCase()) {
          matchesTableFilter = false;
        }
      }
      if (leadStatus && leadStatus !== 'ALL') {
        if ((l.leadStatus || '').toLowerCase() !== leadStatus.trim().toLowerCase()) {
          matchesTableFilter = false;
        }
      }
      if (teamMember && teamMember !== 'ALL') {
        const tm = teamMember.trim().toLowerCase();
        const b1 = (l.bdmName1 || '').toLowerCase();
        const b2 = (l.bdmName2 || '').toLowerCase();
        if (!b1.includes(tm) && !b2.includes(tm)) {
          matchesTableFilter = false;
        }
      }
      if (todayMeetings === 'true') {
        if (!l.meetingDate || l.leadStatus === 'CLOSED_LOST') {
          matchesTableFilter = false;
        }
      }
      if (search && search.trim()) {
        const sq = search.trim().toLowerCase();
        const matchesSearch =
          (l.companyName && l.companyName.toLowerCase().includes(sq)) ||
          (l.directorName && l.directorName.toLowerCase().includes(sq)) ||
          (l.mobileNo && l.mobileNo.toLowerCase().includes(sq)) ||
          (l.emailId && l.emailId.toLowerCase().includes(sq)) ||
          (l.remarks && l.remarks.toLowerCase().includes(sq));
        if (!matchesSearch) {
          matchesTableFilter = false;
        }
      }

      if (matchesActiveMonth && matchesTableFilter) {
        activeSummaryRows.push(l);

        // Client status for active month
        if (l.clientStatus) {
          const cs = l.clientStatus.charAt(0).toUpperCase() + l.clientStatus.slice(1).toLowerCase();
          analytics.byClientStatus[cs] = (analytics.byClientStatus[cs] || 0) + 1;
        }
        // Meeting status for active month
        if (l.meetingStatus) {
          analytics.byMeetingStatus[l.meetingStatus] = (analytics.byMeetingStatus[l.meetingStatus] || 0) + 1;
        }
        // Sourcing status for active month
        if (l.sourcingStatus) {
          analytics.bySourcingStatus[l.sourcingStatus] = (analytics.bySourcingStatus[l.sourcingStatus] || 0) + 1;
        }
        // Closer status for active month
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
        analytics.byStage[stage] = (analytics.byStage[stage] || 0) + 1;

        // Deal value and Funnel aggregation for active month
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

        // Aggregate into bdmFunnel for active month
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

        if (isCountedInMyFunnel) {
          myDirectCount++;
          myDirectFunnel += val;
          if (rawCs === 'hot') myDirectHot += val;
          else if (rawCs === 'warm') myDirectWarm += val;
        }
      }

      const isSharedWithMeAsLeader = !isOwnLead && isTeamLeadUnderMe;

      if (isSharedWithMeAsLeader) {
        let memberName = (l.bdmName1 || '').trim();
        if (!memberName || memberName.toLowerCase() === leaderKey || memberName === '-- None (Single BDM) --') {
          memberName = (l.bdmName2 || '').trim();
        }
        const cleanMemberName = memberName.toLowerCase();
        const matchKey = Object.keys(teamMembersMap).find((k) => {
          const kl = k.toLowerCase();
          return kl === cleanMemberName || kl.includes(cleanMemberName) || cleanMemberName.includes(kl);
        });
        if (matchKey) {
          teamMembersMap[matchKey].leads.push(l);
        }
      }
    });

    analytics.totalLeads = activeSummaryRows.length;
    analytics.myDirectFunnel = myDirectFunnel;
    analytics.myDirectHot = myDirectHot;
    analytics.myDirectWarm = myDirectWarm;
    analytics.myDirectCount = myDirectCount;

    // 2. Fetch paginated lead slice strictly for active month
    const total = activeSummaryRows.length;
    const isAll = req.query.limit === 'all' || req.query.all === 'true';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = isAll ? null : Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = isAll ? 0 : (page - 1) * limit;

    let leads = [];
    if (total > 0) {
      const pageSlice = isAll ? activeSummaryRows : activeSummaryRows.slice(offset, offset + limit);
      const pageIds = pageSlice.map((r) => r.id);
      if (pageIds.length > 0) {
        const placeholders = pageIds.map((_, i) => `$${i + 1}`).join(', ');
        leads = await prisma.$queryRawUnsafe(
          `SELECT * FROM "leads" WHERE "id" IN (${placeholders}) ORDER BY "createdAt" DESC`,
          ...pageIds
        );
      }
    }
    const totalPages = isAll ? 1 : Math.max(1, Math.ceil(total / limit));

    // Compute team member pipeline cards for Leader BDM
    const teamMembersOverview = Object.values(teamMembersMap).map((member) => {
      const mLeads = member.leads;
      const activeLeads = mLeads.filter((l) => l.leadStatus !== 'CLOSED_WON' && l.leadStatus !== 'CLOSED_LOST').length;
      const hotCount = mLeads.filter((l) => (l.clientStatus || '').toLowerCase() === 'hot').length;
      const warmCount = mLeads.filter((l) => (l.clientStatus || 'warm').toLowerCase() === 'warm').length;
      const lostCount = mLeads.filter((l) => (l.clientStatus || '').toLowerCase() === 'lost' || l.leadStatus === 'CLOSED_LOST').length;
      const closedCount = mLeads.filter((l) => l.leadStatus === 'CLOSED_WON' || (l.clientStatus || '').toLowerCase() === 'closed').length;
      const meetingLeads = mLeads.filter((l) => l.meetingDate || (l.meetingStatus && l.meetingStatus !== 'None'));
      const sortedMeetings = [...meetingLeads].sort((a, b) => {
        const da = a.meetingDate ? new Date(a.meetingDate).getTime() : 0;
        const db = b.meetingDate ? new Date(b.meetingDate).getTime() : 0;
        return db - da;
      });
      const nextMeetingLead = sortedMeetings[0] || null;

      const allFollowUps = [];
      mLeads.forEach((l) => {
        let fus = [];
        if (Array.isArray(l.followUps)) fus = l.followUps;
        else if (typeof l.followUps === 'string') {
          try { fus = JSON.parse(l.followUps); } catch {}
        }
        if (Array.isArray(fus)) {
          fus.forEach((fu) => {
            allFollowUps.push({
              ...fu,
              companyName: l.companyName,
              leadId: l.id,
            });
          });
        }
      });
      allFollowUps.sort((a, b) => new Date(b.addedAt || b.date).getTime() - new Date(a.addedAt || a.date).getTime());
      const lastFollowUp = allFollowUps[0] || null;

      const activeLeadsWithEdc = mLeads.filter((l) => l.expectedDateOfCloser && l.leadStatus !== 'CLOSED_WON' && l.leadStatus !== 'CLOSED_LOST');
      activeLeadsWithEdc.sort((a, b) => new Date(a.expectedDateOfCloser) - new Date(b.expectedDateOfCloser));
      const nearestEdcLead = activeLeadsWithEdc[0] || mLeads.find((l) => l.expectedDateOfCloser) || null;
      const totalFunnel = mLeads.reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);

      return {
        name: member.name,
        salesTarget: member.salesTarget || dbBdmTargetMap[member.name] || BDM_TARGET_MAP[member.name] || 0,
        totalLeads: mLeads.length,
        activeLeads,
        hotCount,
        warmCount,
        lostCount,
        closedCount,
        meetingCount: meetingLeads.length,
        nextMeetingLead,
        lastFollowUp,
        nearestEdcLead,
        totalFunnel,
      };
    });

    teamMembersOverview.sort((a, b) => {
      if ((b.totalFunnel || 0) !== (a.totalFunnel || 0)) {
        return (b.totalFunnel || 0) - (a.totalFunnel || 0);
      }
      if ((b.totalLeads || 0) !== (a.totalLeads || 0)) {
        return (b.totalLeads || 0) - (a.totalLeads || 0);
      }
      return a.name.localeCompare(b.name);
    });

    analytics.myDirectFunnel = myDirectFunnel;
    analytics.myDirectHot = myDirectHot;
    analytics.myDirectWarm = myDirectWarm;
    analytics.myDirectCount = myDirectCount;
    analytics.teamMembersOverview = teamMembersOverview;
    analytics.dbTeamMembers = myTeamMemberNames;
    analytics.dbLeaderMap = dbBdmLeaderMap;
    analytics.dbTargetMap = dbBdmTargetMap;

    // Compute comprehensive BDM & Leader performance cards for Admin and Executive Tracking
    const allBdmMap = {};

    // 1. Initialize all known leaders and BDMs from DB
    activeLeaders.forEach((ldr) => {
      if (!allBdmMap[ldr]) {
        allBdmMap[ldr] = {
          name: ldr,
          isLeader: true,
          leads: [],
          leaderName: dbBdmLeaderMap[ldr] || BDM_LEADER_MAP[ldr] || ldr,
          salesTarget: dbBdmTargetMap[ldr] || BDM_TARGET_MAP[ldr] || 0,
        };
      }
    });

    activeBdms.forEach((bdm) => {
      const isLdr = activeLeaders.some((l) => l.toLowerCase() === bdm.toLowerCase());
      if (!allBdmMap[bdm]) {
        allBdmMap[bdm] = {
          name: bdm,
          isLeader: isLdr,
          leads: [],
          leaderName: dbBdmLeaderMap[bdm] || BDM_LEADER_MAP[bdm] || null,
          salesTarget: dbBdmTargetMap[bdm] || BDM_TARGET_MAP[bdm] || 0,
        };
      }
    });

    // 2. Distribute activeSummaryRows leads to BDMs and Leaders
    activeSummaryRows.forEach((l) => {
      const bdm1 = (l.bdmName1 || '').trim();
      const bdm2 = (l.bdmName2 || '').trim();
      const ldr = (l.leaderName || '').trim();

      const namesToAssign = new Set();
      if (bdm1 && bdm1 !== '-- None (Single BDM) --') namesToAssign.add(bdm1);
      if (bdm2 && bdm2 !== '-- None (Single BDM) --' && bdm2.toLowerCase() !== bdm1.toLowerCase()) namesToAssign.add(bdm2);

      namesToAssign.forEach((name) => {
        const isLdr = LEADERS_LIST.some((l) => l.toLowerCase() === name.toLowerCase());
        if (!allBdmMap[name]) {
          allBdmMap[name] = { name, isLeader: isLdr, leads: [], leaderName: ldr || null };
        }
        allBdmMap[name].leads.push(l);
        if (ldr && !allBdmMap[name].leaderName && !allBdmMap[name].isLeader) {
          allBdmMap[name].leaderName = ldr;
        }
      });

      // If leader is also in allBdmMap and not already having this lead directly
      if (ldr && allBdmMap[ldr] && !namesToAssign.has(ldr)) {
        if (!allBdmMap[ldr].teamLeads) allBdmMap[ldr].teamLeads = [];
        allBdmMap[ldr].teamLeads.push(l);
      }
    });

    // 3. Transform into rich card objects
    const todayStr = new Date().toISOString().split('T')[0];
    const allBdmPerformance = Object.values(allBdmMap).map((entry) => {
      const mLeads = entry.leads.length > 0 ? entry.leads : (entry.teamLeads || []);
      const activeLeads = mLeads.filter((l) => l.leadStatus !== 'CLOSED_WON' && l.leadStatus !== 'CLOSED_LOST').length;
      const hotCount = mLeads.filter((l) => (l.clientStatus || '').toLowerCase() === 'hot').length;
      const warmCount = mLeads.filter((l) => (l.clientStatus || 'warm').toLowerCase() === 'warm').length;
      const lostCount = mLeads.filter((l) => (l.clientStatus || '').toLowerCase() === 'lost' || l.leadStatus === 'CLOSED_LOST').length;
      const closedCount = mLeads.filter((l) => l.leadStatus === 'CLOSED_WON' || (l.clientStatus || '').toLowerCase() === 'closed').length;

      const hotValue = mLeads.filter((l) => (l.clientStatus || '').toLowerCase() === 'hot')
        .reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);
      const warmValue = mLeads.filter((l) => (l.clientStatus || 'warm').toLowerCase() === 'warm')
        .reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);
      const closedValue = mLeads.filter((l) => l.leadStatus === 'CLOSED_WON' || (l.clientStatus || '').toLowerCase() === 'closed')
        .reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);
      const totalFunnel = mLeads.filter((l) => l.leadStatus !== 'CLOSED_WON' && l.leadStatus !== 'CLOSED_LOST')
        .reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);

      const meetingLeads = mLeads.filter((l) => l.meetingDate || (l.meetingStatus && l.meetingStatus !== 'None'));
      const sortedMeetings = [...meetingLeads].sort((a, b) => {
        const da = a.meetingDate ? new Date(a.meetingDate).getTime() : 0;
        const db = b.meetingDate ? new Date(b.meetingDate).getTime() : 0;
        return db - da;
      });
      const nextMeetingLead = sortedMeetings[0] || null;

      const allFollowUps = [];
      mLeads.forEach((l) => {
        let fus = [];
        if (Array.isArray(l.followUps)) fus = l.followUps;
        else if (typeof l.followUps === 'string') {
          try { fus = JSON.parse(l.followUps); } catch {}
        }
        if (Array.isArray(fus)) {
          fus.forEach((fu) => {
            allFollowUps.push({
              ...fu,
              companyName: l.companyName,
              leadId: l.id,
            });
          });
        }
      });
      allFollowUps.sort((a, b) => new Date(b.addedAt || b.date).getTime() - new Date(a.addedAt || a.date).getTime());
      const lastFollowUp = allFollowUps[0] || null;

      const activeLeadsWithEdc = mLeads.filter((l) => l.expectedDateOfCloser && l.leadStatus !== 'CLOSED_WON' && l.leadStatus !== 'CLOSED_LOST');
      activeLeadsWithEdc.sort((a, b) => new Date(a.expectedDateOfCloser) - new Date(b.expectedDateOfCloser));
      const nearestEdcLead = activeLeadsWithEdc[0] || mLeads.find((l) => l.expectedDateOfCloser) || null;

      let pendingFollowupsCount = 0;
      let maxDaysOverdue = 0;
      const todayDateObj = new Date(todayStr);

      mLeads.forEach((l) => {
        if (l.leadStatus === 'CLOSED_WON' || l.leadStatus === 'CLOSED_LOST') return;
        const cs = (l.clientStatus || '').toLowerCase();
        if (cs === 'lost' || cs === 'closed') return;

        let fus = [];
        if (Array.isArray(l.followUps)) fus = l.followUps;
        else if (typeof l.followUps === 'string') {
          try { fus = JSON.parse(l.followUps); } catch {}
        }
        let targetDateStr = null;
        if (Array.isArray(fus) && fus.length > 0) {
          const latest = [...fus].sort((a, b) => new Date(b.addedAt || b.date).getTime() - new Date(a.addedAt || a.date).getTime())[0];
          if (latest && latest.date && (latest.status || '').toLowerCase() !== 'closed' && (latest.status || '').toLowerCase() !== 'lost') {
            targetDateStr = latest.date.includes('T') ? latest.date.split('T')[0] : latest.date;
          }
        }
        if (!targetDateStr) {
          if (l.nextFollowUpDate) {
            targetDateStr = new Date(l.nextFollowUpDate).toISOString().split('T')[0];
          } else if (l.meetingDate) {
            targetDateStr = new Date(l.meetingDate).toISOString().split('T')[0];
          }
        }
        if (targetDateStr && targetDateStr < todayStr) {
          pendingFollowupsCount++;
          const targetDateObj = new Date(targetDateStr);
          const diffDays = Math.max(1, Math.floor((todayDateObj.getTime() - targetDateObj.getTime()) / (1000 * 60 * 60 * 24)));
          if (diffDays > maxDaysOverdue) {
            maxDaysOverdue = diffDays;
          }
        }
      });

      const modalLeads = mLeads.map((l) => {
        let overdueDays = 0;
        let isOverdue = false;
        if (l.leadStatus !== 'CLOSED_WON' && l.leadStatus !== 'CLOSED_LOST') {
          const cs = (l.clientStatus || '').toLowerCase();
          if (cs !== 'lost' && cs !== 'closed') {
            let fus = [];
            if (Array.isArray(l.followUps)) fus = l.followUps;
            else if (typeof l.followUps === 'string') {
              try { fus = JSON.parse(l.followUps); } catch {}
            }
            let targetDateStr = null;
            if (Array.isArray(fus) && fus.length > 0) {
              const latest = [...fus].sort((a, b) => new Date(b.addedAt || b.date).getTime() - new Date(a.addedAt || a.date).getTime())[0];
              if (latest && latest.date && (latest.status || '').toLowerCase() !== 'closed' && (latest.status || '').toLowerCase() !== 'lost') {
                targetDateStr = latest.date.includes('T') ? latest.date.split('T')[0] : latest.date;
              }
            }
            if (!targetDateStr) {
              if (l.nextFollowUpDate) {
                targetDateStr = new Date(l.nextFollowUpDate).toISOString().split('T')[0];
              } else if (l.meetingDate) {
                targetDateStr = new Date(l.meetingDate).toISOString().split('T')[0];
              }
            }
            if (targetDateStr && targetDateStr < todayStr) {
              isOverdue = true;
              overdueDays = Math.max(1, Math.floor((todayDateObj.getTime() - new Date(targetDateStr).getTime()) / (1000 * 60 * 60 * 24)));
            }
          }
        }

        return {
          id: l.id,
          companyName: l.companyName,
          directorName: l.directorName,
          mobileNo: l.mobileNo,
          closerStatus: l.closerStatus,
          sourcingStatus: l.sourcingStatus,
          meetingStatus: l.meetingStatus,
          meetingDate: l.meetingDate,
          clientStatus: l.clientStatus,
          leadStatus: l.leadStatus,
          dealValue: l.dealValue,
          expectedDateOfCloser: l.expectedDateOfCloser,
          nextFollowUpDate: l.nextFollowUpDate,
          followUps: l.followUps,
          reassignmentHistory: l.reassignmentHistory,
          bdmName1: l.bdmName1,
          bdmName2: l.bdmName2,
          leaderName: l.leaderName,
          createdAt: l.createdAt,
          isOverdue,
          overdueDays,
        };
      });

      return {
        name: entry.name,
        isLeader: Boolean(entry.isLeader),
        leaderName: entry.leaderName,
        salesTarget: entry.salesTarget || BDM_TARGET_MAP[entry.name] || 0,
        totalLeads: mLeads.length,
        activeLeads,
        hotCount,
        hotValue,
        warmCount,
        warmValue,
        lostCount,
        closedCount,
        closedValue,
        meetingCount: meetingLeads.length,
        nextMeetingLead,
        lastFollowUp,
        nearestEdcLead,
        totalFunnel,
        pendingFollowupsCount,
        maxDaysOverdue,
        leads: modalLeads,
      };
    });

    allBdmPerformance.sort((a, b) => {
      if (a.isLeader && !b.isLeader) return -1;
      if (!a.isLeader && b.isLeader) return 1;
      return (b.totalFunnel || 0) - (a.totalFunnel || 0) || (b.totalLeads || 0) - (a.totalLeads || 0);
    });

    analytics.allBdmPerformance = allBdmPerformance;

    return res.json({
      leads,
      pagination: {
        page: isAll ? 1 : page,
        limit: isAll ? total : limit,
        total,
        totalPages,
      },
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

    // Duplicate check by mobile number (Phone numbers must be strictly unique in LMS)
    const existingPhoneLeads = await prisma.$queryRawUnsafe(
      `SELECT "id", "companyName" FROM "leads" WHERE "mobileNo" = $1 LIMIT 1`,
      cleanPhone
    );
    if (existingPhoneLeads && existingPhoneLeads.length > 0) {
      return res.status(400).json({
        error: `A lead with mobile number ${cleanPhone} already exists (${existingPhoneLeads[0].companyName}). Phone numbers must be unique in LMS.`,
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

    if (meetingDate && isBeforeToday(meetingDate)) {
      return res.status(400).json({
        error: 'Meeting date cannot be in the past. Please select today or an upcoming date.',
      });
    }

    if (expectedDateOfCloser && isBeforeToday(expectedDateOfCloser)) {
      return res.status(400).json({
        error: 'Expected Date of Closer (EDC) cannot be in the past. Please select today or an upcoming date.',
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
    const initialFollowUpDate = parsedMeetingDate || edc || new Date();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "leads" (
        "id", "companyName", "directorName", "mobileNo", "emailId",
        "leaderName", "bdmName1", "bdmName2", "closerStatus", "sourcingStatus",
        "meetingStatus", "meetingDate", "clientStatus", "expectedDateOfCloser", "leadStatus", "dealValue",
        "remarks", "quotationFileUrl", "quotationFileName", "quotationFileSize",
        "createdById", "nextFollowUpDate", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW())`,
      id,
      companyName.trim().toUpperCase(),
      directorName ? directorName.trim().toUpperCase() : null,
      mobileNo.trim(),
      emailId ? emailId.trim().toUpperCase() : null,
      leaderName ? leaderName.trim().toUpperCase() : leaderName,
      bdmName1 ? bdmName1.trim().toUpperCase() : bdmName1,
      bdmName2 && bdmName2.trim() ? bdmName2.trim().toUpperCase() : null,
      closerStatus ? closerStatus.trim().toUpperCase() : closerStatus,
      sourcingStatus ? sourcingStatus.trim().toUpperCase() : sourcingStatus,
      meetingStatus ? meetingStatus.trim().toUpperCase() : meetingStatus,
      parsedMeetingDate,
      finalClientStatus ? finalClientStatus.trim().toUpperCase() : 'WARM',
      edc,
      finalStage ? finalStage.trim().toUpperCase() : 'OPEN',
      finalValue,
      remarks ? remarks.trim().toUpperCase() : null,
      quotationFileUrl,
      file.originalname ? file.originalname.toUpperCase() : file.originalname,
      file.size,
      req.user.id,
      initialFollowUpDate
    );

    const [created] = await prisma.$queryRawUnsafe(`SELECT * FROM "leads" WHERE "id" = $1`, id);

    return res.status(201).json({
      message: 'Lead created successfully with quotation document.',
      lead: created,
    });
  } catch (error) {
    if (error.code === '23505' || error.code === 'P2002' || (error.message && error.message.includes('unique'))) {
      return res.status(400).json({ error: 'A lead with this mobile number already exists. Phone numbers must be unique in LMS.' });
    }
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
      params.push(companyName.trim().toUpperCase());
    }
    if (directorName !== undefined) {
      updates.push(`"directorName" = $${pIdx++}`);
      params.push(directorName ? directorName.trim().toUpperCase() : null);
    }
    if (mobileNo !== undefined) {
      const cleanPhone = mobileNo.trim();
      if (!EXACT_10_DIGIT_PHONE_REGEX.test(cleanPhone)) {
        return res.status(400).json({
          error: 'Invalid mobile number. Must be exactly 10 digits without symbols, spaces, or country code (starting with 6-9).',
        });
      }
      const existingPhoneLeads = await prisma.$queryRawUnsafe(
        `SELECT "id", "companyName" FROM "leads" WHERE "mobileNo" = $1 AND "id" != $2 LIMIT 1`,
        cleanPhone,
        id
      );
      if (existingPhoneLeads && existingPhoneLeads.length > 0) {
        return res.status(400).json({
          error: `A lead with mobile number ${cleanPhone} already exists (${existingPhoneLeads[0].companyName}). Phone numbers must be unique in LMS.`,
        });
      }
      updates.push(`"mobileNo" = $${pIdx++}`);
      params.push(cleanPhone);
    }
    if (emailId !== undefined) {
      updates.push(`"emailId" = $${pIdx++}`);
      params.push(emailId ? emailId.trim().toUpperCase() : null);
    }
    if (leaderName !== undefined) {
      updates.push(`"leaderName" = $${pIdx++}`);
      params.push(leaderName ? leaderName.trim().toUpperCase() : leaderName);
    }
    if (bdmName1 !== undefined) {
      updates.push(`"bdmName1" = $${pIdx++}`);
      params.push(bdmName1 ? bdmName1.trim().toUpperCase() : bdmName1);
    }
    if (bdmName2 !== undefined) {
      updates.push(`"bdmName2" = $${pIdx++}`);
      params.push(bdmName2 ? bdmName2.trim().toUpperCase() : null);
    }
    if (closerStatus !== undefined) {
      updates.push(`"closerStatus" = $${pIdx++}`);
      params.push(closerStatus ? closerStatus.trim().toUpperCase() : closerStatus);
    }
    if (clientStatus !== undefined) {
      const raw = (clientStatus || 'WARM').trim().toUpperCase();
      let norm = 'WARM';
      if (raw === 'HOT') norm = 'HOT';
      else if (raw === 'LOST') norm = 'LOST';
      else if (raw === 'WARM') norm = 'WARM';
      updates.push(`"clientStatus" = $${pIdx++}`);
      params.push(norm);
    }
    if (sourcingStatus !== undefined) {
      updates.push(`"sourcingStatus" = $${pIdx++}`);
      params.push(sourcingStatus ? sourcingStatus.trim().toUpperCase() : sourcingStatus);
    }
    if (meetingStatus !== undefined) {
      updates.push(`"meetingStatus" = $${pIdx++}`);
      params.push(meetingStatus ? meetingStatus.trim().toUpperCase() : meetingStatus);
    }
    if (meetingDate !== undefined) {
      if (meetingDate && isBeforeToday(meetingDate)) {
        return res.status(400).json({
          error: 'Meeting date cannot be in the past. Please select today or an upcoming date.',
        });
      }
      updates.push(`"meetingDate" = $${pIdx++}`);
      params.push(meetingDate ? new Date(meetingDate) : null);
    }
    if (expectedDateOfCloser !== undefined) {
      if (expectedDateOfCloser && isBeforeToday(expectedDateOfCloser)) {
        return res.status(400).json({
          error: 'Expected Date of Closer (EDC) cannot be in the past. Please select today or an upcoming date.',
        });
      }
      updates.push(`"expectedDateOfCloser" = $${pIdx++}`);
      params.push(expectedDateOfCloser ? new Date(expectedDateOfCloser) : null);
    }
    if (leadStatus !== undefined) {
      if (!LEAD_STAGES_LIST.includes(leadStatus) && !LEAD_STAGES_LIST.includes(leadStatus.toUpperCase())) {
        return res.status(400).json({ error: `Invalid leadStatus "${leadStatus}". Allowed values: ${LEAD_STAGES_LIST.join(', ')}` });
      }
      updates.push(`"leadStatus" = $${pIdx++}`);
      params.push(leadStatus ? leadStatus.trim().toUpperCase() : leadStatus);
    }
    if (dealValue !== undefined) {
      updates.push(`"dealValue" = $${pIdx++}`);
      params.push(dealValue ? parseFloat(dealValue) : null);
    }
    if (remarks !== undefined) {
      updates.push(`"remarks" = $${pIdx++}`);
      params.push(remarks ? remarks.trim().toUpperCase() : null);
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
    if (error.code === '23505' || error.code === 'P2002' || (error.message && error.message.includes('unique'))) {
      return res.status(400).json({ error: 'A lead with this mobile number already exists. Phone numbers must be unique in LMS.' });
    }
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
    if (isBeforeToday(date)) {
      return res.status(400).json({
        error: 'Follow-up date cannot be in the past. Please select today or an upcoming date.',
      });
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
      status: matchedStatus.toUpperCase(),
      remarks: remarks && remarks.trim() ? remarks.trim().toUpperCase() : null,
      addedAt: new Date().toISOString(),
      addedById: req.user.id,
      addedByName: req.user.fullName ? req.user.fullName.toUpperCase() : 'BDM',
    };

    // Synchronize clientStatus and leadStatus accordingly
    let finalClientStatus = (lead.clientStatus || 'WARM').toUpperCase();
    let finalLeadStatus = (lead.leadStatus || 'OPEN').toUpperCase();

    if (['HOT', 'WARM', 'LOST'].includes(matchedStatus.toUpperCase())) {
      finalClientStatus = matchedStatus.toUpperCase();
    } else if (matchedStatus.toUpperCase() === 'CLOSED') {
      finalLeadStatus = 'CLOSED_WON';
    }

    // Atomic SQL JSONB append to prevent race conditions and update nextFollowUpDate
    const followUpDateObj = new Date(date);
    await prisma.$executeRawUnsafe(
      `UPDATE "leads" SET 
        "followUps" = COALESCE("followUps", '[]'::jsonb) || $1::jsonb,
        "clientStatus" = $2,
        "leadStatus" = $3,
        "nextFollowUpDate" = $4,
        "updatedAt" = NOW()
      WHERE "id" = $5`,
      JSON.stringify([newEntry]),
      finalClientStatus,
      finalLeadStatus,
      isNaN(followUpDateObj.getTime()) ? new Date() : followUpDateObj,
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

// -----------------------------------------------------------------------------
// GET /api/leads/notifications/my - Notifications for the authenticated user
// -----------------------------------------------------------------------------
router.get('/notifications/my', authenticateToken, async (req, res) => {
  try {
    await ensureLeadsTable();
    const rawName = req.user.fullName || '';
    const cleanName = rawName.replace(/\s*\([^)]*\)/g, '').trim().toUpperCase();
    const isAdmin = req.user.role === 'ADMIN';

    let notifications = [];
    if (isAdmin) {
      notifications = await prisma.$queryRawUnsafe(
        `SELECT * FROM "lead_notifications" ORDER BY "createdAt" DESC LIMIT 50`
      );
    } else {
      notifications = await prisma.$queryRawUnsafe(
        `SELECT * FROM "lead_notifications" 
         WHERE UPPER("targetBdmName") LIKE $1 
            OR ($2 != '' AND $2 LIKE '%' || UPPER("targetBdmName") || '%')
            OR "targetUserId" = $3
         ORDER BY "createdAt" DESC LIMIT 50`,
        `%${cleanName}%`,
        cleanName,
        req.user.id
      );
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('[LMS] Fetch notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications: ' + error.message });
  }
});

// -----------------------------------------------------------------------------
// POST /api/leads/notifications/mark-read - Mark notifications as read
// -----------------------------------------------------------------------------
router.post('/notifications/mark-read', authenticateToken, async (req, res) => {
  try {
    await ensureLeadsTable();
    const { id } = req.body;
    const rawName = req.user.fullName || '';
    const cleanName = rawName.replace(/\s*\([^)]*\)/g, '').trim().toUpperCase();
    const isAdmin = req.user.role === 'ADMIN';

    if (id) {
      await prisma.$executeRawUnsafe(`UPDATE "lead_notifications" SET "isRead" = true WHERE "id" = $1`, id);
    } else if (isAdmin) {
      await prisma.$executeRawUnsafe(`UPDATE "lead_notifications" SET "isRead" = true`);
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE "lead_notifications" 
         SET "isRead" = true 
         WHERE UPPER("targetBdmName") LIKE $1 
            OR ($2 != '' AND $2 LIKE '%' || UPPER("targetBdmName") || '%')
            OR "targetUserId" = $3`,
        `%${cleanName}%`,
        cleanName,
        req.user.id
      );
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[LMS] Mark read notifications error:', error);
    return res.status(500).json({ error: 'Failed to mark notifications as read: ' + error.message });
  }
});

// -----------------------------------------------------------------------------
// POST /api/leads/:id/revoke-reassign - Revoke and Reassign an Overdue Lead (Admin only)
// -----------------------------------------------------------------------------
router.post('/:id/revoke-reassign', authenticateToken, requireRoles('ADMIN'), async (req, res) => {
  try {
    await ensureLeadsTable();
    const { id } = req.params;
    const { newBdmName, newLeaderName, reason, nextFollowUpDate, handoverNotes } = req.body;

    if (!newBdmName || !newBdmName.trim()) {
      return res.status(400).json({ error: 'New BDM assignment is mandatory.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason for lead revocation is mandatory.' });
    }

    const [lead] = await prisma.$queryRawUnsafe(`SELECT * FROM "leads" WHERE "id" = $1`, id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const previousBdm = (lead.bdmName1 || 'UNASSIGNED').trim().toUpperCase();
    const previousLeader = (lead.leaderName || 'Management').trim().toUpperCase();
    const targetNewBdm = newBdmName.trim().toUpperCase();
    const targetNewLeader = newLeaderName ? newLeaderName.trim().toUpperCase() : previousLeader;
    const cleanReason = reason.trim();

    // Compute next follow-up date
    let followUpDateObj = nextFollowUpDate ? new Date(nextFollowUpDate) : new Date(Date.now() + 86400000);
    if (isNaN(followUpDateObj.getTime())) {
      followUpDateObj = new Date(Date.now() + 86400000);
    }

    // 1. Audit trail in followUps array
    const auditEntry = {
      id: crypto.randomUUID(),
      date: followUpDateObj.toISOString().split('T')[0],
      status: 'WARM',
      remarks: `[LEAD REVOKED & REASSIGNED BY ADMIN] Revoked from ${previousBdm} and assigned to ${targetNewBdm}. Reason: ${cleanReason}${handoverNotes ? ` | Handover Notes: ${handoverNotes.trim()}` : ''}`,
      addedAt: new Date().toISOString(),
      addedById: req.user.id,
      addedByName: req.user.fullName ? req.user.fullName.toUpperCase() : 'ADMIN',
      isReassignment: true,
      revokedFrom: previousBdm,
      assignedTo: targetNewBdm,
      reason: cleanReason,
    };

    // 2. Reassignment history object
    const historyEntry = {
      id: crypto.randomUUID(),
      revokedAt: new Date().toISOString(),
      revokedFrom: previousBdm,
      revokedFromLeader: previousLeader,
      assignedTo: targetNewBdm,
      assignedToLeader: targetNewLeader,
      reason: cleanReason,
      handoverNotes: handoverNotes ? handoverNotes.trim() : null,
      revokedById: req.user.id,
      revokedByName: req.user.fullName || 'Admin',
    };

    // 3. Update lead in DB
    await prisma.$executeRawUnsafe(
      `UPDATE "leads" SET 
        "bdmName1" = $1,
        "leaderName" = $2,
        "nextFollowUpDate" = $3,
        "followUps" = COALESCE("followUps", '[]'::jsonb) || $4::jsonb,
        "reassignmentHistory" = COALESCE("reassignmentHistory", '[]'::jsonb) || $5::jsonb,
        "updatedAt" = NOW()
      WHERE "id" = $6`,
      targetNewBdm,
      targetNewLeader,
      followUpDateObj,
      JSON.stringify([auditEntry]),
      JSON.stringify([historyEntry]),
      id
    );

    // 4. Create notifications for BOTH previous BDM and new BDM
    const prevNotifId = crypto.randomUUID();
    const prevTitle = `Lead Revoked: ${lead.companyName}`;
    const prevMessage = `Admin revoked lead "${lead.companyName}" from your pipeline. Reason: "${cleanReason}". Reassigned to ${targetNewBdm}.`;

    const newNotifId = crypto.randomUUID();
    const newTitle = `New Lead Assigned: ${lead.companyName}`;
    const newMessage = `Admin assigned lead "${lead.companyName}" to your pipeline (previously with ${previousBdm}). Reason/Notes: "${cleanReason}".`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "lead_notifications" ("id", "targetBdmName", "title", "message", "type", "leadId", "companyName", "reason", "isRead", "createdAt")
       VALUES 
         ($1, $2, $3, $4, 'LEAD_REVOKED', $5, $6, $7, false, NOW()),
         ($8, $9, $10, $11, 'LEAD_ASSIGNED', $5, $6, $7, false, NOW())`,
      prevNotifId,
      previousBdm,
      prevTitle,
      prevMessage,
      lead.id,
      lead.companyName,
      cleanReason,
      newNotifId,
      targetNewBdm,
      newTitle,
      newMessage
    );

    const [updated] = await prisma.$queryRawUnsafe(`SELECT * FROM "leads" WHERE "id" = $1`, id);

    return res.json({
      message: `Lead "${lead.companyName}" was successfully revoked from ${previousBdm} and assigned to ${targetNewBdm}. Both BDMs have been notified.`,
      lead: updated,
    });
  } catch (error) {
    console.error('[LMS] Revoke & Reassign error:', error);
    return res.status(500).json({ error: 'Failed to revoke and reassign lead: ' + error.message });
  }
});

module.exports = router;
