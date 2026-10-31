import React, { useState, useEffect, useMemo } from 'react';
import {
  Cog,
  CheckCircle2,
  FileCheck,
  RotateCcw,
  Check,
  Lock,
  Layers,
  Eye,
  Send,
  User,
  UserCheck,
  Users,
  Download,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertCircle,
  Award,
  Presentation,
  Code,
  Building2,
  Landmark,
  Scale,
  FileText,
  ChevronRight,
  ExternalLink,
  Briefcase,
  Plus,
  FileSpreadsheet,
} from 'lucide-react';
import api from '../lib/api';
import {
  exportOpsServicesToCsv,
  exportOpsTeamWorkloadToCsv,
} from '../lib/exportCsv';

// -----------------------------------------------------------------------------
// EXPERTISE SECTORS CONFIGURATION (Mock Data - Swappable with Real List Later)
// -----------------------------------------------------------------------------
export const EXPERTISE_SECTORS = [
  {
    id: 'CERTIFICATION',
    name: 'Certifications & Quality',
    icon: Award,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'ISO 9001/14001, CE Mark, Halal, GMP, Startup India, MSME/Udyam',
    keywords: ['iso', 'certification', 'halal', 'ce', 'gmp', 'startup', 'msme', 'udyam', 'compliance', 'audit'],
    specialists: ['Neha Joshi (Certifications Specialist)', 'Vikram Singh (Operations Manager)'],
  },
  {
    id: 'PITCH_DECK',
    name: 'Pitch Decks & Valuation',
    icon: Presentation,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Investor Pitch Decks, Financial Modeling, CMA Data, Business Valuation',
    keywords: ['pitch', 'deck', 'valuation', 'financial model', 'cma', 'business plan', 'projection', 'investor'],
    specialists: ['Amit Patel (Financial & Pitch Specialist)', 'Vikram Singh (Operations Manager)'],
  },
  {
    id: 'DEVELOPMENT',
    name: 'Tech & Web Development',
    icon: Code,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Corporate Websites, E-Commerce Portals, Domain & Hosting, Web Applications',
    keywords: ['web', 'development', 'website', 'portal', 'app', 'domain', 'hosting', 'tech', 'software', 'ui'],
    specialists: ['Rahul Nair (Tech Lead & Full Stack)', 'Vikram Singh (Operations Manager)'],
  },
  {
    id: 'INCORPORATION',
    name: 'Incorporation & MCA',
    icon: Building2,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Pvt Ltd, LLP, OPC, Section 8, SPICe+ Part B, MoA/AoA, ROC Filings',
    keywords: ['incorporation', 'pvt ltd', 'llp', 'opc', 'spice', 'mca', 'roc', 'company registration', 'director'],
    specialists: ['Priya Sharma (ROC & Incorporation Specialist)', 'Vikram Singh (Operations Manager)'],
  },
  {
    id: 'GOVT_TENDERS',
    name: 'GeM Portal & Govt Tenders',
    icon: Landmark,
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'GeM Portal Vendor Registration, Bid Assessment, Tender Documentation',
    keywords: ['gem', 'tender', 'government tender', 'bid', 'vendor assessment', 'eprocure'],
    specialists: ['Siddharth Rawat (GeM & Tender Specialist)', 'Vikram Singh (Operations Manager)'],
  },
  {
    id: 'IP_TRADEMARKS',
    name: 'Trademarks & IP Rights',
    icon: Scale,
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Trademark Filing, Copyright, Provisional Patent, Objection Handling',
    keywords: ['trademark', 'copyright', 'patent', 'ip', 'brand', 'logo registration'],
    specialists: ['Neha Joshi (Certifications Specialist)', 'Vikram Singh (Operations Manager)'],
  },
];

// Helper to auto-categorize service into sector by keyword
function detectSector(serviceName = '') {
  const lower = serviceName.toLowerCase();
  for (const sector of EXPERTISE_SECTORS) {
    if (sector.keywords.some((kw) => lower.includes(kw))) {
      return sector;
    }
  }
  return EXPERTISE_SECTORS[3]; // Default to Incorporation & MCA
}

// Mock Team Members for Sectors (merged with actual DB users)
const MOCK_TEAM_SPECIALISTS = [
  {
    id: 'mock-amit-patel',
    fullName: 'Amit Patel (Financial & Pitch Specialist)',
    email: 'amit.patel@corporatemart.com',
    sectorId: 'PITCH_DECK',
    designation: 'Senior Financial Analyst',
  },
  {
    id: 'mock-rahul-nair',
    fullName: 'Rahul Nair (Tech Lead & Full Stack)',
    email: 'rahul.nair@corporatemart.com',
    sectorId: 'DEVELOPMENT',
    designation: 'Lead Solutions Architect',
  },
  {
    id: 'mock-priya-sharma',
    fullName: 'Priya Sharma (ROC & Incorporation Specialist)',
    email: 'priya.sharma@corporatemart.com',
    sectorId: 'INCORPORATION',
    designation: 'Company Law Executive',
  },
  {
    id: 'mock-siddharth-rawat',
    fullName: 'Siddharth Rawat (GeM & Tender Specialist)',
    email: 'siddharth.rawat@corporatemart.com',
    sectorId: 'GOVT_TENDERS',
    designation: 'Tender Consultant',
  },
];

