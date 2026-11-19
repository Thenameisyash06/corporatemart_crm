import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  UserPlus,
  Users,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Briefcase,
  Phone,
  Mail,
  Building2,
  UserCheck,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  Send,
  Layers,
  Sparkles,
  ArrowRight,
  Edit2,
  Trash2,
  FileSpreadsheet,
  FileText,
  UploadCloud,
  Paperclip,
  Eye,
  X,
  Flame,
  Award,
  Lock,
} from 'lucide-react';
import api from '../lib/api';
import { exportLeadsToCsv } from '../lib/exportCsv';

// -----------------------------------------------------------------------------
// MASTER CONFIGURATION & DROPDOWN DATA
// -----------------------------------------------------------------------------
export const LMS_LEADERS = [
  'Jayesh Rohit',
  'Neel Boda',
  'Shashank Singhal',
  'Yash Rathod',
  'Vishishtta Dixit',
  'Management',
];

export const LMS_BDMS = [
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

export const LMS_CLOSER_STATUSES = [
  'Self Closer',
  'Lead Sharing',
];

export const LMS_CLIENT_STATUSES = [
  {
    id: 'Hot',
    label: 'Hot',
    color: 'bg-rose-50 text-rose-700 border-rose-300',
    dot: 'bg-rose-500',
    iconText: '🔥',
    description: 'High buying intent, ready to close',
  },
  {
    id: 'Warm',
    label: 'Warm',
    color: 'bg-amber-50 text-amber-700 border-amber-300',
    dot: 'bg-amber-500',
    iconText: '☀️',
    description: 'Interested, follow-up ongoing',
  },
  {
    id: 'Lost',
    label: 'Lost',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-400',
    iconText: '❄️',
    description: 'Dropped or unresponsive',
  },
];

export const LMS_SOURCING_STATUSES = [
  'Dialer',
  'Mail',
  'Rohit Lead',
  'CA/Consultant',
  'Self Sourcing',
];

export const LMS_MEETING_STATUSES = [
  'Google/Team Meet',
  'Conference Call',
  'Document Received',
  'Physical Meeting',
];

export const LMS_LEAD_STAGES = [
  { id: 'OPEN', label: 'Open / Fresh Lead', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'FOLLOW_UP', label: 'Follow Up Active', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'MEETING_SCHEDULED', label: 'Meeting Scheduled / Done', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'DOCUMENT_COLLECTED', label: 'Documents Collected', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'CLOSED_WON', label: 'Closed Won (Converted)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'CLOSED_LOST', label: 'Closed Lost / Dropped', color: 'bg-slate-100 text-slate-600 border-slate-200' },
];

export default function LeadManagementWorkbench({ currentUser, onConvertToDeal, highlightLeadId }) {
  const isAdmin = currentUser?.role === 'ADMIN';

  const [leads, setLeads] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Determine current logged-in BDM's name accurately
  const loggedInBdmName = useMemo(() => {
    if (!currentUser?.fullName) return LMS_BDMS[0];
    const clean = currentUser.fullName.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    const match = LMS_BDMS.find((b) =>
      clean.includes(b.toLowerCase()) || b.toLowerCase().includes(clean)
    );
    return match || currentUser.fullName.replace(/\s*\([^)]*\)/g, '').trim();
  }, [currentUser]);

  // Check if current user is an LMS Leader
  const matchedLeaderName = useMemo(() => {
    if (!currentUser?.fullName) return null;
    const clean = currentUser.fullName.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    return LMS_LEADERS.find((l) =>
      clean.includes(l.toLowerCase()) || l.toLowerCase().includes(clean)
    ) || null;
  }, [currentUser]);

  const isLeader = Boolean(matchedLeaderName);

  // Toggle Form Visibility (BDM only - HIDE BY DEFAULT for Leader BDM and Admin, open for regular BDM)
  const [isFormOpen, setIsFormOpen] = useState(!isAdmin && !isLeader);

  // Auto-sync form visibility state when user changes/switches
  useEffect(() => {
    if (isAdmin || isLeader) {
      setIsFormOpen(false);
    } else {
      setIsFormOpen(true);
    }
  }, [isAdmin, isLeader, currentUser?.id]);

  // Admin BDM Funnel Leaderboard toggle
  const [showBdmLeaderboard, setShowBdmLeaderboard] = useState(false);

  // Quotation File Upload State
  const [quotationFile, setQuotationFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const quotationInputRef = useRef(null);

  // In-app Quotation Document Preview Modal State
  const [previewQuotationDoc, setPreviewQuotationDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Expandable lead rows state (Set of lead IDs)
  const [expandedLeadIds, setExpandedLeadIds] = useState(new Set());

  // Auto-expand lead when navigated from notification
  useEffect(() => {
    if (highlightLeadId) {
      setExpandedLeadIds((prev) => new Set([...prev, highlightLeadId]));
      setTimeout(() => {
        const el = document.getElementById(`lead-row-${highlightLeadId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [highlightLeadId]);

  const toggleLeadExpand = (leadId) => {
    setExpandedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  // Helper to get local date string YYYY-MM-DD
  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Follow-up status recording modal state
  const [followUpModalLead, setFollowUpModalLead] = useState(null);
  const [followUpForm, setFollowUpForm] = useState({
    date: getTodayDateStr(),
    status: 'Hot',
    remarks: '',
  });
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  // Helper to safely parse follow-ups list
  const getFollowUpsList = (lead) => {
    if (!lead?.followUps) return [];
    if (Array.isArray(lead.followUps)) return lead.followUps;
    try {
      const parsed = JSON.parse(lead.followUps);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getLeadLatestFollowUp = (lead) => {
    const fus = getFollowUpsList(lead);
    if (!fus || fus.length === 0) return null;
    const sorted = [...fus].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : (a.addedAt ? new Date(a.addedAt).getTime() : 0);
      const db = b.date ? new Date(b.date).getTime() : (b.addedAt ? new Date(b.addedAt).getTime() : 0);
      return db - da;
    });
    return sorted[0] || null;
  };

  const isLeadFollowUpExceeded = (lead) => {
    if (!lead) return false;
    const lStatus = (lead.leadStatus || '').toUpperCase();
    if (lStatus === 'CLOSED_WON' || lStatus === 'CLOSED_LOST') return false;
    const cStatus = (lead.clientStatus || '').toLowerCase();
    if (cStatus === 'lost' || cStatus === 'closed') return false;

    const latestFu = getLeadLatestFollowUp(lead);
    if (!latestFu || !latestFu.date) return false;

    const fuStatus = (latestFu.status || '').toLowerCase();
    if (fuStatus === 'closed' || fuStatus === 'lost') return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let fuDate;
    if (typeof latestFu.date === 'string') {
      const datePart = latestFu.date.includes('T') ? latestFu.date.split('T')[0] : latestFu.date;
      const [y, m, d] = datePart.split('-').map(Number);
      if (!y || !m || !d) return false;
      fuDate = new Date(y, m - 1, d);
    } else {
      fuDate = new Date(latestFu.date);
    }
    fuDate.setHours(0, 0, 0, 0);

    return fuDate.getTime() < today.getTime();
  };

  const handleSaveFollowUp = async (e) => {
    if (e) e.preventDefault();
    if (!followUpModalLead) return;
    if (!followUpForm.date) {
      alert('Please select a follow-up date.');
      return;
    }
    const currentToday = getTodayDateStr();
    if (followUpForm.date < currentToday) {
      alert('Follow-up date cannot be in the past. Please select today or an upcoming date.');
      return;
    }
    try {
      setSavingFollowUp(true);
      await api.post(`/leads/${followUpModalLead.id}/follow-up`, {
        date: followUpForm.date,
        status: followUpForm.status,
        remarks: followUpForm.remarks,
      });
      setFeedback({
        type: 'success',
        message: `Follow-up on ${followUpForm.date} (${followUpForm.status}) recorded and frozen for "${followUpModalLead.companyName}".`,
      });
      setFollowUpModalLead(null);
      setFollowUpForm({
        date: getTodayDateStr(),
        status: 'Hot',
        remarks: '',
      });
      fetchLeads();
    } catch (err) {
      alert('Failed to save follow-up: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingFollowUp(false);
    }
  };

  // Form State (includes clientStatus default 'Warm')
  const initialFormState = {
    companyName: '',
    directorName: '',
    mobileNo: '',
    emailId: '',
    leaderName: isLeader && matchedLeaderName ? matchedLeaderName : LMS_LEADERS[0],
    bdmName1: loggedInBdmName,
    bdmName2: '',
    closerStatus: isLeader ? 'Self Closer' : LMS_CLOSER_STATUSES[0],
    clientStatus: 'Warm',
    sourcingStatus: LMS_SOURCING_STATUSES[0],
    meetingStatus: LMS_MEETING_STATUSES[0],
    meetingDate: '',
    expectedDateOfCloser: '',
    leadStatus: 'OPEN',
    dealValue: '',
    remarks: '',
  };

  const [form, setForm] = useState(initialFormState);

  // Lock form fields:
  // - BDM-I locked to logged-in BDM
  // - For Leaders: Leader Name locked to themselves, Closer Status locked to 'Self Closer'
  useEffect(() => {
    if (!isAdmin) {
      setForm((prev) => ({
        ...prev,
        bdmName1: loggedInBdmName || prev.bdmName1,
        ...(isLeader && matchedLeaderName
          ? { leaderName: matchedLeaderName, closerStatus: 'Self Closer' }
          : {}),
      }));
    }
  }, [isAdmin, loggedInBdmName, isLeader, matchedLeaderName]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeaderFilter, setSelectedLeaderFilter] = useState('ALL');
  const [selectedBdmFilter, setSelectedBdmFilter] = useState('ALL');
  const [selectedCloserFilter, setSelectedCloserFilter] = useState('ALL');
  const [selectedClientStatusFilter, setSelectedClientStatusFilter] = useState('ALL');
  const [selectedSourcingFilter, setSelectedSourcingFilter] = useState('ALL');
  const [selectedMeetingFilter, setSelectedMeetingFilter] = useState('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');
  const [selectedTeamMemberFilter, setSelectedTeamMemberFilter] = useState('ALL');
  const [pendingFollowUpFilter, setPendingFollowUpFilter] = useState(false);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('THIS_MONTH'); // 'THIS_MONTH' | 'NEXT_MONTH'

  // Month Meta and Labels for This Month vs Next Month
  const monthLabels = useMemo(() => {
    const now = new Date();
    const thisMonth = now.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = nextMonthDate.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    return {
      thisMonth: analytics?.monthMeta?.thisMonthLabel || thisMonth,
      nextMonth: analytics?.monthMeta?.nextMonthLabel || nextMonth,
    };
  }, [analytics]);

  // Check if a date string falls in next calendar month
  const isNextMonthDate = useCallback((dateStr) => {
    if (!dateStr) return false;
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length < 2) return false;
    const targetYear = parseInt(parts[0], 10);
    const targetMonth = parseInt(parts[1], 10) - 1; // 0-based
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();
    const nextMonthYear = currMonth === 11 ? currYear + 1 : currYear;
    const nextMonthVal = currMonth === 11 ? 0 : currMonth + 1;
    return targetYear === nextMonthYear && targetMonth === nextMonthVal;
  }, []);

  // Compute month badge for lead row
  const getLeadMonthBadge = useCallback((lead) => {
    const targetDateStr = lead.nextFollowUpDate || lead.meetingDate || lead.expectedDateOfCloser || lead.createdAt;
    if (!targetDateStr) return null;
    const parts = String(targetDateStr).split('T')[0].split('-');
    if (parts.length < 2) return null;
    const targetYear = parseInt(parts[0], 10);
    const targetMonth = parseInt(parts[1], 10) - 1;

    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();
    const nextMonthYear = currMonth === 11 ? currYear + 1 : currYear;
    const nextMonthVal = currMonth === 11 ? 0 : currMonth + 1;

    const formattedDate = new Date(targetDateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

    if (targetYear === nextMonthYear && targetMonth === nextMonthVal) {
      return {
        label: `Next Month (${formattedDate})`,
        icon: '🚀',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold',
      };
    }
    if (targetYear === currYear && targetMonth === currMonth) {
      return {
        label: `This Month (${formattedDate})`,
        icon: '📅',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      };
    }
    return null;
  }, []);

  // Active Leader associated with this user:
  // - If current user is a Leader: matchedLeaderName
  // - If current user is a BDM: the leader assigned in form or their leads
  const effectiveLeaderName = useMemo(() => {
    if (matchedLeaderName) return matchedLeaderName;
    const existing = leads.find((l) => l.leaderName && l.leaderName.trim());
    if (existing) return existing.leaderName.trim();
    return form.leaderName || LMS_LEADERS[0];
  }, [matchedLeaderName, leads, form.leaderName]);

  // Fetch Leads
  const fetchLeads = async (targetPage = page, targetLimit = limit, targetMonthFilter = selectedMonthFilter) => {
    try {
      setLoading(true);
      const params = {
        page: targetPage,
        limit: targetLimit,
      };
      if (!isAdmin) {
        params.scope = 'my';
        params.myBdmName = loggedInBdmName;
        // Strictly only pass myLeaderName if current user is an LMS Leader
        if (isLeader && effectiveLeaderName) {
          params.myLeaderName = effectiveLeaderName;
        }
      } else {
        if (selectedBdmFilter !== 'ALL') params.bdmName = selectedBdmFilter;
      }
      if (selectedLeaderFilter !== 'ALL') params.leaderName = selectedLeaderFilter;
      if (selectedCloserFilter !== 'ALL') params.closerStatus = selectedCloserFilter;
      if (selectedClientStatusFilter !== 'ALL') params.clientStatus = selectedClientStatusFilter;
      if (selectedSourcingFilter !== 'ALL') params.sourcingStatus = selectedSourcingFilter;
      if (selectedMeetingFilter !== 'ALL') params.meetingStatus = selectedMeetingFilter;
      if (selectedStageFilter !== 'ALL') params.leadStatus = selectedStageFilter;
      if (selectedTeamMemberFilter && selectedTeamMemberFilter !== 'ALL') {
        params.teamMember = selectedTeamMemberFilter;
      }
      const activeMonth = targetMonthFilter || selectedMonthFilter || 'THIS_MONTH';
      params.monthFilter = activeMonth;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/leads', { params });
      setLeads(res.data.leads || []);
      setAnalytics(res.data.analytics || null);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      } else {
        setPagination({
          page: targetPage,
          limit: targetLimit,
          total: res.data.leads?.length || 0,
          totalPages: 1,
        });
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to load leads.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchLeads(1, limit);
  }, [
    selectedLeaderFilter,
    selectedBdmFilter,
    selectedCloserFilter,
    selectedClientStatusFilter,
    selectedSourcingFilter,
    selectedMeetingFilter,
    selectedStageFilter,
    selectedTeamMemberFilter,
    selectedMonthFilter,
  ]);

  // Handle Search on Enter
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLeads(1, limit);
  };

  // Separate Own Direct Leads vs Shared Team Leads
  // NOTE: Funnel value, lead counts, and personal metrics belong ONLY to own direct leads.
  // Team member shared leads are visible in the table below for collaborative actions and status/follow-up management.
  const { ownDirectLeads, sharedTeamLeads, visibleLeads } = useMemo(() => {
    if (isAdmin) {
      return {
        ownDirectLeads: leads,
        sharedTeamLeads: [],
        visibleLeads: leads,
      };
    }

    const myName = (loggedInBdmName || '').toLowerCase().trim();

    // If regular BDM (NOT a leader), only their own direct leads exist! No team member leads.
    if (!isLeader) {
      const own = leads.filter((lead) => {
        const bdm1 = (lead.bdmName1 || '').toLowerCase().trim();
        const bdm2 = (lead.bdmName2 || '').toLowerCase().trim();
        return (
          bdm1.includes(myName) ||
          myName.includes(bdm1) ||
          bdm2.includes(myName) ||
          (lead.createdById === currentUser?.id && (!lead.bdmName1 || bdm1.includes(myName) || myName.includes(bdm1)))
        );
      });
      return {
        ownDirectLeads: own,
        sharedTeamLeads: [],
        visibleLeads: own,
      };
    }

    // Only designated Leader manages shared team leads
    const leaderKey = (effectiveLeaderName || matchedLeaderName || myName).toLowerCase().trim();
    if (!myName && !leaderKey) {
      return {
        ownDirectLeads: leads,
        sharedTeamLeads: [],
        visibleLeads: leads,
      };
    }

    const own = [];
    const shared = [];

    leads.forEach((lead) => {
      const bdm1 = (lead.bdmName1 || '').toLowerCase().trim();
      const bdm2 = (lead.bdmName2 || '').toLowerCase().trim();
      const leadLeader = (lead.leaderName || '').toLowerCase().trim();

      // Check if lead belongs directly to this user as BDM or creator
      const isOwnLead =
        bdm1.includes(myName) ||
        myName.includes(bdm1) ||
        bdm2.includes(myName) ||
        (lead.createdById === currentUser?.id && (!lead.bdmName1 || bdm1.includes(myName) || myName.includes(bdm1)));

      // Check if lead belongs to a team member under the same leader
      // In BDM Leader portal, team member leads are ONLY visible if closerStatus is 'Lead Sharing' (not 'Self Closer')
      const closerStatus = (lead.closerStatus || '').toLowerCase().trim();
      const isTeamLead =
        !isOwnLead &&
        leaderKey &&
        (leadLeader.includes(leaderKey) || leaderKey.includes(leadLeader)) &&
        closerStatus.includes('lead sharing');

      if (isOwnLead) {
        own.push(lead);
      } else if (isTeamLead) {
        shared.push(lead);
      }
    });

    return {
      ownDirectLeads: own,
      sharedTeamLeads: shared,
      visibleLeads: [...own, ...shared],
    };
  }, [leads, isAdmin, loggedInBdmName, effectiveLeaderName, matchedLeaderName, isLeader, currentUser]);

  // BDM's Personal Deal Funnel Value (calculated STRICTLY on own direct leads, excluding team member leads)
  const bdmPersonalFunnel = useMemo(() => {
    if (analytics?.myDirectFunnel !== undefined) return analytics.myDirectFunnel;
    return ownDirectLeads.reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);
  }, [analytics, ownDirectLeads]);

  const bdmHotFunnel = useMemo(() => {
    if (analytics?.myDirectHot !== undefined) return analytics.myDirectHot;
    return ownDirectLeads
      .filter((l) => (l.clientStatus || '').toLowerCase() === 'hot')
      .reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);
  }, [analytics, ownDirectLeads]);

  const bdmWarmFunnel = useMemo(() => {
    if (analytics?.myDirectWarm !== undefined) return analytics.myDirectWarm;
    return ownDirectLeads
      .filter((l) => (l.clientStatus || 'warm').toLowerCase() === 'warm')
      .reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);
  }, [ownDirectLeads]);

  // Hot, Warm and Active Leads counts (Active = Sum of Hot + Warm clients)
  const hotClientsCount = useMemo(() => {
    return isAdmin
      ? (analytics?.byClientStatus?.Hot ?? 0)
      : ownDirectLeads.filter((l) => (l.clientStatus || '').toLowerCase() === 'hot').length;
  }, [isAdmin, analytics, ownDirectLeads]);

  const warmClientsCount = useMemo(() => {
    return isAdmin
      ? (analytics?.byClientStatus?.Warm ?? 0)
      : ownDirectLeads.filter((l) => (l.clientStatus || 'warm').toLowerCase() === 'warm').length;
  }, [isAdmin, analytics, ownDirectLeads]);

  const activeLeadsCount = hotClientsCount + warmClientsCount;

  // Compute team members overview cards (strictly team members under this leader, leader card excluded) - ONLY FOR LEADER
  const teamMembersCards = useMemo(() => {
    // Only Team Leaders can see this section (not admin, not regular members)
    if (!isLeader) return [];

    const leaderKey = (matchedLeaderName || loggedInBdmName || '').toLowerCase().trim();
    const membersMap = {};

    // Group leads belonging to team members under this leader (STRICTLY Lead Sharing leads only)
    const sourceLeads = (leads && leads.length > 0)
      ? leads.filter((l) => {
          const ldr = (l.leaderName || '').toLowerCase().trim();
          const bdm1 = (l.bdmName1 || '').toLowerCase().trim();
          const closerStatus = (l.closerStatus || '').toLowerCase().trim();
          const isUnderLeader = ldr && (ldr.includes(leaderKey) || leaderKey.includes(ldr));
          const isLeaderSelf = bdm1 && (bdm1.includes(leaderKey) || leaderKey.includes(bdm1));
          const isLeadSharing = closerStatus.includes('lead sharing');
          return isUnderLeader && !isLeaderSelf && isLeadSharing;
        })
      : (sharedTeamLeads || []);

    sourceLeads.forEach((lead) => {
      let memberName = (lead.bdmName1 || '').trim();
      if (!memberName || memberName.toLowerCase() === leaderKey || memberName === '-- None (Single BDM) --') {
        memberName = (lead.bdmName2 || '').trim();
      }
      if (!memberName || memberName.toLowerCase() === leaderKey || memberName === '-- None (Single BDM) --') return;

      // Exclude other leaders
      const isOtherLeader = LMS_LEADERS.some((l) => l.toLowerCase().trim() === memberName.toLowerCase().trim());
      if (isOtherLeader) return;

      if (!membersMap[memberName]) {
        membersMap[memberName] = {
          name: memberName,
          leads: [],
        };
      }
      membersMap[memberName].leads.push(lead);
    });

    const cards = Object.values(membersMap).map((member) => {
      const mLeads = member.leads;

      // 1. Active Leads: not CLOSED_WON and not CLOSED_LOST
      const activeLeads = mLeads.filter(
        (l) => l.leadStatus !== 'CLOSED_WON' && l.leadStatus !== 'CLOSED_LOST'
      ).length;

      // 2. Hot
      const hotCount = mLeads.filter(
        (l) => (l.clientStatus || '').toLowerCase() === 'hot'
      ).length;

      // 3. Warm
      const warmCount = mLeads.filter(
        (l) => (l.clientStatus || 'warm').toLowerCase() === 'warm'
      ).length;

      // 4. Lost
      const lostCount = mLeads.filter(
        (l) => (l.clientStatus || '').toLowerCase() === 'lost' || l.leadStatus === 'CLOSED_LOST'
      ).length;

      // 5. Closed (Outcome)
      const closedCount = mLeads.filter(
        (l) => l.leadStatus === 'CLOSED_WON' || (l.clientStatus || '').toLowerCase() === 'closed'
      ).length;

      // 6. Meeting (leads with meeting scheduled, upcoming/recent meeting date & status)
      const meetingLeads = mLeads.filter(
        (l) => l.meetingDate || (l.meetingStatus && l.meetingStatus !== 'None')
      );
      const sortedMeetings = [...meetingLeads].sort((a, b) => {
        const da = a.meetingDate ? new Date(a.meetingDate).getTime() : 0;
        const db = b.meetingDate ? new Date(b.meetingDate).getTime() : 0;
        return db - da;
      });
      const nextMeetingLead = sortedMeetings[0] || null;

      // 7. Last Follow Up: gather all frozen follow-ups from all leads of this member and find the latest
      const allFollowUps = [];
      mLeads.forEach((l) => {
        const fus = getFollowUpsList(l);
        fus.forEach((fu) => {
          allFollowUps.push({
            ...fu,
            companyName: l.companyName,
            leadId: l.id,
          });
        });
      });
      allFollowUps.sort((a, b) => {
        const ta = new Date(a.addedAt || a.date).getTime();
        const tb = new Date(b.addedAt || b.date).getTime();
        return tb - ta;
      });
      const lastFollowUp = allFollowUps[0] || null;

      // 8. EDC (Expected Date of Closer): find the nearest upcoming EDC target among active leads
      const activeLeadsWithEdc = mLeads.filter(
        (l) => l.expectedDateOfCloser && l.leadStatus !== 'CLOSED_WON' && l.leadStatus !== 'CLOSED_LOST'
      );
      activeLeadsWithEdc.sort((a, b) => new Date(a.expectedDateOfCloser) - new Date(b.expectedDateOfCloser));
      const nearestEdcLead = activeLeadsWithEdc[0] || mLeads.find((l) => l.expectedDateOfCloser) || null;

      // Total Deal Funnel value for this member's leads
      const totalFunnel = mLeads.reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);

      return {
        name: member.name,
        isLeaderMember: false,
        isSelf: false,
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

    return cards;
  }, [isLeader, matchedLeaderName, loggedInBdmName, leads, sharedTeamLeads]);

  // Leads actually displayed in the table below (supports filtering to a selected team member, selected month, and pending follow-ups)
  const displayedLeads = useMemo(() => {
    let list = visibleLeads;
    if (selectedTeamMemberFilter && selectedTeamMemberFilter !== 'ALL') {
      list = list.filter(
        (l) => (l.bdmName1 || '').toLowerCase().trim() === selectedTeamMemberFilter.toLowerCase().trim()
      );
    }
    if (selectedMonthFilter === 'NEXT_MONTH') {
      list = list.filter((l) => {
        const badge = getLeadMonthBadge(l);
        return badge?.icon === '🚀';
      });
    } else {
      // Default: THIS_MONTH (Current month leads)
      list = list.filter((l) => {
        const badge = getLeadMonthBadge(l);
        return badge?.icon === '📅';
      });
    }
    if (pendingFollowUpFilter) {
      list = list.filter((l) => isLeadFollowUpExceeded(l));
    }
    return list;
  }, [visibleLeads, selectedTeamMemberFilter, selectedMonthFilter, getLeadMonthBadge, pendingFollowUpFilter]);

  // Count of leads whose follow-up date exceeded the current date
  const calculatedPendingFollowups = useMemo(() => {
    const targetLeads = isAdmin ? visibleLeads : (isLeader ? visibleLeads : ownDirectLeads);
    return targetLeads.filter((l) => isLeadFollowUpExceeded(l)).length;
  }, [isAdmin, isLeader, visibleLeads, ownDirectLeads]);

  const displayPendingFollowupsCount = analytics?.pendingFollowupsCount ?? calculatedPendingFollowups;

  // Memoized BDM Funnel Ranking (for Leaderboard - Leaders first, then members)
  const bdmFunnelList = useMemo(() => {
    const map = {};

    // 1. Initialize from backend analytics.bdmFunnel if available
    if (analytics?.bdmFunnel && Object.keys(analytics.bdmFunnel).length > 0) {
      Object.entries(analytics.bdmFunnel).forEach(([name, data]) => {
        map[name] = { ...data };
      });
    }

    // 2. Also ensure all leads in dataset are aggregated (handles single lead, fresh leads, or missing backend keys)
    const dataset = (leads && leads.length > 0) ? leads : visibleLeads;
    dataset.forEach((l) => {
      const bdm = (l.bdmName1 || '').trim();
      if (!bdm) return;
      const val = parseFloat(l.dealValue) || 0;
      const cs = (l.clientStatus || 'Warm').toLowerCase();

      if (!map[bdm]) {
        map[bdm] = { count: 0, totalValue: 0, hotValue: 0, warmValue: 0, lostValue: 0 };
      }

      // If backend didn't supply or map count is 0, accumulate from lead records
      if (!analytics?.bdmFunnel?.[bdm] || analytics.bdmFunnel[bdm].count === 0) {
        map[bdm].count++;
        map[bdm].totalValue += val;
        if (cs === 'hot') map[bdm].hotValue += val;
        else if (cs === 'warm') map[bdm].warmValue += val;
        else if (cs === 'lost') map[bdm].lostValue += val;
      }
    });

    // 3. Ensure the designated Team Leader is ALWAYS in the leaderboard (even with 0 leads / ₹0 funnel)
    const teamLeader = isLeader
      ? (matchedLeaderName || loggedInBdmName)
      : (effectiveLeaderName || form.leaderName || LMS_LEADERS[0]);

    if (teamLeader) {
      const matchKey = Object.keys(map).find(
        (k) => k.toLowerCase().trim() === teamLeader.toLowerCase().trim()
      );
      if (!matchKey) {
        map[teamLeader] = { count: 0, totalValue: 0, hotValue: 0, warmValue: 0, lostValue: 0 };
      }
    }

    // 4. Also ensure current logged in user is in the map
    if (loggedInBdmName && !Object.keys(map).some((k) => k.toLowerCase().trim() === loggedInBdmName.toLowerCase().trim())) {
      map[loggedInBdmName] = { count: 0, totalValue: 0, hotValue: 0, warmValue: 0, lostValue: 0 };
    }

    let list = Object.entries(map).map(([name, data]) => {
      const cleanName = name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
      const cleanTeamLeader = (teamLeader || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
      const isLeaderRole = LMS_LEADERS.some((l) => {
        const cleanL = l.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
        return cleanName === cleanL || cleanName.includes(cleanL) || cleanL.includes(cleanName);
      }) || (cleanTeamLeader && (cleanName === cleanTeamLeader || cleanName.includes(cleanTeamLeader) || cleanTeamLeader.includes(cleanName)));

      return {
        bdmName: name,
        isLeader: Boolean(isLeaderRole),
        ...data,
      };
    });

    // 5. Filter for BDM / Leader views:
    // - Leader: can see himself and all the team members (first leader then members)
    // - BDM member: should NOT see the leader in leaderboard; can only see other team members and himself
    if (!isAdmin) {
      const cleanLeader = (teamLeader || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
      const cleanSelf = (loggedInBdmName || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();

      if (isLeader) {
        // Leader sees himself and all team members
        list = list.filter((item) => {
          const itemClean = item.bdmName.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
          const isCurrentTeamLeader = cleanLeader && (itemClean === cleanLeader || itemClean.includes(cleanLeader) || cleanLeader.includes(itemClean));
          const isSelf = cleanSelf && (itemClean === cleanSelf || itemClean.includes(cleanSelf) || cleanSelf.includes(itemClean));

          // Exclude any outside leaders
          if (item.isLeader && !isCurrentTeamLeader && !isSelf) {
            return false;
          }

          // Always show leader himself; show team members who have activity or are logged-in
          return isCurrentTeamLeader || isSelf || item.totalValue > 0 || item.count > 0;
        });
      } else {
        // BDM member: strictly exclude any leader; only show other team members and himself
        list = list.filter((item) => {
          if (item.isLeader) {
            return false;
          }
          const itemClean = item.bdmName.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
          const isSelf = cleanSelf && (itemClean === cleanSelf || itemClean.includes(cleanSelf) || cleanSelf.includes(itemClean));
          return isSelf || item.totalValue > 0 || item.count > 0;
        });
      }
    } else {
      // For admin, show all who have activity or are known leaders
      list = list.filter((b) => b.isLeader || b.totalValue > 0 || b.count > 0);
    }

    // Sequence by role ascending: first Leader, then Member (within each group, sorted by totalValue descending)
    list.sort((a, b) => {
      if (a.isLeader && !b.isLeader) return -1;
      if (!a.isLeader && b.isLeader) return 1;
      return (b.totalValue || 0) - (a.totalValue || 0) || (b.count || 0) - (a.count || 0);
    });

    return list;
  }, [analytics, leads, visibleLeads, isAdmin, isLeader, matchedLeaderName, loggedInBdmName, effectiveLeaderName, form.leaderName]);

  // Real-Time BDM Funnel Accumulator for Form Input
  const currentBdmFunnel = useMemo(() => {
    if (!isAdmin) {
      return bdmPersonalFunnel;
    }
    const bdmName = form.bdmName1;
    if (analytics?.bdmFunnel?.[bdmName]) {
      return analytics.bdmFunnel[bdmName].totalValue;
    }
    return 0;
  }, [form.bdmName1, analytics, isAdmin, bdmPersonalFunnel]);

  const enteredDealValue = parseFloat(form.dealValue) || 0;
  const projectedBdmFunnel = currentBdmFunnel + enteredDealValue;

  // Handle File Input Change (PDF & Word only)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const validExtensions = ['.pdf', '.doc', '.docx'];

    if (!validExtensions.includes(ext)) {
      setFileError(`Invalid format "${ext}". Only PDF (.pdf) and Word (.doc, .docx) quotation documents are allowed.`);
      setQuotationFile(null);
      if (quotationInputRef.current) quotationInputRef.current.value = '';
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setFileError('File size exceeds the 50MB limit.');
      setQuotationFile(null);
      if (quotationInputRef.current) quotationInputRef.current.value = '';
      return;
    }

    setFileError(null);
    setQuotationFile(file);
  };

  const handleRemoveFile = () => {
    setQuotationFile(null);
    setFileError(null);
    if (quotationInputRef.current) quotationInputRef.current.value = '';
  };

  // Submit New Lead with Mandatory Quotation File & Client Status (BDM ONLY)
  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setFeedback({ type: 'error', message: 'Company Name is required.' });
      return;
    }
    const cleanPhone = form.mobileNo.trim();
    if (!cleanPhone) {
      setFeedback({ type: 'error', message: 'Mobile Number is required.' });
      return;
    }
    const exact10DigitPhoneRegex = /^[6-9]\d{9}$/;
    if (!exact10DigitPhoneRegex.test(cleanPhone)) {
      setFeedback({
        type: 'error',
        message: 'Invalid phone number. Must be exactly 10 digits without symbols, spaces, or country code (starting with 6-9).',
      });
      return;
    }
    if (!quotationFile) {
      setFeedback({ type: 'error', message: 'Quotation file is mandatory! Please upload a PDF or Word quotation document.' });
      setFileError('Quotation document (PDF or Word) is mandatory.');
      return;
    }

    const currentToday = getTodayDateStr();
    if (form.meetingDate && form.meetingDate < currentToday) {
      setFeedback({
        type: 'error',
        message: 'Meeting date cannot be in the past. Please select today or an upcoming date.',
      });
      return;
    }
    if (form.expectedDateOfCloser && form.expectedDateOfCloser < currentToday) {
      setFeedback({
        type: 'error',
        message: 'Expected Date of Closer (EDC) cannot be in the past. Please select today or an upcoming date.',
      });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const targetBdm = loggedInBdmName || form.bdmName1;

      const targetLeader = isLeader && matchedLeaderName ? matchedLeaderName : form.leaderName;
      const targetCloser = isLeader ? 'Self Closer' : form.closerStatus;

      const formData = new FormData();
      formData.append('companyName', form.companyName.trim());
      formData.append('directorName', form.directorName.trim());
      formData.append('mobileNo', form.mobileNo.trim());
      formData.append('emailId', form.emailId.trim());
      formData.append('leaderName', targetLeader);
      formData.append('bdmName1', targetBdm);
      formData.append('bdmName2', form.bdmName2);
      formData.append('closerStatus', targetCloser);
      formData.append('clientStatus', form.clientStatus || 'Warm');
      formData.append('sourcingStatus', form.sourcingStatus);
      formData.append('meetingStatus', form.meetingStatus);
      formData.append('meetingDate', form.meetingDate || '');
      formData.append('expectedDateOfCloser', form.expectedDateOfCloser);
      formData.append('leadStatus', form.leadStatus);
      formData.append('dealValue', form.dealValue);
      formData.append('remarks', form.remarks.trim());
      formData.append('quotation', quotationFile);

      await api.post('/leads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const addedValueMsg = form.dealValue ? ` with deal value of ₹${Number(form.dealValue).toLocaleString('en-IN')}` : '';
      setFeedback({
        type: 'success',
        message: `Lead for "${form.companyName}" successfully logged into your LMS${addedValueMsg}! Your pipeline deal funnel has been updated.`,
      });

      // Reset form (keep BDM & Leader locked appropriately)
      setForm({
        ...initialFormState,
        leaderName: targetLeader,
        bdmName1: targetBdm,
        closerStatus: targetCloser,
      });
      setQuotationFile(null);
      setFileError(null);
      if (quotationInputRef.current) quotationInputRef.current.value = '';
      fetchLeads();
      window.dispatchEvent(new Event('lms_leads_changed'));
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to create lead.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Download Quotation File
  const handleDownloadQuotation = async (lead) => {
    try {
      setDownloadingId(lead.id);
      const res = await api.get(`/leads/${lead.id}/quotation`, { responseType: 'blob' });
      const isPdf = lead.quotationFileName?.toLowerCase().endsWith('.pdf');
      const blob = new Blob([res.data], {
        type: isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', lead.quotationFileName || `Quotation_${lead.companyName}${isPdf ? '.pdf' : '.docx'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download quotation:', err);
      alert('Failed to download quotation file: ' + (err.response?.data?.error || err.message));
    } finally {
      setDownloadingId(null);
    }
  };

  // Preview Quotation PDF via Secure In-App Viewer Modal
  const handlePreviewQuotation = async (lead) => {
    try {
      setPreviewLoading(true);
      const res = await api.get(`/leads/${lead.id}/quotation?inline=true`, {
        responseType: 'blob',
        headers: { Accept: 'application/pdf, application/json' },
      });

      if (res.data instanceof Blob && res.data.type === 'application/json') {
        const text = await res.data.text();
        const json = JSON.parse(text);
        setPreviewQuotationDoc({
          fileName: json.fileName || lead.quotationFileName,
          url: json.signedUrl,
          leadId: lead.id,
          leadCompany: lead.companyName,
          isBlob: false,
        });
        return;
      }

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const objectUrl = window.URL.createObjectURL(blob);
      setPreviewQuotationDoc({
        fileName: lead.quotationFileName || 'Quotation.pdf',
        url: objectUrl,
        leadId: lead.id,
        leadCompany: lead.companyName,
        isBlob: true,
      });
    } catch (err) {
      console.error('Failed to preview quotation:', err);
      const token = localStorage.getItem('cm_crm_token');
      const fallbackUrl = `/api/leads/${lead.id}/quotation?inline=true&token=${encodeURIComponent(token || '')}`;
      window.open(fallbackUrl, '_blank');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewQuotationDoc?.isBlob && previewQuotationDoc?.url) {
      window.URL.revokeObjectURL(previewQuotationDoc.url);
    }
    setPreviewQuotationDoc(null);
  };

  // Quick Update Lead Fields (Client Status, Meeting Status, EDC, Stage)
  const handleQuickUpdateLead = async (leadId, updates) => {
    try {
      const currentToday = getTodayDateStr();
      if (updates.meetingDate && updates.meetingDate < currentToday) {
        setFeedback({
          type: 'error',
          message: 'Meeting date cannot be in the past. Please select today or an upcoming date.',
        });
        return;
      }
      if (updates.expectedDateOfCloser && updates.expectedDateOfCloser < currentToday) {
        setFeedback({
          type: 'error',
          message: 'Expected Date of Closer (EDC) cannot be in the past. Please select today or an upcoming date.',
        });
        return;
      }
      await api.patch(`/leads/${leadId}`, updates);
      setFeedback({ type: 'success', message: 'Lead updated successfully.' });
      fetchLeads();
      window.dispatchEvent(new Event('lms_leads_changed'));
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to update lead.' });
    }
  };

  // Delete Lead
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${leadId}`);
      setFeedback({ type: 'success', message: 'Lead deleted.' });
      fetchLeads();
      window.dispatchEvent(new Event('lms_leads_changed'));
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to delete lead.' });
    }
  };

  // Format EDC relative status
  const getEdcBadge = (edcString, leadStatus) => {
    if (!edcString) return { label: 'No EDC Set', color: 'bg-slate-100 text-slate-500 border-slate-200' };
    const edc = new Date(edcString);
    const now = new Date();
    const diffDays = Math.ceil((edc - now) / (1000 * 60 * 60 * 24));

    if (leadStatus === 'CLOSED_WON') {
      return { label: 'Closed Won', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (diffDays < 0) {
      return { label: `Overdue by ${Math.abs(diffDays)}d`, color: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' };
    }
    if (diffDays === 0) {
      return { label: 'Due Today', color: 'bg-amber-100 text-amber-800 border-amber-300 font-bold' };
    }
    if (diffDays === 1) {
      return { label: 'Due Tomorrow', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (diffDays <= 7) {
      return { label: `${diffDays} days left`, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    return {
      label: edc.toLocaleDateString('en-IN'),
      color: 'bg-slate-50 text-slate-700 border-slate-200',
    };
  };

  const [exportingCsv, setExportingCsv] = useState(false);

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const params = { limit: 'all' };
      if (!isAdmin) {
        params.scope = 'my';
        params.myBdmName = loggedInBdmName;
        if (matchedLeaderName) params.myLeaderName = matchedLeaderName;
      } else {
        if (selectedBdmFilter !== 'ALL') params.bdmName = selectedBdmFilter;
      }
      if (selectedLeaderFilter !== 'ALL') params.leaderName = selectedLeaderFilter;
      if (selectedCloserFilter !== 'ALL') params.closerStatus = selectedCloserFilter;
      if (selectedClientStatusFilter !== 'ALL') params.clientStatus = selectedClientStatusFilter;
      if (selectedSourcingFilter !== 'ALL') params.sourcingStatus = selectedSourcingFilter;
      if (selectedMeetingFilter !== 'ALL') params.meetingStatus = selectedMeetingFilter;
      if (selectedStageFilter !== 'ALL') params.leadStatus = selectedStageFilter;
      if (selectedTeamMemberFilter && selectedTeamMemberFilter !== 'ALL') params.teamMember = selectedTeamMemberFilter;
      params.monthFilter = selectedMonthFilter || 'THIS_MONTH';
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/leads', { params });
      const exportList = res.data.leads || displayedLeads;
      exportLeadsToCsv(exportList, isAdmin ? 'All_Company_LMS_Leads.csv' : `${loggedInBdmName}_LMS_Leads.csv`);
    } catch (err) {
      console.error('Export CSV error:', err);
      exportLeadsToCsv(displayedLeads, isAdmin ? 'All_Company_LMS_Leads.csv' : `${loggedInBdmName}_LMS_Leads.csv`);
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. TOP HEADER & KPI SUMMARY */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Lead Management System (LMS)</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {isAdmin ? 'Master LMS Control' : isLeader ? `${loggedInBdmName}'s Leader Workspace` : `${loggedInBdmName}'s Workspace`}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end flex-wrap">
          {/* Deal Funnel Leaderboard Toggle (For Admin & BDM) */}
          <button
            onClick={() => setShowBdmLeaderboard(!showBdmLeaderboard)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
              showBdmLeaderboard
                ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{showBdmLeaderboard ? 'Hide BDM Funnels' : 'BDM Funnel Breakdown'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={pagination.total === 0 || exportingCsv}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportingCsv ? 'Exporting...' : `Export CSV (${pagination.total || displayedLeads.length})`}</span>
          </button>

          {/* LOG NEW LEAD BUTTON (BDM ONLY - REMOVED FOR ADMIN) */}
          {!isAdmin && (
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isFormOpen ? 'Hide Lead Form' : 'Log New Lead'}</span>
              {isFormOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{typeof feedback.message === 'object' ? feedback.message?.message || JSON.stringify(feedback.message) : String(feedback.message || '')}</span>
          <button onClick={() => setFeedback(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* 2. ANALYTICS KPI TILES (HERO FUNNEL VALUE CARD + STATUS COUNTERS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* HERO TILE: TOTAL DEAL FUNNEL VALUE */}
        <div className="col-span-2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-xl border border-indigo-700/40 text-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              Funnel Value
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                {activeLeadsCount} Leads
              </span>
              {!isAdmin && sharedTeamLeads.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30" title="Team member leads shared with you for collaboration">
                  +{sharedTeamLeads.length} Team
                </span>
              )}
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-1.5 tracking-tight">
            ₹{Number(isAdmin ? (analytics?.totalEstimatedValue || 0) : bdmPersonalFunnel).toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-slate-300 mt-2 pt-2 border-t border-white/10 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="text-rose-400 font-bold">🔥 Hot:</span>
              <span className="text-white font-semibold">
                ₹{Number(isAdmin ? (analytics?.hotFunnelValue || 0) : bdmHotFunnel).toLocaleString('en-IN')}
              </span>
            </span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1">
              <span className="text-amber-400 font-bold">☀️ Warm:</span>
              <span className="text-white font-semibold">
                ₹{Number(isAdmin ? (analytics?.warmFunnelValue || 0) : bdmWarmFunnel).toLocaleString('en-IN')}
              </span>
            </span>
          </div>
        </div>

        {/* Active Leads (Sum of Hot + Warm Clients) */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Active Leads
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">
            {activeLeadsCount}
          </div>
        </div>

        {/* Hot Clients */}
        <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <span>🔥</span> Hot Clients
          </span>
          <div className="text-xl font-extrabold text-rose-700 mt-0.5">
            {hotClientsCount}
          </div>
          <div className="text-[11px] text-rose-600 mt-1 font-semibold truncate">
            Val: ₹{Number(isAdmin ? (analytics?.hotFunnelValue || 0) : bdmHotFunnel).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Warm Clients */}
        <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <span>☀️</span> Warm Clients
          </span>
          <div className="text-xl font-extrabold text-amber-700 mt-0.5">
            {warmClientsCount}
          </div>
          <div className="text-[11px] text-amber-600 mt-1 font-semibold truncate">
            Val: ₹{Number(isAdmin ? (analytics?.warmFunnelValue || 0) : bdmWarmFunnel).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Lost Clients */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
            <span>❄️</span> Lost Clients
          </span>
          <div className="text-xl font-extrabold text-slate-700 mt-0.5">
            {isAdmin
              ? (analytics?.byClientStatus?.Lost ?? 0)
              : ownDirectLeads.filter((l) => (l.clientStatus || '').toLowerCase() === 'lost').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Dropped
          </div>
        </div>

        {/* Meetings Scheduled */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Meetings Scheduled
          </span>
          <div className="text-xl font-extrabold text-blue-600 mt-0.5">
            {isAdmin
              ? ((analytics?.byMeetingStatus?.['Google/Team Meet'] || 0) +
                 (analytics?.byMeetingStatus?.['Conference Call'] || 0) +
                 (analytics?.byMeetingStatus?.['Physical Meeting'] || 0))
              : ownDirectLeads.filter((l) =>
                  ['Google/Team Meet', 'Conference Call', 'Physical Meeting'].includes(l.meetingStatus)
                ).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Physical / Meets
          </div>
        </div>

        {/* Pending Follow-ups */}
        <div
          onClick={() => setPendingFollowUpFilter((prev) => !prev)}
          className={`p-3.5 rounded-xl border shadow-xs transition cursor-pointer ${
            pendingFollowUpFilter
              ? 'bg-rose-100/80 border-rose-400 ring-2 ring-rose-400'
              : 'bg-white hover:bg-rose-50/50 border-slate-200 hover:border-rose-300'
          }`}
          title="Click to view leads whose follow-up date exceeded current date"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
              Pending Follow-ups
            </span>
            {pendingFollowUpFilter && (
              <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-extrabold">Active</span>
            )}
          </div>
          <div className="text-xl font-extrabold text-red-600 mt-0.5">
            {displayPendingFollowupsCount}
          </div>
          <div className="text-[11px] text-rose-600/80 mt-1">
            Follow-up Exceeded
          </div>
        </div>
      </div>

      {/* 2B. BDM FUNNEL LEADERBOARD (Collapsible breakdown for Admin & BDM) */}
      {showBdmLeaderboard && (
        <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                BDM Deal Funnel Leaderboard & Pipeline Value Distribution
              </h3>
              <p className="text-xs text-slate-500">
                Track each BDM's total prospective pipeline value, hot deal volume, and lead conversion capacity
              </p>
            </div>
            <span className="text-xs font-extrabold text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">
              {isAdmin ? 'Total Funnel: ' : 'My Direct Funnel: '}₹{Number(isAdmin ? (analytics?.totalEstimatedValue || 0) : bdmPersonalFunnel).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Rank & BDM Name</th>
                  <th className="py-2.5 px-3 text-center">Total Leads</th>
                  <th className="py-2.5 px-3 text-right">Total Deal Funnel (₹)</th>
                  <th className="py-2.5 px-3 text-right">🔥 Hot Funnel (₹)</th>
                  <th className="py-2.5 px-3 text-right">☀️ Warm Funnel (₹)</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {bdmFunnelList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                      No BDM lead funnel values recorded yet. Values accumulate automatically as BDMs log leads with deal value.
                    </td>
                  </tr>
                ) : (
                  bdmFunnelList.map((item, idx) => (
                    <tr key={item.bdmName} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-extrabold">
                          #{idx + 1}
                        </span>
                        <span>{item.bdmName}</span>
                        {item.isLeader ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                            Leader
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            Member
                          </span>
                        )}
                        {item.bdmName === loggedInBdmName && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                        {item.count}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-indigo-900 text-sm">
                        ₹{Number(item.totalValue).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                        ₹{Number(item.hotValue).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-amber-700">
                        ₹{Number(item.warmValue).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isAdmin ? (
                          <button
                            onClick={() => {
                              setSelectedBdmFilter(item.bdmName);
                              setShowBdmLeaderboard(false);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-900 hover:text-white rounded text-[11px] font-semibold transition"
                          >
                            Filter Leads
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {item.bdmName === loggedInBdmName ? 'Your Rank' : 'Active'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. LEAD CAPTURE FORM (BDM ONLY - COMPLETELY REMOVED FOR ADMIN) */}
      {!isAdmin && isFormOpen && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Log New Prospective Client (LMS Entry)
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-[11px] text-slate-600 flex items-center gap-1 font-semibold">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                BDM: <strong className="text-indigo-900">{loggedInBdmName}</strong>
              </span>
              <span className="text-[11px] text-slate-400">|</span>
              <span className="text-[11px] text-slate-500">All fields with * are mandatory</span>
            </div>
          </div>

          <form onSubmit={handleCreateLead} className="p-5 space-y-4">
            {/* Row 1: Company Name, Director Name, Mobile, Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="e.g. Acme Innovations Pvt Ltd"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Director Name
                </label>
                <div className="relative">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={form.directorName}
                    onChange={(e) => setForm({ ...form, directorName: e.target.value })}
                    placeholder="e.g. Rajesh Kumar Sharma"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Mobile No <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={form.mobileNo}
                    onChange={(e) => setForm({ ...form, mobileNo: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="9876543210 (10 digits)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email ID
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={form.emailId}
                    onChange={(e) => setForm({ ...form, emailId: e.target.value })}
                    placeholder="contact@acme.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Leader's Name, BDM-I (Locked to current BDM), BDM-II, Closer Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Leader's Name <span className="text-rose-500">*</span>
                </label>
                {isLeader ? (
                  <div className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      {matchedLeaderName || form.leaderName}
                    </span>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                      Leader (You)
                    </span>
                  </div>
                ) : (
                  <select
                    required
                    value={form.leaderName}
                    onChange={(e) => setForm({ ...form, leaderName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-slate-800 focus:outline-none"
                  >
                    {LMS_LEADERS.map((ldr) => (
                      <option key={ldr} value={ldr}>{ldr}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* BDM-I: LOCKED TO CURRENT LOGGED-IN BDM */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  BDM's Name - I (Primary BDM) <span className="text-rose-500">*</span>
                </label>
                <div className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    {loggedInBdmName}
                  </span>
                  <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                    You
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  BDM's Name - II (Secondary / Co-BDM)
                </label>
                <select
                  value={form.bdmName2}
                  onChange={(e) => setForm({ ...form, bdmName2: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-slate-800 focus:outline-none"
                >
                  <option value="">-- None (Single BDM) --</option>
                  {LMS_BDMS.filter((b) => b !== loggedInBdmName && (isLeader || !LMS_LEADERS.some((l) => l.toLowerCase() === b.toLowerCase()))).map((bdm) => (
                    <option key={bdm} value={bdm}>{bdm}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Closer Status <span className="text-rose-500">*</span>
                </label>
                {isLeader ? (
                  <div className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                      Self Closer
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      Self
                    </span>
                  </div>
                ) : (
                  <select
                    required
                    value={form.closerStatus}
                    onChange={(e) => setForm({ ...form, closerStatus: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-slate-800 focus:outline-none"
                  >
                    {LMS_CLOSER_STATUSES.map((cs) => (
                      <option key={cs} value={cs}>{cs}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Row 3: Client Status (Hot, Warm, Lost), Sourcing Status, Meeting Status, Meeting Date, EDC Date, Estimated Value + Funnel Accumulator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
              {/* Client Status Selector (Hot / Warm / Lost) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Client Status <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-lg border border-slate-300">
                  {LMS_CLIENT_STATUSES.map((cs) => {
                    const active = (form.clientStatus || 'Warm') === cs.id;
                    return (
                      <button
                        key={cs.id}
                        type="button"
                        onClick={() => setForm({ ...form, clientStatus: cs.id })}
                        className={`py-1.5 px-1 rounded-md text-xs font-bold transition flex items-center justify-center gap-1 ${
                          active
                            ? cs.id === 'Hot'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : cs.id === 'Warm'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-700 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        }`}
                        title={cs.description}
                      >
                        <span>{cs.iconText}</span>
                        <span>{cs.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Sourcing Status <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={form.sourcingStatus}
                  onChange={(e) => setForm({ ...form, sourcingStatus: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-slate-800 focus:outline-none"
                >
                  {LMS_SOURCING_STATUSES.map((src) => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Meeting Status <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={form.meetingStatus}
                  onChange={(e) => setForm({ ...form, meetingStatus: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-slate-800 focus:outline-none"
                >
                  {LMS_MEETING_STATUSES.map((ms) => (
                    <option key={ms} value={ms}>{ms}</option>
                  ))}
                </select>
              </div>

              {/* MEETING DATE (NEW FIELD) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Meeting Date
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    min={getTodayDateStr()}
                    value={form.meetingDate}
                    onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Expected Date of Closer (EDC)
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    min={getTodayDateStr()}
                    value={form.expectedDateOfCloser}
                    onChange={(e) => setForm({ ...form, expectedDateOfCloser: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* ESTIMATED DEAL VALUE (₹) WITH REAL-TIME FUNNEL IMPACT ACCUMULATOR */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Estimated Deal Value (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={form.dealValue}
                    onChange={(e) => setForm({ ...form, dealValue: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none font-mono"
                  />
                </div>

                {/* Real-Time BDM Funnel Accumulator Indicator */}
                <div className="mt-1.5 p-2 bg-indigo-50/80 border border-indigo-200 rounded-lg text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-indigo-950 font-medium">
                    <span className="truncate max-w-[120px] text-[10px] uppercase font-bold text-indigo-700">
                      Your Funnel:
                    </span>
                    <strong className="font-extrabold text-slate-900">
                      ₹{Number(currentBdmFunnel).toLocaleString('en-IN')}
                    </strong>
                  </div>

                  {enteredDealValue > 0 ? (
                    <div className="pt-1 border-t border-indigo-200 flex items-center justify-between gap-1">
                      <span className="text-emerald-700 font-semibold text-[10px]">
                        +₹{Number(enteredDealValue).toLocaleString('en-IN')}
                      </span>
                      <span className="font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                        ➔ Funnel: ₹{Number(projectedBdmFunnel).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 italic">
                      Type deal amount to preview updated funnel
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 4: MANDATORY QUOTATION FILE UPLOAD FIELD */}
            <div className="bg-slate-50/70 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-4 transition">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="p-1 rounded bg-indigo-100 text-indigo-700">
                    <FileText className="w-4 h-4" />
                  </span>
                  <label className="text-xs font-bold text-slate-900">
                    Quotation Document <span className="text-rose-500 font-extrabold">* (Mandatory)</span>
                  </label>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                    Accepted: PDF (.pdf) or Word (.doc, .docx)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Max file size: 50MB</span>
              </div>

              <input
                ref={quotationInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="lms-quotation-upload"
              />

              {!quotationFile ? (
                <div
                  onClick={() => quotationInputRef.current?.click()}
                  className="cursor-pointer bg-white border border-slate-200 hover:border-indigo-300 rounded-lg p-4 text-center transition group shadow-2xs"
                >
                  <UploadCloud className="w-8 h-8 text-indigo-400 group-hover:text-indigo-600 mx-auto mb-1.5 transition" />
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drop quotation document here <span className="text-rose-500">*</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select customer quotation in PDF format (<span className="font-semibold text-rose-600">.pdf</span>) or Microsoft Word format (<span className="font-semibold text-blue-600">.doc, .docx</span>)
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className={`p-2.5 rounded-lg border ${
                      quotationFile.name.toLowerCase().endsWith('.pdf')
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-blue-50 text-blue-600 border-blue-200'
                    }`}>
                      <FileText className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="truncate max-w-xs">{quotationFile.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          quotationFile.name.toLowerCase().endsWith('.pdf')
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {quotationFile.name.split('.').pop()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {(quotationFile.size / 1024).toFixed(1)} KB • Ready for submission
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => quotationInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {fileError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-2 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}
            </div>

            {/* Row 5: Remarks & Submit Button */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3.5 pt-1">
              <div className="lg:col-span-3">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Discussion Remarks & Next Steps
                </label>
                <input
                  type="text"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Key discussion points, pitch deck required, GST/ROC consultation needed..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Saving Lead...' : 'Submit Lead into LMS'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 4. FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company, director, phone, email, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
            />
          </form>

          {/* Client Status Filter (Hot / Warm / Lost) */}
          <select
            value={selectedClientStatusFilter}
            onChange={(e) => setSelectedClientStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">All Client Statuses</option>
            <option value="Hot">🔥 Hot Clients</option>
            <option value="Warm">☀️ Warm Clients</option>
            <option value="Lost">❄️ Lost Clients</option>
          </select>

          {/* Leader Filter */}
          <select
            value={selectedLeaderFilter}
            onChange={(e) => setSelectedLeaderFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">All Leaders</option>
            {LMS_LEADERS.map((ldr) => (
              <option key={ldr} value={ldr}>{ldr}</option>
            ))}
          </select>

          {/* BDM Filter (ADMIN ONLY) */}
          {isAdmin && (
            <select
              value={selectedBdmFilter}
              onChange={(e) => setSelectedBdmFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">All BDMs</option>
              {LMS_BDMS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}

          {/* Sourcing Filter */}
          <select
            value={selectedSourcingFilter}
            onChange={(e) => setSelectedSourcingFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">All Sources</option>
            {LMS_SOURCING_STATUSES.map((src) => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>

          {/* Meeting Status Filter */}
          <select
            value={selectedMeetingFilter}
            onChange={(e) => setSelectedMeetingFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">All Meetings</option>
            {LMS_MEETING_STATUSES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Closer Status Filter */}
          <select
            value={selectedCloserFilter}
            onChange={(e) => setSelectedCloserFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">All Closers</option>
            {LMS_CLOSER_STATUSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Stage Filter */}
          <select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">All Stages</option>
            {LMS_LEAD_STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchLeads}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-xs whitespace-nowrap self-end lg:self-auto"
        >
          Apply Filters
        </button>
      </div>

      {/* Active Pending Follow-ups Filter Alert Pill */}
      {pendingFollowUpFilter && (
        <div className="flex items-center justify-between bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-800 shadow-2xs">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Filter Active: Showing {displayedLeads.length} lead{displayedLeads.length === 1 ? '' : 's'} whose follow-up date exceeded the current date.</span>
          </span>
          <button
            onClick={() => setPendingFollowUpFilter(false)}
            className="text-rose-700 hover:text-rose-950 font-bold underline cursor-pointer text-xs ml-2"
          >
            Clear Filter (Show All)
          </button>
        </div>
      )}

      {/* 4B. TEAM MEMBERS PIPELINE & PERFORMANCE CARDS - STRICTLY FOR TEAM LEADERS ONLY */}
      {isLeader && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Team Members Pipeline Overview
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {teamMembersCards.length} Team {teamMembersCards.length === 1 ? 'Member' : 'Members'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time tracking of active leads, client status distribution, upcoming meetings, last follow-ups, and EDC targets for your team members
              </p>
            </div>

            {selectedTeamMemberFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedTeamMemberFilter('ALL')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <span>Clear Team Filter</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {teamMembersCards.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500">
              <Users className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">No team member leads recorded yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Your team members pipeline cards, follow-ups, and leads will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {teamMembersCards.map((member) => {
                const isSelected = selectedTeamMemberFilter.toLowerCase() === member.name.toLowerCase();
                const memberInitials = member.name
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const edcBadge = member.nearestEdcLead
                  ? getEdcBadge(member.nearestEdcLead.expectedDateOfCloser, member.nearestEdcLead.leadStatus)
                  : null;

                return (
                  <div
                    key={member.name}
                    className={`bg-white border rounded-xl p-4 transition shadow-xs flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/15'
                        : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Member Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {memberInitials}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 leading-tight">
                              {member.name}
                            </h4>
                            <span className="text-[10px] text-slate-400 block font-medium">
                              {member.isSelf
                                ? 'Team Member (You)'
                                : 'BDM Team Member'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-mono font-bold text-indigo-900 block">
                            ₹{Number(member.totalFunnel).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase font-semibold">
                            Funnel Value
                          </span>
                        </div>
                      </div>

                      {/* Status Badges Row: Active Leads, Hot, Warm, Lost, Closed(outcome) */}
                      <div className="grid grid-cols-5 gap-1.5 mt-3 text-center">
                        {/* 1. Active Leads */}
                        <div className="bg-slate-50 border border-slate-200/90 rounded p-1.5">
                          <span className="text-[9px] text-slate-500 uppercase font-bold block truncate" title="Active Leads in pipeline">
                            Active
                          </span>
                          <span className="text-xs font-extrabold text-slate-800">
                            {member.activeLeads}
                          </span>
                        </div>

                        {/* 2. Hot */}
                        <div className="bg-rose-50 border border-rose-200/90 rounded p-1.5">
                          <span className="text-[9px] text-rose-700 uppercase font-bold block truncate">
                            🔥 Hot
                          </span>
                          <span className="text-xs font-extrabold text-rose-700">
                            {member.hotCount}
                          </span>
                        </div>

                        {/* 3. Warm */}
                        <div className="bg-amber-50 border border-amber-200/90 rounded p-1.5">
                          <span className="text-[9px] text-amber-800 uppercase font-bold block truncate">
                            ☀️ Warm
                          </span>
                          <span className="text-xs font-extrabold text-amber-800">
                            {member.warmCount}
                          </span>
                        </div>

                        {/* 4. Lost */}
                        <div className="bg-slate-100 border border-slate-200 rounded p-1.5">
                          <span className="text-[9px] text-slate-600 uppercase font-bold block truncate">
                            ❄️ Lost
                          </span>
                          <span className="text-xs font-extrabold text-slate-700">
                            {member.lostCount}
                          </span>
                        </div>

                        {/* 5. Closed (Outcome) */}
                        <div className="bg-emerald-50 border border-emerald-200/90 rounded p-1.5">
                          <span className="text-[9px] text-emerald-800 uppercase font-bold block truncate" title="Closed Won outcome">
                            🏆 Closed
                          </span>
                          <span className="text-xs font-extrabold text-emerald-800">
                            {member.closedCount}
                          </span>
                        </div>
                      </div>

                      {/* Detail Metrics: Meeting, Last Follow-up, EDC */}
                      <div className="mt-3 space-y-2 text-xs border-t border-slate-100 pt-2.5">
                        {/* 6. Meeting */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 shrink-0 mt-0.5">
                            <Calendar className="w-3 h-3 text-indigo-500" /> Meeting:
                          </span>
                          <div className="text-right">
                            {member.nextMeetingLead ? (
                              <div className="leading-snug">
                                <span className="font-semibold text-slate-800 text-[11px]">
                                  {member.nextMeetingLead.meetingDate
                                    ? new Date(member.nextMeetingLead.meetingDate).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })
                                    : 'Scheduled'}
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate max-w-[170px]" title={`${member.nextMeetingLead.meetingStatus} (${member.nextMeetingLead.companyName})`}>
                                  {member.nextMeetingLead.meetingStatus} ({member.nextMeetingLead.companyName})
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">None scheduled</span>
                            )}
                          </div>
                        </div>

                        {/* 7. Last Follow Up */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 shrink-0 mt-0.5">
                            <Clock className="w-3 h-3 text-indigo-500" /> Last Follow-up:
                          </span>
                          <div className="text-right">
                            {member.lastFollowUp ? (
                              <div className="leading-snug">
                                <div className="flex items-center justify-end gap-1 font-mono text-[11px]">
                                  <span className="font-semibold text-slate-800">
                                    {new Date(member.lastFollowUp.date).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">[Freeze]</span>
                                  <span
                                    className={`px-1 py-0.2 rounded text-[9px] font-extrabold border ${
                                      member.lastFollowUp.status === 'Hot'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : member.lastFollowUp.status === 'Warm'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : member.lastFollowUp.status === 'Closed'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-300'
                                    }`}
                                  >
                                    {member.lastFollowUp.status}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 block truncate max-w-[170px]" title={member.lastFollowUp.companyName}>
                                  For: {member.lastFollowUp.companyName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No follow-ups yet</span>
                            )}
                          </div>
                        </div>

                        {/* 8. EDC (Expected Date of Closer) */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 shrink-0 mt-0.5">
                            <Clock className="w-3 h-3 text-purple-500" /> EDC Target:
                          </span>
                          <div className="text-right">
                            {member.nearestEdcLead?.expectedDateOfCloser ? (
                              <div className="leading-snug">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="font-semibold text-slate-800 text-[11px]">
                                    {new Date(member.nearestEdcLead.expectedDateOfCloser).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                  {edcBadge && (
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${edcBadge.color}`}>
                                      {edcBadge.label}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 block truncate max-w-[170px]" title={member.nearestEdcLead.companyName}>
                                  For: {member.nearestEdcLead.companyName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Not set</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedTeamMemberFilter === member.name) {
                          setSelectedTeamMemberFilter('ALL');
                        } else {
                          setSelectedTeamMemberFilter(member.name);
                        }
                      }}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Showing {member.name}'s Leads (Click to Reset)</span>
                        </>
                      ) : (
                        <>
                          <Filter className="w-3.5 h-3.5" />
                          <span>Filter Table to {member.name}'s Leads ({member.totalLeads})</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. LEADS DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* LEADS LIST MONTH & TIMELINE FILTER TABS */}
        <div className="bg-white border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Leads Month:</span>
            </span>

            {/* This Month Tab (Default Active) */}
            <button
              type="button"
              onClick={() => { setSelectedMonthFilter('THIS_MONTH'); setPage(1); fetchLeads(1, limit, 'THIS_MONTH'); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                selectedMonthFilter === 'THIS_MONTH'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
            >
              <span>📅 This Month ({monthLabels.thisMonth})</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                selectedMonthFilter === 'THIS_MONTH' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {isAdmin ? (analytics?.thisMonthCount ?? 0) : (analytics?.myThisMonthCount ?? 0)}
              </span>
              <span className="text-[10px] opacity-80 font-medium">
                (₹{Number(isAdmin ? (analytics?.thisMonthFunnel || 0) : (analytics?.myThisMonthFunnel || 0)).toLocaleString('en-IN')})
              </span>
            </button>

            {/* Next Month Tab */}
            <button
              type="button"
              onClick={() => { setSelectedMonthFilter('NEXT_MONTH'); setPage(1); fetchLeads(1, limit, 'NEXT_MONTH'); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                selectedMonthFilter === 'NEXT_MONTH'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50/60 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>🚀 Next Month ({monthLabels.nextMonth})</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                selectedMonthFilter === 'NEXT_MONTH' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {isAdmin ? (analytics?.nextMonthCount ?? 0) : (analytics?.myNextMonthCount ?? 0)}
              </span>
              <span className="text-[10px] opacity-80 font-medium">
                (₹{Number(isAdmin ? (analytics?.nextMonthFunnel || 0) : (analytics?.myNextMonthFunnel || 0)).toLocaleString('en-IN')})
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isAdmin && (
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                {isLeader ? `BDM Leader: ${loggedInBdmName}` : `BDM: ${loggedInBdmName}`}
              </span>
            )}
          </div>
        </div>

        {/* Table Scope Indicator Header */}
        <div className="bg-slate-50/60 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              {selectedMonthFilter === 'NEXT_MONTH'
                ? `🚀 Showing Next Month (${monthLabels.nextMonth}) leads (${displayedLeads.length} leads in view, ${pagination.total} total)`
                : `📅 Showing This Month (${monthLabels.thisMonth}) leads (${displayedLeads.length} leads in view, ${pagination.total} total)`}
            </span>
            {selectedTeamMemberFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedTeamMemberFilter('ALL')}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded cursor-pointer transition"
                title="Reset to all leads"
              >
                <span>Filtered: {selectedTeamMemberFilter}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2 px-2.5">Company</th>
                <th className="py-2 px-1.5">Mobile</th>
                <th className="py-2 px-1.5">BDM</th>
                <th className="py-2 px-1.5">Client Status</th>
                <th className="py-2 px-1.5">Meeting Status</th>
                <th className="py-2 px-1.5">Deal Value</th>
                <th className="py-2 px-1.5 text-center">Quotation</th>
                <th className="py-2 px-1.5">Stage</th>
                <th className="py-2 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    Loading LMS lead records...
                  </td>
                </tr>
              ) : displayedLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    {isAdmin
                      ? 'No leads found matching current criteria.'
                      : selectedTeamMemberFilter !== 'ALL'
                      ? `No leads found for team member "${selectedTeamMemberFilter}".`
                      : isLeader
                      ? 'No personal or shared leads found. Shared leads from team members and your personal leads will appear here.'
                      : 'You have not logged any prospective leads yet. Click "Log New Lead" above to record your first prospective client!'}
                  </td>
                </tr>
              ) : (
                displayedLeads.map((lead) => {
                  const isExpanded = expandedLeadIds.has(lead.id);
                  const edcBadge = getEdcBadge(lead.expectedDateOfCloser, lead.leadStatus);
                  const currentStageMeta = LMS_LEAD_STAGES.find((s) => s.id === (lead.leadStatus || 'OPEN')) || LMS_LEAD_STAGES[0];
                  const isPdf = lead.quotationFileName?.toLowerCase().endsWith('.pdf');
                  const currentClientStatus = lead.clientStatus || 'Warm';
                  const leadFollowUps = getFollowUpsList(lead);
                  const leadMonthBadge = getLeadMonthBadge(lead);

                  return (
                    <React.Fragment key={lead.id}>
                      {/* MAIN COMPACT ROW */}
                      <tr
                        id={`lead-row-${lead.id}`}
                        className={`hover:bg-slate-50/80 transition ${
                          isExpanded ? 'bg-indigo-50/30 font-semibold' : ''
                        } ${highlightLeadId === lead.id ? 'ring-2 ring-indigo-500 bg-indigo-50/60' : ''}`}
                      >
                        {/* Company Name with Expand/Collapse Trigger */}
                        <td className="py-2 px-2.5">
                          <button
                            type="button"
                            onClick={() => toggleLeadExpand(lead.id)}
                            className="flex items-center gap-1.5 text-left group focus:outline-none max-w-full"
                            title={isExpanded ? 'Click to hide details' : 'Click to view more information'}
                          >
                            <span
                              className={`p-0.5 rounded transition shrink-0 ${
                                isExpanded
                                  ? 'bg-indigo-100 text-indigo-700 rotate-90'
                                  : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                              }`}
                            >
                              <ChevronRight className="w-3.5 h-3.5 transition-transform duration-150" />
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 group-hover:text-indigo-600 text-xs leading-snug block truncate" title={lead.companyName}>
                                {lead.companyName}
                              </span>
                              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                {lead.directorName && (
                                  <span className="text-[10px] text-slate-500 block truncate" title={lead.directorName}>
                                    {lead.directorName}
                                  </span>
                                )}
                                {leadMonthBadge?.icon === '🚀' && (
                                  <span
                                    className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300"
                                    title={`Pipeline scheduled for next month (${monthLabels.nextMonth})`}
                                  >
                                    🚀 Next Month
                                  </span>
                                )}
                                {isLeadFollowUpExceeded(lead) && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200"
                                    title={`Follow-up date exceeded: ${getLeadLatestFollowUp(lead)?.date || ''}`}
                                  >
                                    <Clock className="w-2.5 h-2.5 text-rose-600" />
                                    <span>Pending Follow-up ({getLeadLatestFollowUp(lead)?.date ? new Date(getLeadLatestFollowUp(lead).date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Overdue'})</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        </td>

                        {/* Mobile No */}
                        <td className="py-2 px-1.5 whitespace-nowrap">
                          <a
                            href={`tel:${lead.mobileNo}`}
                            className="font-mono text-slate-800 font-semibold text-[11px] hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span>{lead.mobileNo}</span>
                          </a>
                        </td>

                        {/* BDM */}
                        <td className="py-2 px-1.5">
                          <div className="text-xs font-semibold text-slate-800 truncate" title={lead.bdmName1}>
                            {lead.bdmName1}
                          </div>
                          {lead.closerStatus === 'Lead Sharing' ? (
                            <span
                              className="inline-block text-[9px] font-bold px-1 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded mt-0.5"
                              title={`Shared with Leader: ${lead.leaderName}`}
                            >
                              🤝 Shared
                            </span>
                          ) : lead.bdmName2 ? (
                            <div className="text-[10px] text-slate-400 truncate">+ {lead.bdmName2}</div>
                          ) : null}
                        </td>

                        {/* Client Status (Hot, Warm, Lost) */}
                        <td className="py-2 px-1.5">
                          <select
                            value={currentClientStatus}
                            onChange={(e) => handleQuickUpdateLead(lead.id, { clientStatus: e.target.value })}
                            className={`text-[11px] font-bold rounded px-1.5 py-0.5 border transition focus:outline-none cursor-pointer w-full max-w-[80px] ${
                              currentClientStatus === 'Hot'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                : currentClientStatus === 'Lost'
                                ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            <option value="Hot">🔥 Hot</option>
                            <option value="Warm">☀️ Warm</option>
                            <option value="Lost">❄️ Lost</option>
                          </select>
                        </td>

                        {/* Meeting Status */}
                        <td className="py-2 px-1.5">
                          <select
                            value={lead.meetingStatus || LMS_MEETING_STATUSES[0]}
                            onChange={(e) => handleQuickUpdateLead(lead.id, { meetingStatus: e.target.value })}
                            className="text-[11px] font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none transition cursor-pointer w-full max-w-[115px] truncate"
                          >
                            {LMS_MEETING_STATUSES.map((ms) => (
                              <option key={ms} value={ms}>{ms}</option>
                            ))}
                          </select>
                          {lead.meetingDate && (
                            <span
                              className="text-[9px] text-slate-500 font-medium block mt-0.5 truncate"
                              title={`Meeting on ${new Date(lead.meetingDate).toLocaleDateString('en-IN')}`}
                            >
                              📅 {new Date(lead.meetingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                          {lead.nextFollowUpDate && (
                            <span
                              className={`text-[9px] font-bold block mt-0.5 truncate ${
                                leadMonthBadge?.icon === '🚀' ? 'text-emerald-700 font-extrabold' : 'text-indigo-600'
                              }`}
                              title={`Next Follow-up on ${new Date(lead.nextFollowUpDate).toLocaleDateString('en-IN')}`}
                            >
                              🔔 Follow-up: {new Date(lead.nextFollowUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </td>

                        {/* Deal Value */}
                        <td className="py-2 px-1.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {lead.dealValue ? `₹${Number(lead.dealValue).toLocaleString('en-IN')}` : <span className="text-slate-400 font-normal italic text-[11px]">No val</span>}
                          </span>
                        </td>

                        {/* Quotation Document */}
                        <td className="py-2 px-1.5 text-center whitespace-nowrap">
                          {lead.quotationFileName ? (
                            <div className="inline-flex items-center gap-1 justify-center">
                              <span className={`text-[9px] font-extrabold uppercase px-1 py-0.2 rounded border ${
                                isPdf
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {lead.quotationFileName.split('.').pop()}
                              </span>
                              <button
                                onClick={() => handleDownloadQuotation(lead)}
                                disabled={downloadingId === lead.id}
                                title={`Download ${lead.quotationFileName}`}
                                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              {isPdf && (
                                <button
                                  onClick={() => handlePreviewQuotation(lead)}
                                  title="Open PDF Preview"
                                  className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">None</span>
                          )}
                        </td>

                        {/* Pipeline Stage */}
                        <td className="py-2 px-1.5">
                          <select
                            value={lead.leadStatus || 'OPEN'}
                            onChange={(e) => handleQuickUpdateLead(lead.id, { leadStatus: e.target.value })}
                            className={`text-[11px] font-semibold rounded px-1.5 py-0.5 border focus:outline-none transition cursor-pointer w-full max-w-[110px] truncate ${currentStageMeta.color}`}
                          >
                            {LMS_LEAD_STAGES.map((stg) => (
                              <option key={stg.id} value={stg.id}>{stg.label}</option>
                            ))}
                          </select>
                        </td>

                        {/* Action */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Convert to Deal Button */}
                            <button
                              onClick={() => {
                                if (onConvertToDeal) {
                                  onConvertToDeal({
                                    companyName: lead.companyName,
                                    clientName: lead.directorName || lead.companyName,
                                    clientPhone: lead.mobileNo,
                                    clientEmail: lead.emailId || '',
                                    remarks: `Converted from LMS (Client Status: ${lead.clientStatus || 'Warm'}, Funnel Value: ₹${lead.dealValue || 0}, Leader: ${lead.leaderName}, Source: ${lead.sourcingStatus}). Quotation: ${lead.quotationFileName || 'None'}. ${lead.remarks || ''}`,
                                  });
                                }
                              }}
                              title="Convert Lead into Active Deal"
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition shadow-xs flex items-center gap-0.5 cursor-pointer"
                            >
                              <ArrowRight className="w-2.5 h-2.5" />
                              <span>Deal</span>
                            </button>

                            {/* Delete Lead */}
                            {(isAdmin || lead.createdById === currentUser?.id) && (
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                title="Delete Lead"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED DOWNWARD ROW: Shows Logged Date, Director Name, Email ID, Leader Name, Source, Meeting Date, EDC */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-b border-indigo-100">
                          <td colSpan={9} className="p-3.5 pl-7">
                            <div className="bg-white border border-indigo-100/90 rounded-xl p-3.5 shadow-2xs space-y-3">
                              {/* Header inside drawer */}
                              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 text-xs flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs">
                                    {lead.companyName} — Additional Details
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Expanded Info
                                  </span>
                                  {lead.closerStatus === 'Lead Sharing' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                      🤝 Shared with Leader: {lead.leaderName}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <span className="font-bold text-slate-700">Logged Date:</span>
                                  <span>
                                    {lead.createdAt
                                      ? new Date(lead.createdAt).toLocaleString('en-IN', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true,
                                        })
                                      : 'N/A'}
                                  </span>
                                </div>
                              </div>

                              {/* Responsive grid for the requested fields + follow-up timeline */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                                {/* 1. Director Name */}
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                    <UserCheck className="w-3 h-3 text-slate-400" /> Director Name
                                  </span>
                                  <div className="font-semibold text-slate-900 mt-1 truncate" title={lead.directorName || 'Not Specified'}>
                                    {lead.directorName || <span className="text-slate-400 italic font-normal">Not Specified</span>}
                                  </div>
                                </div>

                                {/* 2. Email ID */}
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-400" /> Email ID
                                  </span>
                                  <div className="font-semibold text-slate-900 mt-1 truncate">
                                    {lead.emailId ? (
                                      <a href={`mailto:${lead.emailId}`} className="text-indigo-600 hover:underline">
                                        {lead.emailId}
                                      </a>
                                    ) : (
                                      <span className="text-slate-400 italic font-normal">Not Specified</span>
                                    )}
                                  </div>
                                </div>

                                {/* 3. Leader Name */}
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                    <Award className="w-3 h-3 text-slate-400" /> Leader Name
                                  </span>
                                  <div className="font-semibold text-slate-900 mt-1">
                                    {lead.leaderName || 'Not Assigned'}
                                  </div>
                                </div>

                                {/* 4. Sourcing & Closer */}
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                    <Briefcase className="w-3 h-3 text-slate-400" /> Sourcing Status
                                  </span>
                                  <div className="font-semibold text-slate-900 mt-1">
                                    {lead.sourcingStatus}
                                    <span className="text-[10px] text-slate-500 block font-normal mt-0.5">
                                      Closer: <strong className="text-slate-700">{lead.closerStatus}</strong>
                                    </span>
                                  </div>
                                </div>

                                {/* 5. Meeting Date */}
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-indigo-500" /> Meeting Date
                                  </span>
                                  <div className="mt-1">
                                    <input
                                      type="date"
                                      min={getTodayDateStr()}
                                      value={lead.meetingDate ? new Date(lead.meetingDate).toISOString().split('T')[0] : ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const currentToday = getTodayDateStr();
                                        if (val && val < currentToday) {
                                          alert('Meeting date cannot be in the past. Please select today or an upcoming date.');
                                          return;
                                        }
                                        handleQuickUpdateLead(lead.id, { meetingDate: val || null });
                                      }}
                                      className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-400 cursor-pointer w-full shadow-2xs"
                                      title="Click to set or change Meeting Date"
                                    />
                                  </div>
                                </div>

                                {/* 6. Expected Date of Closer (EDC) */}
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" /> EDC Target
                                  </span>
                                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${edcBadge.color}`}>
                                      {edcBadge.label}
                                    </span>
                                    <span className="text-[11px] text-slate-600 font-semibold">
                                      {lead.expectedDateOfCloser ? new Date(lead.expectedDateOfCloser).toLocaleDateString('en-IN') : 'Not Set'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Follow-up Timeline Summary in Drawer */}
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/70 text-xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-indigo-500" /> Follow-up Status History ({leadFollowUps.length})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFollowUpModalLead(lead);
                                      setFollowUpForm({
                                        date: getTodayDateStr(),
                                        status: 'Hot',
                                        remarks: '',
                                      });
                                    }}
                                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Add Follow-up
                                  </button>
                                </div>
                                {leadFollowUps.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                                    {leadFollowUps.map((fu, idx) => (
                                      <div
                                        key={fu.id || idx}
                                        className="flex items-center justify-between bg-white border border-slate-200 rounded p-2 text-xs shadow-2xs"
                                      >
                                        <div className="flex items-center gap-1 font-mono text-slate-700 font-semibold">
                                          <Calendar className="w-3 h-3 text-slate-400" />
                                          <span>{fu.date ? new Date(fu.date).toLocaleDateString('en-IN') : 'N/A'}</span>
                                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">[Freeze]</span>
                                        </div>
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${
                                            fu.status === 'Hot'
                                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                                              : fu.status === 'Warm'
                                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                                              : fu.status === 'Closed'
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                              : 'bg-slate-100 text-slate-600 border-slate-300'
                                          }`}
                                        >
                                          {fu.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic block">No follow-ups recorded yet.</span>
                                )}
                              </div>

                              {/* Remarks / Notes (if present) */}
                              {lead.remarks && (
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 text-xs">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Remarks / Client Notes</span>
                                  <p className="text-slate-700 italic">"{lead.remarks}"</p>
                                </div>
                              )}
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

        {/* 5B. TABLE PAGINATION CONTROLS */}
        {pagination && pagination.total > 0 && (
          <div className="bg-white border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Showing{' '}
                <strong className="text-slate-900">
                  {(pagination.page - 1) * pagination.limit + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-900">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </strong>{' '}
                of <strong className="text-slate-900">{pagination.total}</strong> leads
              </span>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <label htmlFor="leads-limit-select" className="text-slate-500">Per page:</label>
                <select
                  id="leads-limit-select"
                  value={pagination.limit}
                  onChange={(e) => {
                    const newLimit = Number(e.target.value);
                    setLimit(newLimit);
                    setPage(1);
                    fetchLeads(1, newLimit);
                  }}
                  className="border border-slate-200 rounded px-2 py-1 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const newPage = pagination.page - 1;
                  setPage(newPage);
                  fetchLeads(newPage, limit);
                }}
                disabled={pagination.page <= 1}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition cursor-pointer"
              >
                Previous
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  return p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 1;
                })
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <React.Fragment key={p}>
                      {prev && p - prev > 1 && (
                        <span className="px-1 text-slate-400">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPage(p);
                          fetchLeads(p, limit);
                        }}
                        className={`w-7 h-7 rounded-lg font-semibold transition cursor-pointer ${
                          p === pagination.page
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => {
                  const newPage = pagination.page + 1;
                  setPage(newPage);
                  fetchLeads(newPage, limit);
                }}
                disabled={pagination.page >= pagination.totalPages}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. RECORD FOLLOW-UP STATUS MODAL (FROZEN AUDIT TRAIL) */}
      {followUpModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-400/30">
                  <Clock className="w-5 h-5 text-indigo-400" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Record Follow-up Status</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-xs">{followUpModalLead.companyName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFollowUpModalLead(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveFollowUp} className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Freeze Guarantee (Non-editable)</strong>
                  Once saved, this follow-up date and status are permanently frozen and non-editable.
                </div>
              </div>

              {/* Follow-up Date */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Follow-up Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    min={getTodayDateStr()}
                    value={followUpForm.date}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-slate-900 focus:outline-none cursor-pointer"
                  />
                </div>
                {isNextMonthDate(followUpForm.date) && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
                    <span className="text-sm shrink-0">🚀</span>
                    <div>
                      <strong className="block font-bold text-emerald-900">Next Month Pipeline Transition</strong>
                      This follow-up date is in <span className="font-extrabold underline">{monthLabels.nextMonth}</span>. This lead and its {followUpModalLead?.dealValue ? `₹${Number(followUpModalLead.dealValue).toLocaleString('en-IN')}` : 'prospective'} deal value will automatically count into your <span className="font-bold">Next Month Deal Funnel</span>!
                    </div>
                  </div>
                )}
              </div>

              {/* Follow-up Status (Hot, Warm, Closed, Lost) */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Follow-up Status <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Hot', label: 'Hot', icon: '🔥', desc: 'Ready / urgent conversion', color: 'bg-rose-50 border-rose-300 text-rose-700' },
                    { id: 'Warm', label: 'Warm', icon: '☀️', desc: 'Interested / in evaluation', color: 'bg-amber-50 border-amber-300 text-amber-800' },
                    { id: 'Closed', label: 'Closed', icon: '🏆', desc: 'Deal finalized / won', color: 'bg-emerald-50 border-emerald-300 text-emerald-800' },
                    { id: 'Lost', label: 'Lost', icon: '❄️', desc: 'Not interested / dropped', color: 'bg-slate-100 border-slate-300 text-slate-700' },
                  ].map((st) => {
                    const active = followUpForm.status === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setFollowUpForm({ ...followUpForm, status: st.id })}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                          active
                            ? st.id === 'Hot'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : st.id === 'Warm'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                              : st.id === 'Closed'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-700 text-white border-slate-700 shadow-xs'
                            : `${st.color} hover:border-slate-400`
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span>{st.icon}</span>
                            <span>{st.label}</span>
                          </div>
                          <div className={`text-[10px] mt-0.5 ${active ? 'text-white/80' : 'text-slate-500'}`}>
                            {st.desc}
                          </div>
                        </div>
                        {active && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remarks / Discussion notes */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Follow-up Notes / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spoke with client, requested revised quote"
                  value={followUpForm.remarks}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, remarks: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                />
              </div>

              {/* Past follow-ups list inside modal */}
              {getFollowUpsList(followUpModalLead).length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    Previous Frozen Entries ({getFollowUpsList(followUpModalLead).length})
                  </span>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {getFollowUpsList(followUpModalLead).map((fu, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200">
                        <span className="font-mono text-slate-700 font-medium">
                          📅 {fu.date ? new Date(fu.date).toLocaleDateString('en-IN') : 'N/A'} - [Freeze]
                        </span>
                        <span className="font-bold text-xs">
                          {fu.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFollowUpModalLead(null)}
                  disabled={savingFollowUp}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFollowUp}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingFollowUp ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving & Freezing...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Save & Freeze Follow-up</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* IN-APP QUOTATION DOCUMENT PREVIEW MODAL */}
      {previewQuotationDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Quotation Preview</span>
                    <span className="text-xs text-slate-400 font-normal">({previewQuotationDoc.leadCompany})</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                    {previewQuotationDoc.fileName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewQuotationDoc.url}
                  download={previewQuotationDoc.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / iframe */}
            <div className="flex-1 bg-slate-100 relative">
              <iframe
                src={previewQuotationDoc.url}
                title={`Preview of ${previewQuotationDoc.fileName}`}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
