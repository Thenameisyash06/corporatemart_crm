/**
 * Utility to export tabular data to CSV with UTF-8 BOM for Microsoft Excel compatibility.
 */
export function downloadCsv(filename, headers, rows) {
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
  }

  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).toUpperCase().replace(/"/g, '""');
    // Prevent CSV formula injection in Microsoft Excel / Google Sheets
    if (/^[=+@\-\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str}"`;
  };

  const headerLine = headers.map((h) => escapeCell(h.label || h.key || h)).join(',');
  const rowLines = rows.map((row) => {
    return headers
      .map((h) => {
        const key = typeof h === 'object' ? h.key : h;
        const value = typeof h === 'object' && h.formatter ? h.formatter(row[key], row) : row[key];
        return escapeCell(value);
      })
      .join(',');
  });

  // \uFEFF BOM forces Excel to open UTF-8 cleanly
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format deals for CSV export
 */
export function exportDealsToCsv(deals, filename = 'CorporateMart_Deals_Report.csv') {
  const headers = [
    { key: 'dealCode', label: 'Deal Code' },
    { key: 'companyName', label: 'Client / Company' },
    { key: 'clientName', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'bdm', label: 'Primary BDM' },
    { key: 'coBdms', label: 'Co-BDMs' },
    { key: 'stage', label: 'Workflow Stage' },
    { key: 'totalAmount', label: 'Total Value (₹)' },
    { key: 'amountReceived', label: 'Amount Received (₹)' },
    { key: 'pendingAmount', label: 'Pending Balance (₹)' },
    { key: 'paymentType', label: 'Payment Type' },
    { key: 'receivingAccount', label: 'Receiving Bank Account' },
    { key: 'accountsStatus', label: 'Accounts Verification' },
    { key: 'legalStatus', label: 'Legal Scrutiny' },
    { key: 'createdAt', label: 'Created At' },
  ];

  const rows = deals.map((d) => ({
    dealCode: d.dealCode || 'N/A',
    companyName: d.client?.companyName || 'N/A',
    clientName: d.client?.clientName || 'N/A',
    phone: d.client?.phone || 'N/A',
    email: d.client?.email || 'N/A',
    bdm: d.bdm?.fullName || 'N/A',
    coBdms: (d.coBdms || []).map((cb) => cb.fullName).join(', ') || 'None',
    stage: formatStageName(d.stage),
    totalAmount: Number(d.totalAmount || 0).toLocaleString('en-IN'),
    amountReceived: Number(d.amountReceived || 0).toLocaleString('en-IN'),
    pendingAmount: Number(d.pendingAmount || 0).toLocaleString('en-IN'),
    paymentType: d.paymentType === 'PART_PAYMENT' ? 'Part Payment' : 'Full Payment',
    receivingAccount: d.receivingAccount || 'N/A',
    accountsStatus: d.isAccountsVerified ? 'Verified' : 'Pending / Review',
    legalStatus: d.isLegalVerified ? 'Verified' : 'Pending / Scrutiny',
    createdAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN') : 'N/A',
  }));

  downloadCsv(filename, headers, rows);
}

/**
 * Format clients for CSV export
 */
export function exportClientsToCsv(clients, filename = 'CorporateMart_Clients_Directory.csv') {
  const headers = [
    { key: 'companyName', label: 'Company / Firm' },
    { key: 'clientName', label: 'Primary Contact' },
    { key: 'email', label: 'Email Address' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'panNumber', label: 'PAN' },
    { key: 'dealsCount', label: 'Total Deals' },
    { key: 'totalAmount', label: 'Total Business Value (₹)' },
    { key: 'amountReceived', label: 'Total Paid (₹)' },
    { key: 'pendingAmount', label: 'Outstanding Balance (₹)' },
    { key: 'consultantName', label: 'CA / Consultant' },
    { key: 'createdAt', label: 'Client Since' },
  ];

  const rows = clients.map((c) => ({
    companyName: c.companyName || 'N/A',
    clientName: c.clientName || 'N/A',
    email: c.email || 'N/A',
    phone: c.phone || 'N/A',
    city: c.city || 'N/A',
    state: c.state || 'N/A',
    gstin: c.gstin || (c.gstStatus ? 'Yes (Not provided)' : 'Non-GST'),
    panNumber: c.panNumber || 'N/A',
    dealsCount: c.dealsCount || 0,
    totalAmount: Number(c.totalAmount || 0).toLocaleString('en-IN'),
    amountReceived: Number(c.amountReceived || 0).toLocaleString('en-IN'),
    pendingAmount: Number(c.pendingAmount || 0).toLocaleString('en-IN'),
    consultantName: c.consultantName || 'Direct',
    createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : 'N/A',
  }));

  downloadCsv(filename, headers, rows);
}

/**
 * Format BDM team performance for CSV export
 */
export function exportBdmPerformanceToCsv(bdms, filename = 'CorporateMart_BDM_Performance_Report.csv') {
  const headers = [
    { key: 'fullName', label: 'BDM Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'salesTarget', label: 'Target (₹)' },
    { key: 'totalRevenue', label: 'Revenue Generated (₹)' },
    { key: 'totalCollected', label: 'Amount Collected (₹)' },
    { key: 'totalPending', label: 'Pending Balance (₹)' },
    { key: 'achievementPercent', label: 'Achievement (%)' },
    { key: 'dealsCount', label: 'Total Deals' },
    { key: 'closedDealsCount', label: 'Closed Deals' },
    { key: 'activeDealsCount', label: 'Active Pipeline Deals' },
    { key: 'avgDealSize', label: 'Average Ticket Size (₹)' },
  ];

  const rows = bdms.map((b) => ({
    fullName: b.fullName,
    email: b.email,
    phone: b.phone || 'N/A',
    salesTarget: Number(b.salesTarget || 0).toLocaleString('en-IN'),
    totalRevenue: Number(b.totalRevenue || 0).toLocaleString('en-IN'),
    totalCollected: Number(b.totalCollected || 0).toLocaleString('en-IN'),
    totalPending: Number(b.totalPending || 0).toLocaleString('en-IN'),
    achievementPercent: `${b.achievementPercent}%`,
    dealsCount: b.dealsCount,
    closedDealsCount: b.closedDealsCount,
    activeDealsCount: b.activeDealsCount,
    avgDealSize: Number(b.avgDealSize || 0).toLocaleString('en-IN'),
  }));

  downloadCsv(filename, headers, rows);
}

/**
 * Format Department Team (Accounts, Legal, Operations, RM) for CSV export
 */
export function exportDepartmentMembersToCsv(departmentsData, filename = 'CorporateMart_Department_Workload.csv') {
  const headers = [
    { key: 'department', label: 'Department' },
    { key: 'fullName', label: 'Member Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'assignedCount', label: 'Assigned Workload' },
    { key: 'completedCount', label: 'Completed / Verified' },
    { key: 'additionalMetrics', label: 'Performance / Output' },
  ];

  const rows = [];

  // Accounts
  (departmentsData.accounts || []).forEach((m) => {
    rows.push({
      department: 'Accounts Desk',
      fullName: m.fullName,
      email: m.email,
      phone: m.phone || 'N/A',
      assignedCount: `${m.assignedDealsCount || 0} deals`,
      completedCount: `${m.dealsVerifiedCount || 0} deals, ${m.paymentsVerifiedCount || 0} payments`,
      additionalMetrics: `₹${Number(m.totalVerifiedAmount || 0).toLocaleString('en-IN')} verified`,
    });
  });

  // Legal
  (departmentsData.legal || []).forEach((m) => {
    rows.push({
      department: 'Legal Scrutiny',
      fullName: m.fullName,
      email: m.email,
      phone: m.phone || 'N/A',
      assignedCount: `${m.assignedDealsCount || 0} deals`,
      completedCount: `${m.dealsVerifiedCount || 0} deals scrutinized`,
      additionalMetrics: 'Agreements & Docs Scrutiny',
    });
  });

  // Operations
  (departmentsData.operations || []).forEach((m) => {
    rows.push({
      department: 'Operations Processing',
      fullName: m.fullName,
      email: m.email,
      phone: m.phone || 'N/A',
      assignedCount: `${m.totalServices || 0} services`,
      completedCount: `${m.completedServices || 0} completed`,
      additionalMetrics: `${m.completionRate}% completion rate (₹${Number(m.totalFee || 0).toLocaleString('en-IN')})`,
    });
  });

  // RM
  (departmentsData.rm || []).forEach((m) => {
    rows.push({
      department: 'RM & Renewals',
      fullName: m.fullName,
      email: m.email,
      phone: m.phone || 'N/A',
      assignedCount: `${m.renewalsCount || 0} renewals`,
      completedCount: 'Active relationships',
      additionalMetrics: `₹${Number(m.totalRenewalFee || 0).toLocaleString('en-IN')} renewals pipeline`,
    });
  });

  downloadCsv(filename, headers, rows);
}

function formatStageName(stage) {
  if (!stage) return 'N/A';
  const stageMap = {
    STAGE_01_PAYMENT_RECEIVED: 'Stage 01: Payment Received',
    STAGE_02_DOCUMENTS_COLLECTED: 'Stage 02: Docs Collected',
    STAGE_04_ACCOUNTS_VERIFICATION: 'Stage 04: Accounts Verification Queue',
    STAGE_04_ACCOUNTS_REJECTED: 'Stage 04: Accounts Discrepancy (Rejected)',
    STAGE_05_LEGAL_VERIFICATION: 'Stage 05: Legal Scrutiny Queue',
    STAGE_05_LEGAL_REJECTED: 'Stage 05: Legal Deficiencies (Rejected)',
    STAGE_06_OPERATIONS_PROCESSING: 'Stage 06: Operations Processing',
    STAGE_07_SERVICE_COMPLETED: 'Stage 07: Service Completed',
    STAGE_08_FINAL_DOCS_DELIVERED: 'Stage 08: Final Deliverable Dispatched',
    STAGE_09_RM_HANDOVER: 'Stage 09: RM Handover & Relationship',
    CLOSED: 'Deal Closed',
  };
  return stageMap[stage] || stage.replace(/_/g, ' ');
}

/**
 * Format Operations services allocation for CSV export
 */
export function exportOpsServicesToCsv(services, filename = 'Operations_Services_Allocation_Report.csv') {
  const headers = [
    { key: 'dealCode', label: 'Deal Code' },
    { key: 'companyName', label: 'Client / Company' },
    { key: 'serviceName', label: 'Service Task' },
    { key: 'sector', label: 'Expertise Sector' },
    { key: 'assignedMember', label: 'Assigned Specialist' },
    { key: 'status', label: 'Milestone Status' },
    { key: 'govApplicationNumber', label: 'SRN / Govt Application No.' },
    { key: 'targetCompletionDate', label: 'Target Deadline' },
    { key: 'deadlineStatus', label: 'Deadline Status' },
    { key: 'serviceFee', label: 'Service Fee (₹)' },
  ];

  const rows = services.map((s) => ({
    dealCode: s.dealCode || 'N/A',
    companyName: s.companyName || 'N/A',
    serviceName: s.serviceName || 'N/A',
    sector: s.sectorName || 'General Operations',
    assignedMember: s.assignedOpsUser?.fullName || 'Unassigned (In Pool)',
    status: s.status || 'PENDING',
    govApplicationNumber: s.govApplicationNumber || 'Not Filed',
    targetCompletionDate: s.targetCompletionDate ? new Date(s.targetCompletionDate).toLocaleDateString('en-IN') : 'Not Set',
    deadlineStatus: s.deadlineStatus || 'On Track',
    serviceFee: Number(s.serviceFee || 0).toLocaleString('en-IN'),
  }));

  downloadCsv(filename, headers, rows);
}

/**
 * Format Operations team workload and capacity for CSV export
 */
export function exportOpsTeamWorkloadToCsv(teamList, filename = 'Operations_Team_Capacity_Report.csv') {
  const headers = [
    { key: 'fullName', label: 'Team Member' },
    { key: 'role', label: 'Role / Designation' },
    { key: 'sector', label: 'Expertise Sector' },
    { key: 'email', label: 'Email' },
    { key: 'totalAssigned', label: 'Total Assigned' },
    { key: 'inProgress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'overdue', label: 'Overdue Tasks' },
    { key: 'completionRate', label: 'Completion Rate (%)' },
  ];

  const rows = teamList.map((m) => ({
    fullName: m.fullName,
    role: m.designation || 'Operations Executive',
    sector: m.sectorName || 'General Operations',
    email: m.email,
    totalAssigned: m.totalAssigned || 0,
    inProgress: m.inProgress || 0,
    completed: m.completed || 0,
    overdue: m.overdue || 0,
    completionRate: `${m.completionRate || 0}%`,
  }));

  downloadCsv(filename, headers, rows);
}


/**
 * Format LMS leads for CSV export
 */
export function exportLeadsToCsv(leads, filename = 'CorporateMart_LMS_Leads.csv') {
  const headers = [
    { key: 'companyName', label: 'Company Name' },
    { key: 'directorName', label: 'Director Name' },
    { key: 'mobileNo', label: 'Mobile No' },
    { key: 'emailId', label: 'Email ID' },
    { key: 'leaderName', label: "Leader's Name" },
    { key: 'bdmName1', label: "BDM's Name - I" },
    { key: 'bdmName2', label: "BDM's Name - II" },
    { key: 'closerStatus', label: 'Closer Status' },
    { key: 'clientStatus', label: 'Client Status (Hot/Warm/Lost)' },
    { key: 'followUpHistory', label: 'Follow-up Status History' },
    { key: 'sourcingStatus', label: 'Sourcing Status' },
    { key: 'meetingStatus', label: 'Meeting Status' },
    { key: 'meetingDate', label: 'Meeting Date' },
    { key: 'expectedDateOfCloser', label: 'Expected Date of Closer (EDC)' },
    { key: 'leadStatus', label: 'Lead Stage / Status' },
    { key: 'dealValue', label: 'Estimated Deal Value (₹)' },
    { key: 'quotationFileName', label: 'Quotation Document' },
    { key: 'remarks', label: 'Remarks / Notes' },
    { key: 'createdAt', label: 'Date Logged' },
  ];

  const rows = leads.map((l) => ({
    companyName: l.companyName || 'N/A',
    directorName: l.directorName || 'N/A',
    mobileNo: l.mobileNo || 'N/A',
    emailId: l.emailId || 'N/A',
    leaderName: l.leaderName || 'N/A',
    bdmName1: l.bdmName1 || 'N/A',
    bdmName2: l.bdmName2 || 'None',
    closerStatus: l.closerStatus || 'N/A',
    clientStatus: l.clientStatus || 'Warm',
    followUpHistory: (() => {
      let fus = [];
      if (l.followUps) {
        fus = typeof l.followUps === 'string' ? JSON.parse(l.followUps) : l.followUps;
      }
      if (!Array.isArray(fus) || fus.length === 0) return 'No follow-ups';
      return fus.map((f) => `${f.date}: ${f.status}`).join(' | ');
    })(),
    sourcingStatus: l.sourcingStatus || 'N/A',
    meetingStatus: l.meetingStatus || 'N/A',
    meetingDate: l.meetingDate ? new Date(l.meetingDate).toLocaleDateString('en-IN') : 'Not Set',
    expectedDateOfCloser: l.expectedDateOfCloser ? new Date(l.expectedDateOfCloser).toLocaleDateString('en-IN') : 'Not Set',
    leadStatus: l.leadStatus || 'OPEN',
    dealValue: l.dealValue ? Number(l.dealValue).toLocaleString('en-IN') : 'N/A',
    quotationFileName: l.quotationFileName || 'None',
    remarks: l.remarks || 'N/A',
    createdAt: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : 'N/A',
  }));

  downloadCsv(filename, headers, rows);
}
