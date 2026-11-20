import React, { useState, useEffect } from 'react';
import LeadManagementWorkbench from './LeadManagementWorkbench';
import DashboardStats from './DashboardStats';
import DealsTable from './DealsTable';
import {
  TrendingUp,
  UserPlus,
  Users,
  Briefcase,
  CreditCard,
  Scale,
  Cog,
  Send,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Edit3,
  RefreshCw,
  Eye,
  Building2,
  Phone,
  Mail,
  ChevronRight,
  FileSpreadsheet,
  Check,
  X,
  ShieldCheck,
  Percent,
  Layers,
} from 'lucide-react';
import api from '../lib/api';
import {
  exportDealsToCsv,
  exportClientsToCsv,
  exportBdmPerformanceToCsv,
  exportDepartmentMembersToCsv,
  exportLeadsToCsv,
} from '../lib/exportCsv';

const STAGE_LABELS = {
  STAGE_01_PAYMENT_RECEIVED: { label: '01. Payment Rcvd', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  STAGE_02_DOCUMENTS_COLLECTED: { label: '02. Docs Collected', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  STAGE_04_ACCOUNTS_VERIFICATION: { label: '04. Accounts Queue', color: 'bg-amber-50 text-amber-800 border-amber-300' },
  STAGE_04_ACCOUNTS_REJECTED: { label: '04. Accounts Rejected', color: 'bg-rose-50 text-rose-700 border-rose-300' },
  STAGE_05_LEGAL_VERIFICATION: { label: '05. Legal Scrutiny', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  STAGE_05_LEGAL_REJECTED: { label: '05. Legal Rejected', color: 'bg-rose-50 text-rose-700 border-rose-300' },
  STAGE_06_OPERATIONS_PROCESSING: { label: '06. In Operations', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  STAGE_07_SERVICE_COMPLETED: { label: '07. Service Done', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  STAGE_08_FINAL_DOCS_DELIVERED: { label: '08. Docs Delivered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  STAGE_09_RM_HANDOVER: { label: '09. RM Handover', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  CLOSED: { label: 'Deal Closed', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
};

function getDealVerifiedCollected(d) {
  if (d.payments && Array.isArray(d.payments) && d.payments.length > 0) {
    return d.payments
      .filter((p) => p.status === 'VERIFIED')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }
  if (d.isAccountsVerified || !['STAGE_04_ACCOUNTS_VERIFICATION', 'STAGE_04_ACCOUNTS_REJECTED'].includes(d.stage)) {
    return Number(d.amountReceived || 0);
  }
  return 0;
}

function isDealAccountsVerified(d) {
  return Boolean(d.isAccountsVerified || !['STAGE_04_ACCOUNTS_VERIFICATION', 'STAGE_04_ACCOUNTS_REJECTED'].includes(d.stage));
}

function buildOverviewFromDeals(deals = [], users = [], stats = null) {
  const totalDeals = deals.length;
  const verifiedDeals = deals.filter(isDealAccountsVerified);
  const totalRevenue = verifiedDeals.reduce((sum, d) => sum + Number(d.totalAmount || 0), 0);
  const totalCollected = deals.reduce((sum, d) => sum + getDealVerifiedCollected(d), 0);
  const totalPending = Math.max(0, totalRevenue - totalCollected);
  const avgDealSize = verifiedDeals.length > 0 ? Math.round(totalRevenue / verifiedDeals.length) : 0;
  const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;

  // Extract unique clients
  const uniqueClients = new Set();
  deals.forEach((d) => {
    if (d.client?.id) uniqueClients.add(d.client.id);
    else if (d.clientId) uniqueClients.add(d.clientId);
    else if (d.client?.companyName) uniqueClients.add(d.client.companyName);
  });
  const totalClients = Math.max(uniqueClients.size, stats?.counts?.totalClients || uniqueClients.size);

  // Group BDM Performance
  const bdmMap = new Map();
  (users || []).filter((u) => u.role === 'BDM').forEach((u) => {
    bdmMap.set(u.id, {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      salesTarget: Number(u.salesTarget || 500000),
      dealsCount: 0,
      totalRevenue: 0,
      totalCollected: 0,
      totalPending: 0,
      achievementPercent: 0,
      closedDealsCount: 0,
      activeDealsCount: 0,
      avgDealSize: 0,
      isActive: u.isActive !== false,
    });
  });

  deals.forEach((d) => {
    const bdmId = d.bdm?.id || d.bdmId || 'unknown_bdm';
    if (!bdmMap.has(bdmId)) {
      bdmMap.set(bdmId, {
        id: bdmId,
        fullName: d.bdm?.fullName || 'Primary BDM',
        email: d.bdm?.email || '',
        phone: '',
        salesTarget: 500000,
        dealsCount: 0,
        totalRevenue: 0,
        totalCollected: 0,
        totalPending: 0,
        achievementPercent: 0,
        closedDealsCount: 0,
        activeDealsCount: 0,
        avgDealSize: 0,
        isActive: true,
      });
    }
    const b = bdmMap.get(bdmId);
    b.dealsCount += 1;
    if (isDealAccountsVerified(d)) {
      b.totalRevenue += Number(d.totalAmount || 0);
    }
    b.totalCollected += getDealVerifiedCollected(d);
    if (d.stage === 'CLOSED') b.closedDealsCount += 1;
    else b.activeDealsCount += 1;
  });

  const bdmPerformance = Array.from(bdmMap.values()).map((b) => {
    const target = b.salesTarget || 500000;
    b.totalPending = Math.max(0, b.totalRevenue - b.totalCollected);
    return {
      ...b,
      achievementPercent: target > 0 ? Math.round((b.totalCollected / target) * 100) : 0,
      avgDealSize: b.dealsCount > 0 ? Math.round(b.totalRevenue / b.dealsCount) : 0,
    };
  });

  // Accounts Performance
  const accountsMap = new Map();
  (users || []).filter((u) => u.role === 'ACCOUNTS').forEach((u) => {
    accountsMap.set(u.id, {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      assignedDealsCount: 0,
      dealsVerifiedCount: 0,
      paymentsVerifiedCount: 0,
      totalVerifiedAmount: 0,
    });
  });

  deals.forEach((d) => {
    const accId = d.assignedAccountsUserId || d.accountsVerifiedById;
    if (accId && !accountsMap.has(accId)) {
      accountsMap.set(accId, {
        id: accId,
        fullName: d.assignedAccountsUser?.fullName || d.accountsVerifiedBy?.fullName || 'Accounts Executive',
        email: d.assignedAccountsUser?.email || '',
        phone: '',
        assignedDealsCount: 0,
        dealsVerifiedCount: 0,
        paymentsVerifiedCount: 0,
        totalVerifiedAmount: 0,
      });
    }

    if (d.assignedAccountsUserId && accountsMap.has(d.assignedAccountsUserId)) {
      accountsMap.get(d.assignedAccountsUserId).assignedDealsCount += 1;
    }
    if (d.isAccountsVerified && d.accountsVerifiedById && accountsMap.has(d.accountsVerifiedById)) {
      accountsMap.get(d.accountsVerifiedById).dealsVerifiedCount += 1;
    }

    // Tally all verified payments
    (d.payments || []).forEach((p) => {
      if (p.status === 'VERIFIED') {
        const verifierId = p.verifiedById || d.accountsVerifiedById || d.assignedAccountsUserId;
        if (verifierId) {
          if (!accountsMap.has(verifierId)) {
            accountsMap.set(verifierId, {
              id: verifierId,
              fullName: p.verifiedBy?.fullName || d.accountsVerifiedBy?.fullName || d.assignedAccountsUser?.fullName || 'Accounts Executive',
              email: p.verifiedBy?.email || '',
              phone: '',
              assignedDealsCount: 0,
              dealsVerifiedCount: 0,
              paymentsVerifiedCount: 0,
              totalVerifiedAmount: 0,
            });
          }
          const acc = accountsMap.get(verifierId);
          acc.paymentsVerifiedCount += 1;
          acc.totalVerifiedAmount += Number(p.amount || 0);
        }
      }
    });
  });
  const accountsPerformance = Array.from(accountsMap.values());

  // Legal Performance
  const legalMap = new Map();
  (users || []).filter((u) => u.role === 'LEGAL').forEach((u) => {
    legalMap.set(u.id, {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      assignedDealsCount: 0,
      dealsVerifiedCount: 0,
    });
  });
  deals.forEach((d) => {
    if (d.assignedLegalUserId && legalMap.has(d.assignedLegalUserId)) {
      legalMap.get(d.assignedLegalUserId).assignedDealsCount += 1;
    }
    if (d.isLegalVerified && d.legalVerifiedById && legalMap.has(d.legalVerifiedById)) {
      legalMap.get(d.legalVerifiedById).dealsVerifiedCount += 1;
    }
  });
  const legalPerformance = Array.from(legalMap.values());

  // Operations Performance
  const opsMap = new Map();
  (users || []).filter((u) => u.role === 'OPERATIONS').forEach((u) => {
    opsMap.set(u.id, {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      totalServices: 0,
      completedServices: 0,
      inProgressServices: 0,
      pendingServices: 0,
      totalFee: 0,
      completionRate: 0,
    });
  });
  deals.forEach((d) => {
    (d.services || []).forEach((s) => {
      const opsId = s.assignedOpsUserId || d.assignedOpsUserId;
      if (opsId && opsMap.has(opsId)) {
        const op = opsMap.get(opsId);
        op.totalServices += 1;
        op.totalFee += Number(s.serviceFee || 0);
        if (s.status === 'COMPLETED') op.completedServices += 1;
        else if (['IN_PROGRESS', 'GOVT_SUBMITTED', 'QUERY_RAISED'].includes(s.status)) op.inProgressServices += 1;
        else op.pendingServices += 1;
      }
    });
  });
  const opsPerformance = Array.from(opsMap.values()).map((op) => ({
    ...op,
    completionRate: op.totalServices > 0 ? Math.round((op.completedServices / op.totalServices) * 100) : 0,
  }));

  // RM Performance
  const rmMap = new Map();
  (users || []).filter((u) => u.role === 'RM').forEach((u) => {
    rmMap.set(u.id, {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      renewalsCount: 0,
    });
  });
  const rmPerformance = Array.from(rmMap.values());

  // Stage Map
  const stageMap = {};
  deals.forEach((d) => {
    if (!stageMap[d.stage]) {
      stageMap[d.stage] = { count: 0, totalAmount: 0, amountReceived: 0, pendingAmount: 0 };
    }
    stageMap[d.stage].count += 1;
    stageMap[d.stage].totalAmount += Number(d.totalAmount || 0);
    stageMap[d.stage].amountReceived += Number(d.amountReceived || 0);
    stageMap[d.stage].pendingAmount += Number(d.pendingAmount || 0);
  });

  return {
    summary: {
      totalDeals,
      totalClients,
      totalRevenue,
      totalCollected,
      totalPending,
      avgDealSize,
      collectionRate,
    },
    stageMap,
    bdmPerformance,
    accountsPerformance,
    legalPerformance,
    opsPerformance,
    rmPerformance,
    allDeals: deals,
    recentDeals: deals.slice(0, 8),
  };
}

export default function AdminDashboard({
  currentUser,
  onOpenDossier,
  onRefreshParent,
  onConvertToDeal,
  initialDeals = [],
  initialStats = null,
  stats = null,
  onCollectBalance,
  highlightLeadId,
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(() => {
    if (initialDeals && initialDeals.length > 0) {
      return buildOverviewFromDeals(initialDeals, [], initialStats);
    }
    return null;
  });
  const [clients, setClients] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('deals');
  const [lmsCount, setLmsCount] = useState(0);
  const [lmsAnalytics, setLmsAnalytics] = useState(null);
  
  // Master Pipeline tab filter & search
  const [pipelineFilterId, setPipelineFilterId] = useState('ALL');
  const [pipelineStageKey, setPipelineStageKey] = useState(null);
  const [pipelineSearch, setPipelineSearch] = useState('');

  // Switch to LMS subtab if a specific lead is highlighted
  useEffect(() => {
    if (highlightLeadId) {
      setActiveSubTab('lms');
    }
  }, [highlightLeadId]);

  // Deals tab filter & search
  const [dealSearch, setDealSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [bdmFilter, setBdmFilter] = useState('ALL');

  // Clients tab filter & search
  const [clientSearch, setClientSearch] = useState('');

  // Target editing state
  const [editingTargetUserId, setEditingTargetUserId] = useState(null);
  const [targetInputValue, setTargetInputValue] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  // Export menu toggle
  const [showExportMenu, setShowExportMenu] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      let overviewData = null;
      let clientsData = [];

      try {
        const overviewRes = await api.get('/dashboard/admin-overview');
        overviewData = overviewRes.data;
      } catch (err) {
        console.warn('admin-overview API error, falling back:', err);
      }

      try {
        const clientsRes = await api.get('/dashboard/clients');
        clientsData = clientsRes.data.clients || [];
      } catch (err) {
        console.warn('clients API error:', err);
      }

      // If backend returned complete overview, use it
      if (overviewData && overviewData.allDeals && overviewData.allDeals.length > 0) {
        setData(overviewData);
        if (clientsData.length > 0) {
          setClients(clientsData);
        } else {
          extractClientsFromDeals(overviewData.allDeals);
        }
      } else {
        // Fallback: Fetch directly from /deals and /users
        const [dealsRes, usersRes] = await Promise.all([
          api.get('/deals').catch(() => ({ data: { deals: initialDeals || [] } })),
          api.get('/users').catch(() => ({ data: { users: [] } })),
        ]);

        const rawDeals = (dealsRes.data?.deals && dealsRes.data.deals.length > 0)
          ? dealsRes.data.deals
          : (initialDeals || []);
        const rawUsers = usersRes.data?.users || [];

        const generated = buildOverviewFromDeals(rawDeals, rawUsers, initialStats);
        setData(generated);

        if (clientsData.length > 0) {
          setClients(clientsData);
        } else {
          extractClientsFromDeals(rawDeals);
        }
      }
    } catch (err) {
      console.error('Failed to load admin overview:', err);
      if (initialDeals && initialDeals.length > 0) {
        setData(buildOverviewFromDeals(initialDeals, [], initialStats));
        extractClientsFromDeals(initialDeals);
      }
    } finally {
      try {
        const leadsRes = await api.get('/leads');
        setLmsCount((leadsRes.data.leads || []).length);
        setLmsAnalytics(leadsRes.data.analytics || null);
      } catch (err) {}
      setLoading(false);
    }
  };

  const extractClientsFromDeals = (dealsList) => {
    const clientMap = new Map();
    dealsList.forEach((d) => {
      const c = d.client;
      if (c && (c.id || c.companyName)) {
        const key = c.id || c.companyName;
        if (!clientMap.has(key)) {
          clientMap.set(key, {
            id: c.id || key,
            companyName: c.companyName,
            clientName: c.clientName || 'N/A',
            email: c.email || 'N/A',
            phone: c.phone || 'N/A',
            city: c.city || '',
            state: c.state || '',
            gstin: c.gstin || '',
            panNumber: c.panNumber || '',
            consultantName: c.consultantName || '',
            dealsCount: 0,
            totalAmount: 0,
            amountReceived: 0,
            pendingAmount: 0,
            deals: [],
          });
        }
        const entry = clientMap.get(key);
        entry.dealsCount += 1;
        entry.totalAmount += Number(d.totalAmount || 0);
        entry.amountReceived += Number(d.amountReceived || 0);
        entry.pendingAmount += Number(d.pendingAmount || 0);
        entry.deals.push(d);
      }
    });
    setClients(Array.from(clientMap.values()));
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // If parent deals update, keep fallback in sync
  useEffect(() => {
    if (initialDeals && initialDeals.length > 0 && (!data || !data.allDeals || data.allDeals.length === 0)) {
      setData(buildOverviewFromDeals(initialDeals, [], initialStats));
      extractClientsFromDeals(initialDeals);
    }
  }, [initialDeals]);

  const handleUpdateTarget = async (userId) => {
    try {
      setSavingTarget(true);
      await api.patch(`/users/${userId}/sales-target`, {
        salesTarget: parseFloat(targetInputValue),
      });
      setEditingTargetUserId(null);
      await fetchAdminData();
    } catch (err) {
      alert('Failed to update sales target: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingTarget(false);
    }
  };

  const summary = data?.summary || {
    totalDeals: 0,
    totalClients: 0,
    totalRevenue: 0,
    totalCollected: 0,
    totalPending: 0,
    collectionRate: 0,
    avgDealSize: 0,
  };

  const allDeals = data?.allDeals || initialDeals || [];
  const bdmPerformance = data?.bdmPerformance || [];
  const accountsPerformance = data?.accountsPerformance || [];
  const legalPerformance = data?.legalPerformance || [];
  const opsPerformance = data?.opsPerformance || [];
  const rmPerformance = data?.rmPerformance || [];

  // Filtered Deals
  const filteredDeals = allDeals.filter((d) => {
    if (stageFilter !== 'ALL' && d.stage !== stageFilter) return false;
    if (bdmFilter !== 'ALL' && (d.bdm?.id !== bdmFilter && d.bdmId !== bdmFilter)) return false;
    if (dealSearch.trim()) {
      const q = dealSearch.toLowerCase().trim();
      const code = (d.dealCode || '').toLowerCase();
      const company = (d.client?.companyName || '').toLowerCase();
      const client = (d.client?.clientName || '').toLowerCase();
      const bdmName = (d.bdm?.fullName || '').toLowerCase();
      return code.includes(q) || company.includes(q) || client.includes(q) || bdmName.includes(q);
    }
    return true;
  });

  // Filtered Deals for Master Pipeline tab
  const pipelineFilteredDeals = allDeals.filter((d) => {
    if (pipelineStageKey) {
      if (pipelineStageKey === 'STAGE_08_FINAL_DOCS_DELIVERED') {
        if (d.stage !== 'STAGE_08_FINAL_DOCS_DELIVERED' && d.stage !== 'STAGE_09_RM_HANDOVER') {
          return false;
        }
      } else if (d.stage !== pipelineStageKey) {
        return false;
      }
    }
    if (pipelineSearch.trim()) {
      const q = pipelineSearch.toLowerCase().trim();
      const code = (d.dealCode || '').toLowerCase();
      const company = (d.client?.companyName || '').toLowerCase();
      const client = (d.client?.clientName || '').toLowerCase();
      const bdmName = (d.bdm?.fullName || '').toLowerCase();
      return code.includes(q) || company.includes(q) || client.includes(q) || bdmName.includes(q);
    }
    return true;
  });

  const currentStats = stats || initialStats || {
    counts: {
      totalDeals: allDeals.length,
      pendingBdmHandover: 0,
      pendingAccounts: allDeals.filter((d) => d.stage === 'STAGE_04_ACCOUNTS_VERIFICATION').length,
      accountsRejected: allDeals.filter((d) => d.stage === 'STAGE_04_ACCOUNTS_REJECTED').length,
      pendingLegal: allDeals.filter((d) => d.stage === 'STAGE_05_LEGAL_VERIFICATION').length,
      legalRejected: allDeals.filter((d) => d.stage === 'STAGE_05_LEGAL_REJECTED').length,
      inOperations: allDeals.filter((d) => d.stage === 'STAGE_06_OPERATIONS_PROCESSING').length,
      completedServices: allDeals.filter((d) => d.stage === 'STAGE_07_SERVICE_COMPLETED').length,
      pendingRmHandover: allDeals.filter((d) => d.stage === 'STAGE_08_FINAL_DOCS_DELIVERED' || d.stage === 'STAGE_09_RM_HANDOVER').length,
      closedDeals: allDeals.filter((d) => d.stage === 'CLOSED').length,
      pendingBalanceVerifications: 0,
    },
    financials: {
      totalDealValue: summary.totalRevenue || 0,
      totalCollected: summary.totalCollected || 0,
      totalPending: summary.totalPending || 0,
    },
  };

  // Filtered Clients
  const filteredClients = clients.filter((c) => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase().trim();
    return (
      (c.companyName || '').toLowerCase().includes(q) ||
      (c.clientName || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.gstin || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. ADMIN HEADER & GLOBAL ACTIONS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Admin Command Center</h1>
                <p className="text-xs text-slate-300 mt-0.5">
                  Complete real-time governance of Deals, Financial Flow, Department Workloads & Client Intelligence
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-auto relative">
            <button
              onClick={() => {
                fetchAdminData();
                if (onRefreshParent) onRefreshParent();
              }}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-white/10 backdrop-blur-sm"
              title="Refresh All Metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* EXPORT DATA DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export Reports</span>
              </button>

              {showExportMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-1"
                  onClick={() => setShowExportMenu(false)}
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Export Data (Excel / CSV)
                  </div>
                  <button
                    onClick={() => exportDealsToCsv(allDeals)}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <span>Export All Deals ({allDeals.length})</span>
                  </button>
                  <button
                    onClick={async () => {
                      const res = await api.get('/leads');
                      exportLeadsToCsv(res.data.leads || []);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <UserPlus className="w-4 h-4 text-amber-600" />
                    <span>Export All LMS Leads ({lmsCount})</span>
                  </button>
                  <button
                    onClick={() => exportClientsToCsv(clients)}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Export Clients Directory ({clients.length})</span>
                  </button>
                  <button
                    onClick={() => exportBdmPerformanceToCsv(bdmPerformance)}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span>Export BDM Scorecards ({bdmPerformance.length})</span>
                  </button>
                  <button
                    onClick={() =>
                      exportDepartmentMembersToCsv({
                        accounts: accountsPerformance,
                        legal: legalPerformance,
                        operations: opsPerformance,
                        rm: rmPerformance,
                      })
                    }
                    className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                    <span>Export Department Workloads</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. TOP KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <span className="text-[11px] font-medium text-slate-300 uppercase tracking-wider block">Closed Pipeline Value</span>
            <div className="text-xl font-extrabold text-white mt-1 font-mono tabular-nums">
              ₹{Number(summary.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1 font-mono tabular-nums">
              <span>Avg Deal: ₹{Number(summary.avgDealSize || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="bg-indigo-950/40 rounded-xl p-3.5 border border-indigo-500/30">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> LMS Lead Funnel
            </span>
            <div className="text-xl font-extrabold text-amber-300 mt-1 font-mono tabular-nums">
              ₹{Number(lmsAnalytics?.totalEstimatedValue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-indigo-200 mt-1">
              <span className="font-mono tabular-nums font-bold">{lmsCount}</span> prospective leads in funnel
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <span className="text-[11px] font-medium text-slate-300 uppercase tracking-wider block">Collected / Realized</span>
            <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono tabular-nums">
              ₹{Number(summary.totalCollected || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-300/80 mt-1 flex items-center gap-1">
              <Percent className="w-3 h-3" />
              <span className="font-mono tabular-nums font-bold">{summary.collectionRate}%</span> Collection Rate
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <span className="text-[11px] font-medium text-slate-300 uppercase tracking-wider block">Outstanding Balance</span>
            <div className="text-xl font-extrabold text-amber-400 mt-1 font-mono tabular-nums">
              ₹{Number(summary.totalPending || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-amber-300/80 mt-1">
              Across Part-Payment Deals
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <span className="text-[11px] font-medium text-slate-300 uppercase tracking-wider block">Deals & Clients Volume</span>
            <div className="text-xl font-extrabold text-indigo-300 mt-1">
              <span className="font-mono tabular-nums">{allDeals.length}</span> Deals <span className="text-xs text-slate-300 font-normal">/ <span className="font-mono tabular-nums">{clients.length || summary.totalClients}</span> Clients</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              <span className="font-mono tabular-nums font-bold">{bdmPerformance.length}</span> BDMs active
            </div>
          </div>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'deals', label: 'Deals Monitor', icon: Briefcase, count: allDeals.length },
          { id: 'pipeline', label: 'Master Pipeline', icon: Layers, count: (currentStats?.counts?.totalDeals || allDeals.length) },
          { id: 'lms', label: 'Lead Management (LMS)', icon: UserPlus, count: lmsCount },
          { id: 'bdm', label: 'BDM Team', icon: TrendingUp, count: bdmPerformance.length },
          { id: 'accounts', label: 'Accounts Desk', icon: CreditCard, count: accountsPerformance.length },
          { id: 'legal', label: 'Legal Scrutiny', icon: Scale, count: legalPerformance.length },
          { id: 'operations', label: 'Operations Desk', icon: Cog, count: opsPerformance.length },
          { id: 'rm', label: 'RM & Renewals', icon: Send, count: rmPerformance.length },
          { id: 'clients', label: 'Client Directory', icon: Building2, count: clients.length },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. VIEW CONTENT */}

      {/* -------------------- TAB: MASTER PIPELINE -------------------- */}
      {activeSubTab === 'pipeline' && (
        <div className="space-y-4">
          <DashboardStats
            stats={currentStats}
            activeFilter={pipelineFilterId}
            onSelectFilter={(filterId, stageKey) => {
              setPipelineFilterId(filterId);
              setPipelineStageKey(stageKey || null);
            }}
            currentUser={currentUser || { role: 'ADMIN' }}
            onRefreshStats={() => {
              fetchAdminData();
              if (onRefreshParent) onRefreshParent();
            }}
          />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search company, client name, or deal code..."
                value={pipelineSearch}
                onChange={(e) => setPipelineSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
              />
            </div>

            <div className="text-xs sm:text-sm text-slate-500 font-medium self-end sm:self-auto">
              Showing <strong className="text-slate-900 font-bold font-mono tabular-nums">{pipelineFilteredDeals.length}</strong> active deals
            </div>
          </div>

          <DealsTable
            deals={pipelineFilteredDeals}
            loading={loading}
            currentUser={currentUser || { role: 'ADMIN' }}
            onSelectDeal={(id) => onOpenDossier(id)}
            onCollectBalance={onCollectBalance}
          />
        </div>
      )}

      {/* -------------------- TAB: LEAD MANAGEMENT SYSTEM (LMS) -------------------- */}
      {activeSubTab === 'lms' && (
        <LeadManagementWorkbench
          currentUser={{ role: 'ADMIN', fullName: 'Master Admin' }}
          onConvertToDeal={onConvertToDeal}
        />
      )}

      {/* -------------------- TAB 1: DEALS MONITOR -------------------- */}
      {activeSubTab === 'deals' && (
        <div className="space-y-4">
          {/* Controls: Search, Stage Filter, BDM Filter, Export */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search deal code, company, client, or BDM..."
                  value={dealSearch}
                  onChange={(e) => setDealSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
                />
              </div>

              {/* Stage Filter */}
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">All Stages</option>
                {Object.entries(STAGE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>

              {/* BDM Filter */}
              <select
                value={bdmFilter}
                onChange={(e) => setBdmFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">All BDMs</option>
                {bdmPerformance.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportDealsToCsv(filteredDeals, 'Filtered_Deals_Report.csv')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-300"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export View ({filteredDeals.length})</span>
              </button>
            </div>
          </div>

          {/* Deals Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Deal Code</th>
                    <th className="py-3 px-4">Client / Company</th>
                    <th className="py-3 px-4">BDM</th>
                    <th className="py-3 px-4">Stage / Gate</th>
                    <th className="py-3 px-4 text-right">Total Deal Value</th>
                    <th className="py-3 px-4 text-right">Received</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-center">Status Checks</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredDeals.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No deals match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDeals.map((deal) => {
                      const stageMeta = STAGE_LABELS[deal.stage] || {
                        label: deal.stage,
                        color: 'bg-slate-100 text-slate-700 border-slate-200',
                      };
                      return (
                        <tr key={deal.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {deal.dealCode}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{deal.client?.companyName}</div>
                            <div className="text-[11px] text-slate-500">{deal.client?.clientName} • {deal.client?.phone}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 text-xs block">
                              {(deal.bdm?.fullName || 'N/A').replace(/\s*\(BDM\)/gi, '')}
                            </span>
                            {deal.coBdms?.length > 0 && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[150px]" title={deal.coBdms.map((cb) => cb.fullName).join(', ')}>
                                + {deal.coBdms.map((cb) => cb.fullName).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border ${stageMeta.color}`}>
                              {stageMeta.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            ₹{Number(deal.totalAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                            ₹{Number(deal.amountReceived || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-amber-600">
                            ₹{Number(deal.pendingAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-[10px]">
                              <span
                                className={`px-1.5 py-0.5 rounded font-semibold ${
                                  deal.isAccountsVerified
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                Acc: {deal.isAccountsVerified ? '✓' : '—'}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-semibold ${
                                  deal.isLegalVerified
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                Leg: {deal.isLegalVerified ? '✓' : '—'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => onOpenDossier(deal.id)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition mx-auto"
                              title="Open Deal Dossier"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: BDM TEAM PERFORMANCE -------------------- */}
      {activeSubTab === 'bdm' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-slate-900">BDM Sales Team Scorecard</h2>
              <p className="text-xs text-slate-500">Track target achievements, revenue generated, collection rates and edit sales targets</p>
            </div>
            <button
              onClick={() => exportBdmPerformanceToCsv(bdmPerformance)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export BDM Scorecard</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bdmPerformance.map((bdm) => {
              const isEditing = editingTargetUserId === bdm.id;
              const isGoalMet = bdm.achievementPercent >= 100;
              const progressColor =
                bdm.achievementPercent >= 100
                  ? 'bg-emerald-500'
                  : bdm.achievementPercent >= 60
                  ? 'bg-amber-500'
                  : 'bg-rose-500';

              return (
                <div
                  key={bdm.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{bdm.fullName}</h3>
                      <p className="text-xs text-slate-500">{bdm.email}</p>
                      {bdm.phone && <p className="text-xs text-slate-400">{bdm.phone}</p>}
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-extrabold ${
                        isGoalMet ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {bdm.achievementPercent}% Goal
                    </span>
                  </div>

                  {/* Target & Inline Editor */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Monthly Sales Target:</span>
                      {!isEditing && (
                        <button
                          onClick={() => {
                            setEditingTargetUserId(bdm.id);
                            setTargetInputValue(String(bdm.salesTarget));
                          }}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 text-[11px]"
                        >
                          <Edit3 className="w-3 h-3" /> Edit Target
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-bold text-slate-700">₹</span>
                        <input
                          type="number"
                          value={targetInputValue}
                          onChange={(e) => setTargetInputValue(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateTarget(bdm.id)}
                          disabled={savingTarget}
                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          title="Save Target"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingTargetUserId(null)}
                          className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-base font-extrabold text-slate-900">
                        ₹{Number(bdm.salesTarget || 0).toLocaleString('en-IN')}
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2.5">
                      <div
                        className={`h-full ${progressColor} transition-all duration-500`}
                        style={{ width: `${Math.min(100, bdm.achievementPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Revenue</span>
                      <span className="font-extrabold text-slate-900">
                        ₹{Number(bdm.totalRevenue || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
                      <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Collected</span>
                      <span className="font-extrabold text-emerald-700">
                        ₹{Number(bdm.totalCollected || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-100">
                      <span className="text-[10px] text-amber-600 uppercase font-semibold block">Pending</span>
                      <span className="font-extrabold text-amber-700">
                        ₹{Number(bdm.totalPending || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100">
                      <span className="text-[10px] text-indigo-600 uppercase font-semibold block">Deals</span>
                      <span className="font-extrabold text-indigo-800">
                        {bdm.dealsCount} Total ({bdm.closedDealsCount} Closed)
                      </span>
                    </div>

                    {/* BDM LMS Lead Funnel Value */}
                    <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-indigo-700 uppercase font-bold flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-indigo-600" /> LMS Deal Funnel
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-600">
                          {lmsAnalytics?.bdmFunnel?.[bdm.fullName]?.count || 0} active leads
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-extrabold text-indigo-950 text-sm">
                          ₹{Number(lmsAnalytics?.bdmFunnel?.[bdm.fullName]?.totalValue || 0).toLocaleString('en-IN')}
                        </span>
                        {(lmsAnalytics?.bdmFunnel?.[bdm.fullName]?.hotValue || 0) > 0 && (
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">
                            🔥 Hot: ₹{Number(lmsAnalytics?.bdmFunnel?.[bdm.fullName]?.hotValue || 0).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Filter deals by this BDM trigger */}
                  <button
                    onClick={() => {
                      setBdmFilter(bdm.id);
                      setActiveSubTab('deals');
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <span>View Deals by {bdm.fullName.split(' ')[0]}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------- TAB 3: ACCOUNTS DESK MONITOR -------------------- */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Accounts Verification Desk</h2>
              <p className="text-xs text-slate-500">Monitor transaction verification, payment tranches ledger, and accounts executive assignments</p>
            </div>
            <button
              onClick={() =>
                exportDepartmentMembersToCsv({ accounts: accountsPerformance }, 'Accounts_Workload_Report.csv')
              }
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Accounts Report</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountsPerformance.map((acc) => (
              <div key={acc.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{acc.fullName}</h3>
                    <p className="text-xs text-slate-500">{acc.email}</p>
                    {acc.phone && <p className="text-xs text-slate-400">{acc.phone}</p>}
                  </div>
                  <span className="p-2 rounded-lg bg-amber-50 text-amber-700">
                    <CreditCard className="w-4 h-4" />
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Assigned Deals</span>
                    <span className="font-extrabold text-slate-900">{acc.assignedDealsCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Deals Verified</span>
                    <span className="font-extrabold text-emerald-800">{acc.dealsVerifiedCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 col-span-2">
                    <span className="text-[10px] text-indigo-600 uppercase font-semibold block">Total Payment Verified</span>
                    <span className="font-extrabold text-indigo-900">
                      ₹{Number(acc.totalVerifiedAmount || 0).toLocaleString('en-IN')} ({acc.paymentsVerifiedCount} tranches)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Deals pending in Accounts */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Deals Currently in Accounts Queue ({allDeals.filter((d) => d.stage === 'STAGE_04_ACCOUNTS_VERIFICATION').length})</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] bg-slate-50/60">
                    <th className="py-2 px-3">Deal Code</th>
                    <th className="py-2 px-3">Client Company</th>
                    <th className="py-2 px-3">BDM</th>
                    <th className="py-2 px-3">Receiving Bank</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allDeals
                    .filter((d) => d.stage === 'STAGE_04_ACCOUNTS_VERIFICATION')
                    .map((deal) => (
                      <tr key={deal.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{deal.dealCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{deal.client?.companyName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{deal.bdm?.fullName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{deal.receivingAccount || 'N/A'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹{Number(deal.totalAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => onOpenDossier(deal.id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-900 hover:text-white rounded text-[11px] font-semibold transition"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 4: LEGAL SCRUTINY MONITOR -------------------- */}
      {activeSubTab === 'legal' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Legal Scrutiny & Compliance Desk</h2>
              <p className="text-xs text-slate-500">Monitor KYC verification, draft agreements, and compliance clearance rates</p>
            </div>
            <button
              onClick={() =>
                exportDepartmentMembersToCsv({ legal: legalPerformance }, 'Legal_Workload_Report.csv')
              }
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Legal Report</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {legalPerformance.map((leg) => (
              <div key={leg.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{leg.fullName}</h3>
                    <p className="text-xs text-slate-500">{leg.email}</p>
                    {leg.phone && <p className="text-xs text-slate-400">{leg.phone}</p>}
                  </div>
                  <span className="p-2 rounded-lg bg-purple-50 text-purple-700">
                    <Scale className="w-4 h-4" />
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Assigned Deals</span>
                    <span className="font-extrabold text-slate-900">{leg.assignedDealsCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-100">
                    <span className="text-[10px] text-purple-600 uppercase font-semibold block">Deals Cleared</span>
                    <span className="font-extrabold text-purple-800">{leg.dealsVerifiedCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Deals pending in Legal */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Deals Currently in Legal Scrutiny ({allDeals.filter((d) => d.stage === 'STAGE_05_LEGAL_VERIFICATION').length})</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] bg-slate-50/60">
                    <th className="py-2 px-3">Deal Code</th>
                    <th className="py-2 px-3">Client Company</th>
                    <th className="py-2 px-3">BDM</th>
                    <th className="py-2 px-3">Legal Counsel</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allDeals
                    .filter((d) => d.stage === 'STAGE_05_LEGAL_VERIFICATION')
                    .map((deal) => (
                      <tr key={deal.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{deal.dealCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{deal.client?.companyName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{deal.bdm?.fullName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{deal.assignedLegalUser?.fullName || 'Adv. Ananya Roy (Legal)'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹{Number(deal.totalAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => onOpenDossier(deal.id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-900 hover:text-white rounded text-[11px] font-semibold transition"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 5: OPERATIONS TEAM MONITOR -------------------- */}
      {activeSubTab === 'operations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Operations Processing & Service Milestones</h2>
              <p className="text-xs text-slate-500">Track service delivery turnaround, govt filings, and workload per Operations member</p>
            </div>
            <button
              onClick={() =>
                exportDepartmentMembersToCsv({ operations: opsPerformance }, 'Operations_Workload_Report.csv')
              }
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Operations Report</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opsPerformance.map((op) => (
              <div key={op.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{op.fullName}</h3>
                    <p className="text-xs text-slate-500">{op.email}</p>
                    {op.phone && <p className="text-xs text-slate-400">{op.phone}</p>}
                  </div>
                  <span className="p-2 rounded-lg bg-cyan-50 text-cyan-700">
                    <Cog className="w-4 h-4" />
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Completion Rate</span>
                    <span className="font-bold text-slate-900">{op.completionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${op.completionRate}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-500 block">Assigned</span>
                    <span className="font-bold text-slate-900">{op.totalServices}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-cyan-50 border border-cyan-100 text-center">
                    <span className="text-[10px] text-cyan-700 block">In Progress</span>
                    <span className="font-bold text-cyan-800">{op.inProgressServices}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                    <span className="text-[10px] text-emerald-700 block">Completed</span>
                    <span className="font-bold text-emerald-800">{op.completedServices}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- TAB 6: RM & RENEWALS MONITOR -------------------- */}
      {activeSubTab === 'rm' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Relationship Managers & Renewals Desk</h2>
              <p className="text-xs text-slate-500">Track client relationship handovers, annual ROC/GST compliances, and retention revenue</p>
            </div>
            <button
              onClick={() => exportDepartmentMembersToCsv({ rm: rmPerformance }, 'RM_Workload_Report.csv')}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export RM Report</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rmPerformance.map((rm) => (
              <div key={rm.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{rm.fullName}</h3>
                    <p className="text-xs text-slate-500">{rm.email}</p>
                    {rm.phone && <p className="text-xs text-slate-400">{rm.phone}</p>}
                  </div>
                  <span className="p-2 rounded-lg bg-slate-100 text-slate-700">
                    <Send className="w-4 h-4" />
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Renewals Assigned</span>
                    <span className="font-extrabold text-slate-900">{rm.renewalsCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Status</span>
                    <span className="font-extrabold text-emerald-800">Active Relationships</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- TAB 7: CLIENTS DIRECTORY -------------------- */}
      {activeSubTab === 'clients' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by company name, contact person, phone, email, or GSTIN..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
              />
            </div>

            <button
              onClick={() => exportClientsToCsv(filteredClients)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Clients ({filteredClients.length})</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Contact Person</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Tax IDs</th>
                    <th className="py-3 px-4 text-center">Deals</th>
                    <th className="py-3 px-4 text-right">Total Business</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No clients found matching your query.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{c.companyName}</div>
                          {c.consultantName && (
                            <div className="text-[11px] text-slate-400">CA: {c.consultantName}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-semibold">{c.clientName}</div>
                          <div className="text-[11px] text-slate-500">{c.email}</div>
                          <div className="text-[11px] text-slate-400">{c.phone}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {c.city || 'N/A'}{c.state ? `, ${c.state}` : ''}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[11px] font-mono">
                            {c.gstin ? (
                              <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">
                                GST: {c.gstin}
                              </span>
                            ) : (
                              <span className="text-slate-400">Non-GST</span>
                            )}
                          </div>
                          {c.panNumber && (
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              PAN: {c.panNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-800">
                            {c.dealsCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          ₹{Number(c.totalAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                          ₹{Number(c.amountReceived || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-amber-600">
                          ₹{Number(c.pendingAmount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