export default function OperationsWorkbench({ currentUser, onRefreshParent, onOpenDossier }) {
  // Role Detection: Manager (Vikram Singh / Admin) vs Execution Specialist (Priya, Amit, Rahul, etc.)
  const isManager = Boolean(
    currentUser?.role === 'ADMIN' ||
    currentUser?.email === 'ops@corporatemart.com' ||
    (currentUser?.fullName || '').toLowerCase().includes('manager')
  );

  // Navigation Tabs:
  // Manager: 'allocation' | 'team' | 'dossier'
  // Specialist: 'my_tasks' | 'pool' | 'dossier'
  const [activeTab, setActiveTab] = useState(isManager ? 'allocation' : 'my_tasks');

  useEffect(() => {
    if (isManager) {
      if (activeTab === 'my_tasks' || activeTab === 'pool') setActiveTab('allocation');
    } else {
      if (activeTab === 'allocation' || activeTab === 'team') setActiveTab('my_tasks');
    }
  }, [isManager, currentUser?.id, currentUser?.email]);

  const [deals, setDeals] = useState([]);
  const [opsTeam, setOpsTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [deliverableFile, setDeliverableFile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Filters for Manager Allocation Hub
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState('ALL');
  const [selectedUrgencyFilter, setSelectedUrgencyFilter] = useState('ALL'); // 'ALL' | 'OVERDUE' | 'DUE_48H' | 'THIS_WEEK'

  // Fetch Deals and Operations Users
  const fetchOpsData = async () => {
    try {
      setLoading(true);
      const [dealsRes, teamRes] = await Promise.all([
        api.get('/deals', { params: { roleFilter: 'OPERATIONS' } }),
        api.get('/users', { params: { role: 'OPERATIONS' } }),
      ]);

      const fetchedDeals = dealsRes.data.deals || [];
      const fetchedTeam = teamRes.data.users || [];

      setDeals(fetchedDeals);

      // Merge real users with mock specialist metadata
      const combinedTeam = fetchedTeam.map((u) => {
        const specMeta = MOCK_TEAM_SPECIALISTS.find((s) => s.email === u.email);
        return {
          ...u,
          sectorId: specMeta?.sectorId,
          designation: specMeta?.designation || (u.role === 'OPERATIONS' ? 'Operations Specialist' : u.role),
        };
      });

      // If any specialist is not yet returned in fetchedTeam, add as fallback
      MOCK_TEAM_SPECIALISTS.forEach((spec) => {
        if (!combinedTeam.some((u) => u.email === spec.email || u.id === spec.id)) {
          combinedTeam.push(spec);
        }
      });
      setOpsTeam(combinedTeam);

      if (fetchedDeals.length > 0) {
        if (selectedDeal) {
          const updated = fetchedDeals.find((d) => d.id === selectedDeal.id);
          setSelectedDeal(updated || fetchedDeals[0]);
        } else {
          setSelectedDeal(fetchedDeals[0]);
        }
      } else {
        setSelectedDeal(null);
      }
    } catch (err) {
      console.error('Failed to load operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpsData();
  }, []);

  // ---------------------------------------------------------------------------
  // FLATTEN ALL SERVICES ACROSS ACTIVE DEALS FOR MANAGER ALLOCATION HUB
  // ---------------------------------------------------------------------------
  const allServices = useMemo(() => {
    const list = [];
    deals.forEach((d) => {
      (d.services || []).forEach((s) => {
        const sector = detectSector(s.serviceName);
        const targetDate = s.targetCompletionDate ? new Date(s.targetCompletionDate) : null;
        const now = new Date();
        const isOverdue = targetDate && targetDate < now && s.status !== 'COMPLETED';
        const diffMs = targetDate ? targetDate - now : null;
        const daysLeft = diffMs !== null ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : null;

        let deadlineStatus = 'No Deadline';
        if (isOverdue) deadlineStatus = `Overdue by ${Math.abs(daysLeft)}d`;
        else if (daysLeft === 0) deadlineStatus = 'Due Today';
        else if (daysLeft === 1) deadlineStatus = 'Due Tomorrow';
        else if (daysLeft > 1) deadlineStatus = `${daysLeft} days left`;

        list.push({
          ...s,
          dealId: d.id,
          dealCode: d.dealCode,
          dealStage: d.stage,
          companyName: d.client?.companyName || 'N/A',
          clientName: d.client?.clientName || 'N/A',
          clientPhone: d.client?.phone || 'N/A',
          sectorId: sector.id,
          sectorName: sector.name,
          sectorBadge: sector.badgeColor,
          isOverdue,
          daysLeft,
          deadlineStatus,
        });
      });
    });
    return list;
  }, [deals]);


  // Detect specialist's core sector
  const specialistSector = useMemo(() => {
    if (isManager) return null;
    const name = currentUser?.fullName || '';
    const email = currentUser?.email || '';
    for (const sector of EXPERTISE_SECTORS) {
      if (sector.specialists.some((s) => name.toLowerCase().includes(s.toLowerCase().split(' ')[0]) || email.toLowerCase().includes(s.toLowerCase().split(' ')[0]))) {
        return sector;
      }
    }
    return EXPERTISE_SECTORS[3]; // Default to Incorporation
  }, [currentUser, isManager]);

  // Specialist's personal assigned services
  const myServices = useMemo(() => {
    return allServices.filter(
      (s) => s.assignedOpsUserId === currentUser?.id || (currentUser?.email && s.assignedOpsUser?.email === currentUser?.email)
    );
  }, [allServices, currentUser]);

  // Unassigned General Pool
  const poolServices = useMemo(() => {
    return allServices.filter((s) => !s.assignedOpsUserId);
  }, [allServices]);

  // Filtered Services for Specialist Personal View
  const filteredMyServices = useMemo(() => {
    return myServices.filter((s) => {
      if (selectedStatusFilter !== 'ALL' && s.status !== selectedStatusFilter) return false;

      if (selectedUrgencyFilter === 'OVERDUE' && !s.isOverdue) return false;
      if (selectedUrgencyFilter === 'DUE_48H') {
        if (s.daysLeft === null || s.daysLeft < 0 || s.daysLeft > 2) return false;
      }
      if (selectedUrgencyFilter === 'THIS_WEEK') {
        if (s.daysLeft === null || s.daysLeft < 0 || s.daysLeft > 7) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (s.dealCode || '').toLowerCase().includes(q);
        const matchCompany = (s.companyName || '').toLowerCase().includes(q);
        const matchService = (s.serviceName || '').toLowerCase().includes(q);
        const matchSRN = (s.govApplicationNumber || '').toLowerCase().includes(q);
        if (!matchCode && !matchCompany && !matchService && !matchSRN) {
          return false;
        }
      }

      return true;
    });
  }, [myServices, selectedStatusFilter, selectedUrgencyFilter, searchQuery]);

  // Filtered Services for Manager View
  const filteredServices = useMemo(() => {
    return allServices.filter((s) => {
      if (selectedSectorFilter !== 'ALL' && s.sectorId !== selectedSectorFilter) return false;
      if (selectedStatusFilter !== 'ALL' && s.status !== selectedStatusFilter) return false;
      
      // Assignee Filter
      if (selectedAssigneeFilter === 'UNASSIGNED') {
        if (s.assignedOpsUserId) return false;
      } else if (selectedAssigneeFilter === 'MY_TASKS') {
        if (s.assignedOpsUserId !== currentUser?.id) return false;
      } else if (selectedAssigneeFilter !== 'ALL') {
        if (s.assignedOpsUserId !== selectedAssigneeFilter) return false;
      }

      // Urgency Filter
      if (selectedUrgencyFilter === 'OVERDUE' && !s.isOverdue) return false;
      if (selectedUrgencyFilter === 'DUE_48H') {
        if (s.daysLeft === null || s.daysLeft < 0 || s.daysLeft > 2) return false;
      }
      if (selectedUrgencyFilter === 'THIS_WEEK') {
        if (s.daysLeft === null || s.daysLeft < 0 || s.daysLeft > 7) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (s.dealCode || '').toLowerCase().includes(q);
        const matchCompany = (s.companyName || '').toLowerCase().includes(q);
        const matchService = (s.serviceName || '').toLowerCase().includes(q);
        const matchSRN = (s.govApplicationNumber || '').toLowerCase().includes(q);
        const matchAssignee = (s.assignedOpsUser?.fullName || '').toLowerCase().includes(q);
        if (!matchCode && !matchCompany && !matchService && !matchSRN && !matchAssignee) {
          return false;
        }
      }

      return true;
    });
  }, [allServices, selectedSectorFilter, selectedStatusFilter, selectedAssigneeFilter, selectedUrgencyFilter, searchQuery, currentUser]);

  // ---------------------------------------------------------------------------
  // TEAM CAPACITY & WORKLOAD METRICS
  // ---------------------------------------------------------------------------
  const teamWorkload = useMemo(() => {
    return opsTeam.map((member) => {
      const assigned = allServices.filter(
        (s) => s.assignedOpsUserId === member.id || (member.email && s.assignedOpsUser?.email === member.email)
      );
      const inProgress = assigned.filter((s) => ['IN_PROGRESS', 'GOVT_SUBMITTED', 'QUERY_RAISED'].includes(s.status));
      const completed = assigned.filter((s) => s.status === 'COMPLETED' || s.status === 'APPROVED');
      const overdue = assigned.filter((s) => s.isOverdue);
      const completionRate = assigned.length > 0 ? Math.round((completed.length / assigned.length) * 100) : 0;

      // Find matching sector for this member
      const matchingSector = EXPERTISE_SECTORS.find((sec) =>
        sec.specialists.some((name) => member.fullName.includes(name.split(' ')[0]))
      ) || EXPERTISE_SECTORS[0];

      return {
        ...member,
        sectorName: matchingSector.name,
        badgeColor: matchingSector.badgeColor,
        totalAssigned: assigned.length,
        inProgress: inProgress.length,
        completed: completed.length,
        overdue: overdue.length,
        completionRate,
        tasks: assigned,
      };
    });
  }, [opsTeam, allServices]);

  // ---------------------------------------------------------------------------
  // SERVICE & MILESTONE UPDATE HANDLERS
  // ---------------------------------------------------------------------------
  const handleUpdateService = async (dealId, serviceId, updates) => {
    try {
      setActionLoading(true);
      await api.patch(`/deals/${dealId}/services/${serviceId}`, updates);
      setFeedback({ type: 'success', message: 'Service task updated successfully.' });
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to update service.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelfAssignService = async (dealId, serviceId) => {
    if (!currentUser?.id) return;
    await handleUpdateService(dealId, serviceId, {
      assignedOpsUserId: currentUser.id,
      status: 'IN_PROGRESS',
    });
    setFeedback({ type: 'success', message: 'Service task assigned to you.' });
  };

  const handleAssignDealLead = async (targetUserId) => {
    if (!selectedDeal) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/deals/${selectedDeal.id}/assign`, {
        department: 'OPERATIONS',
        userId: targetUserId || null,
      });
      setFeedback({ type: 'success', message: res.data.message });
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Assignment failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteService = async () => {
    if (!selectedDeal) return;
    try {
      setActionLoading(true);
      setFeedback(null);

      if (deliverableFile) {
        const formData = new FormData();
        formData.append('dealId', selectedDeal.id);
        formData.append('documentType', 'FINAL_DELIVERABLE_CERTIFICATE');
        formData.append('title', `Final Deliverable Certificate - ${deliverableFile.name}`);
        formData.append('file', deliverableFile);
        await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await api.post(`/deals/${selectedDeal.id}/service-complete`, {
        outcomeNotes: 'All filings completed, government certificates generated and verified.',
      });

      setFeedback({ type: 'success', message: `Deal ${selectedDeal.dealCode} marked as Service Completed (Stage 07)!` });
      setDeliverableFile(null);
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to complete service.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverToClient = async () => {
    if (!selectedDeal) return;
    try {
      setActionLoading(true);
      setFeedback(null);

      await api.post(`/deals/${selectedDeal.id}/final-delivery`, {
        deliveryProof: 'Delivered via Email Portal & WhatsApp Notification',
      });

      setFeedback({ type: 'success', message: `Deliverables released to client (Stage 08)! Ready for RM Handover.` });
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Delivery dispatch failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const hasDeliverable = selectedDeal?.documents?.some((d) => d.documentType === 'FINAL_DELIVERABLE_CERTIFICATE');
  const isPartPaymentPending = selectedDeal && Number(selectedDeal.pendingAmount) > 0;

  // Unassigned tasks count
  const unassignedCount = allServices.filter((s) => !s.assignedOpsUserId).length;
  const overdueCount = allServices.filter((s) => s.isOverdue).length;

  return (
    <div className="space-y-5">
      {/* 1. TOP HEADER & WORKBENCH VIEW SWITCHER */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className={`p-2 rounded-xl text-white shadow-xs ${isManager ? 'bg-slate-900' : 'bg-emerald-600'}`}>
              {isManager ? <Cog className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {isManager ? 'Operations Command & Allocation Suite' : `Specialist Execution Desk — ${currentUser?.fullName || 'Filing Portal'}`}
                </h2>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                    isManager
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {isManager ? 'Manager Portal' : specialistSector?.name || 'Specialist Desk'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isManager
                  ? 'Allocate multi-deal services by team expertise, manage deadlines, self-execute filings, and export reports'
                  : `Focused compliance workspace for ${currentUser?.fullName}. Manage your assigned filings, update milestone SRN numbers, and claim pool tasks.`}
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-stretch md:self-auto justify-center">
          {isManager ? (
            <>
              <button
                onClick={() => setActiveTab('allocation')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'allocation'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                <span>Service Allocation Hub</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-50 text-indigo-700">
                  {allServices.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('team')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'team'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Team & Expertise Capacity</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-50 text-emerald-700">
                  {teamWorkload.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('dossier')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'dossier'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-cyan-600" />
                <span>Deal Dossier & Dispatch</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-cyan-50 text-cyan-700">
                  {deals.length}
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('my_tasks')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'my_tasks'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                <span>My Assigned Tasks</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-50 text-emerald-700">
                  {myServices.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('pool')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'pool'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>General Task Pool</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-50 text-amber-700">
                  {poolServices.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('dossier')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'dossier'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-cyan-600" />
                <span>Deal Dossier & Files</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-cyan-50 text-cyan-700">
                  {deals.length}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      
      {/* ----------------------------------------------------------------------- */}
      {/* TAB: SPECIALIST MY ASSIGNED TASKS */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'my_tasks' && (
        <div className="space-y-4">
          {/* Top Specialist Personal Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                My Assigned Filings
              </span>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                {myServices.length} <span className="text-xs font-normal text-slate-500">active tasks</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Value: ₹{myServices.reduce((sum, s) => sum + Number(s.serviceFee || 0), 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                In Progress / Submitted
              </span>
              <div className="text-xl font-extrabold text-blue-600 mt-0.5">
                {myServices.filter((s) => ['IN_PROGRESS', 'GOVT_SUBMITTED', 'QUERY_RAISED'].includes(s.status)).length}
              </div>
              <div className="text-[11px] text-blue-700/80 mt-1">
                Under active compliance
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                Overdue / Urgent
              </span>
              <div className="text-xl font-extrabold text-rose-600 mt-0.5">
                {myServices.filter((s) => s.isOverdue).length}
              </div>
              <div className="text-[11px] text-rose-700/80 mt-1">
                Immediate Action Required
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Completed & Approved
              </span>
              <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
                {myServices.filter((s) => s.status === 'COMPLETED' || s.status === 'APPROVED').length}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-1">
                Filing cleared & certified
              </div>
            </div>
          </div>

          {/* Specialist Table Controls */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search my tasks by deal, company, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">All Statuses</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="GOVT_SUBMITTED">Govt / MCA Submitted</option>
                <option value="QUERY_RAISED">Query Raised</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <select
                value={selectedUrgencyFilter}
                onChange={(e) => setSelectedUrgencyFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">All Deadlines</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="DUE_48H">Due Next 48 Hours</option>
                <option value="THIS_WEEK">Due This Week</option>
              </select>
            </div>
          </div>

          {/* My Tasks Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Deal / Company</th>
                    <th className="py-3 px-4">Service Task & Sector</th>
                    <th className="py-3 px-4">My Milestone Status</th>
                    <th className="py-3 px-4">SRN / MCA Reference</th>
                    <th className="py-3 px-4">Target Deadline</th>
                    <th className="py-3 px-4 text-center">Filing Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredMyServices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        No service filings currently assigned to you. Click "General Task Pool" above to pick up unassigned tasks!
                      </td>
                    </tr>
                  ) : (
                    filteredMyServices.map((svc) => (
                      <tr key={svc.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              {svc.dealCode}
                            </span>
                            <button
                              onClick={() => onOpenDossier(svc.dealId)}
                              title="Open Deal Dossier"
                              className="text-slate-400 hover:text-slate-800"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="font-bold text-slate-900 mt-1 truncate max-w-[200px]">
                            {svc.companyName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {svc.clientName} ({svc.clientPhone})
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">{svc.serviceName}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${svc.sectorBadge}`}>
                              {svc.sectorName}
                            </span>
                            <span className="text-[11px] text-slate-500">Fee: ₹{Number(svc.serviceFee || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 min-w-[180px]">
                          <select
                            value={svc.status || 'NOT_STARTED'}
                            onChange={(e) =>
                              handleUpdateService(svc.dealId, svc.id, {
                                status: e.target.value,
                                completedAt: e.target.value === 'COMPLETED' ? new Date().toISOString() : undefined,
                              })
                            }
                            className={`w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border focus:outline-none ${
                              svc.status === 'COMPLETED' || svc.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : svc.status === 'GOVT_SUBMITTED'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : svc.status === 'QUERY_RAISED'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : svc.status === 'IN_PROGRESS'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-slate-50 text-slate-700 border-slate-300'
                            }`}
                          >
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="IN_PROGRESS">In Progress (Drafting)</option>
                            <option value="GOVT_SUBMITTED">Govt / MCA Submitted</option>
                            <option value="QUERY_RAISED">Query / Resubmission</option>
                            <option value="COMPLETED">Completed / Approved</option>
                          </select>
                        </td>

                        <td className="py-3 px-4 min-w-[160px]">
                          <input
                            type="text"
                            defaultValue={svc.govApplicationNumber || ''}
                            placeholder="Enter SRN / Ref..."
                            onBlur={(e) => {
                              if (e.target.value !== (svc.govApplicationNumber || '')) {
                                handleUpdateService(svc.dealId, svc.id, {
                                  govApplicationNumber: e.target.value.trim(),
                                });
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-800"
                          />
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border ${
                              svc.isOverdue
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : svc.daysLeft !== null && svc.daysLeft <= 2
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {svc.deadlineStatus}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {svc.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                handleUpdateService(svc.dealId, svc.id, {
                                  status: 'COMPLETED',
                                  completedAt: new Date().toISOString(),
                                })
                              }
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1 mx-auto"
                            >
                              <Check className="w-3.5 h-3.5" /> Mark Done
                            </button>
                          )}
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

      {/* ----------------------------------------------------------------------- */}
      {/* TAB: GENERAL TASK POOL (UNASSIGNED SERVICES) */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'pool' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-amber-900">General Unassigned Filing Pool</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Client services waiting for allocation. Pick up services matching your expertise ({specialistSector?.name || 'All Sectors'}) to add to your queue.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs border border-amber-300 whitespace-nowrap">
              {poolServices.length} Available Tasks
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Deal / Company</th>
                    <th className="py-3 px-4">Service Task & Sector</th>
                    <th className="py-3 px-4">Service Fee</th>
                    <th className="py-3 px-4">Target Deadline</th>
                    <th className="py-3 px-4 text-center">Claim Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {poolServices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                        All client services are currently assigned! Check back later.
                      </td>
                    </tr>
                  ) : (
                    poolServices.map((svc) => {
                      const isRecommendedForMe = specialistSector && svc.sectorId === specialistSector.id;
                      return (
                        <tr key={svc.id} className={`hover:bg-slate-50/70 transition ${isRecommendedForMe ? 'bg-indigo-50/30' : ''}`}>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              {svc.dealCode}
                            </span>
                            <div className="font-bold text-slate-900 mt-1 truncate max-w-[200px]">
                              {svc.companyName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {svc.clientName}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              {svc.serviceName}
                              {isRecommendedForMe && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  ⭐ Your Sector Match
                                </span>
                              )}
                            </div>
                            <div className="mt-1">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${svc.sectorBadge}`}>
                                {svc.sectorName}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-900">
                            ₹{Number(svc.serviceFee || 0).toLocaleString('en-IN')}
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-slate-600 text-xs">
                              <Clock className="w-3.5 h-3.5 text-slate-400" /> {svc.deadlineStatus}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleSelfAssignService(svc.dealId, svc.id)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1.5 mx-auto"
                            >
                              <Plus className="w-3.5 h-3.5" /> Claim Task
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

      {/* TAB 1: MANAGER SERVICE ALLOCATION HUB */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'allocation' && (
        <div className="space-y-4">
          {/* Top Operational Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Services in Filing
              </span>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                {allServices.length} <span className="text-xs font-normal text-slate-500">across {deals.length} deals</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Value: ₹{allServices.reduce((sum, s) => sum + Number(s.serviceFee || 0), 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                Unassigned Tasks
              </span>
              <div className="text-xl font-extrabold text-amber-600 mt-0.5">
                {unassignedCount} <span className="text-xs font-normal text-slate-500">need allocation</span>
              </div>
              <div className="text-[11px] text-amber-700/80 mt-1">
                Open in General Pool
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                Overdue / Urgent Tasks
              </span>
              <div className="text-xl font-extrabold text-rose-600 mt-0.5">
                {overdueCount} <span className="text-xs font-normal text-slate-500">past target deadline</span>
              </div>
              <div className="text-[11px] text-rose-700/80 mt-1">
                Immediate Action Required
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Completed & Cleared
              </span>
              <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
                {allServices.filter((s) => s.status === 'COMPLETED' || s.status === 'APPROVED').length}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-1">
                Ready for Deliverable Release
              </div>
            </div>
          </div>

          {/* Controls Bar: Search, Sector Filter, Status Filter, Urgency Filter, Export */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search service, deal code, client, or SRN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
                />
              </div>

              {/* Sector Filter */}
              <select
                value={selectedSectorFilter}
                onChange={(e) => setSelectedSectorFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">All Expertise Sectors</option>
                {EXPERTISE_SECTORS.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">All Milestones</option>
                <option value="PENDING">PENDING</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="GOVT_SUBMITTED">GOVT_SUBMITTED</option>
                <option value="QUERY_RAISED">QUERY_RAISED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>

              {/* Urgency Filter */}
              <select
                value={selectedUrgencyFilter}
                onChange={(e) => setSelectedUrgencyFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">All Deadlines</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="DUE_48H">Due in 48 Hours</option>
                <option value="THIS_WEEK">Due This Week</option>
              </select>

              {/* Assignee Filter */}
              <select
                value={selectedAssigneeFilter}
                onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">All Assignees</option>
                <option value="UNASSIGNED">Unassigned (In Pool)</option>
                <option value="MY_TASKS">Assigned to Me (Manager)</option>
                {opsTeam.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Reports Buttons */}
            <div className="flex items-center gap-2 self-end lg:self-auto">
              <button
                onClick={() => exportOpsServicesToCsv(filteredServices)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Allocation ({filteredServices.length})</span>
              </button>
            </div>
          </div>

          {/* Services Allocation Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Deal / Client</th>
                    <th className="py-3 px-4">Service Task & Sector</th>
                    <th className="py-3 px-4">Assigned Specialist</th>
                    <th className="py-3 px-4">Milestone Status</th>
                    <th className="py-3 px-4">SRN / Govt Application</th>
                    <th className="py-3 px-4">Target Deadline</th>
                    <th className="py-3 px-4 text-center">Manager Self-Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        No service tasks found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((svc) => {
                      const isAssignedToMe = svc.assignedOpsUserId === currentUser?.id;
                      const sectorMeta = EXPERTISE_SECTORS.find((s) => s.id === svc.sectorId) || EXPERTISE_SECTORS[0];

                      return (
                        <tr key={svc.id} className="hover:bg-slate-50/70 transition">
                          {/* Deal / Client */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                {svc.dealCode}
                              </span>
                              <button
                                onClick={() => onOpenDossier(svc.dealId)}
                                title="Open Deal Dossier"
                                className="text-slate-400 hover:text-slate-800"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="font-bold text-slate-900 mt-1 truncate max-w-[180px]">
                              {svc.companyName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {svc.clientName}
                            </div>
                          </td>

                          {/* Service Task & Sector */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-sm">
                              {svc.serviceName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${sectorMeta.badgeColor}`}>
                                {sectorMeta.name}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Fee: ₹{Number(svc.serviceFee || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </td>

                          {/* Assigned Specialist & Quick Reassign */}
                          <td className="py-3 px-4 min-w-[200px]">
                            <div className="flex flex-col gap-1">
                              <select
                                value={svc.assignedOpsUserId || ''}
                                onChange={(e) =>
                                  handleUpdateService(svc.dealId, svc.id, {
                                    assignedOpsUserId: e.target.value || null,
                                  })
                                }
                                disabled={actionLoading}
                                className={`w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none ${
                                  svc.assignedOpsUserId
                                    ? 'bg-white border-slate-300 text-slate-900'
                                    : 'bg-amber-50/70 border-amber-300 text-amber-800'
                                }`}
                              >
                                <option value="">-- Unassigned (Open in Pool) --</option>
                                <optgroup label="Sector Recommended Specialists">
                                  {opsTeam
                                    .filter((m) =>
                                      sectorMeta.specialists.some((name) => m.fullName.includes(name.split(' ')[0]))
                                    )
                                    .map((m) => (
                                      <option key={m.id} value={m.id}>
                                        ⭐ {m.fullName}
                                      </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Other Operations Members">
                                  {opsTeam
                                    .filter(
                                      (m) =>
                                        !sectorMeta.specialists.some((name) => m.fullName.includes(name.split(' ')[0]))
                                    )
                                    .map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.fullName}
                                      </option>
                                    ))}
                                </optgroup>
                              </select>

                              {isAssignedToMe && (
                                <span className="text-[10px] text-indigo-700 font-bold flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" /> Assigned to You (Manager)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Milestone Status */}
                          <td className="py-3 px-4 min-w-[150px]">
                            <select
                              value={svc.status}
                              onChange={(e) =>
                                handleUpdateService(svc.dealId, svc.id, {
                                  status: e.target.value,
                                  completedAt: e.target.value === 'COMPLETED' ? new Date().toISOString() : null,
                                })
                              }
                              disabled={actionLoading}
                              className={`w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none ${
                                svc.status === 'COMPLETED'
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : svc.status === 'GOVT_SUBMITTED'
                                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                                  : svc.status === 'IN_PROGRESS'
                                  ? 'bg-purple-50 border-purple-300 text-purple-800'
                                  : svc.status === 'QUERY_RAISED'
                                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                                  : 'bg-slate-50 border-slate-300 text-slate-700'
                              }`}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="IN_PROGRESS">IN_PROGRESS (Drafting)</option>
                              <option value="GOVT_SUBMITTED">GOVT_SUBMITTED (Filed)</option>
                              <option value="QUERY_RAISED">QUERY_RAISED (Resubmit)</option>
                              <option value="APPROVED">APPROVED (Cleared)</option>
                              <option value="COMPLETED">COMPLETED</option>
                            </select>
                          </td>

                          {/* SRN / Govt Application Input */}
                          <td className="py-3 px-4 min-w-[150px]">
                            <input
                              type="text"
                              defaultValue={svc.govApplicationNumber || ''}
                              placeholder="e.g. SRN2918237"
                              onBlur={(e) =>
                                handleUpdateService(svc.dealId, svc.id, {
                                  govApplicationNumber: e.target.value.trim() || null,
                                })
                              }
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-800 focus:outline-none"
                            />
                          </td>

                          {/* Target Deadline Date */}
                          <td className="py-3 px-4 min-w-[150px]">
                            <input
                              type="date"
                              defaultValue={
                                svc.targetCompletionDate
                                  ? new Date(svc.targetCompletionDate).toISOString().split('T')[0]
                                  : ''
                              }
                              onChange={(e) =>
                                handleUpdateService(svc.dealId, svc.id, {
                                  targetCompletionDate: e.target.value || null,
                                })
                              }
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:bg-white focus:border-slate-800 focus:outline-none"
                            />
                            {svc.targetCompletionDate && (
                              <div className="mt-1">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    svc.isOverdue
                                      ? 'bg-rose-100 text-rose-800'
                                      : svc.daysLeft <= 2
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {svc.deadlineStatus}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Manager Self-Action / Claim Service */}
                          <td className="py-3 px-4 text-center">
                            {!isAssignedToMe ? (
                              <button
                                onClick={() => handleSelfAssignService(svc.dealId, svc.id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition mx-auto shadow-xs whitespace-nowrap"
                                title="Take this service and work on it yourself"
                              >
                                <User className="w-3.5 h-3.5" />
                                <span>Take Task</span>
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Mine
                              </span>
                            )}
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

      {/* ----------------------------------------------------------------------- */}
      {/* TAB 2: TEAM & EXPERTISE CAPACITY */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Operations Team Capacity & Workload Balance</h3>
              <p className="text-xs text-slate-500">
                Track specialist allocations across Certifications, Pitch Decks, Tech Development, and Incorporations
              </p>
            </div>
            <button
              onClick={() => exportOpsTeamWorkloadToCsv(teamWorkload)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Team Capacity</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamWorkload.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{member.fullName}</h4>
                    <p className="text-xs text-slate-500">{member.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${member.badgeColor}`}>
                      {member.sectorName}
                    </span>
                  </div>
                  <span className="p-2 rounded-lg bg-slate-100 text-slate-700">
                    <UserCheck className="w-4 h-4" />
                  </span>
                </div>

                {/* Workload Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Completion Rate</span>
                    <span className="font-bold text-slate-900">{member.completionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all duration-500"
                      style={{ width: `${member.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Capacity Counter Grid */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Total</span>
                    <span className="font-extrabold text-slate-900">{member.totalAssigned}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-50 border border-purple-100">
                    <span className="text-[10px] text-purple-700 block uppercase font-bold">Active</span>
                    <span className="font-extrabold text-purple-800">{member.inProgress}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 block uppercase font-bold">Done</span>
                    <span className="font-extrabold text-emerald-800">{member.completed}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-100">
                    <span className="text-[10px] text-rose-700 block uppercase font-bold">Overdue</span>
                    <span className="font-extrabold text-rose-800">{member.overdue}</span>
                  </div>
                </div>

                {/* Quick Task List preview */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    Assigned Tasks ({member.tasks?.length || 0}):
                  </span>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {member.tasks?.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No tasks currently assigned</p>
                    ) : (
                      member.tasks.map((t) => (
                        <div
                          key={t.id}
                          className="text-[11px] bg-slate-50 px-2 py-1 rounded border border-slate-200/60 flex items-center justify-between gap-1"
                        >
                          <span className="truncate font-medium text-slate-800">{t.serviceName}</span>
                          <span className="text-[10px] font-bold text-slate-500 font-mono">{t.dealCode}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* TAB 3: DEAL DOSSIER & FINAL DISPATCH (Original File Execution) */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'dossier' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
          {/* LEFT PANE: Active Ops Deals List (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Operations Queue ({deals.length})
              </span>
              <button
                onClick={fetchOpsData}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-medium px-2 py-1 rounded hover:bg-slate-200/60 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2.5 space-y-1.5">
              {deals.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">
                  <CheckCircle2 className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  No active operations files in queue.
                </div>
              ) : (
                deals.map((d) => {
                  const isSelected = selectedDeal?.id === d.id;
                  const isReadyDelivery = d.stage === 'STAGE_07_SERVICE_COMPLETED';

                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDeal(d)}
                      className={`p-3.5 rounded-lg cursor-pointer transition border text-left ${
                        isSelected
                          ? 'bg-slate-50 border-slate-800 shadow-xs ring-1 ring-slate-800/20'
                          : 'bg-white border-slate-200/70 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {d.dealCode}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded border ${
                            isReadyDelivery
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                              : 'bg-sky-50 text-sky-700 border-sky-200 font-semibold'
                          }`}
                        >
                          {isReadyDelivery ? 'Ready to Deliver' : 'Filing Active'}
                        </span>
                      </div>

                      <div className="font-semibold text-sm text-slate-900 mt-2 truncate">
                        {d.client.companyName}
                      </div>

                      <div className="text-xs text-slate-500 flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                        <span>Services: <strong className="text-slate-800">{d.services?.length || 0}</strong></span>
                        <span className="text-slate-600 font-mono font-medium">
                          {d.client.directors?.length || 0} Directors
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANE: Execution & Deliverable Desk (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-xs">
            {selectedDeal ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-slate-200 gap-3">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                        {selectedDeal.dealCode}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{selectedDeal.client.companyName}</h3>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Client: <strong className="text-slate-800">{selectedDeal.client.clientName}</strong> ({selectedDeal.client.phone}) • Accounts & Legal Verified: <strong className="text-emerald-700">✓ Yes</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => onOpenDossier(selectedDeal.id)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Eye className="w-4 h-4" /> View Full Dossier
                  </button>
                </div>

                {/* LEAD OPERATIONS EXECUTIVE ASSIGNMENT */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-xs">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    <div>
                      <span className="text-xs text-slate-500 block font-medium">Lead Operations Executive</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {selectedDeal.assignedOpsUser ? selectedDeal.assignedOpsUser.fullName : 'Unassigned (Open in Pool)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedDeal.assignedOpsUserId || ''}
                      onChange={(e) => handleAssignDealLead(e.target.value || null)}
                      disabled={actionLoading}
                      className="bg-white border border-slate-300 text-slate-800 text-xs font-medium rounded-md px-2.5 py-1.5 focus:outline-none focus:border-slate-800"
                    >
                      <option value="">-- Assign Lead Exec --</option>
                      {opsTeam.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SERVICES IN THIS DEAL */}
                <div className="space-y-3.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" /> Service Filing Tasks ({selectedDeal.services?.length || 0})
                  </div>

                  {selectedDeal.services?.map((svc) => {
                    const sector = detectSector(svc.serviceName);

                    return (
                      <div
                        key={svc.id}
                        className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900">{svc.serviceName}</h4>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${sector.badgeColor}`}>
                                {sector.name}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              Service Fee: <strong className="text-slate-800">₹{Number(svc.serviceFee).toLocaleString('en-IN')}</strong>{' '}
                              {svc.govtFee && `• Govt Challan: ₹${Number(svc.govtFee).toLocaleString('en-IN')}`}
                            </div>
                          </div>

                          <span className="text-xs px-2.5 py-1 rounded-md bg-white text-slate-800 border border-slate-300 font-semibold self-start sm:self-auto shadow-xs">
                            {svc.status}
                          </span>
                        </div>

                        {/* Execution Controls Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-xs">
                          <div>
                            <label className="text-xs text-slate-600 font-medium block mb-1">
                              Assigned Specialist
                            </label>
                            <select
                              value={svc.assignedOpsUserId || ''}
                              onChange={(e) =>
                                handleUpdateService(selectedDeal.id, svc.id, {
                                  assignedOpsUserId: e.target.value || null,
                                })
                              }
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                            >
                              <option value="">-- Select Specialist --</option>
                              {opsTeam.map((u) => (
                                <option key={u.id} value={u.id}>{u.fullName}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-slate-600 font-medium block mb-1">
                              Govt Application / SRN Number
                            </label>
                            <input
                              type="text"
                              defaultValue={svc.govApplicationNumber || ''}
                              placeholder="e.g. SRN29182371"
                              onBlur={(e) =>
                                handleUpdateService(selectedDeal.id, svc.id, {
                                  govApplicationNumber: e.target.value.trim() || null,
                                })
                              }
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-800"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-slate-600 font-medium block mb-1">Milestone Stage</label>
                            <select
                              defaultValue={svc.status}
                              onChange={(e) =>
                                handleUpdateService(selectedDeal.id, svc.id, {
                                  status: e.target.value,
                                  completedAt: e.target.value === 'COMPLETED' ? new Date().toISOString() : null,
                                })
                              }
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="IN_PROGRESS">IN_PROGRESS (Drafting)</option>
                              <option value="GOVT_SUBMITTED">GOVT_SUBMITTED (Filed)</option>
                              <option value="QUERY_RAISED">QUERY_RAISED (Resubmit)</option>
                              <option value="APPROVED">APPROVED (Authority Cleared)</option>
                              <option value="COMPLETED">COMPLETED</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DELIVERABLE CERTIFICATE UPLOAD & STAGE ACTIONS */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Deliverable Certificate & Completion Gate
                  </h4>

                  <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
                    <label className="text-xs font-semibold text-slate-800 block">
                      Upload Final Deliverable (Certificate of Incorporation, License, Registration PDF):
                    </label>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => setDeliverableFile(e.target.files?.[0] || null)}
                      className="text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                    />
                    {deliverableFile && (
                      <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5 mt-1.5">
                        <Check className="w-4 h-4" /> Selected: {deliverableFile.name} ({(deliverableFile.size / 1024).toFixed(0)} KB)
                      </div>
                    )}
                    {hasDeliverable && (
                      <div className="text-xs text-emerald-800 font-semibold pt-1">
                        ✓ Final Certificate on file in Object Storage.
                      </div>
                    )}
                  </div>

                  {/* Part-payment lock warning */}
                  {isPartPaymentPending && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">
                        <strong>Part-Payment Hold:</strong> Client has ₹{Number(selectedDeal.pendingAmount).toLocaleString('en-IN')} pending balance. Service completion is permitted, but final certificate dispatch (Stage 08) requires balance verification by Accounts Desk.
                      </span>
                    </div>
                  )}

                  {/* Stage Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                    {selectedDeal.stage === 'STAGE_06_OPERATIONS_PROCESSING' && (
                      <button
                        onClick={handleCompleteService}
                        disabled={actionLoading || (!deliverableFile && !hasDeliverable)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Mark Service Completed (Stage 07 Gate)</span>
                      </button>
                    )}

                    {selectedDeal.stage === 'STAGE_07_SERVICE_COMPLETED' && (
                      <button
                        onClick={handleDeliverToClient}
                        disabled={actionLoading || isPartPaymentPending}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-40"
                      >
                        <Send className="w-4 h-4" />
                        <span>Deliver Certificate to Client (Stage 08 Dispatch)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
                Select an operations file to track filings.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
