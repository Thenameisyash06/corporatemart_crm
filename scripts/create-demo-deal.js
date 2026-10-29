const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_BASE = 'http://localhost:4000/api';

async function seedDemoDeal() {
  console.log('1. Logging in as BDM...');
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'bdm@corporatemart.com',
    password: 'bdm123',
  });
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log('2. Creating new Deal (Stages 01 - 03)...');
  const dealRes = await axios.post(
    `${API_BASE}/deals`,
    {
      companyName: 'Acrobat Logistics Private Limited',
      clientName: 'Sanjay Kumar Verma',
      clientEmail: 'sanjay@acrobatlogistics.in',
      clientPhone: '+919811223344',
      gstStatus: true,
      gstin: '07AAACA1234Q1Z2',
      panNumber: 'AAACA1234Q',
      billingAddress: '42, Okhla Industrial Area Phase-III, New Delhi',
      directors: [
        {
          name: 'Sanjay Kumar Verma',
          din: '08912341',
          pan: 'AAACA1234Q',
          email: 'sanjay@acrobatlogistics.in',
          phone: '+919811223344',
        },
        {
          name: 'Meena Verma',
          din: '08912342',
          pan: 'AABPV5678R',
          email: 'meena@acrobatlogistics.in',
          phone: '+919811223345',
        },
      ],
      services: [
        {
          serviceName: 'Private Limited Company Incorporation',
          serviceFee: 12000,
          govtFee: 3000,
        },
        {
          serviceName: 'GST Registration & Filing',
          serviceFee: 3500,
          govtFee: 0,
        },
      ],
      totalAmount: 18500,
      amountReceived: 10000,
      paymentType: 'PART_PAYMENT',
      paymentMode: 'NEFT_RTGS',
      transactionReference: 'AXIS202610129841',
      paymentDate: new Date().toISOString().split('T')[0],
    },
    { headers: authHeaders }
  );

  const dealId = dealRes.data.dealId;
  const dealCode = dealRes.data.dealCode;
  console.log(`Created deal: ${dealCode} (ID: ${dealId})`);

  // 3. Upload Payment Proof to Object Storage
  console.log('3. Uploading Payment Proof to Object Storage...');
  const paymentProofForm = new FormData();
  paymentProofForm.append('dealId', dealId);
  paymentProofForm.append('documentType', 'PAYMENT_PROOF');
  paymentProofForm.append('title', 'Bank Transfer Slip - AXIS202610129841.pdf');
  paymentProofForm.append(
    'file',
    Buffer.from('%PDF-1.4 Mock Bank Transfer Receipt AXIS202610129841 - ₹10,000 received'),
    { filename: 'AXIS_Payment_Receipt.pdf', contentType: 'application/pdf' }
  );

  await axios.post(`${API_BASE}/documents/upload`, paymentProofForm, {
    headers: { ...authHeaders, ...paymentProofForm.getHeaders() },
  });
  console.log('Payment proof uploaded to Supabase Object Storage!');

  // 4. Upload KYC Doc to Object Storage
  console.log('4. Uploading Director KYC document...');
  const kycForm = new FormData();
  kycForm.append('dealId', dealId);
  kycForm.append('documentType', 'KYC_PAN');
  kycForm.append('title', 'Director 1 PAN Card - Sanjay Verma.pdf');
  kycForm.append(
    'file',
    Buffer.from('%PDF-1.4 Mock PAN Card Copy Sanjay Kumar Verma AAACA1234Q'),
    { filename: 'Sanjay_Verma_PAN.pdf', contentType: 'application/pdf' }
  );

  await axios.post(`${API_BASE}/documents/upload`, kycForm, {
    headers: { ...authHeaders, ...kycForm.getHeaders() },
  });
  console.log('KYC doc uploaded to Supabase Object Storage!');

  // 5. Handover file to Accounts (Stage 03 Gate)
  console.log('5. Triggering Stage 03 Gate: BDM Handover to Accounts...');
  const handoverRes = await axios.post(`${API_BASE}/deals/${dealId}/handover`, {}, {
    headers: authHeaders,
  });
  console.log('Handover complete! Deal stage is now:', handoverRes.data.deal.stage);
  console.log('ALL DEMO DATA PREPARED AND VERIFIED SUCCESSFULLY!');
}

seedDemoDeal().catch((err) => {
  console.error('Error running demo deal:', err.response?.data || err.message);
  process.exit(1);
});
