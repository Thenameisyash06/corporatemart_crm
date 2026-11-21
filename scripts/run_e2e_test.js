const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const prisma = require('../src/lib/prisma');
const app = require('../src/server');

let server;
let API_BASE;

const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function record(name, success, details = '') {
  if (success) {
    results.passed++;
    console.log(`  [PASS] ${name}${details ? ` (${details})` : ''}`);
    results.tests.push({ name, status: 'PASS', details });
  } else {
    results.failed++;
    console.error(`  [FAIL] ${name}: ${details}`);
    results.tests.push({ name, status: 'FAIL', details });
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('   CorporateMart CRM & LMS End-to-End Test Suite    ');
  console.log('====================================================\n');

  // STEP 0: Start API Server on dynamic port
  console.log('[STEP 0] Starting in-process Express Server & checking Database...');
  const port = await new Promise((resolve) => {
    server = app.listen(0, () => {
      const p = server.address().port;
      resolve(p);
    });
  });
  API_BASE = `http://127.0.0.1:${port}/api`;
  console.log(`Server listening on ${API_BASE}\n`);

  try {
    const healthRes = await axios.get(`${API_BASE}/health`);
    record('API Health Check', healthRes.data.status === 'ok', `DB Status: ${healthRes.data.database}`);
  } catch (e) {
    record('API Health Check', false, e.message);
  }

  // Verify users in DB
  let dbUsersList = [];
  try {
    dbUsersList = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true, role: true, leaderName: true, isActive: true },
    });
    const bdmUsers = dbUsersList.filter((u) => u.role === 'BDM');
    record('Database Users Check', bdmUsers.length > 0, `Total BDMs in DB: ${bdmUsers.length}`);
    console.log('BDM Users in DB:', bdmUsers.map(u => `${u.email} (${u.fullName}, active: ${u.isActive}, leader: ${u.leaderName})`));
  } catch (e) {
    record('Database Users Check', false, e.message);
  }

  // STEP 1: Authentication Tests
  console.log('\n[STEP 1] Testing Authentication & RBAC Login...');
  let adminToken = '';
  let leaderToken = '';
  let bdmToken = '';

  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@corporatemart.com',
      password: 'admin123',
    });
    adminToken = res.data.token;
    record('Admin Login', res.data.user.role === 'ADMIN', `User: ${res.data.user.fullName}`);
  } catch (e) {
    record('Admin Login', false, e.response?.data?.error || e.message);
  }

  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: 'jayesh.rohit@corporatemart.com',
      password: 'Jayesh@492R',
    });
    leaderToken = res.data.token;
    record('BDM Leader Login', res.data.user.role === 'BDM', `User: ${res.data.user.fullName}`);
  } catch (e) {
    record('BDM Leader Login', false, e.response?.data?.error || e.message);
  }

  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: 'akash.rawal@corporatemart.com',
      password: 'Akash@918R',
    });
    bdmToken = res.data.token;
    record('Regular BDM Login', res.data.user.role === 'BDM', `User: ${res.data.user.fullName}`);
  } catch (e) {
    record('Regular BDM Login', false, e.response?.data?.error || e.message);
  }

  try {
    await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@corporatemart.com',
      password: 'wrong_password_xyz',
    });
    record('Invalid Password Rejection', false, 'Expected 401 but succeeded');
  } catch (e) {
    record('Invalid Password Rejection', e.response?.status === 401, 'Correctly returned 401 Unauthorized');
  }

  // STEP 2: LMS Functionality & Leader Team Members Check
  console.log('\n[STEP 2] Testing LMS Lead Management & Leaderboards...');
  try {
    const res = await axios.get(`${API_BASE}/leads?monthFilter=THIS_MONTH`, {
      headers: { Authorization: `Bearer ${leaderToken}` },
    });
    const analytics = res.data.analytics || {};
    const teamMembers = analytics.dbTeamMembers || [];
    const teamOverview = analytics.teamMembersOverview || [];

    record(
      'Leader LMS Team Members from DB',
      teamMembers.length > 0,
      `Team Members: ${teamMembers.join(', ')}`
    );
    record(
      'Leader LMS Pipeline Overview Cards Generated',
      teamOverview.length > 0,
      `Cards: ${teamOverview.map((c) => `${c.name} (Target: ₹${c.salesTarget || 0})`).join(', ')}`
    );
    record(
      'Leader LMS BDM Funnel Map Initialized',
      Boolean(analytics.bdmFunnel && Object.keys(analytics.bdmFunnel).length > 0),
      `BDM Funnel Keys: ${Object.keys(analytics.bdmFunnel || {}).length}`
    );
  } catch (e) {
    record('Leader LMS Fetch', false, e.response?.data?.error || e.message);
  }

  // STEP 3: Lead Creation & Phone Uniqueness Validation
  console.log('\n[STEP 3] Testing LMS Lead Validations & Duplicate Mobile Prevention...');
  const testPhone = '98' + Math.floor(10000000 + Math.random() * 90000000); // 10-digit unique mobile
  let createdLeadId = null;

  // Validation 1: Missing Company Name
  try {
    const form = new FormData();
    form.append('mobileNo', testPhone);
    await axios.post(`${API_BASE}/leads`, form, {
      headers: { Authorization: `Bearer ${bdmToken}`, ...form.getHeaders() },
    });
    record('Reject Missing Company Name', false, 'Expected 400 error');
  } catch (e) {
    record('Reject Missing Company Name', e.response?.status === 400, e.response?.data?.error);
  }

  // Validation 2: Invalid 5-digit Phone
  try {
    const form = new FormData();
    form.append('companyName', 'Test Dummy Co');
    form.append('mobileNo', '12345');
    await axios.post(`${API_BASE}/leads`, form, {
      headers: { Authorization: `Bearer ${bdmToken}`, ...form.getHeaders() },
    });
    record('Reject Invalid Mobile Format', false, 'Expected 400 error');
  } catch (e) {
    record('Reject Invalid Mobile Format', e.response?.status === 400, e.response?.data?.error);
  }

  // Validation 3: Missing Quotation File
  try {
    const form = new FormData();
    form.append('companyName', 'Test Dummy Co');
    form.append('mobileNo', testPhone);
    await axios.post(`${API_BASE}/leads`, form, {
      headers: { Authorization: `Bearer ${bdmToken}`, ...form.getHeaders() },
    });
    record('Reject Missing Quotation File', false, 'Expected 400 error');
  } catch (e) {
    record('Reject Missing Quotation File', e.response?.status === 400, e.response?.data?.error);
  }

  // Validation 4: Valid Lead Creation with Dummy Quotation
  const dummyQuotationPath = path.join(__dirname, 'dummy_test_quotation.pdf');
  fs.writeFileSync(dummyQuotationPath, '%PDF-1.4 dummy quotation content for automated test');

  try {
    const form = new FormData();
    form.append('companyName', 'Automated QA Diagnostics Pvt Ltd');
    form.append('directorName', 'Ramesh QA Kumar');
    form.append('mobileNo', testPhone);
    form.append('emailId', 'ramesh@qadiagnostics.in');
    form.append('dealValue', '150000');
    form.append('clientStatus', 'Hot');
    form.append('closerStatus', 'Self Closer');
    form.append('leaderName', 'Jayesh Rohit');
    form.append('bdmName1', 'Akash Rawal');
    form.append('sourcingStatus', 'Outbound Call');
    form.append('meetingStatus', 'Scheduled');
    form.append('quotation', fs.createReadStream(dummyQuotationPath));

    const res = await axios.post(`${API_BASE}/leads`, form, {
      headers: { Authorization: `Bearer ${bdmToken}`, ...form.getHeaders() },
    });
    createdLeadId = res.data.lead?.id;
    record('Create Lead with Quotation & Deal Value', res.status === 201 || res.status === 200, `Lead ID: ${createdLeadId}`);
  } catch (e) {
    record('Create Lead with Quotation & Deal Value', false, e.response?.data?.error || e.message);
  }

  // Validation 5: DUPLICATE PHONE NUMBER TEST (Must be blocked!)
  try {
    const form = new FormData();
    form.append('companyName', 'Another Company Attempting Same Phone');
    form.append('directorName', 'Duplicate Attempter');
    form.append('mobileNo', testPhone); // Identical phone
    form.append('leaderName', 'Jayesh Rohit');
    form.append('bdmName1', 'Akash Rawal');
    form.append('closerStatus', 'Self Closer');
    form.append('sourcingStatus', 'Outbound Call');
    form.append('meetingStatus', 'Scheduled');
    form.append('quotation', fs.createReadStream(dummyQuotationPath));

    await axios.post(`${API_BASE}/leads`, form, {
      headers: { Authorization: `Bearer ${bdmToken}`, ...form.getHeaders() },
    });
    record('Strict Unique Mobile Number Block', false, 'Duplicate phone was erroneously allowed!');
  } catch (e) {
    const isBlocked = e.response?.status === 400;
    const errMsg = e.response?.data?.error || '';
    const mentionsDuplicate = errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('unique');
    record(
      'Strict Unique Mobile Number Block',
      isBlocked && mentionsDuplicate,
      `Blocked with message: "${errMsg}"`
    );
  }

  // STEP 4: Follow-up Status Audit Trail
  console.log('\n[STEP 4] Testing Lead Follow-up Recording & Date Validation...');
  if (createdLeadId) {
    try {
      // Past follow-up date rejection
      await axios.post(
        `${API_BASE}/leads/${createdLeadId}/follow-up`,
        { date: '2020-01-01', status: 'Called', notes: 'Should fail' },
        { headers: { Authorization: `Bearer ${bdmToken}` } }
      );
      record('Reject Past Follow-up Date', false, 'Expected 400 error');
    } catch (e) {
      record('Reject Past Follow-up Date', e.response?.status === 400, e.response?.data?.error);
    }

    try {
      // Valid future follow-up with valid status (Hot / Warm / Closed / Lost)
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const fuRes = await axios.post(
        `${API_BASE}/leads/${createdLeadId}/follow-up`,
        { date: tomorrow, status: 'Hot', notes: 'Automated follow-up test pass' },
        { headers: { Authorization: `Bearer ${bdmToken}` } }
      );
      record('Record Valid Follow-up', fuRes.status === 200, `Updated nextFollowUpDate to ${tomorrow}`);
    } catch (e) {
      record('Record Valid Follow-up', false, e.response?.data?.error || e.message);
    }
  }

  // STEP 5: Quotation Download & Access Control
  console.log('\n[STEP 5] Testing Quotation Download & RBAC Security...');
  if (createdLeadId) {
    try {
      const qRes = await axios.get(`${API_BASE}/leads/${createdLeadId}/quotation`, {
        headers: { Authorization: `Bearer ${bdmToken}` },
      });
      record('Download Lead Quotation', qRes.status === 200, `Content-Type: ${qRes.headers['content-type']}`);
    } catch (e) {
      record('Download Lead Quotation', false, e.response?.data?.error || e.message);
    }
  }

  // STEP 6: Lead Revoke & Reassign (Admin Only)
  console.log('\n[STEP 6] Testing Admin Lead Revoke & Reassignment...');
  if (createdLeadId) {
    // Non-admin attempt (should fail 403)
    try {
      await axios.post(
        `${API_BASE}/leads/${createdLeadId}/revoke-reassign`,
        { newBdmName: 'Darshak Fichadiya', reason: 'Attempt by regular BDM' },
        { headers: { Authorization: `Bearer ${bdmToken}` } }
      );
      record('Block Non-Admin Revoke/Reassign', false, 'Expected 403 Forbidden');
    } catch (e) {
      record('Block Non-Admin Revoke/Reassign', e.response?.status === 403, 'Correctly returned 403 Forbidden');
    }

    // Admin valid reassignment
    try {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const reassignRes = await axios.post(
        `${API_BASE}/leads/${createdLeadId}/revoke-reassign`,
        {
          newBdmName: 'Darshak Fichadiya',
          newLeaderName: 'Jayesh Rohit',
          reason: 'Automated QA performance load rebalancing test',
          nextFollowUpDate: tomorrow,
          handoverNotes: 'Priority client, call before noon',
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      record('Admin Revoke & Reassign Lead', reassignRes.status === 200, reassignRes.data?.message);
    } catch (e) {
      record('Admin Revoke & Reassign Lead', false, e.response?.data?.error || e.message);
    }
  }

  // STEP 7: Master CRM Deal Workflow
  console.log('\n[STEP 7] Testing Master CRM Deal Creation & Progression Flow...');
  let testDealId = null;
  try {
    const dealPayload = {
      companyName: 'Apex Precision Technologies Private Limited',
      clientName: 'Vikramaditya Sharma',
      clientEmail: 'vikram@apexprecision.in',
      clientPhone: '9822334455',
      gstStatus: true,
      gstin: '24AAACA5555Q1Z5',
      panNumber: 'AAACA5555Q',
      billingAddress: 'GIDC Industrial Estate, Vadodara, Gujarat',
      directors: [
        { name: 'Vikramaditya Sharma', din: '09812341', pan: 'AAACA5555Q', email: 'vikram@apexprecision.in', phone: '9822334455' },
      ],
      services: [
        { serviceName: 'Private Limited Company Incorporation', serviceFee: 15000, govtFee: 3000 },
      ],
      totalAmount: 18000,
      amountReceived: 10000,
      paymentType: 'PART_PAYMENT',
      paymentMode: 'NEFT_RTGS',
      receivingAccount: 'ICICI_MAIN',
      cashCollectorName: '',
      hasQuotation: true,
      quotationNumber: 'QT-2026-QA01',
      quotationAmount: 18000,
      quotationDate: '2026-11-20',
      quotationRemarks: 'Special annual retainer offer',
    };

    const dealRes = await axios.post(`${API_BASE}/deals`, dealPayload, {
      headers: { Authorization: `Bearer ${bdmToken}` },
    });
    testDealId = dealRes.data.dealId || dealRes.data.deal?.id;
    record('Create Master Deal (Stages 01-03)', Boolean(testDealId), `Deal ID: ${testDealId}, Code: ${dealRes.data.dealCode}`);
  } catch (e) {
    record('Create Master Deal (Stages 01-03)', false, e.response?.data?.error || e.message);
  }

  if (testDealId) {
    try {
      const getDeal = await axios.get(`${API_BASE}/deals/${testDealId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const d = getDeal.data.deal;
      record('Fetch Deal Dossier', Boolean(d), `Stage: ${d.stage}, Current Desk: ${d.currentDesk}`);
    } catch (e) {
      record('Fetch Deal Dossier', false, e.response?.data?.error || e.message);
    }
  }

  // STEP 8: Cleanup of Test Artifacts
  console.log('\n[STEP 8] Cleaning up temporary test data from Database...');
  if (createdLeadId) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "leads" WHERE "id" = $1`, createdLeadId);
      record('Cleanup Test Lead', true);
    } catch (e) {
      record('Cleanup Test Lead', false, e.message);
    }
  }
  if (testDealId) {
    try {
      await prisma.dealService.deleteMany({ where: { dealId: testDealId } });
      await prisma.payment.deleteMany({ where: { dealId: testDealId } });
      await prisma.deal.delete({ where: { id: testDealId } });
      record('Cleanup Test Deal', true);
    } catch (e) {
      record('Cleanup Test Deal', false, e.message);
    }
  }
  if (fs.existsSync(dummyQuotationPath)) {
    fs.unlinkSync(dummyQuotationPath);
  }

  // Close server and disconnect DB
  server.close();
  await prisma.$disconnect();

  console.log('\n====================================================');
  console.log(`Results: ${results.passed} Passed, ${results.failed} Failed`);
  console.log('====================================================');
  return results;
}

runAllTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  if (server) server.close();
  process.exit(1);
});
