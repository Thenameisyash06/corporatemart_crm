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
  LayoutGrid,
  List,
  Trash2,
  Paperclip,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  File,
} from 'lucide-react';
import api from '../lib/api';
import {
  exportOpsServicesToCsv,
  exportOpsTeamWorkloadToCsv,
} from '../lib/exportCsv';

// -----------------------------------------------------------------------------
// DOCUMENT CATEGORIES FOR OPERATIONS
// -----------------------------------------------------------------------------
export const OPS_DOCUMENT_TYPES = [
  { value: 'FINAL_DELIVERABLE_CERTIFICATE', label: 'Final Deliverable Certificate (COI / License / Approval PDF)' },
  { value: 'INCORPORATION_FORM', label: 'Govt / MCA Filing Form / Challan Receipt' },
  { value: 'LEGAL_AGREEMENT', label: 'Service / Legal Agreement' },
  { value: 'OTHER', label: 'Working Paper / Objection Reply / Other Document' },
  { value: 'KYC_PAN', label: 'Director PAN Card' },
  { value: 'KYC_AADHAAR', label: 'Director Aadhaar Card' },
  { value: 'ADDRESS_PROOF', label: 'Office / Electricity Address Proof' },
  { value: 'DSC_TOKEN', label: 'DSC / Token Document' },
];

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
  // Specialist: 'my_tasks' (Unified Tasks & Dossier) | 'pool'
  const [activeTab, setActiveTab] = useState(isManager ? 'allocation' : 'my_tasks');

  useEffect(() => {
    if (isManager) {
      if (activeTab === 'my_tasks' || activeTab === 'pool') setActiveTab('allocation');
    } else {
      if (activeTab === 'allocation' || activeTab === 'team' || activeTab === 'dossier') setActiveTab('my_tasks');
    }
  }, [isManager, currentUser?.id, currentUser?.email]);

  const [deals, setDeals] = useState([]);
  const [opsTeam, setOpsTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [deliverableFile, setDeliverableFile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Specialist Unified Workspace & Files State
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [viewMode, setViewMode] = useState('workspace'); // 'workspace' | 'table'
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [uploadDocType, setUploadDocType] = useState('FINAL_DELIVERABLE_CERTIFICATE');
  const [uploadDocTitle, setUploadDocTitle] = useState('');
  const [uploadDocFile, setUploadDocFile] = useState(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isEmailingCerts, setIsEmailingCerts] = useState(false);

  // Filters for Specialist & Manager
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(isManager ? 'ALL' : 'ACTIVE');
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
          deal: d,
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
      if (
        sector.specialists.some(
          (s) =>
            name.toLowerCase().includes(s.toLowerCase().split(' ')[0]) ||
            email.toLowerCase().includes(s.toLowerCase().split(' ')[0])
        )
      ) {
        return sector;
      }
    }
    return EXPERTISE_SECTORS[3]; // Default to Incorporation
  }, [currentUser, isManager]);

  // Specialist's personal assigned services
  const myServices = useMemo(() => {
    return allServices.filter(
      (s) =>
        s.assignedOpsUserId === currentUser?.id ||
        (currentUser?.email && s.assignedOpsUser?.email === currentUser?.email)
    );
  }, [allServices, currentUser]);

  // Unassigned General Pool
  // Deals assigned specifically to the logged-in Operations Manager
  const managerDossierDeals = useMemo(() => {
    return deals.filter((d) => {
      const isDealAssigned =
        (currentUser?.id && d.assignedOpsUserId === currentUser.id) ||
        (currentUser?.email && d.assignedOpsUser?.email === currentUser.email);
      const hasAssignedService = (d.services || []).some(
        (s) =>
          (currentUser?.id && s.assignedOpsUserId === currentUser.id) ||
          (currentUser?.email && s.assignedOpsUser?.email === currentUser.email)
      );
      return isDealAssigned || hasAssignedService;
    });
  }, [deals, currentUser?.id, currentUser?.email]);

  const activeDossierDeal = useMemo(() => {
    if (!selectedDeal) return managerDossierDeals[0] || null;
    return managerDossierDeals.find((d) => d.id === selectedDeal.id) || managerDossierDeals[0] || null;
  }, [selectedDeal, managerDossierDeals]);

  const poolServices = useMemo(() => {
    return allServices.filter((s) => !s.assignedOpsUserId);
  }, [allServices]);

  // Filtered Services for Specialist Personal View
  const filteredMyServices = useMemo(() => {
    return myServices.filter((s) => {
      // By default ACTIVE hides completed / approved services so they are removed from active workspace
      if (selectedStatusFilter === 'ACTIVE') {
        if (s.status === 'COMPLETED' || s.status === 'APPROVED') return false;
      } else if (selectedStatusFilter !== 'ALL' && s.status !== selectedStatusFilter) {
        return false;
      }

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

  // Active Selected Task & Deal for the Unified Section
  const activeTask = useMemo(() => {
    if (filteredMyServices.length === 0) return null;
    if (selectedTaskId) {
      const found = filteredMyServices.find((s) => s.id === selectedTaskId);
      if (found) return found;
    }
    return filteredMyServices[0];
  }, [filteredMyServices, selectedTaskId]);

  const activeDeal = useMemo(() => {
    if (activeTask?.dealId) {
      return deals.find((d) => d.id === activeTask.dealId) || activeTask.deal || null;
    }
    return selectedDeal || deals[0] || null;
  }, [activeTask, deals, selectedDeal]);

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
      if (updates.status === 'COMPLETED') {
        setFeedback({
          type: 'success',
          message: 'Service marked as COMPLETED and removed from your active workspace!',
        });
      } else {
        setFeedback({ type: 'success', message: 'Service task updated successfully.' });
      }
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

  const handleCompleteService = async (dealTarget) => {
    const target = dealTarget || selectedDeal;
    if (!target) return;

    // A deal is not self-completable: all individual services must be completed first
    const incompleteServices = (target.services || []).filter((s) => s.status !== 'COMPLETED');
    if (incompleteServices.length > 0) {
      setFeedback({
        type: 'error',
        message: `Cannot complete deal. All ${target.services?.length || 0} services must be completed by operations first (${incompleteServices.length} still in progress).`,
      });
      return;
    }

    try {
      setActionLoading(true);
      setFeedback(null);

      if (deliverableFile) {
        const formData = new FormData();
        formData.append('dealId', target.id);
        formData.append('documentType', 'FINAL_DELIVERABLE_CERTIFICATE');
        formData.append('title', `Final Deliverable Certificate - ${deliverableFile.name}`);
        formData.append('file', deliverableFile);
        await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await api.post(`/deals/${target.id}/service-complete`, {
        outcomeNotes: 'All filings completed, government certificates generated and verified.',
      });

      setFeedback({ type: 'success', message: `Deal ${target.dealCode} marked as Service Completed (Stage 07)!` });
      setDeliverableFile(null);
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to complete service.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmailCertificatesToClient = async (dealTarget) => {
    const target = dealTarget || selectedDeal;
    if (!target || !target.client?.email) {
      setFeedback({ type: 'warning', message: 'No client email address configured for this deal.' });
      return;
    }
    try {
      setIsEmailingCerts(true);
      setFeedback(null);
      await api.post(`/deals/${target.id}/send-email-update`, {
        subject: `Official Service Deliverable Certificates - Deal #${target.dealCode} | Corporate Mart`,
        message: `We are pleased to deliver your official service certificate(s) and completion documents for ${target.client?.companyName || 'your company'}. Please find the official files attached to this notification for your compliance and regulatory records.`,
        attachCertificates: true,
      });
      setFeedback({
        type: 'success',
        message: `Service certificate email dispatched with attachment to ${target.client.email}!`,
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to dispatch email with certificates.' });
    } finally {
      setIsEmailingCerts(false);
    }
  };

  const handleDeliverToClient = async (dealTarget) => {
    const target = dealTarget || selectedDeal;
    if (!target) return;
    try {
      setActionLoading(true);
      setFeedback(null);

      await api.post(`/deals/${target.id}/final-delivery`, {
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

  // ---------------------------------------------------------------------------
  // DOCUMENT VAULT & FILE ATTACHMENT HANDLERS
  // ---------------------------------------------------------------------------
  const handleDirectDeliverableUpload = async (dealId, fileOverride = null) => {
    const fileToUpload = fileOverride || deliverableFile;
    if (!dealId || !fileToUpload) return;
    try {
      setIsUploadingDoc(true);
      setFeedback(null);
      const formData = new FormData();
      formData.append('dealId', dealId);
      formData.append('documentType', 'FINAL_DELIVERABLE_CERTIFICATE');
      formData.append('title', `Final Deliverable Certificate - ${fileToUpload.name}`);
      formData.append('file', fileToUpload);
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFeedback({ type: 'success', message: `Deliverable certificate "${fileToUpload.name}" attached successfully!` });
      setDeliverableFile(null);
      const fileInput = document.getElementById('deliverable-file-input');
      if (fileInput) fileInput.value = '';
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to upload certificate.' });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleUploadDocument = async (dealId) => {
    if (!dealId) {
      setFeedback({ type: 'error', message: 'No active deal selected to attach document.' });
      return;
    }
    if (!uploadDocFile) {
      setFeedback({ type: 'error', message: 'Please select a file to attach.' });
      return;
    }

    try {
      setIsUploadingDoc(true);
      setFeedback(null);
      const formData = new FormData();
      formData.append('dealId', dealId);
      formData.append('documentType', uploadDocType || 'OTHER');
      formData.append('title', uploadDocTitle.trim() || uploadDocFile.name);
      formData.append('file', uploadDocFile);

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFeedback({ type: 'success', message: `File "${uploadDocFile.name}" attached successfully to deal dossier!` });
      setUploadDocFile(null);
      setUploadDocTitle('');
      const fileInput = document.getElementById('ops-doc-file-input');
      if (fileInput) fileInput.value = '';

      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to attach document.' });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handlePreviewDocument = async (docId) => {
    try {
      const res = await api.get(`/documents/${docId}/signed-url`);
      setPreviewDoc(res.data);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to generate document preview link.' });
    }
  };

  const handleDeleteDocument = async (docId, docTitle) => {
    if (!window.confirm(`Are you sure you want to remove document "${docTitle}" from the deal dossier?`)) return;
    try {
      setActionLoading(true);
      await api.delete(`/documents/${docId}`);
      setFeedback({ type: 'success', message: 'Document removed from deal dossier.' });
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to delete document.' });
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
                  {managerDossierDeals.length}
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
                <span>My Assigned Tasks & Deal Dossier</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-50 text-emerald-700">
                  {myServices.filter((s) => s.status !== 'COMPLETED' && s.status !== 'APPROVED').length}
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
            <div
              onClick={() => setSelectedStatusFilter('ACTIVE')}
              className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition ${
                selectedStatusFilter === 'ACTIVE'
                  ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                My Active Filings
              </span>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                {myServices.filter((s) => s.status !== 'COMPLETED' && s.status !== 'APPROVED').length}{' '}
                <span className="text-xs font-normal text-slate-500">pending tasks</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Value: ₹{myServices.filter((s) => s.status !== 'COMPLETED' && s.status !== 'APPROVED').reduce((sum, s) => sum + Number(s.serviceFee || 0), 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div
              onClick={() => setSelectedStatusFilter('IN_PROGRESS')}
              className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition ${
                selectedStatusFilter === 'IN_PROGRESS'
                  ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
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

            <div
              onClick={() => setSelectedUrgencyFilter(selectedUrgencyFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
              className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition ${
                selectedUrgencyFilter === 'OVERDUE'
                  ? 'bg-rose-50/50 border-rose-500 ring-1 ring-rose-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                Overdue / Urgent
              </span>
              <div className="text-xl font-extrabold text-rose-600 mt-0.5">
                {myServices.filter((s) => s.isOverdue && s.status !== 'COMPLETED' && s.status !== 'APPROVED').length}
              </div>
              <div className="text-[11px] text-rose-700/80 mt-1">
                Immediate Action Required
              </div>
            </div>

            <div
              onClick={() => setSelectedStatusFilter('COMPLETED')}
              className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition ${
                selectedStatusFilter === 'COMPLETED'
                  ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Completed & Cleared
              </span>
              <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
                {myServices.filter((s) => s.status === 'COMPLETED' || s.status === 'APPROVED').length}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-1">
                Removed from workspace
              </div>
            </div>
          </div>

          {/* Unified Controls: Search, Filters & View Mode Switcher */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search assigned tasks by deal code, company, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-between sm:justify-end">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
              >
                <option value="ACTIVE">Active Tasks (In Workspace)</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="GOVT_SUBMITTED">Govt / MCA Submitted</option>
                <option value="QUERY_RAISED">Query Raised</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="COMPLETED">Completed History</option>
                <option value="ALL">All Statuses</option>
              </select>

              <select
                value={selectedUrgencyFilter}
                onChange={(e) => setSelectedUrgencyFilter(e.target.value)}
                className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
              >
                <option value="ALL">All Deadlines</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="DUE_48H">Due Next 48 Hours</option>
                <option value="THIS_WEEK">Due This Week</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('workspace')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                    viewMode === 'workspace'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Workspace View"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Workspace View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                    viewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Table View</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: UNIFIED WORKSPACE (SPLIT DESK) */}
          {viewMode === 'workspace' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
              {/* LEFT COLUMN: Assigned Task Queue (4 cols) */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-xs">
                <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                      My Assigned Tasks ({filteredMyServices.length})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Select a filing to manage dossier, documents, & status
                    </span>
                  </div>
                  <button
                    onClick={fetchOpsData}
                    className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-slate-200/60 transition"
                    title="Refresh tasks"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5 max-h-[750px]">
                  {filteredMyServices.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      No assigned filings found matching filters. Pick up tasks from the General Task Pool!
                    </div>
                  ) : (
                    filteredMyServices.map((svc) => {
                      const isSelected = activeTask?.id === svc.id;
                      const svcDeal = svc.deal || deals.find((d) => d.id === svc.dealId);
                      const docCount = svcDeal?.documents?.length || 0;

                      return (
                        <div
                          key={svc.id}
                          onClick={() => setSelectedTaskId(svc.id)}
                          className={`p-3 rounded-xl cursor-pointer transition border text-left ${
                            isSelected
                              ? 'bg-slate-50 border-slate-900 shadow-xs ring-1 ring-slate-900/20'
                              : 'bg-white border-slate-200/70 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {svc.dealCode}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                svc.status === 'COMPLETED' || svc.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : svc.status === 'GOVT_SUBMITTED'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : svc.status === 'QUERY_RAISED'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : svc.status === 'IN_PROGRESS'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {svc.status?.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="font-bold text-slate-900 text-xs mt-1.5 truncate">
                            {svc.companyName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {svc.clientName} ({svc.clientPhone})
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                              {svc.serviceName}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold text-[10px] border ${
                                svc.isOverdue
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : svc.daysLeft !== null && svc.daysLeft <= 2
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {svc.deadlineStatus}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-mono">SRN: {svc.govApplicationNumber || 'Pending'}</span>
                            <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                              <Paperclip className="w-3 h-3 text-slate-400" /> {docCount} {docCount === 1 ? 'file' : 'files'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Unified Deal Dossier, Files, & Task Status Controls (8 cols) */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-xs">
                {activeTask && activeDeal ? (
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* WORKSPACE HEADER */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-slate-200 gap-3">
                      <div>
                        <div className="flex items-center space-x-2.5">
                          <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                            {activeDeal.dealCode}
                          </span>
                          <h3 className="text-base font-bold text-slate-900">{activeDeal.client?.companyName || activeTask.companyName}</h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${activeTask.sectorBadge}`}>
                            {activeTask.sectorName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Client: <strong className="text-slate-800">{activeDeal.client?.clientName}</strong> ({activeDeal.client?.phone}) • Email: <span className="font-mono">{activeDeal.client?.email || 'N/A'}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => onOpenDossier(activeDeal.id)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 flex items-center gap-1.5 transition shadow-xs whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Full Modal Dossier
                      </button>
                    </div>

                    {/* 1. MY ASSIGNED TASK STATUS & FILING MILESTONE CONTROLS */}
                    <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{activeTask.serviceName}</h4>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${activeTask.sectorBadge}`}>
                              My Assigned Filing
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Service Fee: <strong className="text-slate-800">₹{Number(activeTask.serviceFee || 0).toLocaleString('en-IN')}</strong>{' '}
                            {activeTask.govtFee && `• Govt Challan Fee: ₹${Number(activeTask.govtFee).toLocaleString('en-IN')}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {activeTask.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                handleUpdateService(activeTask.dealId, activeTask.id, {
                                  status: 'COMPLETED',
                                  completedAt: new Date().toISOString(),
                                })
                              }
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Mark Completed
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-xs">
                        <div>
                          <label className="text-xs text-slate-700 font-semibold block mb-1">
                            Update Milestone Status
                          </label>
                          <select
                            value={activeTask.status || 'PENDING'}
                            onChange={(e) =>
                              handleUpdateService(activeTask.dealId, activeTask.id, {
                                status: e.target.value,
                                completedAt: e.target.value === 'COMPLETED' ? new Date().toISOString() : null,
                              })
                            }
                            disabled={actionLoading}
                            className={`w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border focus:outline-none ${
                              activeTask.status === 'COMPLETED' || activeTask.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : activeTask.status === 'GOVT_SUBMITTED'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : activeTask.status === 'QUERY_RAISED'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : activeTask.status === 'IN_PROGRESS'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            <option value="PENDING">PENDING (Not Started)</option>
                            <option value="IN_PROGRESS">IN_PROGRESS (Drafting)</option>
                            <option value="GOVT_SUBMITTED">GOVT_SUBMITTED (Filed)</option>
                            <option value="QUERY_RAISED">QUERY_RAISED (Resubmission)</option>
                            <option value="APPROVED">APPROVED (Authority Cleared)</option>
                            <option value="COMPLETED">COMPLETED</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-slate-700 font-semibold block mb-1">
                            Govt Application / SRN Number
                          </label>
                          <input
                            type="text"
                            defaultValue={activeTask.govApplicationNumber || ''}
                            placeholder="e.g. SRN29182371 / Ref"
                            onBlur={(e) => {
                              if (e.target.value !== (activeTask.govApplicationNumber || '')) {
                                handleUpdateService(activeTask.dealId, activeTask.id, {
                                  govApplicationNumber: e.target.value.trim() || null,
                                });
                              }
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-800"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-700 font-semibold block mb-1">
                            Target Completion Date
                          </label>
                          <input
                            type="date"
                            defaultValue={
                              activeTask.targetCompletionDate
                                ? new Date(activeTask.targetCompletionDate).toISOString().split('T')[0]
                                : ''
                            }
                            onChange={(e) => {
                              handleUpdateService(activeTask.dealId, activeTask.id, {
                                targetCompletionDate: e.target.value || null,
                              });
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. DEAL DOSSIER: COMPANY DETAILS & DIRECTORS */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-slate-500" /> Deal Dossier & Client Profile
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Stage: <strong className="text-slate-800">{activeDeal.stage?.replace(/_/g, ' ')}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-medium block">GSTIN</span>
                          <span className="font-mono font-bold text-slate-900 mt-0.5 block truncate">
                            {activeDeal.client?.gstin || (activeDeal.client?.gstStatus ? 'Pending' : 'Non-GST')}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-medium block">Company PAN</span>
                          <span className="font-mono font-bold text-slate-900 mt-0.5 block truncate">
                            {activeDeal.client?.pan || 'Not Provided'}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-medium block">Industry / Sector</span>
                          <span className="font-semibold text-slate-900 mt-0.5 block truncate">
                            {activeDeal.client?.industry || activeDeal.client?.sector || 'General Corporate'}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-medium block">City / State</span>
                          <span className="font-semibold text-slate-900 mt-0.5 block truncate">
                            {[activeDeal.client?.city, activeDeal.client?.state].filter(Boolean).join(', ') || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {activeDeal.client?.billingAddress && (
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-xs">
                          <span className="text-[10px] font-medium text-slate-500 block mb-0.5">Registered / Office Address:</span>
                          <span className="font-medium text-slate-800">{activeDeal.client.billingAddress}</span>
                        </div>
                      )}

                      {/* Company Directors */}
                      {activeDeal.client?.directors && activeDeal.client.directors.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[11px] font-bold text-slate-700 block mb-2">
                            Directors ({activeDeal.client.directors.length}):
                          </span>
                          <div className="border border-slate-200 rounded-lg overflow-x-auto">
                            <table className="w-full text-left text-xs min-w-[450px]">
                              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-bold tracking-wider">
                                <tr>
                                  <th className="py-2 px-3">Name</th>
                                  <th className="py-2 px-3">DIN</th>
                                  <th className="py-2 px-3">PAN</th>
                                  <th className="py-2 px-3">Mobile</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                                {activeDeal.client.directors.map((d) => (
                                  <tr key={d.id} className="hover:bg-slate-50/70">
                                    <td className="py-2 px-3 font-bold text-slate-900">{d.name}</td>
                                    <td className="py-2 px-3 font-mono text-[11px]">{d.din || 'N/A'}</td>
                                    <td className="py-2 px-3 font-mono text-[11px]">{d.pan || 'N/A'}</td>
                                    <td className="py-2 px-3 text-slate-600">{d.phone || 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. DEAL DOSSIER & ATTACHED FILES (VIEW & PREVIEW) */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <FolderOpen className="w-4 h-4 text-cyan-600" /> Deal Dossier & Attached Files ({activeDeal.documents?.length || 0})
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          KYC, MOA/AOA, Filing Proofs, Challans, & Deliverables
                        </span>
                      </div>

                      <div className="space-y-2">
                        {!activeDeal.documents || activeDeal.documents.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                            <Paperclip className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                            No files attached to this deal yet. Attach files using the form below.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {activeDeal.documents.map((doc) => {
                              const isPaymentProofVerified = (() => {
                                if (doc.documentType !== 'PAYMENT_PROOF') return false;
                                const verifiedPayments = (activeDeal.payments || []).filter((p) => p.status === 'VERIFIED');
                                if (verifiedPayments.length === 0) return false;
                                if ((activeDeal.payments || []).length > 0 && (activeDeal.payments || []).every((p) => p.status === 'VERIFIED')) return true;
                                const paymentProofDocs = (activeDeal.documents || []).filter((d) => d.documentType === 'PAYMENT_PROOF');
                                const docIdx = paymentProofDocs.findIndex((d) => d.id === doc.id);
                                if (docIdx !== -1 && docIdx < verifiedPayments.length) return true;
                                return verifiedPayments.some((p) => {
                                  if (p.paymentProofUrl && p.paymentProofUrl === doc.fileUrl) return true;
                                  if (p.transactionReference && doc.title && doc.title.toLowerCase().includes(p.transactionReference.toLowerCase())) return true;
                                  if (!doc.title) return false;
                                  const tLower = doc.title.toLowerCase();
                                  const trNum = String(p.trancheNumber || '');
                                  return (
                                    (trNum && (
                                      tLower.includes('tranche #' + trNum) ||
                                      tLower.includes('tranche ' + trNum) ||
                                      tLower.includes('tranche-' + trNum) ||
                                      tLower.includes('tranche_' + trNum) ||
                                      tLower.includes('tranche' + trNum) ||
                                      tLower.includes('#' + trNum)
                                    )) ||
                                    (p.trancheNumber === 1 && !tLower.includes('tranche'))
                                  );
                                });
                              })();
                              const isDocVerified = Boolean(doc.isVerified || isPaymentProofVerified);

                              return (
                              <div
                                key={doc.id}
                                className="p-3 bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-between text-xs transition"
                              >
                                <div className="flex items-center space-x-2.5 truncate mr-2">
                                  <div className="p-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-xs flex-shrink-0">
                                    <FileText className="w-4 h-4 text-indigo-600" />
                                  </div>
                                  <div className="truncate">
                                    <div className="font-semibold text-slate-900 truncate" title={doc.title}>
                                      {doc.title}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate flex items-center gap-1.5">
                                      <span className="px-1.5 py-0.2 rounded font-sans font-bold bg-white text-slate-700 border border-slate-200">
                                        {doc.documentType}
                                      </span>
                                      {doc.fileSize && <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>}
                                      {isDocVerified && (
                                        <span className="text-emerald-700 font-bold font-sans">✓ Verified</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1.5 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewDocument(doc.id)}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-200/80 text-slate-700 rounded-md border border-slate-300 text-xs font-semibold flex items-center gap-1 transition shadow-xs"
                                    title="Preview Document"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Preview
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc.id, doc.title)}
                                    className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition"
                                    title="Delete Document"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. ATTACH NEW DOCUMENT / FILING PROOF / DELIVERABLE */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <UploadCloud className="w-4 h-4 text-emerald-600" /> Attach Document or Deliverable to Deal Dossier
                      </h4>

                      <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Document Category
                            </label>
                            <select
                              value={uploadDocType}
                              onChange={(e) => setUploadDocType(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                            >
                              {OPS_DOCUMENT_TYPES.map((dt) => (
                                <option key={dt.value} value={dt.value}>
                                  {dt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Document Title / Note (Optional)
                            </label>
                            <input
                              type="text"
                              value={uploadDocTitle}
                              onChange={(e) => setUploadDocTitle(e.target.value)}
                              placeholder="e.g. SPICe+ Part B Filing Acknowledgment"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Select File (PDF, DOCX, Images up to 50MB)
                          </label>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <input
                              id="ops-doc-file-input"
                              type="file"
                              accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                              onChange={(e) => setUploadDocFile(e.target.files?.[0] || null)}
                              className="text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                            />

                            <button
                              type="button"
                              onClick={() => handleUploadDocument(activeDeal.id)}
                              disabled={!uploadDocFile || isUploadingDoc}
                              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition disabled:opacity-40 whitespace-nowrap self-stretch sm:self-auto justify-center"
                            >
                              <UploadCloud className="w-4 h-4" />
                              <span>{isUploadingDoc ? 'Uploading...' : 'Attach & Upload'}</span>
                            </button>
                          </div>
                          {uploadDocFile && (
                            <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5 mt-2">
                              <Check className="w-3.5 h-3.5" /> Selected: {uploadDocFile.name} ({(uploadDocFile.size / 1024).toFixed(0)} KB)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                    <h3 className="text-base font-bold text-slate-800">Workspace Queue Clear</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      {selectedStatusFilter === 'ACTIVE'
                        ? 'All your assigned service filings are completed! Pick up new tasks from the General Task Pool matching your sector.'
                        : 'No filings found matching your search and filter criteria.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: TABLE WITH EXPANDABLE DOSSIER & FILES DRAWER */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Deal / Company</th>
                      <th className="py-3 px-4">Service Task & Sector</th>
                      <th className="py-3 px-4">My Milestone Status</th>
                      <th className="py-3 px-4">SRN / MCA Reference</th>
                      <th className="py-3 px-4">Target Deadline</th>
                      <th className="py-3 px-4 text-center">Dossier & Action</th>
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
                      filteredMyServices.map((svc) => {
                        const isExpanded = expandedTaskId === svc.id;
                        const svcDeal = svc.deal || deals.find((d) => d.id === svc.dealId);
                        const docCount = svcDeal?.documents?.length || 0;

                        return (
                          <React.Fragment key={svc.id}>
                            <tr className={`hover:bg-slate-50/70 transition ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                    {svc.dealCode}
                                  </span>
                                  <button
                                    onClick={() => onOpenDossier(svc.dealId)}
                                    title="Open Deal Dossier Modal"
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
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedTaskId(isExpanded ? null : svc.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition border ${
                                      isExpanded
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                    }`}
                                    title="View Dossier & Files"
                                  >
                                    <Paperclip className="w-3.5 h-3.5" />
                                    <span>{docCount} Files</span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>

                                  {svc.status === 'COMPLETED' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3" /> Done
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleUpdateService(svc.dealId, svc.id, {
                                          status: 'COMPLETED',
                                          completedAt: new Date().toISOString(),
                                        })
                                      }
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition shadow-xs flex items-center gap-1"
                                      title="Mark task completed"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* EXPANDABLE ROW: INLINE DOSSIER & FILES DRAWER */}
                            {isExpanded && svcDeal && (
                              <tr className="bg-slate-50/90 border-b border-slate-200">
                                <td colSpan={6} className="p-4">
                                  <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-4 shadow-sm">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-slate-800 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                                          {svcDeal.dealCode}
                                        </span>
                                        <h4 className="font-bold text-slate-900 text-sm">{svcDeal.client?.companyName}</h4>
                                        <span className="text-xs text-slate-500 font-mono">
                                          • {svcDeal.client?.clientName} ({svcDeal.client?.phone})
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => onOpenDossier(svcDeal.id)}
                                        className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
                                      >
                                        <Eye className="w-3.5 h-3.5" /> Full Modal Dossier
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                      {/* Col 1: Dossier Details */}
                                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                                          Company & Director Dossier
                                        </span>
                                        <div className="space-y-1">
                                          <div><span className="text-slate-500">GSTIN:</span> <strong className="font-mono text-slate-900">{svcDeal.client?.gstin || 'Pending/Non-GST'}</strong></div>
                                          <div><span className="text-slate-500">PAN:</span> <strong className="font-mono text-slate-900">{svcDeal.client?.pan || 'N/A'}</strong></div>
                                          <div><span className="text-slate-500">Industry:</span> <span className="font-medium text-slate-900">{svcDeal.client?.industry || 'N/A'}</span></div>
                                          <div><span className="text-slate-500">Address:</span> <span className="font-medium text-slate-900">{svcDeal.client?.billingAddress || 'N/A'}</span></div>
                                        </div>

                                        {svcDeal.client?.directors && svcDeal.client.directors.length > 0 && (
                                          <div className="pt-2 border-t border-slate-200/70">
                                            <span className="text-[11px] font-bold text-slate-700 block mb-1">Directors:</span>
                                            <div className="space-y-1">
                                              {svcDeal.client.directors.map((d) => (
                                                <div key={d.id} className="text-[11px] text-slate-800 font-medium">
                                                  • {d.name} {d.din ? `(DIN: ${d.din})` : ''}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Col 2: Attached Documents */}
                                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                                            Attached Files ({svcDeal.documents?.length || 0})
                                          </span>
                                        </div>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                          {!svcDeal.documents || svcDeal.documents.length === 0 ? (
                                            <p className="text-[11px] text-slate-400 italic">No files attached yet</p>
                                          ) : (
                                            svcDeal.documents.map((doc) => (
                                              <div
                                                key={doc.id}
                                                className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                                              >
                                                <div className="truncate mr-2">
                                                  <div className="font-semibold text-slate-900 truncate" title={doc.title}>
                                                    {doc.title}
                                                  </div>
                                                  <div className="text-[10px] text-slate-500 font-mono">
                                                    {doc.documentType} {doc.fileSize && `• ${(doc.fileSize / 1024).toFixed(0)} KB`}
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={() => handlePreviewDocument(doc.id)}
                                                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                                                  >
                                                    Preview
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteDocument(doc.id, doc.title)}
                                                    className="p-0.5 text-slate-400 hover:text-rose-600 rounded"
                                                    title="Delete"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>

                                      {/* Col 3: Upload Document Form */}
                                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                                          Attach Document to Deal
                                        </span>
                                        <div className="space-y-2">
                                          <select
                                            value={uploadDocType}
                                            onChange={(e) => setUploadDocType(e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                                          >
                                            {OPS_DOCUMENT_TYPES.map((dt) => (
                                              <option key={dt.value} value={dt.value}>
                                                {dt.label}
                                              </option>
                                            ))}
                                          </select>

                                          <input
                                            type="text"
                                            value={uploadDocTitle}
                                            onChange={(e) => setUploadDocTitle(e.target.value)}
                                            placeholder="Document Title (optional)"
                                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                                          />

                                          <div className="flex items-center gap-1.5">
                                            <input
                                              type="file"
                                              accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                                              onChange={(e) => setUploadDocFile(e.target.files?.[0] || null)}
                                              className="text-xs text-slate-700 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-slate-900 file:text-white"
                                            />
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => handleUploadDocument(svcDeal.id)}
                                            disabled={!uploadDocFile || isUploadingDoc}
                                            className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 transition disabled:opacity-40"
                                          >
                                            <UploadCloud className="w-3.5 h-3.5" />
                                            <span>{isUploadingDoc ? 'Uploading...' : 'Upload & Attach'}</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
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
              <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Deal / Client</th>
                    <th className="py-3 px-4">Service Task & Sector</th>
                    <th className="py-3 px-4">Assigned Specialist</th>
                    <th className="py-3 px-4">Target Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
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
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                {svc.dealCode}
                              </span>
                              <button
                                onClick={() => onOpenDossier(svc.dealId)}
                                title="Open Deal Dossier Modal"
                                className="text-slate-400 hover:text-slate-800"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="font-bold text-slate-900 mt-1 truncate max-w-[180px]">
                              {svc.companyName}
                            </div>
                            <div className="text-[11px] text-slate-500">{svc.clientName}</div>
                          </td>

                          {/* Service Task & Sector */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm">{svc.serviceName}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${sectorMeta.badgeColor}`}>
                                {sectorMeta.name}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Fee: ₹{Number(svc.serviceFee || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </td>

                          {/* Assigned Specialist */}
                          <td className="py-3.5 px-4 min-w-[200px]">
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
                              <div className="text-[10px] text-indigo-700 font-semibold mt-1">
                                Assigned to You
                              </div>
                            )}
                          </td>

                          {/* Target Deadline */}
                          <td className="py-3.5 px-4 min-w-[150px]">
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
                Operations Queue ({managerDossierDeals.length})
              </span>
              <button
                onClick={fetchOpsData}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-medium px-2 py-1 rounded hover:bg-slate-200/60 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2.5 space-y-1.5">
              {managerDossierDeals.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">
                  <CheckCircle2 className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  No operations files currently assigned to you.
                </div>
              ) : (
                managerDossierDeals.map((d) => {
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
            {activeDossierDeal ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-slate-200 gap-3">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                        {activeDossierDeal.dealCode}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{activeDossierDeal.client.companyName}</h3>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Client: <strong className="text-slate-800">{activeDossierDeal.client.clientName}</strong> ({activeDossierDeal.client.phone}) • Accounts & Legal Verified: <strong className="text-emerald-700">✓ Yes</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => onOpenDossier(activeDossierDeal.id)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Eye className="w-4 h-4" /> View Full Dossier
                  </button>
                </div>

                {/* SERVICES IN THIS DEAL (Only Unassigned/Operable Tasks Shown to Manager) */}
                {(() => {
                  const managerOperableServices = (activeDossierDeal.services || []).filter(
                    (svc) => !svc.assignedOpsUserId || (currentUser?.id && svc.assignedOpsUserId === currentUser.id)
                  );
                  const assignedToSpecialistsCount = (activeDossierDeal.services || []).length - managerOperableServices.length;

                  return (
                    <div className="space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-slate-500" /> Service Filing Tasks ({managerOperableServices.length})
                        </div>
                        {assignedToSpecialistsCount > 0 && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {assignedToSpecialistsCount} assigned to specialist desk{assignedToSpecialistsCount > 1 ? 's' : ''} (hidden from manager execution)
                          </span>
                        )}
                      </div>

                      {managerOperableServices.length === 0 ? (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-800">
                              All services in this deal are assigned to team specialists.
                            </p>
                            <p className="mt-0.5 text-slate-500">
                              Assigned services are operated directly by specialists in their assigned workspaces and cannot be operated from the manager dossier view. To reallocate, use the Team Dispatch & Workload tab.
                            </p>
                          </div>
                        </div>
                      ) : (
                        managerOperableServices.map((svc) => {
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
                                    Assign Specialist
                                  </label>
                                  <select
                                    value={svc.assignedOpsUserId || ''}
                                    onChange={(e) =>
                                      handleUpdateService(activeDossierDeal.id, svc.id, {
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
                                      handleUpdateService(activeDossierDeal.id, svc.id, {
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
                                      handleUpdateService(activeDossierDeal.id, svc.id, {
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
                        })
                      )}
                    </div>
                  );
                })()}

                {/* DEAL DOSSIER: ATTACHED DOCUMENTS & VAULT */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FolderOpen className="w-4 h-4 text-cyan-600" /> Deal Dossier Documents ({activeDossierDeal.documents?.length || 0})
                    </h4>
                    <div className="flex items-center gap-2.5">
                      <span className="hidden sm:inline text-[11px] text-slate-500">
                        KYC, Forms, Agreements, & Deliverables
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const fileInput = document.getElementById('ops-doc-file-input');
                          if (fileInput) fileInput.click();
                        }}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-xs font-semibold flex items-center gap-1 transition shadow-xs cursor-pointer"
                        title="Attach Document to Dossier"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Document</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {!activeDossierDeal.documents || activeDossierDeal.documents.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                        <Paperclip className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                        No files currently attached to this deal.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {activeDossierDeal.documents.map((doc) => {
                          const isPaymentProofVerified = (() => {
                            if (doc.documentType !== 'PAYMENT_PROOF') return false;
                            const verifiedPayments = (activeDossierDeal.payments || []).filter((p) => p.status === 'VERIFIED');
                            if (verifiedPayments.length === 0) return false;
                            if ((activeDossierDeal.payments || []).length > 0 && (activeDossierDeal.payments || []).every((p) => p.status === 'VERIFIED')) return true;
                            const paymentProofDocs = (activeDossierDeal.documents || []).filter((d) => d.documentType === 'PAYMENT_PROOF');
                            const docIdx = paymentProofDocs.findIndex((d) => d.id === doc.id);
                            if (docIdx !== -1 && docIdx < verifiedPayments.length) return true;
                            return verifiedPayments.some((p) => {
                              if (p.paymentProofUrl && p.paymentProofUrl === doc.fileUrl) return true;
                              if (p.transactionReference && doc.title && doc.title.toLowerCase().includes(p.transactionReference.toLowerCase())) return true;
                              if (!doc.title) return false;
                              const tLower = doc.title.toLowerCase();
                              const trNum = String(p.trancheNumber || '');
                              return (
                                (trNum && (
                                  tLower.includes('tranche #' + trNum) ||
                                  tLower.includes('tranche ' + trNum) ||
                                  tLower.includes('tranche-' + trNum) ||
                                  tLower.includes('tranche_' + trNum) ||
                                  tLower.includes('tranche' + trNum) ||
                                  tLower.includes('#' + trNum)
                                )) ||
                                (p.trancheNumber === 1 && !tLower.includes('tranche'))
                              );
                            });
                          })();
                          const isDocVerified = Boolean(doc.isVerified || isPaymentProofVerified);

                          return (
                          <div
                            key={doc.id}
                            className="p-3 bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-between text-xs transition"
                          >
                            <div className="flex items-center space-x-2.5 truncate mr-2">
                              <div className="p-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-xs flex-shrink-0">
                                <FileText className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div className="truncate">
                                <div className="font-semibold text-slate-900 truncate" title={doc.title}>
                                  {doc.title}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.2 rounded font-sans font-bold bg-white text-slate-700 border border-slate-200">
                                    {doc.documentType}
                                  </span>
                                  {doc.fileSize && <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>}
                                  {isDocVerified && (
                                    <span className="text-emerald-700 font-bold font-sans whitespace-nowrap">✓ Verified</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handlePreviewDocument(doc.id)}
                                className="px-2.5 py-1 bg-white hover:bg-slate-200/80 text-slate-700 rounded-md border border-slate-300 text-xs font-semibold flex items-center gap-1 transition shadow-xs"
                                title="Preview Document"
                              >
                                <Eye className="w-3.5 h-3.5" /> Preview
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(doc.id, doc.title)}
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition"
                                title="Delete Document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ATTACH NEW DOCUMENT TO DEAL */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-emerald-600" /> Attach Document to Dossier
                  </h4>

                  <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Document Category
                        </label>
                        <select
                          value={uploadDocType}
                          onChange={(e) => setUploadDocType(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                        >
                          {OPS_DOCUMENT_TYPES.map((dt) => (
                            <option key={dt.value} value={dt.value}>
                              {dt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Document Title / Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={uploadDocTitle}
                          onChange={(e) => setUploadDocTitle(e.target.value)}
                          placeholder="e.g. SPICe+ Part B Filing Acknowledgment"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Select File (PDF, DOCX, Images up to 50MB)
                      </label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <input
                          type="file"
                          accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                          onChange={(e) => setUploadDocFile(e.target.files?.[0] || null)}
                          className="text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                        />

                        <button
                          type="button"
                          onClick={() => handleUploadDocument(activeDossierDeal.id)}
                          disabled={!uploadDocFile || isUploadingDoc}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition disabled:opacity-40 whitespace-nowrap self-stretch sm:self-auto justify-center"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>{isUploadingDoc ? 'Uploading...' : 'Attach & Upload'}</span>
                        </button>
                      </div>
                      {uploadDocFile && (
                        <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5 mt-2">
                          <Check className="w-3.5 h-3.5" /> Selected: {uploadDocFile.name} ({(uploadDocFile.size / 1024).toFixed(0)} KB)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* DELIVERABLE CERTIFICATE UPLOAD & STAGE ACTIONS */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" /> Deliverable Certificate & Completion Gate
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const fileInput = document.getElementById('deliverable-file-input');
                        if (fileInput) fileInput.click();
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer flex-shrink-0"
                      title="Upload & Attach Final Deliverable Certificate"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Documents</span>
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2">
                    <label className="text-xs font-semibold text-slate-800 block">
                      Upload Final Deliverable (Certificate of Incorporation, License, Registration PDF):
                    </label>
                    <input
                      id="deliverable-file-input"
                      type="file"
                      accept="application/pdf,image/*,.doc,.docx"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setDeliverableFile(file);
                          await handleDirectDeliverableUpload(activeDossierDeal.id, file);
                        }
                      }}
                      className="text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                    />
                    {deliverableFile && (
                      <div className="text-xs text-emerald-700 font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-2 p-2 bg-emerald-50 rounded-md border border-emerald-200">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>Selected: {deliverableFile.name} ({(deliverableFile.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDirectDeliverableUpload(activeDossierDeal.id)}
                          disabled={isUploadingDoc}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs transition disabled:opacity-50"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{isUploadingDoc ? 'Uploading...' : 'Upload Certificate'}</span>
                        </button>
                      </div>
                    )}
                    {hasDeliverable && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-200">
                        <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Final Certificate on file in Object Storage.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEmailCertificatesToClient(activeDossierDeal)}
                          disabled={actionLoading || isEmailingCerts}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
                          title={`Email service certificate(s) to ${activeDossierDeal.client?.email || 'client'}`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isEmailingCerts ? 'Sending...' : 'Email Certificate to Client'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Part-payment lock warning */}
                  {isPartPaymentPending && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">
                        <strong>Part-Payment Hold:</strong> Client has ₹{Number(activeDossierDeal.pendingAmount).toLocaleString('en-IN')} pending balance. Service completion is permitted, but final certificate dispatch (Stage 08) requires balance verification by Accounts Desk.
                      </span>
                    </div>
                  )}

                  {/* Stage Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                    {activeDossierDeal.stage === 'STAGE_06_OPERATIONS_PROCESSING' && (
                      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {(() => {
                          const incompleteCount = (activeDossierDeal.services || []).filter((s) => s.status !== 'COMPLETED').length;
                          const totalServices = (activeDossierDeal.services || []).length;
                          const allDone = totalServices > 0 && incompleteCount === 0;

                          return (
                            <>
                              <div className="text-xs text-slate-500">
                                {allDone ? (
                                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                                    <Check className="w-4 h-4 text-emerald-600" /> All {totalServices} services completed. Ready to close deal stage.
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-medium">
                                    ⏳ Filing Active: {totalServices - incompleteCount}/{totalServices} services completed ({incompleteCount} pending).
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={handleCompleteService}
                                disabled={actionLoading || !allDone || (!deliverableFile && !hasDeliverable)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                                title={!allDone ? `Cannot complete: ${incompleteCount} service(s) still in progress` : ''}
                              >
                                <FileCheck className="w-4 h-4" />
                                <span>Mark Service Completed (Stage 07 Gate)</span>
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {activeDossierDeal.stage === 'STAGE_07_SERVICE_COMPLETED' && (
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

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-semibold text-xs text-slate-800 flex items-center gap-2 truncate mr-3">
                <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span className="font-bold truncate">{previewDoc.title || previewDoc.fileName}</span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">({previewDoc.fileName})</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={previewDoc.signedUrl}
                  download={previewDoc.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-300 text-xs font-semibold flex items-center gap-1 transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-2 overflow-auto flex items-center justify-center">
              {previewDoc.mimeType?.includes('pdf') ? (
                <iframe
                  src={previewDoc.signedUrl}
                  className="w-full h-full rounded border-0"
                  title="PDF Viewer"
                />
              ) : (
                <img
                  src={previewDoc.signedUrl}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain rounded"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
