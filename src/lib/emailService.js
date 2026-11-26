const { sendEmail } = require('./mailer');
const { downloadFile } = require('./storage');
const prisma = require('./prisma');

/**
 * Generate High-Contrast, Professional Black & White HTML Email Template
 * - Big, prominently visible typography (18px-20px body, 20px-26px headings)
 * - Single-line guaranteed Deal Code header banner
 * - Strict high-contrast black and white styling (solid #000000 text and borders)
 * - Detailed Payment Tranche Summary with Amount Paid & Pending Balance
 * - Fully responsive width="100%" with -webkit-text-size-adjust to prevent mobile shrinking
 */
function buildStageEmailHtml({
  clientName,
  companyName,
  dealCode,
  services,
  totalAmount = 0,
  amountReceived = 0,
  pendingAmount = 0,
  payments = [],
  stepCompleted,
  stepStarted,
  description,
  remarks,
  hideNote = false,
  subject,
  attachedDocsSummary = [],
  bdmName,
  bdmPhone,
  bdmEmail,
}) {
  const cleanDealCode = (dealCode || 'CM-DEAL').trim();

  const servicesListHtml = (services && services.length > 0)
    ? services
        .map(
          (s) => `<li style="margin-bottom: 10px; color: #000000; font-size: 19px; line-height: 1.5; font-weight: 700;">${s.serviceName || s}</li>`
        )
        .join('')
    : '<li style="font-size: 19px; color: #000000; line-height: 1.5; font-weight: 700;">Corporate Compliance & Legal Services</li>';

  const formattedTotal = `₹${Math.round(Number(totalAmount) || 0).toLocaleString('en-IN')}`;
  const formattedReceived = `₹${Math.round(Number(amountReceived) || 0).toLocaleString('en-IN')}`;
  const formattedPending = `₹${Math.round(Number(pendingAmount) || 0).toLocaleString('en-IN')}`;

  const tranchesRowsHtml = (payments && payments.length > 0)
    ? payments
        .map((p) => {
          const trancheLabel = p.trancheNumber === 1 ? 'Tranche 1 (Advance Payment)' : `Tranche ${p.trancheNumber} (Balance Settlement)`;
          const dateStr = p.paymentDate
            ? new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Recorded';
          const statusText = p.status === 'VERIFIED' ? '[VERIFIED]' : '[UNDER VERIFICATION]';
          const modeRef = [p.paymentMode, p.transactionReference].filter(Boolean).join(' - ');

          return `
            <tr style="border-bottom: 2px solid #000000;">
              <td style="padding: 12px 10px; font-size: 18px; color: #000000; vertical-align: top;">
                <strong>${trancheLabel}</strong>
                ${modeRef ? `<div style="font-size: 15px; color: #222222; margin-top: 4px; font-weight: 600;">Ref: ${modeRef}</div>` : ''}
              </td>
              <td align="center" style="padding: 12px 10px; font-size: 16px; color: #000000; text-align: center; white-space: nowrap; vertical-align: top; font-weight: 700;">
                ${dateStr}
              </td>
              <td align="center" style="padding: 12px 10px; font-size: 16px; font-weight: 900; color: #000000; text-align: center; white-space: nowrap; vertical-align: top;">
                ${statusText}
              </td>
              <td align="right" style="padding: 12px 10px; font-size: 20px; font-weight: 900; color: #000000; text-align: right; white-space: nowrap; font-family: 'Courier New', Courier, monospace, sans-serif; vertical-align: top;">
                ₹${Math.round(Number(p.amount) || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          `;
        })
        .join('')
    : `
      <tr>
        <td colspan="4" style="padding: 14px 10px; font-size: 18px; color: #000000; text-align: center; font-weight: 700;">
          Tranche 1: ${formattedReceived} recorded
        </td>
      </tr>
    `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${subject || 'Corporate Mart Status Update'}</title>
  <style type="text/css">
    body, table, td, p, a, li {
      -webkit-text-size-adjust: 100% !important;
      -ms-text-size-adjust: 100% !important;
      font-size: 18px;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .mobile-pad {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f2f2f2; font-family: Arial, Helvetica, sans-serif; color: #000000; line-height: 1.6; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; min-width: 100%; background-color: #f2f2f2; padding: 16px 0;">
    <tr>
      <td align="center" style="padding: 0 10px;">
        <!-- Main Container (Responsive 100% with max-width 650px) -->
        <table class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 650px; width: 100%; background-color: #ffffff; border: 3px solid #000000; border-radius: 6px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
          
          <!-- Top Header Banner (Solid Black) -->
          <tr>
            <td class="mobile-pad" style="background-color: #000000; padding: 22px 28px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align: middle; text-align: left;">
                    <div style="font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; line-height: 1.2;">
                      Corporate Mart
                    </div>
                    <div style="font-size: 14px; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px; font-weight: 700;">
                      Enterprise Compliance & CRM Workflow
                    </div>
                  </td>
                  <td align="right" style="vertical-align: middle; white-space: nowrap; text-align: right; padding-left: 12px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="display: inline-table; white-space: nowrap;">
                      <tr>
                        <td style="background-color: #ffffff; color: #000000; font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 19px; font-weight: 900; padding: 10px 18px; border: 2px solid #ffffff; border-radius: 4px; white-space: nowrap !important; text-align: center;">
                          ${cleanDealCode}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="mobile-pad" style="padding: 32px 28px 24px 28px; background-color: #ffffff;">
              <h2 style="margin: 0 0 14px 0; font-size: 24px; color: #000000; font-weight: 900; line-height: 1.3;">
                Dear ${clientName || 'Valued Client'},
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 19px; color: #000000; line-height: 1.6; font-weight: 500;">
                Here is the verified status update regarding your request for <strong style="color: #000000; font-weight: 900;">${companyName}</strong>:
              </p>

              <!-- Step Status Announcement Box (High Visibility Clean Black & White Bordered Box) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 26px; background-color: #fafafa; border: 3px solid #000000; border-radius: 6px; padding: 20px;">
                <tr>
                  <td style="padding: 2px;">
                    ${
                      stepCompleted
                        ? `<div style="font-size: 15px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.8px; margin-bottom: 6px;">
                             [✓ STEP COMPLETED]
                           </div>
                           <div style="font-size: 22px; font-weight: 900; color: #000000; margin-bottom: 14px; line-height: 1.3;">
                             ${stepCompleted}
                           </div>`
                        : ''
                    }
                    ${
                      stepStarted
                        ? `<div style="font-size: 15px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 0.8px; margin-bottom: 6px;">
                             [▶ CURRENT STEP STARTED]
                           </div>
                           <div style="font-size: 22px; font-weight: 900; color: #000000; margin-bottom: 14px; line-height: 1.3;">
                             ${stepStarted}
                           </div>`
                        : ''
                    }
                    <div style="font-size: 19px; color: #000000; line-height: 1.65; margin-top: 8px; font-weight: 500;">
                      ${description || ''}
                    </div>
                    ${
                      !hideNote &&
                      remarks &&
                      remarks.trim() &&
                      remarks.trim().toLowerCase() !== (description || '').trim().toLowerCase()
                        ? `<div style="margin-top: 16px; padding-top: 14px; border-top: 2px dashed #000000; font-size: 18px; color: #000000; font-style: italic; line-height: 1.5;">
                             <strong style="font-style: normal; color: #000000;">Note:</strong> "${remarks}"
                           </div>`
                        : ''
                    }
                  </td>
                </tr>
              </table>

              <!-- Payment Tranches & Balance Breakdown Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 2.5px solid #000000; border-radius: 6px; padding: 20px; margin-bottom: 26px;">
                <tr>
                  <td style="padding: 2px;">
                    <div style="font-size: 20px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; border-bottom: 2.5px solid #000000; padding-bottom: 8px;">
                      Payment & Tranche Summary
                    </div>

                    <!-- Financial High-level Metrics -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 18px; font-size: 19px;">
                      <tr style="border-bottom: 1.5px solid #e0e0e0;">
                        <td style="color: #000000; padding: 10px 0; font-weight: 700;">Total Deal Value:</td>
                        <td align="right" style="font-weight: 900; color: #000000; font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 22px;">
                          ${formattedTotal}
                        </td>
                      </tr>
                      <tr style="border-bottom: 1.5px solid #e0e0e0;">
                        <td style="color: #000000; padding: 10px 0; font-weight: 700;">Total Amount Paid:</td>
                        <td align="right" style="font-weight: 900; color: #000000; font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 22px;">
                          ${formattedReceived}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #000000; padding: 10px 0; font-weight: 900;">
                          Pending Balance:
                        </td>
                        <td align="right" style="font-weight: 900; color: #000000; font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 22px;">
                          ${pendingAmount > 0 ? `${formattedPending} (Due)` : '₹0 (Fully Settled)'}
                        </td>
                      </tr>
                    </table>

                    <!-- Tranche Ledger Breakdown -->
                    <div style="font-size: 18px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                      Tranche Breakdown
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; width: 100%; font-size: 17px; background-color: #fafafa; border: 2px solid #000000; border-radius: 4px;">
                      <thead>
                        <tr style="border-bottom: 2px solid #000000; background-color: #ebebeb;">
                          <th align="left" style="padding: 12px 10px; font-size: 15px; font-weight: 900; color: #000000; text-transform: uppercase;">Tranche</th>
                          <th align="center" style="padding: 12px 10px; font-size: 15px; font-weight: 900; color: #000000; text-transform: uppercase;">Date</th>
                          <th align="center" style="padding: 12px 10px; font-size: 15px; font-weight: 900; color: #000000; text-transform: uppercase;">Status</th>
                          <th align="right" style="padding: 12px 10px; font-size: 15px; font-weight: 900; color: #000000; text-transform: uppercase;">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${tranchesRowsHtml}
                      </tbody>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Active Services Section -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 2.5px solid #000000; border-radius: 6px; padding: 20px; margin-bottom: 26px;">
                <tr>
                  <td style="padding: 2px;">
                    <div style="font-size: 20px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; border-bottom: 2.5px solid #000000; padding-bottom: 8px;">
                      Active Services in This Request
                    </div>
                    <ul style="margin: 0; padding-left: 24px;">
                      ${servicesListHtml}
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Representative & Support Contact Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 2.5px solid #000000; padding-top: 20px;">
                <tr>
                  <td>
                    <div style="font-size: 15px; font-weight: 900; text-transform: uppercase; color: #222222; letter-spacing: 0.5px; margin-bottom: 6px;">
                      Assigned BDM / Account Manager
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: #000000;">
                      ${bdmName || 'Corporate Mart Client Support'}
                    </div>
                    <div style="font-size: 18px; color: #000000; margin-top: 8px; line-height: 1.5; font-weight: 600;">
                      ${bdmPhone ? `Phone: <a href="tel:${bdmPhone}" style="color: #000000; font-weight: 900; text-decoration: underline;">${bdmPhone}</a> &nbsp;|&nbsp; ` : ''}
                      ${bdmEmail ? `Email: <a href="mailto:${bdmEmail}" style="color: #000000; font-weight: 900; text-decoration: underline;">${bdmEmail}</a>` : ''}
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer (High Contrast) -->
          <tr>
            <td class="mobile-pad" style="background-color: #ebebeb; padding: 22px 28px; text-align: center; border-top: 2px solid #000000; font-size: 16px; color: #000000; line-height: 1.6;">
              <div style="font-weight: 900; font-size: 18px; color: #000000;">Corporate Mart Private Limited</div>
              <div style="margin-top: 6px; font-size: 16px; font-weight: 700;">
                Official Support: <a href="mailto:Admin@corporate-mart.com" style="color: #000000; font-weight: 900; text-decoration: underline;">Admin@corporate-mart.com</a>
              </div>
              <div style="margin-top: 8px; color: #222222; font-size: 15px; font-weight: 500;">
                This is an automated notification from Corporate Mart CRM. Please retain this email for your compliance records.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Main Dispatcher: notifyCustomerStageChange
 * Triggers corresponding step completion & step start customer emails
 */
async function notifyCustomerStageChange({
  dealId,
  event,
  notes,
  customSubject,
  serviceName,
  stepCompleted: customStepCompleted,
  stepStarted: customStepStarted,
  hideNote = false,
  documentIds = [],
  attachAgreement = false,
  attachCertificates = false,
}) {
  try {
    if (!dealId) return;

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        client: true,
        services: true,
        documents: true,
        bdm: { select: { fullName: true, email: true, phone: true } },
        payments: {
          orderBy: { trancheNumber: 'asc' },
        },
      },
    });

    if (!deal || !deal.client || !deal.client.email) {
      console.log(`[EmailService] Skipping notification for deal ${deal?.dealCode || dealId}: No client email.`);
      return;
    }

    const clientEmail = deal.client.email.trim();
    if (!clientEmail || !clientEmail.includes('@')) {
      console.log(`[EmailService] Invalid client email "${clientEmail}" for deal ${deal.dealCode}.`);
      return;
    }

    const clientName = deal.client.clientName || 'Valued Client';
    const companyName = deal.client.companyName || 'Your Company';
    const dealCode = deal.dealCode || 'CM-DEAL';
    const services = (deal.services || []).map((s) => s.serviceName);
    const bdmName = deal.bdm?.fullName || 'Corporate Mart Team';
    const bdmPhone = deal.bdm?.phone || null;
    const bdmEmail = deal.bdm?.email || null;

    // Financial & Tranche Data
    const totalAmount = Math.round(Number(deal.totalAmount) || 0);
    const amountReceived = Math.round(Number(deal.amountReceived) || 0);
    const pendingAmount = Math.max(0, Math.round(Number(deal.pendingAmount) || (totalAmount - amountReceived)));
    const payments = (deal.payments || []).map((p) => ({
      trancheNumber: p.trancheNumber,
      amount: Math.round(Number(p.amount) || 0),
      paymentDate: p.paymentDate,
      paymentMode: p.paymentMode,
      status: p.status,
      transactionReference: p.transactionReference,
      remarks: p.remarks,
    }));

    let subject = '';
    let stepCompleted = null;
    let stepStarted = null;
    let description = '';

    switch (event) {
      // 1. DEAL CREATED (Initial Submission)
      case 'DEAL_CREATED':
        subject = `Service Request Initiated - Deal #${dealCode} | Corporate Mart`;
        stepCompleted = null;
        stepStarted = 'Step 1: Payment & Accounts Verification Started';
        description = `Your service request has been successfully created. Initial advance payment has been logged and submitted to our Accounts Desk for verification.`;
        break;

      // 2. ACCOUNTS APPROVED -> STAGE_05_LEGAL_VERIFICATION
      case 'ACCOUNTS_APPROVED':
        subject = `Payment Verified & Legal Scrutiny Started - Deal #${dealCode} | Corporate Mart`;
        stepCompleted = 'Step 1: Payment & Accounts Verification Completed';
        stepStarted = 'Step 2: Legal Scrutiny & Document Verification Started';
        description = `Your payment has been successfully verified by our Accounts Department. Your dossier has now moved to our Legal Desk for KYC document scrutiny, draft verification, and compliance validation.`;
        break;

      // 3. ACCOUNTS REJECTED
      case 'ACCOUNTS_REJECTED':
        subject = `Payment Verification Notice - Deal #${dealCode} | Corporate Mart`;
        stepCompleted = null;
        stepStarted = 'Step 1: Payment Verification (Discrepancy Rectification)';
        description = `Our Accounts Desk has reviewed the submitted payment transaction and requested clarification. Our representative is rectifying the details to complete your verification promptly.`;
        break;

      // 4. RESUBMITTED TO ACCOUNTS
      case 'RESUBMIT_TO_ACCOUNTS':
      case 'RESUBMITTED_TO_ACCOUNTS':
        subject = `Dossier Resubmitted to Accounts - Deal #${dealCode} | Corporate Mart`;
        stepCompleted = null;
        stepStarted = 'Step 1: Re-verification by Accounts Desk';
        description = `Updated payment proof and documentation have been resubmitted to our Accounts Desk for priority verification.`;
        break;

      // 5. LEGAL APPROVED -> STAGE_06_OPERATIONS_PROCESSING
      case 'LEGAL_APPROVED':
        subject = `Legal Clearance Approved & Service Agreement Dispatched - Deal #${dealCode} | Corporate Mart`;
        stepCompleted = 'Step 2: Legal Scrutiny, Document Clearance & Agreement Execution Completed';
        stepStarted = 'Step 3: Operations Processing & Government Filing Started';
        description = `Your statutory legal scrutiny, entity verification, and legal service agreement execution have been approved by our Legal Desk. Your formal executed Legal Service Agreement is attached to this notification for your statutory compliance records. Your dossier has been forwarded to our Operations & Compliance Team for government filing.`;
        break;

      // 6. LEGAL REJECTED
      case 'LEGAL_REJECTED':
        subject = `Document Verification Update - Deal #${dealCode} | Corporate Mart`;
        stepCompleted = null;
        stepStarted = 'Step 2: Legal Scrutiny (Document Rectification)';
        description = `Our Legal Desk has completed preliminary document examination and noted a deficiency that requires attention. Our team is working to provide the rectified documents.`;
        break;

      // 7. SERVICE COMPLETED -> STAGE_07_SERVICE_COMPLETED
      case 'SERVICE_COMPLETED': {
        const primaryServiceName = serviceName || (services.length > 0 ? services.join(', ') : 'Service');
        subject = `Final Deliverable Certificate(s): ${primaryServiceName} - Deal #${dealCode} | Corporate Mart`;
        stepCompleted = `Completed: ${primaryServiceName}`;
        stepStarted = null;
        description = notes || `All filings and operational processing for "${primaryServiceName}" have been successfully completed by our Operations department. Your official deliverable certificate(s) are attached to this email.`;
        hideNote = true;
        break;
      }

      // 8. FINAL DOCS DELIVERED -> STAGE_08_FINAL_DOCS_DELIVERED
      case 'FINAL_DOCS_DELIVERED': {
        const primaryServiceName = serviceName || (services.length > 0 ? services.join(', ') : 'Service');
        subject = `Final Deliverable Certificate(s): ${primaryServiceName} - Deal #${dealCode} | Corporate Mart`;
        stepCompleted = `Completed: ${primaryServiceName}`;
        stepStarted = null;
        description = notes || `Your official certificates and final deliverables for "${primaryServiceName}" have been released and delivered. Your dossier is now moving to our dedicated Relationship Management team for post-service handover.`;
        hideNote = true;
        break;
      }

      // 8b. OPERATIONS FINAL DELIVERABLE
      case 'OPERATIONS_FINAL_DELIVERABLE': {
        const primaryServiceName = serviceName || (services.length > 0 ? services.join(', ') : 'Service');
        subject = `Final Deliverable Certificate(s): ${primaryServiceName} - Deal #${dealCode} | Corporate Mart`;
        stepCompleted = `Completed: ${primaryServiceName}`;
        stepStarted = null;
        description = notes || `We are pleased to inform you that your filing for "${primaryServiceName}" has been completed, and the official deliverable certificate(s) have been generated. Please find the official deliverable document(s) attached to this email.`;
        hideNote = true;
        break;
      }

      // 9. RM HANDOVER -> CLOSED
      case 'WORKFLOW_CLOSED':
        subject = `Service Execution Concluded & RM Assigned - Deal #${dealCode} | Corporate Mart`;
        stepCompleted = 'Step 5: Client Handover & Compliance Concluded';
        stepStarted = 'Annual Compliance & Continuous Advisory';
        description = `Congratulations! All service requirements for ${companyName} have been formally executed, verified, and successfully closed. Your dedicated Relationship Manager is assigned for continuous compliance support.`;
        break;

      // 10. BALANCE PAYMENT RECEIVED
      case 'BALANCE_PAYMENT_VERIFIED':
        subject = `Payment Receipt Confirmed - Deal #${dealCode} | Corporate Mart`;
        stepCompleted = 'Balance Payment Verified by Accounts';
        stepStarted = 'Next Stage Processing Released';
        description = `We have received and verified your balance payment tranche. Your account ledger has been updated and holds released.`;
        break;

      // 11. INDIVIDUAL SERVICE COMPLETED
      case 'INDIVIDUAL_SERVICE_COMPLETED': {
        const primaryServiceName = serviceName || (services.length > 0 ? services.join(', ') : 'Service');
        subject = `Final Deliverable Certificate(s): ${primaryServiceName} - Deal #${dealCode} | Corporate Mart`;
        stepCompleted = `Completed: ${primaryServiceName}`;
        stepStarted = null;
        description = notes || `We are pleased to notify you that the filing/service for "${primaryServiceName}" has been marked COMPLETED by our Operations department. The official deliverable certificate(s) are attached to this notification.`;
        hideNote = true;
        break;
      }

      default:
        subject = `Status Update on Your Request - Deal #${dealCode} | Corporate Mart`;
        stepCompleted = null;
        stepStarted = `Current Stage: ${deal.stage?.replace(/^STAGE_\d+_/i, '').replace(/_/g, ' ') || deal.stage}`;
        description = notes || 'Your service request has received an update from the Corporate Mart team.';
        break;
    }

    if (customStepCompleted !== undefined) stepCompleted = customStepCompleted;
    if (customStepStarted !== undefined) stepStarted = customStepStarted;
    if (customSubject) subject = customSubject;

    // Check if this is an operations deliverable event
    const isOpsDeliverableEvent =
      ['SERVICE_COMPLETED', 'FINAL_DOCS_DELIVERED', 'INDIVIDUAL_SERVICE_COMPLETED', 'OPERATIONS_FINAL_DELIVERABLE'].includes(event) ||
      attachCertificates;

    const primaryServiceName = serviceName || (services.length > 0 ? services.join(', ') : 'Service');

    if (isOpsDeliverableEvent) {
      hideNote = true;
      // If stepCompleted was not set or stepStarted was set (e.g. showing "Current Stage: Operations Processing"), ensure it shows "Completed: <serviceName>"
      if (!stepCompleted || stepStarted) {
        stepCompleted = `Completed: ${primaryServiceName}`;
        stepStarted = null;
      }
      // Ensure the email subject/title contains the service name
      if (!subject || !subject.includes(primaryServiceName)) {
        if (customSubject && !customSubject.includes(primaryServiceName)) {
          subject = `Final Deliverable Certificate(s): ${primaryServiceName} - ${customSubject}`;
        } else {
          subject = `Final Deliverable Certificate(s): ${primaryServiceName} - Deal #${dealCode} | Corporate Mart`;
        }
      }
    }

    // -------------------------------------------------------------------------
    // ATTACHMENTS RESOLVER:
    // - Legal Desk: Attach Legal Service Agreement
    // - Operations Desk: Attach Deliverable Certificates & Incorporation Forms
    // - Custom Email: Attach explicit documentIds or requested types
    // -------------------------------------------------------------------------
    const allDealDocs = deal.documents || [];
    const docsToAttach = [];

    // 1. Legal Agreement (for Legal approval or explicit attachAgreement flag)
    const isLegalEvent = event === 'LEGAL_APPROVED' || attachAgreement;
    if (isLegalEvent) {
      let legalDoc = allDealDocs
        .filter(
          (d) =>
            d.documentType === 'LEGAL_AGREEMENT' ||
            (deal.legalAgreementUrl && d.fileUrl === deal.legalAgreementUrl) ||
            d.title?.toLowerCase().includes('legal service agreement') ||
            d.fileName?.toLowerCase().includes('agreement')
        )
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];

      if (!legalDoc && deal.legalAgreementUrl) {
        legalDoc = {
          id: 'deal-legal-agreement',
          title: `Legal Service Agreement - ${deal.client?.companyName || dealCode}`,
          fileName: 'Legal_Service_Agreement.pdf',
          fileUrl: deal.legalAgreementUrl,
          mimeType: 'application/pdf',
          documentType: 'LEGAL_AGREEMENT',
        };
      }

      if (legalDoc && !docsToAttach.some((d) => d.id === legalDoc.id)) {
        docsToAttach.push(legalDoc);
      }
    }

    // 2. Service Deliverable Certificates (for Operations completion, final delivery, or explicit attachCertificates flag)
    if (isOpsDeliverableEvent) {
      const certDocs = allDealDocs.filter(
        (d) =>
          d.documentType === 'FINAL_DELIVERABLE_CERTIFICATE' ||
          d.documentType === 'INCORPORATION_FORM' ||
          d.title?.toLowerCase().includes('certificate')
      );
      certDocs.forEach((cd) => {
        if (!docsToAttach.some((d) => d.id === cd.id)) {
          docsToAttach.push(cd);
        }
      });
    }

    // 3. Explicit Document IDs requested by user
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      const explicitDocs = allDealDocs.filter((d) => documentIds.includes(d.id));
      explicitDocs.forEach((ed) => {
        if (!docsToAttach.some((d) => d.id === ed.id)) {
          docsToAttach.push(ed);
        }
      });
    }

    // Download document files from Object Storage & format as Microsoft Graph File Attachments
    const attachments = [];
    const attachedDocsSummary = [];

    for (const doc of docsToAttach) {
      try {
        if (!doc.fileUrl) continue;
        console.log(`[EmailService] Fetching document "${doc.fileName || doc.title}" from storage for email attachment...`);
        const fileBuffer = await downloadFile(doc.fileUrl);
        attachments.push({
          name: doc.fileName || doc.title || 'document.pdf',
          contentType: doc.mimeType || 'application/pdf',
          contentBytes: fileBuffer.toString('base64'),
        });
        attachedDocsSummary.push(`${doc.title || doc.fileName} (${(doc.documentType || 'LEGAL_AGREEMENT').replace(/_/g, ' ')})`);
      } catch (dlErr) {
        console.warn(`[EmailService] Could not attach file "${doc.fileName || doc.title}":`, dlErr.message);
      }
    }

    const html = buildStageEmailHtml({
      clientName,
      companyName,
      dealCode,
      services,
      totalAmount,
      amountReceived,
      pendingAmount,
      payments,
      stepCompleted,
      stepStarted,
      description,
      remarks: hideNote ? null : notes,
      hideNote,
      subject,
      attachedDocsSummary,
      bdmName,
      bdmPhone,
      bdmEmail,
    });

    console.log(`[EmailService] Dispatching stage update email to "${clientEmail}" for Deal ${dealCode} (Event: ${event}, Attachments: ${attachments.length})...`);

    try {
      await sendEmail({
        to: clientEmail,
        subject,
        html,
        fromName: 'Corporate Mart',
        attachments,
      });
      console.log(`[EmailService] ✓ Email delivered to ${clientEmail} for Deal ${dealCode} (${attachments.length} attachment(s))`);
    } catch (sendErr) {
      console.error(`[EmailService] ✗ Failed to send email to ${clientEmail}:`, sendErr.message);
    }
  } catch (error) {
    console.error('[EmailService] Error in notifyCustomerStageChange:', error);
  }
}

module.exports = {
  notifyCustomerStageChange,
  buildStageEmailHtml,
};
