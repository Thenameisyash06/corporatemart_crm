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
  UserX,
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import api from '../lib/api';
import { toast } from '../context/ToastContext';
import { exportLeadsToCsv } from '../lib/exportCsv';
import CountryCodePhoneInput from './CountryCodePhoneInput';

// -----------------------------------------------------------------------------
// MASTER CONFIGURATION & DROPDOWN DATA
// -----------------------------------------------------------------------------
export const LMS_LEADERS = [
  'Jayesh Rohit',
  'Neel Boda',
  'Shashank Singhal',
  'Vishishta Dixit',
  'Yash Rathod',
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
  'Panchal Kunal',
  'Yash Rathod',
  'Pankaj Solanki',
  'Rishi Hemnani',
  'Vinay Raj',
  'Himanshu Goswami',
  'Jimit Panchal',
];

export const BDM_LEADER_MAP = {
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

export const BDM_TARGET_MAP = {
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

export const getCanonicalBdmName = (rawName) => {
  if (!rawName) return '';
  const trimmed = String(rawName).replace(/\s*\([^)]*\)/g, '').trim();
  if (!trimmed || trimmed === '-- None (Single BDM) --') return '';
  const lower = trimmed.toLowerCase();
  const matchedLeader = LMS_LEADERS.find((l) => l.toLowerCase() === lower);
  if (matchedLeader) return matchedLeader;
  const matchedBdm = LMS_BDMS.find((b) => b.toLowerCase() === lower);
  if (matchedBdm) return matchedBdm;
  return trimmed
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

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

export const normalizeClientStatus = (status) => {
  if (!status) return 'Warm';
  const s = String(status).trim().toLowerCase();
  if (s === 'hot') return 'Hot';
  if (s === 'lost') return 'Lost';
  return 'Warm';
};

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
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
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

  // Fetch active users from database to get live stored leaderName mappings
  const [dbUsers, setDbUsers] = useState([]);

  useEffect(() => {
    api
      .get('/users')
      .then((res) => {
        if (res.data?.users) {
          setDbUsers(res.data.users);
        }
      })
      .catch(() => {});
  }, []);

  // Compute strictly fetched Leader Name from stored user data
  const fetchedLeaderName = useMemo(() => {
    // 1. If current user is an LMS Leader themselves:
    if (isLeader && matchedLeaderName) {
      return matchedLeaderName;
    }
    // 2. From currentUser record (loaded from DB /auth/me)
    if (currentUser?.leaderName && currentUser.leaderName.trim()) {
      return currentUser.leaderName.trim();
    }
    // 3. From dbUsers list matching currentUser.id or name
    const cleanCurrent = (currentUser?.fullName || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    const cleanBdm = (loggedInBdmName || '').trim().toLowerCase();
    const found = dbUsers.find((u) => {
      if (currentUser?.id && u.id === currentUser.id) return true;
      const uName = (u.fullName || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
      return (
        (uName && cleanCurrent && (uName === cleanCurrent || uName.includes(cleanCurrent) || cleanCurrent.includes(uName))) ||
        (uName && cleanBdm && (uName === cleanBdm || uName.includes(cleanBdm) || cleanBdm.includes(uName)))
      );
    });
    if (found?.leaderName && found.leaderName.trim()) {
      return found.leaderName.trim();
    }
    // 4. From static master mapping BDM_LEADER_MAP
    if (loggedInBdmName && BDM_LEADER_MAP[loggedInBdmName]) {
      return BDM_LEADER_MAP[loggedInBdmName];
    }
    if (currentUser?.fullName) {
      const matchKey = Object.keys(BDM_LEADER_MAP).find((k) =>
        k.toLowerCase() === cleanCurrent || cleanCurrent.includes(k.toLowerCase())
      );
      if (matchKey) return BDM_LEADER_MAP[matchKey];
    }
    return 'Management';
  }, [isLeader, matchedLeaderName, currentUser, dbUsers, loggedInBdmName]);

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

  // Admin Cockpit & Detailed BDM Dossier Modal State
  const [selectedBdmDetailModal, setSelectedBdmDetailModal] = useState(null);
  const [adminCockpitTab, setAdminCockpitTab] = useState('ALL'); // 'ALL' | 'LEADERS' | 'MEMBERS' | 'ACTIVE_ONLY'
  const [adminCockpitSearch, setAdminCockpitSearch] = useState('');
  const [bdmDetailModalTab, setBdmDetailModalTab] = useState('FOLLOWUPS'); // 'FOLLOWUPS' | 'METRICS'

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
    expectedDateOfCloser: '',
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

  // Helper to determine if lead's follow-up or meeting is overdue and calculate exact days overdue
  const getLeadOverdueInfo = useCallback((lead) => {
    if (!lead) return { isOverdue: false, daysOverdue: 0, targetDateStr: null };
    const lStatus = (lead.leadStatus || '').toUpperCase();
    if (lStatus === 'CLOSED_WON' || lStatus === 'CLOSED_LOST') {
      return { isOverdue: false, daysOverdue: 0, targetDateStr: null };
    }
    const cStatus = (lead.clientStatus || '').toLowerCase();
    if (cStatus === 'lost' || cStatus === 'closed') {
      return { isOverdue: false, daysOverdue: 0, targetDateStr: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toLocalDateStr = (val) => {
      if (!val) return null;
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
        return val.trim();
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    };

    const candidateDates = [];
    const fus = getFollowUpsList(lead);
    if (fus && fus.length > 0) {
      const sorted = [...fus].sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : (a.addedAt ? new Date(a.addedAt).getTime() : 0);
        const db = b.date ? new Date(b.date).getTime() : (b.addedAt ? new Date(b.addedAt).getTime() : 0);
        return db - da;
      });
      const latest = sorted[0];
      if (latest && latest.date && (latest.status || '').toLowerCase() !== 'closed' && (latest.status || '').toLowerCase() !== 'lost') {
        const dStr = toLocalDateStr(latest.date);
        if (dStr) candidateDates.push(dStr);
      }
    }
    if (lead.nextFollowUpDate) {
      const nfuStr = toLocalDateStr(lead.nextFollowUpDate);
      if (nfuStr) candidateDates.push(nfuStr);
    }
    if (lead.meetingDate) {
      const mdStr = toLocalDateStr(lead.meetingDate);
      if (mdStr) candidateDates.push(mdStr);
    }

    if (candidateDates.length === 0) return { isOverdue: false, daysOverdue: 0, targetDateStr: null };

    // Use the LATEST scheduled action date (so scheduling a future follow-up clears past meeting/follow-up dates)
    const latestDateStr = [...candidateDates].sort().pop();
    const parts = latestDateStr.split('-');
    if (parts.length < 3) return { isOverdue: false, daysOverdue: 0, targetDateStr: null };
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return { isOverdue: false, daysOverdue: 0, targetDateStr: null };

    const targetDate = new Date(y, m - 1, d);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - targetDate.getTime();
    if (diffTime > 0) {
      const days = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      return { isOverdue: true, daysOverdue: days, targetDateStr: latestDateStr };
    }

    return { isOverdue: false, daysOverdue: 0, targetDateStr: latestDateStr };
  }, []);

  const isLeadFollowUpExceeded = useCallback((lead) => {
    return getLeadOverdueInfo(lead).isOverdue;
  }, [getLeadOverdueInfo]);

  const handleSaveFollowUp = async (e) => {
    if (e) e.preventDefault();
    if (!followUpModalLead) return;
    if (!followUpForm.date) {
      toast.warning('Please select a scheduled date for this client follow-up.', 'Date Required');
      return;
    }
    const currentToday = getTodayDateStr();
    if (followUpForm.date < currentToday) {
      toast.warning('Follow-up date cannot be in the past. Please select today or a future date.', 'Past Date Not Allowed');
      return;
    }
    if (followUpForm.expectedDateOfCloser && followUpForm.expectedDateOfCloser < currentToday) {
      toast.warning('Expected Date of Closer (EDC) cannot be in the past. Please select today or an upcoming date.', 'Past Date Not Allowed');
      return;
    }
    try {
      setSavingFollowUp(true);
      await api.post(`/leads/${followUpModalLead.id}/follow-up`, {
        date: followUpForm.date,
        status: followUpForm.status,
        remarks: followUpForm.remarks,
        expectedDateOfCloser: followUpForm.expectedDateOfCloser || null,
      });
      toast.success(`Follow-up on ${followUpForm.date} with status "${followUpForm.status}" recorded for ${followUpModalLead.companyName}.`, 'Follow-up Saved');
      setFollowUpModalLead(null);
      setFollowUpForm({
        date: getTodayDateStr(),
        status: 'Hot',
        remarks: '',
        expectedDateOfCloser: '',
      });
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Unable to record follow-up.', 'Follow-up Failed');
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleRevokeAndReassign = async (e) => {
    if (e) e.preventDefault();
    if (!reassignModalLead) return;
    if (!reassignForm.newBdmName) {
      toast.warning('Please select the BDM team member to whom you want to transfer this lead.', 'Target BDM Required');
      return;
    }
    if (reassignForm.newBdmName.trim().toUpperCase() === (reassignModalLead.bdmName1 || '').trim().toUpperCase()) {
      toast.warning(`This lead is already assigned to ${reassignModalLead.bdmName1}. Please choose a different BDM.`, 'Duplicate Assignee');
      return;
    }
    if (!reassignForm.reason.trim()) {
      toast.warning('Please specify an administrative reason so both BDMs understand the handover.', 'Reassignment Reason Required');
      return;
    }

    try {
      setIsSubmittingReassign(true);
      const res = await api.post(`/leads/${reassignModalLead.id}/revoke-reassign`, {
        newBdmName: reassignForm.newBdmName,
        newLeaderName: reassignForm.newLeaderName,
        reason: reassignForm.reason,
        nextFollowUpDate: reassignForm.nextFollowUpDate,
        handoverNotes: reassignForm.handoverNotes,
      });

      toast.success(res.data?.message || `Lead "${reassignModalLead.companyName}" successfully revoked and reassigned.`);

      // Dispatch notification event for navbar & listeners
      window.dispatchEvent(new CustomEvent('lead_notifications_changed'));
      window.dispatchEvent(new CustomEvent('lms_leads_changed'));

      setReassignModalLead(null);
      if (selectedBdmDetailModal) {
        setSelectedBdmDetailModal(null);
      }
      if (selectedTeamMemberFilter !== 'ALL') {
        setSelectedTeamMemberFilter('ALL');
      }
      fetchLeads(1, limit);
    } catch (err) {
      toast.error('Failed to revoke and reassign lead: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  // Form State (includes clientStatus default 'Warm')
  const initialFormState = {
    companyName: '',
    directorName: '',
    mobileNo: '',
    emailId: '',
    leaderName: fetchedLeaderName || LMS_LEADERS[0],
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
    parentLeadId: null,
  };

  const [form, setForm] = useState(initialFormState);

  // Lock form fields:
  // - BDM-I locked to logged-in BDM
  // - Leader Name strictly fetched from stored user records (not editable)
  // - For Leaders: Closer Status locked to 'Self Closer'
  useEffect(() => {
    if (!isAdmin) {
      setForm((prev) => ({
        ...prev,
        bdmName1: loggedInBdmName || prev.bdmName1,
        leaderName: fetchedLeaderName || prev.leaderName,
        ...(isLeader ? { closerStatus: 'Self Closer' } : {}),
      }));
    }
  }, [isAdmin, loggedInBdmName, fetchedLeaderName, isLeader]);

  // Real-time check for duplicate phone number in form (matches digits with or without country code)
  const duplicatePhoneLead = useMemo(() => {
    if (form.parentLeadId) return null;
    const raw = (form.mobileNo || '').trim();
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 8) return null;
    const coreDigits = digits.length >= 10 ? digits.slice(-10) : digits;
    return leads.find((l) => {
      const lRaw = (l.mobileNo || '').trim();
      const lDigits = lRaw.replace(/\D/g, '');
      if (lDigits === digits) return true;
      if (coreDigits.length === 10 && lDigits.slice(-10) === coreDigits) return true;
      return false;
    }) || null;
  }, [form.mobileNo, form.parentLeadId, leads]);

  // Real-time check for duplicate company name in form (match characters only, ignore symbols/spaces)
  const duplicateCompanyLead = useMemo(() => {
    if (form.parentLeadId) return null;
    const norm = (form.companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!norm) return null;
    return leads.find((l) => (l.companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === norm) || null;
  }, [form.companyName, form.parentLeadId, leads]);

  // Duplicate Phone Number Popup State (shows with clear message & cancel/edit option)
  const [duplicatePhonePopup, setDuplicatePhonePopup] = useState(null);
  const duplicatePhoneTimerRef = useRef(null);

  const showDuplicatePhonePopup = useCallback((detail = '') => {
    if (duplicatePhoneTimerRef.current) {
      clearTimeout(duplicatePhoneTimerRef.current);
    }
    setDuplicatePhonePopup({ detail });
    duplicatePhoneTimerRef.current = setTimeout(() => {
      setDuplicatePhonePopup(null);
    }, 5000);
  }, []);

  const closeDuplicatePhonePopup = useCallback(() => {
    if (duplicatePhoneTimerRef.current) {
      clearTimeout(duplicatePhoneTimerRef.current);
    }
    setDuplicatePhonePopup(null);
  }, []);

  useEffect(() => {
    return () => {
      if (duplicatePhoneTimerRef.current) {
        clearTimeout(duplicatePhoneTimerRef.current);
      }
    };
  }, []);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoggedDate, setSelectedLoggedDate] = useState('');
  const [selectedLeaderFilter, setSelectedLeaderFilter] = useState('ALL');
  const [selectedBdmFilter, setSelectedBdmFilter] = useState('ALL');
  const [selectedCloserFilter, setSelectedCloserFilter] = useState('ALL');
  const [selectedClientStatusFilter, setSelectedClientStatusFilter] = useState('ALL');
  const [selectedSourcingFilter, setSelectedSourcingFilter] = useState('ALL');
  const [selectedMeetingFilter, setSelectedMeetingFilter] = useState('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');
  const [selectedTeamMemberFilter, setSelectedTeamMemberFilter] = useState('ALL');
  const [pendingFollowUpFilter, setPendingFollowUpFilter] = useState(false);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('THIS_MONTH'); // 'THIS_MONTH' | 'NEXT_MONTH' | 'PENDING_FOLLOWUPS'

  // Admin Cockpit Sorting & Overdue Filter Controls
  const [adminCockpitSort, setAdminCockpitSort] = useState('DEFAULT'); // 'DEFAULT' | 'OVERDUE_DESC' | 'OVERDUE_ASC' | 'FUNNEL_DESC'
  const [overdueSortOrder, setOverdueSortOrder] = useState('MAX_TO_MIN'); // 'MAX_TO_MIN' | 'MIN_TO_MAX'
  const [overdueBdmFilter, setOverdueBdmFilter] = useState('ALL');

  // Lead Revoke & Reassign Modal State
  const [reassignModalLead, setReassignModalLead] = useState(null);
  const [reassignForm, setReassignForm] = useState({
    newBdmName: '',
    newLeaderName: '',
    reason: '',
    nextFollowUpDate: getTodayDateStr(),
    handoverNotes: '',
  });
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);

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
      if (isAdmin && selectedLeaderFilter !== 'ALL') params.leaderName = selectedLeaderFilter;
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
      if (selectedLoggedDate) params.loggedDate = selectedLoggedDate;

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

      // Notify parent dashboards (e.g. AdminDashboard LMS tab badge) of the latest This Month count
      try {
        const thisMonthLeadsCount = res.data.analytics?.thisMonthCount ?? res.data.pagination?.total ?? (res.data.leads || []).length;
        window.dispatchEvent(new CustomEvent('lms_leads_changed', {
          detail: {
            thisMonthCount: thisMonthLeadsCount,
            total: res.data.pagination?.total,
            analytics: res.data.analytics,
          }
        }));
      } catch (_) {}
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
    selectedLoggedDate,
  ]);

  // Listen for global app refresh button click
  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchLeads();
    };
    window.addEventListener('app_refresh_all', handleGlobalRefresh);
    return () => {
      window.removeEventListener('app_refresh_all', handleGlobalRefresh);
    };
  }, [page, limit, selectedMonthFilter]);

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

    const leaderTeamMembers = (analytics?.dbTeamMembers && analytics.dbTeamMembers.length > 0)
      ? analytics.dbTeamMembers
      : Object.entries(BDM_LEADER_MAP)
          .filter(([_, ldr]) => {
            const cl = ldr.toLowerCase().trim();
            return cl.includes(leaderKey) || leaderKey.includes(cl);
          })
          .map(([bdm]) => bdm);

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

      // Check if lead belongs to a team member under this leader (from DB or mapping)
      const assignedLeader = (analytics?.dbLeaderMap?.[lead.bdmName1] || BDM_LEADER_MAP[lead.bdmName1] || '').toLowerCase().trim();
      const isMemberOfMyTeam = leaderTeamMembers.some((m) => {
        const mc = m.toLowerCase().trim();
        return bdm1.includes(mc) || mc.includes(bdm1) || bdm2.includes(mc) || mc.includes(bdm2);
      }) || (assignedLeader && (assignedLeader.includes(leaderKey) || leaderKey.includes(assignedLeader)));

      // LEAD SHARING REQUIREMENT: Team leads are ONLY shared with leader if closerStatus is 'Lead Sharing' (not 'Self Closer')
      const isLeadSharing = (lead.closerStatus || '').toUpperCase().includes('LEAD SHARING');

      const isTeamLead = !isOwnLead && leaderKey && isLeadSharing && (
        (leadLeader && (leadLeader.includes(leaderKey) || leaderKey.includes(leadLeader))) ||
        isMemberOfMyTeam
      );

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
  }, [leads, isAdmin, loggedInBdmName, effectiveLeaderName, matchedLeaderName, isLeader, currentUser, analytics]);

  // BDM's Personal Deal Funnel Value (calculated STRICTLY on own direct leads, excluding team member leads)
  const bdmPersonalFunnel = useMemo(() => {
    return ownDirectLeads.reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);
  }, [ownDirectLeads]);

  const bdmHotFunnel = useMemo(() => {
    return ownDirectLeads
      .filter((l) => (l.clientStatus || '').toLowerCase() === 'hot')
      .reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);
  }, [ownDirectLeads]);

  const bdmWarmFunnel = useMemo(() => {
    return ownDirectLeads
      .filter((l) => (l.clientStatus || 'warm').toLowerCase() === 'warm')
      .reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);
  }, [ownDirectLeads]);

  // Personal This Month & Next Month Metrics (Strictly based on own direct leads for BDM/Leader)
  const myThisMonthLeads = useMemo(() => {
    return ownDirectLeads.filter((l) => {
      const badge = getLeadMonthBadge(l);
      return badge?.icon === '📅';
    });
  }, [ownDirectLeads, getLeadMonthBadge]);

  const myThisMonthCount = myThisMonthLeads.length;
  const myThisMonthFunnel = useMemo(() => {
    return myThisMonthLeads.reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);
  }, [myThisMonthLeads]);

  const myNextMonthLeads = useMemo(() => {
    return ownDirectLeads.filter((l) => {
      const badge = getLeadMonthBadge(l);
      return badge?.icon === '🚀';
    });
  }, [ownDirectLeads, getLeadMonthBadge]);

  const myNextMonthCount = myNextMonthLeads.length;
  const myNextMonthFunnel = useMemo(() => {
    return myNextMonthLeads.reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);
  }, [myNextMonthLeads]);

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

    // 1. Get all team member names for this leader from DB analytics (or BDM_LEADER_MAP fallback)
    const rawTeamMemberNames = (analytics?.dbTeamMembers && analytics.dbTeamMembers.length > 0)
      ? analytics.dbTeamMembers
      : Object.entries(BDM_LEADER_MAP)
          .filter(([_, ldr]) => {
            const cl = ldr.toLowerCase().trim();
            return cl.includes(leaderKey) || leaderKey.includes(cl);
          })
          .map(([bdm]) => bdm);

    // Canonicalize and deduplicate team member names
    const uniqueMembers = new Map();
    rawTeamMemberNames.forEach((n) => {
      const canonical = getCanonicalBdmName(n);
      if (!canonical || canonical.toLowerCase() === leaderKey) return;
      uniqueMembers.set(canonical.toLowerCase(), canonical);
    });

    // Initialize every team member from DB so their card is ALWAYS present!
    uniqueMembers.forEach((name, lowerKey) => {
      membersMap[lowerKey] = {
        name,
        salesTarget: analytics?.dbTargetMap?.[name] || analytics?.dbTargetMap?.[lowerKey] || BDM_TARGET_MAP[name] || 0,
        leads: [],
      };
    });

    // 2. Group leads belonging to team members under this leader (strictly Lead Sharing)
    const sourceLeads = (sharedTeamLeads && sharedTeamLeads.length > 0)
      ? sharedTeamLeads
      : (leads || []).filter((l) => {
          const bdm1 = (l.bdmName1 || '').toLowerCase().trim();
          const isLeaderSelf = bdm1 && (bdm1.includes(leaderKey) || leaderKey.includes(bdm1));
          const isLeadSharing = (l.closerStatus || '').toUpperCase().includes('LEAD SHARING');
          return !isLeaderSelf && isLeadSharing;
        });

    sourceLeads.forEach((lead) => {
      let memberName = (lead.bdmName1 || '').trim();
      if (!memberName || memberName.toLowerCase() === leaderKey || memberName === '-- None (Single BDM) --') {
        memberName = (lead.bdmName2 || '').trim();
      }
      if (!memberName || memberName.toLowerCase() === leaderKey || memberName === '-- None (Single BDM) --') return;

      const canonical = getCanonicalBdmName(memberName);
      const cleanLower = canonical.toLowerCase();
      // Match to an existing member of this leader's team
      const matchKey = Object.keys(membersMap).find(
        (k) => k === cleanLower || cleanLower.includes(k) || k.includes(cleanLower)
      );
      if (matchKey) {
        membersMap[matchKey].leads.push(lead);
      }
    });

    // 3. Map into card objects (supplementing with analytics.teamMembersOverview if available)
    const backendOverviewMap = {};
    if (analytics?.teamMembersOverview && Array.isArray(analytics.teamMembersOverview)) {
      analytics.teamMembersOverview.forEach((bo) => {
        if (bo?.name) backendOverviewMap[bo.name.toLowerCase().trim()] = bo;
      });
    }

    const cards = Object.values(membersMap).map((member) => {
      const mLeads = member.leads;
      const cleanNameLower = member.name.toLowerCase().trim();
      const bo = backendOverviewMap[cleanNameLower] || Object.entries(backendOverviewMap).find(([k]) => k.includes(cleanNameLower) || cleanNameLower.includes(k))?.[1];

      // Use overall backend counts (includes both shared and self-close counts for the card summary)
      const activeLeads = bo?.activeLeads !== undefined
        ? bo.activeLeads
        : mLeads.filter((l) => l.leadStatus !== 'CLOSED_WON' && l.leadStatus !== 'CLOSED_LOST').length;

      const hotCount = bo?.hotCount !== undefined
        ? bo.hotCount
        : mLeads.filter((l) => (l.clientStatus || '').toLowerCase() === 'hot').length;

      const warmCount = bo?.warmCount !== undefined
        ? bo.warmCount
        : mLeads.filter((l) => (l.clientStatus || 'warm').toLowerCase() === 'warm').length;

      const lostCount = bo?.lostCount !== undefined
        ? bo.lostCount
        : mLeads.filter((l) => (l.clientStatus || '').toLowerCase() === 'lost' || l.leadStatus === 'CLOSED_LOST').length;

      const closedCount = bo?.closedCount !== undefined
        ? bo.closedCount
        : mLeads.filter((l) => l.leadStatus === 'CLOSED_WON' || (l.clientStatus || '').toLowerCase() === 'closed').length;

      const selfCloseCount = bo?.selfCloseCount !== undefined
        ? bo.selfCloseCount
        : mLeads.filter((l) => (l.closerStatus || '').toUpperCase().includes('SELF')).length;

      const pendingFollowUpsCount = bo?.pendingFollowUpsCount !== undefined
        ? bo.pendingFollowUpsCount
        : mLeads.filter((l) => getLeadOverdueInfo(l).isOverdue).length;

      const meetingLeads = mLeads.filter(
        (l) => l.meetingDate || (l.meetingStatus && l.meetingStatus !== 'None')
      );
      const sortedMeetings = [...meetingLeads].sort((a, b) => {
        const da = a.meetingDate ? new Date(a.meetingDate).getTime() : 0;
        const db = b.meetingDate ? new Date(b.meetingDate).getTime() : 0;
        return db - da;
      });
      const nextMeetingLead = sortedMeetings[0] || bo?.nextMeetingLead || null;

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
      const lastFollowUp = allFollowUps[0] || bo?.lastFollowUp || null;

      const activeLeadsWithEdc = mLeads.filter(
        (l) => l.expectedDateOfCloser && l.leadStatus !== 'CLOSED_WON' && l.leadStatus !== 'CLOSED_LOST'
      );
      activeLeadsWithEdc.sort((a, b) => new Date(a.expectedDateOfCloser) - new Date(b.expectedDateOfCloser));
      const nearestEdcLead = activeLeadsWithEdc[0] || mLeads.find((l) => l.expectedDateOfCloser) || bo?.nearestEdcLead || null;

      const totalFunnel = bo?.totalFunnel !== undefined
        ? bo.totalFunnel
        : mLeads.reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0);

      const totalLeads = mLeads.length > 0 ? mLeads.length : (bo?.totalLeads ?? 0);

      let maxOverdue = 0;
      let overdueCount = 0;
      mLeads.forEach((l) => {
        const info = getLeadOverdueInfo(l);
        if (info.isOverdue) {
          overdueCount++;
          if (info.daysOverdue > maxOverdue) maxOverdue = info.daysOverdue;
        }
      });

      return {
        name: member.name,
        salesTarget: member.salesTarget || bo?.salesTarget || 0,
        isLeaderMember: false,
        isSelf: false,
        leads: mLeads || [],
        totalLeads,
        activeLeads,
        hotCount,
        hotValue: mLeads.filter((l) => (l.clientStatus || '').toLowerCase() === 'hot').reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0) || (bo?.hotValue ?? 0),
        warmCount,
        warmValue: mLeads.filter((l) => (l.clientStatus || 'warm').toLowerCase() === 'warm').reduce((sum, l) => sum + (parseFloat(l.dealValue) || 0), 0) || (bo?.warmValue ?? 0),
        lostCount,
        closedCount,
        selfCloseCount,
        pendingFollowUpsCount,
        meetingCount: meetingLeads.length > 0 ? meetingLeads.length : (bo?.meetingCount ?? 0),
        nextMeetingLead,
        lastFollowUp,
        nearestEdcLead,
        totalFunnel,
      };
    });

    cards.sort((a, b) => (b.totalFunnel || 0) - (a.totalFunnel || 0) || (b.totalLeads || 0) - (a.totalLeads || 0) || a.name.localeCompare(b.name));

    return cards;
  }, [isLeader, matchedLeaderName, loggedInBdmName, leads, sharedTeamLeads, analytics, getLeadOverdueInfo]);

  // Leads actually displayed in the table below (supports filtering to a selected team member, selected month, and pending follow-ups)
  const displayedLeads = useMemo(() => {
    let list = visibleLeads;
    if (isAdmin && selectedLeaderFilter && selectedLeaderFilter !== 'ALL') {
      const ldr = selectedLeaderFilter.toLowerCase().trim();
      list = list.filter((l) => {
        const leadLdr = (l.leaderName || '').toLowerCase().trim();
        const b1 = (l.bdmName1 || '').toLowerCase().trim();
        const b2 = (l.bdmName2 || '').toLowerCase().trim();
        const isLeaderOwn = b1.includes(ldr) || ldr.includes(b1) || b2.includes(ldr) || ldr.includes(b2);
        const isLeadSharing = (l.closerStatus || '').toUpperCase().includes('LEAD SHARING');
        return (leadLdr === ldr || leadLdr.includes(ldr) || ldr.includes(leadLdr)) && (isLeaderOwn || isLeadSharing);
      });
    }
    if (selectedTeamMemberFilter && selectedTeamMemberFilter !== 'ALL') {
      list = list.filter(
        (l) => (l.bdmName1 || '').toLowerCase().trim() === selectedTeamMemberFilter.toLowerCase().trim()
      );
    }
    if (selectedLoggedDate) {
      list = list.filter((l) => {
        if (!l.createdAt) return false;
        const d = new Date(l.createdAt);
        if (isNaN(d.getTime())) return false;
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === selectedLoggedDate;
      });
    } else if (selectedMonthFilter === 'PENDING_FOLLOWUPS') {
      list = (isAdmin ? (leads && leads.length > 0 ? leads : visibleLeads) : visibleLeads).filter(
        (l) => getLeadOverdueInfo(l).isOverdue
      );
      if (overdueBdmFilter && overdueBdmFilter !== 'ALL') {
        list = list.filter(
          (l) => (l.bdmName1 || '').toLowerCase().trim() === overdueBdmFilter.toLowerCase().trim()
        );
      }
      list.sort((a, b) => {
        const da = getLeadOverdueInfo(a).daysOverdue;
        const db = getLeadOverdueInfo(b).daysOverdue;
        if (overdueSortOrder === 'MIN_TO_MAX') {
          return da - db;
        }
        return db - da; // default MAX_TO_MIN
      });
    } else if (selectedMonthFilter === 'NEXT_MONTH') {
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
    if (pendingFollowUpFilter && selectedMonthFilter !== 'PENDING_FOLLOWUPS') {
      list = list.filter((l) => isLeadFollowUpExceeded(l));
    }

    // Group associated child leads directly underneath their parent lead when both are visible
    const listIds = new Set(list.map((l) => l.id));
    const childrenByParent = {};
    const topLevel = [];
    list.forEach((l) => {
      if (l.parentLeadId && listIds.has(l.parentLeadId)) {
        if (!childrenByParent[l.parentLeadId]) childrenByParent[l.parentLeadId] = [];
        childrenByParent[l.parentLeadId].push(l);
      } else {
        topLevel.push(l);
      }
    });

    const ordered = [];
    topLevel.forEach((l) => {
      ordered.push(l);
      if (childrenByParent[l.id]) {
        childrenByParent[l.id]
          .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
          .forEach((child) => ordered.push(child));
      }
    });

    return ordered;
  }, [visibleLeads, leads, isAdmin, selectedLeaderFilter, selectedTeamMemberFilter, selectedMonthFilter, selectedLoggedDate, getLeadMonthBadge, pendingFollowUpFilter, getLeadOverdueInfo, overdueBdmFilter, overdueSortOrder]);

  // All overdue leads across available leads
  const allOverdueLeads = useMemo(() => {
    const targetLeads = isAdmin ? (leads && leads.length > 0 ? leads : visibleLeads) : (isLeader ? visibleLeads : ownDirectLeads);
    return targetLeads.filter((l) => getLeadOverdueInfo(l).isOverdue);
  }, [isAdmin, isLeader, leads, visibleLeads, ownDirectLeads, getLeadOverdueInfo]);

  // Unique list of BDMs with pending follow-ups and their stats
  const bdmsWithOverdueList = useMemo(() => {
    const map = {};
    allOverdueLeads.forEach((l) => {
      const bdm = (l.bdmName1 || 'UNASSIGNED').trim();
      if (!map[bdm]) {
        map[bdm] = { name: bdm, count: 0, maxOverdue: 0 };
      }
      map[bdm].count++;
      const overdue = getLeadOverdueInfo(l).daysOverdue;
      if (overdue > map[bdm].maxOverdue) {
        map[bdm].maxOverdue = overdue;
      }
    });
    return Object.values(map).sort((a, b) => b.maxOverdue - a.maxOverdue || b.count - a.count);
  }, [allOverdueLeads, getLeadOverdueInfo]);

  // Count of leads whose follow-up or meeting date exceeded the current date
  const calculatedPendingFollowups = useMemo(() => {
    return allOverdueLeads.length;
  }, [allOverdueLeads]);

  const displayPendingFollowupsCount = useMemo(() => {
    if (isAdmin) {
      return Math.max(analytics?.pendingFollowupsCount ?? 0, calculatedPendingFollowups);
    }
    return Math.max(analytics?.myPendingFollowupsCount ?? 0, calculatedPendingFollowups);
  }, [isAdmin, analytics?.pendingFollowupsCount, analytics?.myPendingFollowupsCount, calculatedPendingFollowups]);

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

    // 4. For Leader: Ensure ALL of this Leader's team members from DB are in map (even with 0 leads / ₹0 funnel)
    if (isLeader) {
      const leaderTeamMembers = (analytics?.dbTeamMembers && analytics.dbTeamMembers.length > 0)
        ? analytics.dbTeamMembers
        : Object.entries(BDM_LEADER_MAP)
            .filter(([_, ldr]) => {
              const cl = ldr.toLowerCase().trim();
              const lk = (matchedLeaderName || loggedInBdmName || '').toLowerCase().trim();
              return cl.includes(lk) || lk.includes(cl);
            })
            .map(([bdm]) => bdm);

      leaderTeamMembers.forEach((member) => {
        const cleanMember = member.trim();
        const existingKey = Object.keys(map).find(
          (k) => k.toLowerCase().trim() === cleanMember.toLowerCase()
        );
        if (!existingKey) {
          map[cleanMember] = { count: 0, totalValue: 0, hotValue: 0, warmValue: 0, lostValue: 0 };
        }
      });
    }

    // 5. Also ensure current logged in user is in the map
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

    // 6. Filter for BDM / Leader views:
    // - Leader: can see himself (#1) and all of his team members (and ONLY his team members)
    // - BDM member: should NOT see the leader; can only see themselves
    if (!isAdmin) {
      const cleanLeader = (teamLeader || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
      const cleanSelf = (loggedInBdmName || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();

      if (isLeader) {
        const myTeamSet = new Set(
          ((analytics?.dbTeamMembers && analytics.dbTeamMembers.length > 0)
            ? analytics.dbTeamMembers
            : Object.entries(BDM_LEADER_MAP)
                .filter(([_, ldr]) => {
                  const cl = ldr.toLowerCase().trim();
                  return cl.includes(cleanLeader) || cleanLeader.includes(cl);
                })
                .map(([bdm]) => bdm)
          ).map((m) => m.toLowerCase().trim())
        );

        list = list.filter((item) => {
          const itemClean = item.bdmName.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
          const isCurrentTeamLeader = cleanLeader && (itemClean === cleanLeader || itemClean.includes(cleanLeader) || cleanLeader.includes(itemClean));
          const isMyMember = myTeamSet.has(itemClean) || Array.from(myTeamSet).some((tm) => tm.includes(itemClean) || itemClean.includes(tm));

          // Strictly Leader himself and all his team members (even with 0 leads / ₹0 funnel)
          return isCurrentTeamLeader || isMyMember;
        });
      } else {
        // Regular BDM member: only themselves
        list = list.filter((item) => {
          if (item.isLeader) return false;
          const itemClean = item.bdmName.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
          return cleanSelf && (itemClean === cleanSelf || itemClean.includes(cleanSelf) || cleanSelf.includes(itemClean));
        });
      }
    } else {
      // For admin, show all who have activity or are known leaders
      list = list.filter((b) => b.isLeader || b.totalValue > 0 || b.count > 0);
    }

    // Sequence by role ascending: first Leader, then Member (within members, sorted by totalValue descending, then count, then name)
    list.sort((a, b) => {
      if (a.isLeader && !b.isLeader) return -1;
      if (!a.isLeader && b.isLeader) return 1;
      return (b.totalValue || 0) - (a.totalValue || 0) || (b.count || 0) - (a.count || 0) || a.bdmName.localeCompare(b.bdmName);
    });

    return list;
  }, [analytics, leads, visibleLeads, isAdmin, isLeader, matchedLeaderName, loggedInBdmName, effectiveLeaderName, form.leaderName]);

  // Admin Cockpit: Full list of all BDMs and Leaders with rich performance metrics
  const adminBdmCards = useMemo(() => {
    if (!isAdmin) return [];

    let list = [];
    if (analytics?.allBdmPerformance && Array.isArray(analytics.allBdmPerformance) && analytics.allBdmPerformance.length > 0) {
      list = [...analytics.allBdmPerformance];
    } else {
      // Fallback: build from leads + LMS_LEADERS + LMS_BDMS
      const map = {};
      LMS_LEADERS.forEach((rawLdr) => {
        const ldr = getCanonicalBdmName(rawLdr);
        if (!ldr) return;
        const key = ldr.toLowerCase();
        if (!map[key]) {
          map[key] = {
            name: ldr,
            isLeader: true,
            leaderName: BDM_LEADER_MAP[ldr] || ldr,
            salesTarget: BDM_TARGET_MAP[ldr] || 0,
            leads: [],
            totalLeads: 0,
            activeLeads: 0,
            totalFunnel: 0,
            hotCount: 0,
            hotValue: 0,
            warmCount: 0,
            warmValue: 0,
            lostCount: 0,
            closedCount: 0,
            closedValue: 0,
            pendingFollowupsCount: 0,
            nextMeetingLead: null,
            lastFollowUp: null,
            nearestEdcLead: null,
          };
        }
      });
      LMS_BDMS.forEach((rawB) => {
        const b = getCanonicalBdmName(rawB);
        if (!b) return;
        const key = b.toLowerCase();
        const isLdr = LMS_LEADERS.some((l) => l.toLowerCase() === key);
        if (!map[key]) {
          map[key] = {
            name: b,
            isLeader: isLdr,
            leaderName: BDM_LEADER_MAP[b] || null,
            salesTarget: BDM_TARGET_MAP[b] || 0,
            leads: [],
            totalLeads: 0,
            activeLeads: 0,
            totalFunnel: 0,
            hotCount: 0,
            hotValue: 0,
            warmCount: 0,
            warmValue: 0,
            lostCount: 0,
            closedCount: 0,
            closedValue: 0,
            pendingFollowupsCount: 0,
            nextMeetingLead: null,
            lastFollowUp: null,
            nearestEdcLead: null,
          };
        }
      });
      (leads || []).forEach((l) => {
        const b1 = getCanonicalBdmName(l.bdmName1);
        const b2 = getCanonicalBdmName(l.bdmName2);
        const ldr = getCanonicalBdmName(l.leaderName);
        const names = [b1, b2].filter((n) => n && n !== '-- None (Single BDM) --');
        const val = parseFloat(l.dealValue) || 0;
        const cs = (l.clientStatus || 'warm').toLowerCase();
        const isWon = l.leadStatus === 'CLOSED_WON' || cs === 'closed';
        const isLost = l.leadStatus === 'CLOSED_LOST' || cs === 'lost';
        const isActive = !isWon && !isLost;

        names.forEach((canonicalName) => {
          const key = canonicalName.toLowerCase();
          if (!map[key]) {
            const isLdr = LMS_LEADERS.some((l) => l.toLowerCase() === key);
            map[key] = {
              name: canonicalName,
              isLeader: isLdr,
              leads: [],
              totalLeads: 0,
              activeLeads: 0,
              totalFunnel: 0,
              hotCount: 0,
              hotValue: 0,
              warmCount: 0,
              warmValue: 0,
              lostCount: 0,
              closedCount: 0,
              closedValue: 0,
              pendingFollowupsCount: 0,
              nextMeetingLead: null,
              lastFollowUp: null,
              nearestEdcLead: null,
            };
          }
          map[key].leads.push(l);
          map[key].totalLeads++;
          if (isActive) {
            map[key].activeLeads++;
            map[key].totalFunnel += val;
          }
          if (cs === 'hot') {
            map[key].hotCount++;
            map[key].hotValue += val;
          } else if (cs === 'warm') {
            map[key].warmCount++;
            map[key].warmValue += val;
          } else if (isLost) {
            map[key].lostCount++;
          }
          if (isWon) {
            map[key].closedCount++;
            map[key].closedValue += val;
          }
          if (ldr && !map[key].leaderName && !map[key].isLeader) {
            map[key].leaderName = ldr;
          }
          const overdueInfo = getLeadOverdueInfo(l);
          if (overdueInfo.isOverdue) {
            map[key].pendingFollowupsCount = (map[key].pendingFollowupsCount || 0) + 1;
            if (overdueInfo.daysOverdue > (map[key].maxDaysOverdue || 0)) {
              map[key].maxDaysOverdue = overdueInfo.daysOverdue;
            }
          }
        });
      });
      list = Object.values(map);
      list.sort((a, b) => {
        if (a.isLeader && !b.isLeader) return -1;
        if (!a.isLeader && b.isLeader) return 1;
        return (b.totalFunnel || 0) - (a.totalFunnel || 0) || (b.totalLeads || 0) - (a.totalLeads || 0);
      });
    }

    // Strictly deduplicate list by canonical name case-insensitively
    const deduplicatedMap = {};
    list.forEach((card) => {
      const canonical = getCanonicalBdmName(card.name);
      if (!canonical) return;
      const key = canonical.toLowerCase();
      if (!deduplicatedMap[key]) {
        deduplicatedMap[key] = {
          ...card,
          name: canonical,
          leads: Array.isArray(card.leads) ? [...card.leads] : [],
        };
      } else {
        const existing = deduplicatedMap[key];
        const existingLeadIds = new Set((existing.leads || []).map((l) => l.id));
        if (Array.isArray(card.leads)) {
          card.leads.forEach((l) => {
            if (!existingLeadIds.has(l.id)) {
              existing.leads.push(l);
              existingLeadIds.add(l.id);
            }
          });
        }
        existing.totalLeads = Math.max(existing.totalLeads || 0, card.totalLeads || 0, existing.leads.length);
        existing.activeLeads = Math.max(existing.activeLeads || 0, card.activeLeads || 0);
        existing.totalFunnel = Math.max(existing.totalFunnel || 0, card.totalFunnel || 0);
        existing.hotCount = Math.max(existing.hotCount || 0, card.hotCount || 0);
        existing.hotValue = Math.max(existing.hotValue || 0, card.hotValue || 0);
        existing.warmCount = Math.max(existing.warmCount || 0, card.warmCount || 0);
        existing.warmValue = Math.max(existing.warmValue || 0, card.warmValue || 0);
        existing.lostCount = Math.max(existing.lostCount || 0, card.lostCount || 0);
        existing.closedCount = Math.max(existing.closedCount || 0, card.closedCount || 0);
        existing.closedValue = Math.max(existing.closedValue || 0, card.closedValue || 0);
        existing.meetingCount = Math.max(existing.meetingCount || 0, card.meetingCount || 0);
        if (!existing.nextMeetingLead && card.nextMeetingLead) existing.nextMeetingLead = card.nextMeetingLead;
        if (!existing.lastFollowUp && card.lastFollowUp) existing.lastFollowUp = card.lastFollowUp;
        if (!existing.nearestEdcLead && card.nearestEdcLead) existing.nearestEdcLead = card.nearestEdcLead;
        if (!existing.isLeader && card.isLeader) existing.isLeader = true;
      }
    });
    list = Object.values(deduplicatedMap);

    // Ensure pendingFollowupsCount and maxDaysOverdue are strictly synchronized
    list = list.map((card) => {
      let maxOverdue = card.maxDaysOverdue || 0;
      let overdueCount = card.pendingFollowupsCount || 0;
      if (card.leads && Array.isArray(card.leads)) {
        overdueCount = 0;
        card.leads.forEach((l) => {
          const info = getLeadOverdueInfo(l);
          if (info.isOverdue) {
            overdueCount++;
            if (info.daysOverdue > maxOverdue) {
              maxOverdue = info.daysOverdue;
            }
          }
        });
      }
      return {
        ...card,
        pendingFollowupsCount: overdueCount,
        maxDaysOverdue: maxOverdue,
      };
    });

    return list;
  }, [isAdmin, analytics, leads, getLeadOverdueInfo]);

  // Filtered cards for display in Cockpit based on Tab, Sort and Search
  const filteredAdminCards = useMemo(() => {
    let result = adminBdmCards;

    if (adminCockpitTab === 'LEADERS') {
      result = result.filter((c) => c.isLeader);
    } else if (adminCockpitTab === 'MEMBERS') {
      result = result.filter((c) => !c.isLeader);
    } else if (adminCockpitTab === 'PENDING_FOLLOWUPS') {
      result = result.filter((c) => (c.pendingFollowupsCount || 0) > 0);
    } else if (adminCockpitTab === 'ACTIVE_ONLY') {
      result = result.filter((c) => (c.totalFunnel || 0) > 0 || (c.activeLeads || 0) > 0 || (c.totalLeads || 0) > 0);
    }

    if (adminCockpitSearch.trim()) {
      const q = adminCockpitSearch.toLowerCase().trim();
      result = result.filter((c) => c.name.toLowerCase().includes(q) || (c.leaderName && c.leaderName.toLowerCase().includes(q)));
    }

    result = [...result].sort((a, b) => {
      if (adminCockpitSort === 'OVERDUE_DESC') {
        return (b.maxDaysOverdue || 0) - (a.maxDaysOverdue || 0) || (b.pendingFollowupsCount || 0) - (a.pendingFollowupsCount || 0);
      }
      if (adminCockpitSort === 'OVERDUE_ASC') {
        return (a.maxDaysOverdue || 0) - (b.maxDaysOverdue || 0) || (a.pendingFollowupsCount || 0) - (b.pendingFollowupsCount || 0);
      }
      if (adminCockpitSort === 'FUNNEL_DESC') {
        return (b.totalFunnel || 0) - (a.totalFunnel || 0);
      }
      if (a.isLeader && !b.isLeader) return -1;
      if (!a.isLeader && b.isLeader) return 1;
      return (b.totalFunnel || 0) - (a.totalFunnel || 0) || (b.totalLeads || 0) - (a.totalLeads || 0);
    });

    return result;
  }, [adminBdmCards, adminCockpitTab, adminCockpitSort, adminCockpitSearch]);

  const pendingFollowupsBdmCount = useMemo(() => {
    return adminBdmCards.filter((c) => (c.pendingFollowupsCount || 0) > 0).length;
  }, [adminBdmCards]);

  // Aggregate stats for Admin Cockpit header
  const adminTotalFunnel = useMemo(() => {
    return adminBdmCards.reduce((sum, c) => sum + (c.totalFunnel || 0), 0);
  }, [adminBdmCards]);

  const adminTotalActiveLeads = useMemo(() => {
    return adminBdmCards.reduce((sum, c) => sum + (c.activeLeads || 0), 0);
  }, [adminBdmCards]);

  const leadersCount = useMemo(() => {
    return adminBdmCards.filter((c) => c.isLeader).length;
  }, [adminBdmCards]);

  const membersCount = useMemo(() => {
    return adminBdmCards.filter((c) => !c.isLeader).length;
  }, [adminBdmCards]);

  const activeFunnelCount = useMemo(() => {
    return adminBdmCards.filter((c) => (c.totalFunnel || 0) > 0 || (c.activeLeads || 0) > 0 || (c.totalLeads || 0) > 0).length;
  }, [adminBdmCards]);

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
      toast.warning('Please enter the client company name before submitting.', 'Missing Company Name');
      return;
    }
    const cleanPhone = form.mobileNo.trim();
    if (!cleanPhone) {
      toast.warning('Please provide a mobile number for client communication.', 'Missing Mobile Number');
      return;
    }
    const digits = cleanPhone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      toast.warning('Please enter a valid mobile number (must be 8-15 digits including country code).', 'Invalid Mobile Format');
      return;
    }
    if (cleanPhone.startsWith('+91') || (!cleanPhone.startsWith('+') && digits.length === 10)) {
      const indianDigits = cleanPhone.startsWith('+91') ? digits.slice(2) : digits;
      if (indianDigits.length !== 10 || !/^[6-9]\d{9}$/.test(indianDigits)) {
        toast.warning('Indian mobile number must be exactly 10 digits starting with 6, 7, 8, or 9.', 'Invalid Mobile Format');
        return;
      }
    }
    if (!form.parentLeadId && duplicateCompanyLead) {
      toast.warning(
        `A lead with company name "${duplicateCompanyLead.companyName}" already exists in LMS. Company Name must be strictly unique.`,
        'Duplicate Company Name'
      );
      return;
    }
    if (!form.parentLeadId && duplicatePhoneLead) {
      showDuplicatePhonePopup(
        `This mobile number is already registered in LMS for "${duplicatePhoneLead.companyName}".`
      );
      return;
    }

    const currentToday = getTodayDateStr();
    if (form.meetingDate && form.meetingDate < currentToday) {
      toast.warning('Scheduled meeting date cannot be in the past. Please choose today or an upcoming date.', 'Invalid Meeting Date');
      return;
    }
    if (form.expectedDateOfCloser && form.expectedDateOfCloser < currentToday) {
      toast.warning('Expected Date of Closure (EDC) cannot be in the past. Please choose today or an estimated future closing date.', 'Invalid Closure Date');
      return;
    }

    try {
      setSubmitting(true);

      const targetBdm = loggedInBdmName || form.bdmName1;

      const targetLeader = fetchedLeaderName || (isLeader && matchedLeaderName ? matchedLeaderName : form.leaderName) || 'Management';
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
      if (form.parentLeadId) {
        formData.append('parentLeadId', form.parentLeadId);
      }
      if (quotationFile) {
        formData.append('quotation', quotationFile);
      }

      await api.post('/leads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const addedValueMsg = form.dealValue ? ` with deal value of ₹${Number(form.dealValue).toLocaleString('en-IN')}` : '';
      toast.success(`Lead for "${form.companyName}" successfully logged into your LMS${addedValueMsg}! Your pipeline deal funnel has been updated.`);

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
      const errMsg = err.response?.data?.error || err.message || 'Failed to create lead.';
      if (
        errMsg.toLowerCase().includes('already exists') ||
        errMsg.toLowerCase().includes('phone number') ||
        errMsg.toLowerCase().includes('mobile number')
      ) {
        showDuplicatePhonePopup(errMsg);
      } else {
        toast.error(errMsg);
      }
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
      toast.error('Failed to download quotation file: ' + (err.response?.data?.error || err.message));
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
        toast.warning('Meeting date cannot be in the past. Please select today or an upcoming date.');
        return;
      }
      if (updates.expectedDateOfCloser && updates.expectedDateOfCloser < currentToday) {
        toast.warning('Expected Date of Closer (EDC) cannot be in the past. Please select today or an upcoming date.');
        return;
      }
      const formattedUpdates = { ...updates };
      if (formattedUpdates.clientStatus) {
        formattedUpdates.clientStatus = normalizeClientStatus(formattedUpdates.clientStatus);
      }
      // Optimistically update local state for immediate responsive UI
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, ...formattedUpdates } : l))
      );
      await api.patch(`/leads/${leadId}`, formattedUpdates);
      toast.success('Lead updated successfully.');
      fetchLeads();
      window.dispatchEvent(new Event('lms_leads_changed'));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update lead.');
      fetchLeads();
    }
  };

  // Delete Lead
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${leadId}`);
      toast.success('Lead deleted.');
      fetchLeads();
      window.dispatchEvent(new Event('lms_leads_changed'));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete lead.');
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
      if (isAdmin && selectedLeaderFilter !== 'ALL') params.leaderName = selectedLeaderFilter;
      if (selectedCloserFilter !== 'ALL') params.closerStatus = selectedCloserFilter;
      if (selectedClientStatusFilter !== 'ALL') params.clientStatus = selectedClientStatusFilter;
      if (selectedSourcingFilter !== 'ALL') params.sourcingStatus = selectedSourcingFilter;
      if (selectedMeetingFilter !== 'ALL') params.meetingStatus = selectedMeetingFilter;
      if (selectedStageFilter !== 'ALL') params.leadStatus = selectedStageFilter;
      if (selectedTeamMemberFilter && selectedTeamMemberFilter !== 'ALL') params.teamMember = selectedTeamMemberFilter;
      params.monthFilter = selectedMonthFilter || 'THIS_MONTH';
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedLoggedDate) params.loggedDate = selectedLoggedDate;

      let exportList = [];
      try {
        const res = await api.get('/leads', { params });
        exportList = res.data?.leads || [];
      } catch (e) {
        exportList = displayedLeads;
      }

      if (exportList.length === 0) {
        exportList = displayedLeads;
      }

      // Strict access filter for non-admin:
      // Leaders/BDMs must NEVER export team members' Self Closer leads!
      if (!isAdmin) {
        const myName = (loggedInBdmName || '').toLowerCase().trim();
        exportList = exportList.filter((lead) => {
          const b1 = (lead.bdmName1 || '').toLowerCase().trim();
          const b2 = (lead.bdmName2 || '').toLowerCase().trim();
          const isOwn = b1.includes(myName) || myName.includes(b1) || b2.includes(myName) || (lead.createdById === currentUser?.id);
          const isLeadSharing = (lead.closerStatus || '').toUpperCase().includes('LEAD SHARING');
          return isOwn || (isLeader && isLeadSharing);
        });

        // Also respect active month tab filter on exportList
        if (selectedMonthFilter === 'NEXT_MONTH') {
          exportList = exportList.filter((l) => getLeadMonthBadge(l)?.icon === '🚀');
        } else if (selectedMonthFilter === 'THIS_MONTH') {
          exportList = exportList.filter((l) => getLeadMonthBadge(l)?.icon === '📅');
        } else if (selectedMonthFilter === 'PENDING_FOLLOWUPS') {
          exportList = exportList.filter((l) => getLeadOverdueInfo(l).isOverdue);
        }
      }

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
          {/* Deal Funnel Leaderboard Toggle (For Admin & Team Leaders ONLY) */}
          {(isAdmin || isLeader) && (
            <button
              onClick={() => setShowBdmLeaderboard(!showBdmLeaderboard)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${showBdmLeaderboard
                ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{showBdmLeaderboard ? 'Hide BDM Funnels' : 'BDM Funnel Breakdown'}</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            disabled={displayedLeads.length === 0 || exportingCsv}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportingCsv ? 'Exporting...' : `Export CSV (${displayedLeads.length})`}</span>
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



      {/* 2A. BDM PERSONAL KPI TILES (HERO FUNNEL VALUE CARD + STATUS COUNTERS - HIDDEN FOR ADMIN) */}
      {!isAdmin && (
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
              ₹{Number(bdmPersonalFunnel).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-slate-300 mt-2 pt-2 border-t border-white/10 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="text-rose-400 font-bold">🔥 Hot:</span>
                <span className="text-white font-semibold">
                  ₹{Number(bdmHotFunnel).toLocaleString('en-IN')}
                </span>
              </span>
              <span className="text-white/20">•</span>
              <span className="flex items-center gap-1">
                <span className="text-amber-400 font-bold">☀️ Warm:</span>
                <span className="text-white font-semibold">
                  ₹{Number(bdmWarmFunnel).toLocaleString('en-IN')}
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
              Val: ₹{Number(bdmHotFunnel).toLocaleString('en-IN')}
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
              Val: ₹{Number(bdmWarmFunnel).toLocaleString('en-IN')}
            </div>
          </div>

          {/* Lost Clients */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <span>❄️</span> Lost Clients
            </span>
            <div className="text-xl font-extrabold text-slate-700 mt-0.5">
              {ownDirectLeads.filter((l) => (l.clientStatus || '').toLowerCase() === 'lost').length}
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
              {ownDirectLeads.filter((l) =>
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
            className={`p-3.5 rounded-xl border shadow-xs transition cursor-pointer ${pendingFollowUpFilter
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
      )}

      {/* 2B. ADMIN BDM & LEADER PERFORMANCE TRACKING COCKPIT (ADMIN ONLY) */}
      {isAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      BDM & Team Leaders Performance Tracker
                    </h2>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {adminBdmCards.length} Tracked
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pipeline tracking across team leaders and BDMs. Click any card to inspect detailed dossier and leads.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-600">
                <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                <span>Total Active Funnel:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(adminTotalFunnel).toLocaleString('en-IN')}
                </span>
              </div>

              {selectedTeamMemberFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedTeamMemberFilter('ALL')}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  title="Clear current table filter"
                >
                  <span>Filtered: {selectedTeamMemberFilter}</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setAdminCockpitTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer border ${adminCockpitTab === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                All ({adminBdmCards.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminCockpitTab('LEADERS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer border flex items-center gap-1.5 ${adminCockpitTab === 'LEADERS'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <span>Team Leaders</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${adminCockpitTab === 'LEADERS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {leadersCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAdminCockpitTab('MEMBERS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer border flex items-center gap-1.5 ${adminCockpitTab === 'MEMBERS'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <span>BDM Members</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${adminCockpitTab === 'MEMBERS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {membersCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdminCockpitTab('PENDING_FOLLOWUPS');
                  setAdminCockpitSort('OVERDUE_DESC');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer border flex items-center gap-1.5 ${adminCockpitTab === 'PENDING_FOLLOWUPS'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                  : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                  }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Pending Follow-ups</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${adminCockpitTab === 'PENDING_FOLLOWUPS' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                  }`}>
                  {pendingFollowupsBdmCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAdminCockpitTab('ACTIVE_ONLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer border flex items-center gap-1.5 ${adminCockpitTab === 'ACTIVE_ONLY'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <span>Active Pipeline</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${adminCockpitTab === 'ACTIVE_ONLY' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {activeFunnelCount}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Overdue / Metric Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Sort:</span>
                <select
                  value={adminCockpitSort}
                  onChange={(e) => setAdminCockpitSort(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="DEFAULT">Default (Leaders First)</option>
                  <option value="OVERDUE_DESC">⏳ Overdue Days: Max to Min</option>
                  <option value="OVERDUE_ASC">⏳ Overdue Days: Min to Max</option>
                  <option value="FUNNEL_DESC">💰 Highest Funnel Value</option>
                </select>
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={adminCockpitSearch}
                  onChange={(e) => setAdminCockpitSearch(e.target.value)}
                  placeholder="Search by name or team..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8.5 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-slate-800"
                />
                {adminCockpitSearch && (
                  <button
                    type="button"
                    onClick={() => setAdminCockpitSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredAdminCards.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500 space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">
                {adminCockpitTab === 'PENDING_FOLLOWUPS'
                  ? '🎉 No Pending Follow-ups! All BDMs & Leaders are up to date.'
                  : 'No BDMs or Leaders match this filter'}
              </p>
              <p className="text-[11px] text-slate-400">
                {adminCockpitTab === 'PENDING_FOLLOWUPS'
                  ? 'All overdue follow-ups have been addressed.'
                  : 'Try selecting "All" or clearing your search query.'}
              </p>
              {adminCockpitTab !== 'ALL' && (
                <div>
                  <button
                    type="button"
                    onClick={() => setAdminCockpitTab('ALL')}
                    className="mt-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>View All ({adminBdmCards.length}) BDMs & Leaders</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredAdminCards.map((member) => {
                const isSelected = selectedTeamMemberFilter.toLowerCase() === member.name.toLowerCase();
                const memberInitials = member.name
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={member.name}
                    onClick={() => setSelectedBdmDetailModal(member)}
                    className={`bg-white border rounded-xl p-4 transition shadow-2xs flex flex-col justify-between gap-3 cursor-pointer group ${isSelected
                      ? 'border-slate-900 ring-2 ring-slate-900/10 bg-slate-50/30'
                      : 'border-slate-200 hover:border-slate-400 hover:shadow-xs'
                      }`}
                  >
                    <div>
                      {/* Card Header: Avatar, Name, Role tag, Funnel Value */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${member.isLeader
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                          >
                            {memberInitials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition">
                                {member.name}
                              </h4>
                              {member.isLeader && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  Leader
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block font-normal truncate max-w-[150px]">
                              {member.isLeader
                                ? 'Team Leader'
                                : member.leaderName
                                  ? `Team: ${member.leaderName}`
                                  : 'BDM Member'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-mono font-bold text-slate-900 block leading-tight">
                            ₹{Number(member.totalFunnel || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase font-medium">
                            Funnel Value
                          </span>
                          {(member.salesTarget || BDM_TARGET_MAP[member.name]) ? (
                            <span className="text-[10px] text-slate-600 block font-medium mt-0.5">
                              Target: ₹{Number(member.salesTarget || BDM_TARGET_MAP[member.name]).toLocaleString('en-IN')}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* 5 Status Counters in a Clean Neutral Grid */}
                      <div className="grid grid-cols-5 gap-1.5 mt-3 text-center">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5">
                          <span className="text-[9px] text-slate-500 uppercase font-medium block truncate">
                            Active
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {member.activeLeads || 0}
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5">
                          <span className="text-[9px] text-slate-500 uppercase font-medium block truncate">
                            Hot
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {member.hotCount || 0}
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5">
                          <span className="text-[9px] text-slate-500 uppercase font-medium block truncate">
                            Warm
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {member.warmCount || 0}
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5">
                          <span className="text-[9px] text-slate-500 uppercase font-medium block truncate">
                            Lost
                          </span>
                          <span className="text-xs font-bold text-slate-600">
                            {member.lostCount || 0}
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5">
                          <span className="text-[9px] text-slate-500 uppercase font-medium block truncate">
                            Closed
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {member.closedCount || 0}
                          </span>
                        </div>
                      </div>

                      {/* Detail Metrics: Meeting, Follow-up, EDC */}
                      <div className="mt-3 space-y-1.5 text-xs border-t border-slate-100 pt-2.5">
                        {/* Meeting */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-medium uppercase flex items-center gap-1 shrink-0 mt-0.5">
                            Meeting:
                          </span>
                          <div className="text-right">
                            {member.nextMeetingLead ? (
                              <div className="leading-snug">
                                <span className="font-semibold text-slate-800 text-[11px]">
                                  {member.nextMeetingLead.meetingDate
                                    ? new Date(member.nextMeetingLead.meetingDate).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
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

                        {/* Last Follow Up */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-medium uppercase flex items-center gap-1 shrink-0 mt-0.5">
                            Follow-up:
                          </span>
                          <div className="text-right">
                            {member.lastFollowUp ? (
                              <div className="leading-snug">
                                <div className="flex items-center justify-end gap-1.5 text-[11px]">
                                  <span className="font-semibold text-slate-800">
                                    {new Date(member.lastFollowUp.date).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {member.lastFollowUp.status}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 block truncate max-w-[170px]" title={member.lastFollowUp.companyName}>
                                  {member.lastFollowUp.companyName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No follow-ups yet</span>
                            )}
                          </div>
                        </div>

                        {/* EDC Target */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-medium uppercase flex items-center gap-1 shrink-0 mt-0.5">
                            EDC Target:
                          </span>
                          <div className="text-right">
                            {member.nearestEdcLead?.expectedDateOfCloser ? (
                              <div className="leading-snug">
                                <span className="font-semibold text-slate-800 text-[11px]">
                                  {new Date(member.nearestEdcLead.expectedDateOfCloser).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                  })}
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate max-w-[170px]" title={member.nearestEdcLead.companyName}>
                                  {member.nearestEdcLead.companyName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Not set</span>
                            )}
                          </div>
                        </div>

                        {/* Overdue Follow-ups */}
                        {member.pendingFollowupsCount > 0 && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBdmDetailModal(member);
                              setBdmDetailModalTab('FOLLOWUPS');
                            }}
                            className="mt-1 flex items-center justify-between text-[11px] font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-md transition cursor-pointer"
                            title="Click to inspect overdue follow-ups and revoke leads"
                          >
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Overdue Follow-ups:</span>
                            </span>
                            <span className="font-mono">
                              {member.pendingFollowupsCount} {member.pendingFollowupsCount === 1 ? 'Lead' : 'Leads'}
                              {member.maxDaysOverdue > 0 ? ` (${member.maxDaysOverdue}d max)` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Action Buttons */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBdmDetailModal(member);
                        }}
                        className="w-full py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1 border border-slate-300 transition cursor-pointer"
                        title="Click to view detailed info"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2B. BDM FUNNEL LEADERBOARD (Collapsible breakdown for Admin & Leader ONLY) */}
      {(isAdmin || isLeader) && showBdmLeaderboard && (
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
            {form.parentLeadId && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                  <Plus className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Adding New Requirement for Existing Client: <strong>{form.companyName}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      ...initialFormState,
                      leaderName: fetchedLeaderName || initialFormState.leaderName,
                      bdmName1: loggedInBdmName || initialFormState.bdmName1,
                    });
                    setIsFormOpen(false);
                  }}
                  className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Row 1: Company Name, Director Name, Mobile, Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    readOnly={Boolean(form.parentLeadId)}
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="e.g. Acme Innovations Pvt Ltd"
                    className={`w-full h-10 border rounded-xl pl-9 pr-3 text-xs text-slate-900 focus:outline-none transition-colors ${
                      form.parentLeadId
                        ? 'bg-slate-100 border-slate-300 cursor-not-allowed font-semibold'
                        : duplicateCompanyLead
                          ? 'bg-rose-50/30 border-rose-400 focus:border-rose-500 focus:bg-white'
                          : 'bg-slate-50 border-slate-300 focus:border-slate-800 focus:bg-white'
                    }`}
                  />
                </div>
                {duplicateCompanyLead && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>A lead with company name "{duplicateCompanyLead.companyName}" already exists in LMS.</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Director Name
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    readOnly={Boolean(form.parentLeadId)}
                    value={form.directorName}
                    onChange={(e) => setForm({ ...form, directorName: e.target.value })}
                    placeholder="e.g. Rajesh Kumar Sharma"
                    className={`w-full h-10 border border-slate-300 rounded-xl pl-9 pr-3 text-xs text-slate-900 focus:outline-none transition-colors ${
                      form.parentLeadId ? 'bg-slate-100 cursor-not-allowed font-semibold' : 'bg-slate-50 focus:bg-white focus:border-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Mobile No <span className="text-rose-500">*</span>
                </label>
                {form.parentLeadId ? (
                  <div className="w-full h-10 bg-slate-100 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 font-mono font-semibold flex items-center gap-2 cursor-not-allowed">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{form.mobileNo}</span>
                  </div>
                ) : (
                  <CountryCodePhoneInput
                    value={form.mobileNo}
                    onChange={(val) => setForm({ ...form, mobileNo: val })}
                    required
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl focus-within:bg-white focus-within:border-slate-800 transition-colors shadow-2xs"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Email ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    readOnly={Boolean(form.parentLeadId)}
                    value={form.emailId}
                    onChange={(e) => setForm({ ...form, emailId: e.target.value })}
                    placeholder="contact@acme.com"
                    className={`w-full h-10 border border-slate-300 rounded-xl pl-9 pr-3 text-xs text-slate-900 focus:outline-none transition-colors ${
                      form.parentLeadId ? 'bg-slate-100 cursor-not-allowed font-semibold' : 'bg-slate-50 focus:bg-white focus:border-slate-800'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Leader's Name, BDM-I (Locked to current BDM), BDM-II, Closer Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>Leader's Name <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Auto-assigned</span>
                </label>
                <div className="w-full h-10 bg-slate-100 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 font-bold flex items-center justify-between cursor-not-allowed select-none shadow-2xs">
                  <span className="flex items-center gap-1.5 truncate">
                    <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate">{fetchedLeaderName || form.leaderName || 'Management'}</span>
                  </span>
                  <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-bold shrink-0">
                    {isLeader ? 'Leader (You)' : 'Leader'}
                  </span>
                </div>
              </div>

              {/* BDM-I: LOCKED TO CURRENT LOGGED-IN BDM */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  BDM's Name - I (Primary BDM) <span className="text-rose-500">*</span>
                </label>
                <div className="w-full h-10 bg-slate-100 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    {loggedInBdmName}
                  </span>
                  <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                    You
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  BDM's Name - II (Secondary / Co-BDM)
                </label>
                <select
                  value={form.bdmName2}
                  onChange={(e) => setForm({ ...form, bdmName2: e.target.value })}
                  className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 font-medium focus:bg-white focus:border-slate-800 focus:outline-none transition-colors"
                >
                  <option value="">-- None (Single BDM) --</option>
                  {LMS_BDMS.filter((b) => b !== loggedInBdmName && (isLeader || !LMS_LEADERS.some((l) => l.toLowerCase() === b.toLowerCase()))).map((bdm) => (
                    <option key={bdm} value={bdm}>{bdm}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Closer Status <span className="text-rose-500">*</span>
                </label>
                {isLeader ? (
                  <div className="w-full h-10 bg-slate-100 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-emerald-600" />
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
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 font-medium focus:bg-white focus:border-slate-800 focus:outline-none transition-colors"
                  >
                    {LMS_CLOSER_STATUSES.map((cs) => (
                      <option key={cs} value={cs}>{cs}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Row 3: Client Status, Sourcing Channel, Meeting Mode & Meeting Date (Clean 4-column layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Client Status Selector (Hot / Warm / Lost) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Client Status <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-300">
                  {LMS_CLIENT_STATUSES.map((cs) => {
                    const active = normalizeClientStatus(form.clientStatus) === cs.id;
                    return (
                      <button
                        key={cs.id}
                        type="button"
                        onClick={() => setForm({ ...form, clientStatus: cs.id })}
                        className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${active
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
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Sourcing Status <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={form.sourcingStatus}
                  onChange={(e) => setForm({ ...form, sourcingStatus: e.target.value })}
                  className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 font-medium focus:bg-white focus:border-slate-800 focus:outline-none transition-colors"
                >
                  {LMS_SOURCING_STATUSES.map((src) => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Meeting Status <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={form.meetingStatus}
                  onChange={(e) => setForm({ ...form, meetingStatus: e.target.value })}
                  className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 font-medium focus:bg-white focus:border-slate-800 focus:outline-none transition-colors"
                >
                  {LMS_MEETING_STATUSES.map((ms) => (
                    <option key={ms} value={ms}>{ms}</option>
                  ))}
                </select>
              </div>

              {/* MEETING DATE */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Meeting Date(First Follow-Up)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    min={getTodayDateStr()}
                    value={form.meetingDate}
                    onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: EDC Closer Date, Estimated Deal Value & Real-time Funnel Preview (Spacious 4-col layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Expected Date of Closer (EDC)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    min={getTodayDateStr()}
                    value={form.expectedDateOfCloser}
                    onChange={(e) => setForm({ ...form, expectedDateOfCloser: e.target.value })}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              {/* ESTIMATED DEAL VALUE (₹) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Estimated Deal Value (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.dealValue}
                    onChange={(e) => setForm({ ...form, dealValue: e.target.value })}
                    onWheel={(e) => e.target.blur()}
                    placeholder="e.g. 10000, 10240"
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none font-mono tabular-nums font-bold transition-colors"
                  />
                </div>
              </div>

              {/* Real-Time BDM Funnel Accumulator Indicator (Spans 2 columns on desktop) */}
              <div className="sm:col-span-2 p-3 bg-indigo-50/70 border border-indigo-200/90 rounded-xl text-xs space-y-1.5 h-auto sm:h-10 sm:flex sm:items-center sm:justify-between sm:space-y-0 sm:px-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700">
                    Your Pipeline Funnel:
                  </span>
                  <strong className="font-extrabold text-slate-900 font-mono tabular-nums text-sm">
                    ₹{Number(currentBdmFunnel).toLocaleString('en-IN')}
                  </strong>
                </div>

                {enteredDealValue > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold text-xs font-mono tabular-nums">
                      +₹{Number(enteredDealValue).toLocaleString('en-IN')}
                    </span>
                    <span className="font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300/80 px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums">
                      ➔ Projected: ₹{Number(projectedBdmFunnel).toLocaleString('en-IN')}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">
                    Type deal amount to preview updated funnel
                  </div>
                )}
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
                    Quotation Document <span className="text-slate-400 font-normal">(Optional)</span>
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
                    Click to browse or drop quotation document here <span className="text-slate-400 font-normal">(Optional)</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select customer quotation in PDF format (<span className="font-semibold text-rose-600">.pdf</span>) or Microsoft Word format (<span className="font-semibold text-blue-600">.doc, .docx</span>)
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className={`p-2.5 rounded-lg border ${quotationFile.name.toLowerCase().endsWith('.pdf')
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-blue-50 text-blue-600 border-blue-200'
                      }`}>
                      <FileText className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="truncate max-w-xs">{quotationFile.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${quotationFile.name.toLowerCase().endsWith('.pdf')
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
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 w-full">
          {/* Search Box with Integrated Logged-Date Calendar Filter */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search company, director, phone, email, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-9 ${selectedLoggedDate ? 'pr-32' : 'pr-10'} text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors`}
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {selectedLoggedDate ? (
                <div className="flex items-center bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md h-6 pl-2 pr-1 gap-1 shadow-2xs">
                  <div className="relative flex items-center gap-1 cursor-pointer">
                    <Calendar className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span className="text-[11px] font-bold whitespace-nowrap">
                      {new Date(`${selectedLoggedDate}T00:00:00+05:30`).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        timeZone: 'Asia/Kolkata',
                      })}
                    </span>
                    <input
                      type="date"
                      value={selectedLoggedDate}
                      onChange={(e) => setSelectedLoggedDate(e.target.value)}
                      title="Change logged date filter"
                      aria-label="Filter by logged date"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLoggedDate('')}
                    title="Clear logged date filter"
                    aria-label="Clear logged date filter"
                    className="p-0.5 rounded hover:bg-indigo-200/70 text-indigo-600 hover:text-indigo-900 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  title="Filter by logged date"
                  className="relative flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <Calendar className="w-4 h-4 pointer-events-none" />
                  <input
                    type="date"
                    value={selectedLoggedDate}
                    onChange={(e) => setSelectedLoggedDate(e.target.value)}
                    aria-label="Filter by logged date"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              )}
            </div>
          </form>

          {/* Client Status Filter (Hot / Warm / Lost) */}
          <select
            value={selectedClientStatusFilter}
            onChange={(e) => setSelectedClientStatusFilter(e.target.value)}
            className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
          >
            <option value="ALL">All Client Statuses</option>
            <option value="Hot">🔥 Hot Clients</option>
            <option value="Warm">☀️ Warm Clients</option>
            <option value="Lost">❄️ Lost Clients</option>
          </select>

          {/* Leader Filter (ADMIN ONLY) */}
          {isAdmin && (
            <select
              value={selectedLeaderFilter}
              onChange={(e) => setSelectedLeaderFilter(e.target.value)}
              className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
            >
              <option value="ALL">All Leaders</option>
              {LMS_LEADERS.map((ldr) => (
                <option key={ldr} value={ldr}>{ldr}</option>
              ))}
            </select>
          )}

          {/* Team Member Filter for Leaders */}
          {isLeader && !isAdmin && (
            <select
              value={selectedTeamMemberFilter}
              onChange={(e) => setSelectedTeamMemberFilter(e.target.value)}
              className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
            >
              <option value="ALL">All Team Members</option>
              {teamMembersCards.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          )}

          {/* BDM Filter (ADMIN ONLY) */}
          {isAdmin && (
            <select
              value={selectedBdmFilter}
              onChange={(e) => setSelectedBdmFilter(e.target.value)}
              className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
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
            className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
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
            className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
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
            className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
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
            className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
          >
            <option value="ALL">All Stages</option>
            {LMS_LEAD_STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchLeads}
          className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs whitespace-nowrap self-stretch lg:self-auto flex items-center justify-center shrink-0"
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
      {!isAdmin && isLeader && (
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
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
                    className={`bg-white border rounded-xl p-4 transition shadow-2xs flex flex-col justify-between gap-3 ${isSelected
                      ? 'border-slate-900 ring-2 ring-slate-900/10 bg-slate-50/30'
                      : 'border-slate-200 hover:border-slate-400 hover:shadow-xs'
                      }`}
                  >
                    <div>
                      {/* Member Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {memberInitials}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 leading-tight">
                              {member.name}
                            </h4>
                            <span className="text-[10px] text-slate-500 block font-normal">
                              {member.isSelf ? 'Team Member (You)' : 'BDM Team Member'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-mono font-bold text-slate-900 block leading-tight">
                            ₹{Number(member.totalFunnel).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase font-medium">
                            Funnel Value
                          </span>
                        </div>
                      </div>

                      {/* Status Badges Row in Clean Neutral Grid */}
                      <div className="grid grid-cols-4 gap-1.5 mt-3 text-center">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5">
                          <span className="text-[9px] text-slate-500 uppercase font-medium block truncate">
                            Active Leads
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {member.activeLeads}
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5">
                          <span className="text-[9px] text-slate-500 uppercase font-medium block truncate">
                            Hot
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {member.hotCount}
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5">
                          <span className="text-[9px] text-slate-500 uppercase font-medium block truncate">
                            Warm
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {member.warmCount}
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5">
                          <span className="text-[9px] text-slate-500 uppercase font-medium block truncate">
                            Lost
                          </span>
                          <span className="text-xs font-bold text-slate-600">
                            {member.lostCount}
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5">
                          <span className="text-[9px] text-slate-500 uppercase font-medium block truncate">
                            Closed
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {member.closedCount}
                          </span>
                        </div>

                        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-lg p-1.5">
                          <span className="text-[9px] text-indigo-700 uppercase font-medium block truncate">
                            Self Close
                          </span>
                          <span className="text-xs font-bold text-indigo-900">
                            {member.selfCloseCount ?? 0}
                          </span>
                        </div>

                        <div className="col-span-2 bg-rose-50/70 border border-rose-200/80 rounded-lg p-1.5">
                          <span className="text-[9px] text-rose-700 uppercase font-medium block truncate">
                            Pending Follow-ups
                          </span>
                          <span className="text-xs font-bold text-rose-900">
                            {member.pendingFollowUpsCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Buttons */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBdmDetailModal(member);
                        }}
                        className="w-full py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1 border border-slate-300 transition cursor-pointer"
                        title="Click to view detailed info"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. LEADS DATA TABLE */}
      <div id="lms-leads-table-container" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${selectedMonthFilter === 'THIS_MONTH'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
            >
              <span>📅 This Month ({monthLabels.thisMonth})</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${selectedMonthFilter === 'THIS_MONTH' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
                }`}>
                {isAdmin ? (analytics?.thisMonthCount ?? 0) : myThisMonthCount}
              </span>
              <span className="text-[10px] opacity-80 font-medium">
                (₹{Number(isAdmin ? (analytics?.thisMonthFunnel || 0) : myThisMonthFunnel).toLocaleString('en-IN')})
              </span>
            </button>

            {/* Next Month Tab */}
            <button
              type="button"
              onClick={() => { setSelectedMonthFilter('NEXT_MONTH'); setPage(1); fetchLeads(1, limit, 'NEXT_MONTH'); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${selectedMonthFilter === 'NEXT_MONTH'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50/60 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
            >
              <span>🚀 Next Month ({monthLabels.nextMonth})</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${selectedMonthFilter === 'NEXT_MONTH' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'
                }`}>
                {isAdmin ? (analytics?.nextMonthCount ?? 0) : myNextMonthCount}
              </span>
              <span className="text-[10px] opacity-80 font-medium">
                (₹{Number(isAdmin ? (analytics?.nextMonthFunnel || 0) : myNextMonthFunnel).toLocaleString('en-IN')})
              </span>
            </button>

            {/* Pending Follow-ups Tab */}
            <button
              type="button"
              onClick={() => {
                setSelectedMonthFilter('PENDING_FOLLOWUPS');
                setPage(1);
                fetchLeads(1, limit, 'PENDING_FOLLOWUPS');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${selectedMonthFilter === 'PENDING_FOLLOWUPS'
                ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                : 'bg-rose-50/60 text-rose-800 border-rose-200 hover:bg-rose-100'
                }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Pending Follow-ups</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${selectedMonthFilter === 'PENDING_FOLLOWUPS' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-900'
                }`}>
                {displayPendingFollowupsCount}
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

        {/* Sub-bar for Pending Follow-ups: BDM selection and Days Overdue Sort */}
        {selectedMonthFilter === 'PENDING_FOLLOWUPS' && (
          <div className="bg-rose-50/40 border-b border-rose-200 px-5 py-2.5 flex items-center justify-between text-xs flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-rose-900 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-rose-600" />
                <span>Filter Overdue BDMs:</span>
              </span>
              <select
                value={overdueBdmFilter}
                onChange={(e) => setOverdueBdmFilter(e.target.value)}
                className="bg-white border border-rose-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none"
              >
                <option value="ALL">All BDMs with Overdue Follow-ups ({allOverdueLeads.length} leads)</option>
                {bdmsWithOverdueList.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} ({b.count} overdue • max {b.maxOverdue}d)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-bold uppercase text-slate-600">Sort Overdue:</span>
              <select
                value={overdueSortOrder}
                onChange={(e) => setOverdueSortOrder(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="MAX_TO_MIN">⬇️ Overdue Days: Max to Min (Highest Delay First)</option>
                <option value="MIN_TO_MAX">⬆️ Overdue Days: Min to Max (Lowest Delay First)</option>
              </select>
            </div>
          </div>
        )}

        {/* Table Scope Indicator Header */}
        <div className="bg-slate-50/60 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              {selectedLoggedDate
                ? `📅 Showing leads logged on ${new Date(`${selectedLoggedDate}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })} (${displayedLeads.length} leads in view${isAdmin ? `, ${pagination.total} total` : ''})`
                : selectedMonthFilter === 'PENDING_FOLLOWUPS'
                  ? `⚠️ Showing Pending Follow-ups (${displayedLeads.length} overdue leads in view${overdueBdmFilter !== 'ALL' ? ` for ${overdueBdmFilter}` : ''})`
                  : selectedMonthFilter === 'NEXT_MONTH'
                    ? `🚀 Showing Next Month (${monthLabels.nextMonth}) leads (${displayedLeads.length} leads in view${isAdmin ? `, ${pagination.total} total` : ''})`
                    : `📅 Showing This Month (${monthLabels.thisMonth}) leads (${displayedLeads.length} leads in view${isAdmin ? `, ${pagination.total} total` : ''})`}
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
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-2.5 w-[14%]">Company</th>
                <th className="py-2.5 px-2 w-[11%]">Mobile</th>
                <th className="py-2.5 px-2 w-[10%]">BDM</th>
                <th className="py-2.5 px-1.5 w-[9%]">Client Status</th>
                <th className="py-2.5 px-2 w-[16%]">Meeting Status</th>
                <th className="py-2.5 px-2 w-[8%]">Deal Value</th>
                <th className="py-2.5 px-1 w-[6%] text-center">Quote</th>
                <th className="py-2.5 px-2 w-[15%]">Stage</th>
                <th className="py-2.5 px-3 w-[11%] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                    Loading LMS lead records...
                  </td>
                </tr>
              ) : displayedLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
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
                (() => {
                  const childCountMap = {};
                  const childOrderMap = {};
                  displayedLeads.forEach((item) => {
                    if (item.parentLeadId) {
                      childCountMap[item.parentLeadId] = (childCountMap[item.parentLeadId] || 0) + 1;
                      childOrderMap[item.id] = childCountMap[item.parentLeadId];
                    }
                  });

                  return displayedLeads.map((lead, rowIdx) => {
                  const isExpanded = expandedLeadIds.has(lead.id);
                  const isPdf = lead.quotationFileName?.toLowerCase().endsWith('.pdf');
                  const currentClientStatus = normalizeClientStatus(lead.clientStatus);
                  const leadMonthBadge = getLeadMonthBadge(lead);
                  const isOverdue = isLeadFollowUpExceeded(lead);
                  const edcBadge = getEdcBadge(lead.expectedDateOfCloser, lead.leadStatus);
                  const leadFollowUps = getFollowUpsList(lead);
                  const isChildLead = Boolean(lead.parentLeadId);
                  const linkedChildrenCount = childCountMap[lead.id] || 0;
                  const isParentWithChildren = linkedChildrenCount > 0;
                  const childOrder = childOrderMap[lead.id] || 1;
                  const nextLead = displayedLeads[rowIdx + 1];
                  const isLastChildInGroup =
                    isChildLead && (!nextLead || nextLead.parentLeadId !== lead.parentLeadId);

                  return (
                    <React.Fragment key={lead.id}>
                      {/* MAIN COMPACT ROW */}
                      <tr
                        id={`lead-row-${lead.id}`}
                        className={`transition-colors ${
                          isChildLead
                            ? `bg-indigo-50/45 hover:bg-indigo-50/75 border-l-4 border-l-indigo-600 ${
                                isLastChildInGroup ? 'border-b-2 border-b-indigo-200' : 'border-b border-b-indigo-100'
                              }`
                            : isParentWithChildren
                              ? 'bg-indigo-50/15 hover:bg-indigo-50/35 border-l-4 border-l-indigo-600 border-b border-b-indigo-200/80'
                              : 'hover:bg-slate-50/80'
                        } ${isExpanded ? 'bg-indigo-50/50' : ''} ${highlightLeadId === lead.id ? 'ring-2 ring-indigo-500 bg-indigo-50/60' : ''}`}
                      >
                        {/* Company Name with Expand/Collapse Trigger */}
                        <td className={`py-2.5 pr-2.5 align-middle relative ${isChildLead ? 'pl-5' : 'px-2.5'}`}>
                          <div className="flex items-start gap-1.5 min-w-0">
                            {isChildLead && (
                              <div
                                className="relative flex items-center shrink-0 mr-0.5"
                                title={`Linked requirement #${childOrder} for ${lead.companyName}`}
                              >
                                <span className="w-3.5 h-5 border-l-2 border-b-2 border-indigo-400 rounded-bl-md inline-block -mt-2" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleLeadExpand(lead.id)}
                              className={`mt-0.5 w-5 h-5 flex items-center justify-center rounded transition-all shrink-0 cursor-pointer ${isExpanded
                                ? 'bg-slate-900 text-white rotate-90'
                                : isChildLead
                                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                                }`}
                              title={isExpanded ? 'Click to hide details' : 'Click to view more information'}
                            >
                              <ChevronRight className="w-3 h-3 transition-transform duration-150" />
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`text-xs leading-tight block truncate ${
                                    isChildLead ? 'font-semibold text-indigo-950' : 'font-bold text-slate-900'
                                  }`}
                                  title={lead.companyName}
                                >
                                  {lead.companyName}
                                </span>
                                {isParentWithChildren && (
                                  <span
                                    className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-600 text-white whitespace-nowrap shrink-0 shadow-2xs"
                                    title={`${linkedChildrenCount} linked additional requirement(s)`}
                                  >
                                    🔗 {linkedChildrenCount} Linked
                                  </span>
                                )}
                                {isChildLead && (
                                  <span
                                    className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 whitespace-nowrap shrink-0"
                                    title={`Linked requirement #${childOrder} for existing client`}
                                  >
                                    Linked #{childOrder}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 min-w-0">
                                {lead.directorName && (
                                  <span className="text-[11px] text-slate-500 block truncate" title={lead.directorName}>
                                    {lead.directorName}
                                  </span>
                                )}
                                {leadMonthBadge?.icon === '🚀' && (
                                  <span
                                    className="inline-flex items-center text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap shrink-0"
                                    title={`Pipeline scheduled for next month (${monthLabels.nextMonth})`}
                                  >
                                    Next Mo
                                  </span>
                                )}
                                {isOverdue && (
                                  <span
                                    className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap shrink-0"
                                    title={`Follow-up date exceeded: ${getLeadLatestFollowUp(lead)?.date || ''}`}
                                  >
                                    <Clock className="w-2.5 h-2.5 text-rose-600" />
                                    <span>Overdue</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Mobile No */}
                        <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                          <a
                            href={`tel:${lead.mobileNo}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 hover:text-indigo-600 font-mono tabular-nums"
                          >
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{lead.mobileNo}</span>
                          </a>
                        </td>

                        {/* BDM */}
                        <td className="py-2.5 px-2 align-middle">
                          <div className="text-xs font-bold text-slate-800 truncate" title={lead.bdmName1}>
                            {lead.bdmName1}
                          </div>
                          {(lead.closerStatus || '').toUpperCase().includes('LEAD SHARING') ? (
                            <span
                              className="inline-block text-[9px] font-semibold px-1 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 rounded mt-0.5 whitespace-nowrap"
                              title={`Shared with Leader: ${lead.leaderName}`}
                            >
                              🤝 Shared
                            </span>
                          ) : lead.bdmName2 ? (
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">+ {lead.bdmName2}</div>
                          ) : null}
                        </td>

                        {/* Client Status (Hot, Warm, Lost) */}
                        <td className="py-2.5 px-1.5 align-middle">
                          <select
                            value={currentClientStatus}
                            onChange={(e) => handleQuickUpdateLead(lead.id, { clientStatus: e.target.value })}
                            className="h-8 w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-800 transition-colors cursor-pointer"
                          >
                            <option value="Hot">🔥 Hot</option>
                            <option value="Warm">☀️ Warm</option>
                            <option value="Lost">❄️ Lost</option>
                          </select>
                        </td>

                        {/* Meeting Status */}
                        <td className="py-2.5 px-2 align-middle">
                          <select
                            value={lead.meetingStatus || LMS_MEETING_STATUSES[0]}
                            onChange={(e) => handleQuickUpdateLead(lead.id, { meetingStatus: e.target.value })}
                            className="h-8 w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-800 transition-colors cursor-pointer truncate"
                          >
                            {LMS_MEETING_STATUSES.map((ms) => (
                              <option key={ms} value={ms}>{ms}</option>
                            ))}
                          </select>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis flex-wrap">
                            {lead.meetingDate && (
                              <span title={`Meeting on ${new Date(lead.meetingDate).toLocaleDateString('en-IN')}`}>
                                📅 {new Date(lead.meetingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                            {lead.meetingDate && lead.expectedDateOfCloser && <span className="text-slate-300">•</span>}
                            {lead.expectedDateOfCloser && (
                              <span className="text-indigo-600 font-semibold cursor-pointer" onClick={() => toggleLeadExpand(lead.id)} title={`EDC Target: ${new Date(lead.expectedDateOfCloser).toLocaleDateString('en-IN')}. Updated via Follow-up.`}>
                                🎯 EDC: {new Date(lead.expectedDateOfCloser).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                            {(lead.meetingDate || lead.expectedDateOfCloser) && lead.nextFollowUpDate && <span className="text-slate-300">•</span>}
                            {lead.nextFollowUpDate && (
                              <span title={`Next Follow-up on ${new Date(lead.nextFollowUpDate).toLocaleDateString('en-IN')}`}>
                                Follow-up: {new Date(lead.nextFollowUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Deal Value */}
                        <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 tabular-nums">
                            {lead.dealValue ? `₹${Number(lead.dealValue).toLocaleString('en-IN')}` : <span className="text-slate-400 font-normal italic text-xs">—</span>}
                          </span>
                        </td>

                        {/* Quotation Document */}
                        <td className="py-2.5 px-1 text-center align-middle whitespace-nowrap">
                          {lead.quotationFileName ? (
                            <div className="inline-flex items-center gap-0.5 justify-center">
                              <span className="text-[9px] font-bold uppercase px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                                {lead.quotationFileName.split('.').pop()}
                              </span>
                              <button
                                onClick={() => handleDownloadQuotation(lead)}
                                disabled={downloadingId === lead.id}
                                title={`Download ${lead.quotationFileName}`}
                                className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded transition cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              {isPdf && (
                                <button
                                  onClick={() => handlePreviewQuotation(lead)}
                                  title="Open PDF Preview"
                                  className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded transition cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Pipeline Stage */}
                        <td className="py-2.5 px-2 align-middle">
                          <select
                            value={lead.leadStatus || 'OPEN'}
                            onChange={(e) => handleQuickUpdateLead(lead.id, { leadStatus: e.target.value })}
                            className="h-8 w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-800 transition-colors cursor-pointer truncate"
                          >
                            {LMS_LEAD_STAGES.map((stg) => (
                              <option key={stg.id} value={stg.id}>{stg.label}</option>
                            ))}
                          </select>
                        </td>

                        {/* Action */}
                        <td className="py-2.5 px-3 text-right align-middle whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Convert to Deal Button */}
                            <button
                              onClick={() => {
                                if (onConvertToDeal) {
                                  onConvertToDeal({
                                    companyName: lead.companyName,
                                    clientName: lead.directorName || lead.companyName,
                                    clientPhone: lead.mobileNo,
                                    clientEmail: lead.emailId || '',
                                    remarks: `Converted from LMS (Client Status: ${normalizeClientStatus(lead.clientStatus)}, Funnel Value: ₹${lead.dealValue || 0}, Leader: ${lead.leaderName}, Source: ${lead.sourcingStatus}). Quotation: ${lead.quotationFileName || 'None'}. ${lead.remarks || ''}`,
                                  });
                                }
                              }}
                              title="Convert Lead into Active Deal"
                              className="h-8 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <span>Deal</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>

                            {/* Revoke & Reassign Lead (Admin only) */}
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  const overdueInfo = getLeadOverdueInfo(lead);
                                  setReassignModalLead(lead);
                                  setReassignForm({
                                    newBdmName: '',
                                    newLeaderName: lead.leaderName || LMS_LEADERS[0],
                                    reason: overdueInfo.isOverdue
                                      ? `Follow-up overdue for ${overdueInfo.daysOverdue} days without response.`
                                      : 'Administrative lead reassignment.',
                                    nextFollowUpDate: getTodayDateStr(),
                                    handoverNotes: '',
                                  });
                                }}
                                title="Revoke & Reassign Lead to another BDM"
                                className={`px-2 py-1 rounded text-[11px] font-bold transition shadow-2xs flex items-center gap-0.5 cursor-pointer ${getLeadOverdueInfo(lead).isOverdue
                                  ? 'bg-rose-700 hover:bg-rose-800 text-white ring-1 ring-rose-400'
                                  : 'bg-slate-800 hover:bg-slate-900 text-white'
                                  }`}
                              >
                                <ArrowRightLeft className="w-2.5 h-2.5" />
                                <span>Reassign</span>
                              </button>
                            )}

                            {/* Delete Lead */}
                            {(isAdmin || lead.createdById === currentUser?.id) && (
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                title="Delete Lead"
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
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
                                  {(lead.closerStatus || '').toUpperCase().includes('LEAD SHARING') && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                      🤝 Shared with Leader: {lead.leaderName}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
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
                                  {!isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setForm({
                                          ...initialFormState,
                                          parentLeadId: lead.id,
                                          companyName: lead.companyName || '',
                                          directorName: lead.directorName || '',
                                          mobileNo: lead.mobileNo || '',
                                          emailId: lead.emailId || '',
                                          leaderName: fetchedLeaderName || lead.leaderName || initialFormState.leaderName,
                                          bdmName1: loggedInBdmName || lead.bdmName1 || '',
                                          closerStatus: isLeader ? 'Self Closer' : LMS_CLOSER_STATUSES[0],
                                        });
                                        setQuotationFile(null);
                                        setFileError(null);
                                        if (quotationInputRef.current) quotationInputRef.current.value = '';
                                        setIsFormOpen(true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      className="text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                      title="Log another service requirement for this same client"
                                    >
                                      <Plus className="w-3 h-3" /> Add New
                                    </button>
                                  )}
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
                                          toast.warning('Meeting date cannot be in the past. Please select today or an upcoming date.');
                                          return;
                                        }
                                        handleQuickUpdateLead(lead.id, { meetingDate: val || null });
                                      }}
                                      className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-400 cursor-pointer w-full shadow-2xs"
                                      title="Click to set or change Meeting Date"
                                    />
                                  </div>
                                </div>

                                {/* 6. Expected Date of Closer (EDC) - Label (Updated via Follow-up Modal) */}
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-indigo-500" /> Expected Date of Closer (EDC)
                                    </span>
                                    {edcBadge && (
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${edcBadge.color}`}>
                                        {edcBadge.label}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 flex items-center justify-between bg-white border border-slate-200 rounded px-2.5 py-1.5 shadow-2xs">
                                    <span className="text-xs font-semibold text-slate-800 font-mono">
                                      {lead.expectedDateOfCloser ? new Date(lead.expectedDateOfCloser).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Set'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 italic">
                                      Set via Follow-up
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
                                        expectedDateOfCloser: lead.expectedDateOfCloser ? new Date(lead.expectedDateOfCloser).toISOString().split('T')[0] : '',
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
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${fu.status === 'Hot'
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

                              {/* Reassignment & Revocation Trail (if present) */}
                              {(() => {
                                let rh = [];
                                if (Array.isArray(lead.reassignmentHistory)) rh = lead.reassignmentHistory;
                                else if (typeof lead.reassignmentHistory === 'string') {
                                  try { rh = JSON.parse(lead.reassignmentHistory); } catch { }
                                }
                                if (rh && rh.length > 0) {
                                  return (
                                    <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 text-xs space-y-1.5">
                                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                                        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700" />
                                        <span>Reassignment & Revocation Trail ({rh.length})</span>
                                      </div>
                                      <div className="space-y-1.5">
                                        {rh.map((item, idx) => (
                                          <div key={idx} className="text-[11px] text-amber-900 bg-white/70 p-2 rounded border border-amber-200/60 flex items-start justify-between gap-2">
                                            <div>
                                              <div>
                                                Revoked from <strong className="text-rose-700">{item.revokedFrom}</strong> → Assigned to <strong className="text-emerald-700">{item.assignedTo}</strong>
                                                {item.assignedToLeader && (
                                                  <span className="text-slate-500 text-[10px] ml-1">(Team: {item.assignedToLeader})</span>
                                                )}
                                              </div>
                                              {item.reason && (
                                                <div className="italic text-slate-700 mt-0.5 font-medium">
                                                  Reason: "{item.reason}"
                                                </div>
                                              )}
                                              {item.handoverNotes && (
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                  Notes: {item.handoverNotes}
                                                </div>
                                              )}
                                            </div>
                                            <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                              {item.revokedAt ? new Date(item.revokedAt).toLocaleDateString('en-IN') : ''}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                });
                })()
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
                        className={`w-7 h-7 rounded-lg font-semibold transition cursor-pointer ${p === pagination.page
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
                        className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${active
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

              {/* Expected Date of Closer (EDC) Target */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1 flex items-center justify-between">
                  <span>Expected Date of Closer (EDC) <span className="text-slate-400 font-normal">(Target Closer Date)</span></span>
                  {followUpForm.expectedDateOfCloser && (
                    <span className="text-[10px] text-indigo-600 font-semibold font-mono">
                      Target: {new Date(followUpForm.expectedDateOfCloser).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    min={getTodayDateStr()}
                    value={followUpForm.expectedDateOfCloser}
                    onChange={(e) => {
                      const val = e.target.value;
                      const currentToday = getTodayDateStr();
                      if (val && val < currentToday) {
                        toast.warning('Expected Date of Closer (EDC) cannot be in the past. Please select today or an upcoming date.');
                        return;
                      }
                      setFollowUpForm({ ...followUpForm, expectedDateOfCloser: val });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-slate-900 focus:outline-none cursor-pointer font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Updates the lead's Expected Date of Closer displayed on the lead details card.
                </p>
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

      {/* 7. DETAILED BDM DOSSIER & PERFORMANCE MODAL */}
      {selectedBdmDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {selectedBdmDetailModal.name
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white">
                      {selectedBdmDetailModal.name}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedBdmDetailModal.isLeader ? 'Team Leader' : 'BDM Member'}
                    </span>
                    {selectedBdmDetailModal.leaderName && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        Team: {selectedBdmDetailModal.leaderName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Performance Dossier • {selectedBdmDetailModal.totalLeads || 0} Total Leads Logged
                    {(selectedBdmDetailModal.salesTarget || BDM_TARGET_MAP[selectedBdmDetailModal.name]) ? (
                      <span className="text-slate-300 font-medium"> • Sales Target: ₹{Number(selectedBdmDetailModal.salesTarget || BDM_TARGET_MAP[selectedBdmDetailModal.name]).toLocaleString('en-IN')}</span>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeamMemberFilter(selectedBdmDetailModal.name);
                    setSelectedBdmDetailModal(null);
                    const el = document.getElementById('lms-leads-table-container');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBdmDetailModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* KPI Highlights Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                  Deal Funnel Value
                </span>
                <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  ₹{Number(selectedBdmDetailModal.totalFunnel || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                  <span>Hot: ₹{Number(selectedBdmDetailModal.hotValue || 0).toLocaleString('en-IN')}</span>
                  <span>•</span>
                  <span>Warm: ₹{Number(selectedBdmDetailModal.warmValue || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                  Active in Pipeline
                </span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedBdmDetailModal.activeLeads || 0} Leads
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {selectedBdmDetailModal.totalLeads || 0} Total in Database
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                  Closed Won Deals
                </span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedBdmDetailModal.closedCount || 0} Won
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">
                  Val: ₹{Number(selectedBdmDetailModal.closedValue || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                  Overdue Follow-ups
                </span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedBdmDetailModal.pendingFollowupsCount || 0} Overdue
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Follow-up date exceeded
                </div>
              </div>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setBdmDetailModalTab('FOLLOWUPS')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${bdmDetailModalTab === 'FOLLOWUPS'
                  ? 'border-slate-900 text-slate-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Follow-ups & Meetings</span>
              </button>
              <button
                type="button"
                onClick={() => setBdmDetailModalTab('METRICS')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${bdmDetailModalTab === 'METRICS'
                  ? 'border-slate-900 text-slate-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Conversion & Performance</span>
              </button>
            </div>

            {/* Modal Body / Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {/* TAB 1: FOLLOW-UPS & MEETINGS */}
              {bdmDetailModalTab === 'FOLLOWUPS' && (
                <div className="space-y-4">
                  {/* Overdue Follow-ups Alert Section if any */}
                  {(() => {
                    const overdueList = (selectedBdmDetailModal.leads || []).filter((l) => getLeadOverdueInfo(l).isOverdue);
                    if (overdueList.length > 0) {
                      return (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                              <span>Overdue Follow-ups ({overdueList.length} Leads Requiring Attention)</span>
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white">
                              Action Required
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {overdueList.map((l) => {
                              const info = getLeadOverdueInfo(l);
                              return (
                                <div key={l.id} className="p-3 bg-white border border-rose-200 rounded-lg flex items-start justify-between gap-2 shadow-2xs">
                                  <div>
                                    <span className="font-bold text-slate-900 text-xs block">{l.companyName}</span>
                                    <span className="text-[10px] text-slate-500 block">
                                      Value: <strong>₹{Number(l.dealValue || 0).toLocaleString('en-IN')}</strong>
                                    </span>
                                    <span className="text-[10px] font-bold text-rose-700 mt-1 inline-block bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                                      ⚠️ {info.daysOverdue} Days Overdue (Due: {info.targetDateStr})
                                    </span>
                                  </div>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReassignModalLead(l);
                                        setReassignForm({
                                          newBdmName: '',
                                          newLeaderName: l.leaderName || LMS_LEADERS[0],
                                          reason: `Follow-up overdue for ${info.daysOverdue} days without update.`,
                                          nextFollowUpDate: getTodayDateStr(),
                                          handoverNotes: '',
                                        });
                                      }}
                                      className="px-2 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded text-[10px] font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                                      title="Revoke & Reassign Lead"
                                    >
                                      <ArrowRightLeft className="w-3 h-3" />
                                      <span>Revoke</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Scheduled Meetings */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-700" />
                      <span>Scheduled Meetings</span>
                    </h4>
                    {(selectedBdmDetailModal.leads || []).filter((l) => l.meetingDate).length === 0 ? (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                        No scheduled meetings for this BDM.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(selectedBdmDetailModal.leads || [])
                          .filter((l) => l.meetingDate)
                          .map((l) => (
                            <div
                              key={l.id}
                              className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-2"
                            >
                              <div>
                                <span className="font-bold text-slate-900 text-xs block">{l.companyName}</span>
                                <span className="text-[10px] text-slate-500 block">
                                  {l.directorName} • {l.mobileNo}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-700 mt-1 inline-block bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                                  {l.meetingStatus}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-slate-900 font-mono">
                                {new Date(l.meetingDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Frozen Follow-up Audit Trail */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-700" />
                      <span>Follow-up Audit Trail</span>
                    </h4>
                    {(() => {
                      const allFus = [];
                      (selectedBdmDetailModal.leads || []).forEach((l) => {
                        const fus = getFollowUpsList(l);
                        fus.forEach((fu) => {
                          allFus.push({ ...fu, companyName: l.companyName, leadId: l.id });
                        });
                      });
                      allFus.sort(
                        (a, b) =>
                          new Date(b.addedAt || b.date).getTime() - new Date(a.addedAt || a.date).getTime()
                      );

                      if (allFus.length === 0) {
                        return (
                          <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                            No follow-up history logged yet.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {allFus.map((fu, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-start justify-between gap-3 shadow-2xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{fu.companyName}</span>
                                  <span
                                    className="text-[9px] font-semibold px-1.5 py-0.2 rounded border bg-slate-100 text-slate-700 border-slate-200"
                                  >
                                    {fu.status}
                                  </span>
                                </div>
                                {fu.remarks && (
                                  <p className="text-[11px] text-slate-600 mt-1 italic">"{fu.remarks}"</p>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                {new Date(fu.date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 3: PERFORMANCE & METRICS */}
              {bdmDetailModalTab === 'METRICS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-medium text-slate-500 uppercase block">Conversion Rate</span>
                      <div className="text-2xl font-bold text-slate-900 mt-1">
                        {selectedBdmDetailModal.totalLeads > 0
                          ? `${((selectedBdmDetailModal.closedCount / selectedBdmDetailModal.totalLeads) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">Closed Won / Total Logged</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-medium text-slate-500 uppercase block">Hot Lead Ratio</span>
                      <div className="text-2xl font-bold text-slate-900 mt-1">
                        {selectedBdmDetailModal.totalLeads > 0
                          ? `${((selectedBdmDetailModal.hotCount / selectedBdmDetailModal.totalLeads) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        {selectedBdmDetailModal.hotCount || 0} Hot Deals
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-medium text-slate-500 uppercase block">Average Deal Value</span>
                      <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                        ₹
                        {selectedBdmDetailModal.totalLeads > 0
                          ? Math.round(
                            (selectedBdmDetailModal.totalFunnel || 0) /
                            (selectedBdmDetailModal.activeLeads || 1)
                          ).toLocaleString('en-IN')
                          : '0'}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">Per Active Opportunity</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">CorporateMart CRM • BDM Performance Cockpit</span>
              <button
                type="button"
                onClick={() => setSelectedBdmDetailModal(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. REVOKE & REASSIGN OVERDUE LEAD MODAL (ADMIN ONLY) */}
      {reassignModalLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Revoke & Reassign Lead</h3>
                  <p className="text-[11px] text-slate-300">
                    Transfer lead ownership & notify both BDMs simultaneously
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalLead(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRevokeAndReassign} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Lead Summary Box */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Company / Opportunity</span>
                      <h4 className="text-sm font-extrabold text-slate-900">{reassignModalLead.companyName}</h4>
                      {reassignModalLead.directorName && (
                        <span className="text-slate-500 text-[11px]">Contact: {reassignModalLead.directorName} • {reassignModalLead.mobileNo}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Deal Value</span>
                      <span className="text-sm font-mono font-bold text-slate-900">
                        {reassignModalLead.dealValue ? `₹${Number(reassignModalLead.dealValue).toLocaleString('en-IN')}` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Current Assignee:</span>
                      <span className="font-bold text-slate-800">{reassignModalLead.bdmName1 || 'UNASSIGNED'}</span>
                      <span className="text-slate-500 block text-[10px]">Team: {reassignModalLead.leaderName || 'Management'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Follow-up Status:</span>
                      {(() => {
                        const overdue = getLeadOverdueInfo(reassignModalLead);
                        if (overdue.isOverdue) {
                          return (
                            <span className="font-bold text-rose-700 block">
                              ⚠️ {overdue.daysOverdue} Days Overdue (Due: {overdue.targetDateStr})
                            </span>
                          );
                        }
                        return <span className="font-semibold text-slate-700 block">Up to date</span>;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Form Input: New BDM */}
                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">
                    Assign to New BDM <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={reassignForm.newBdmName}
                    onChange={(e) => {
                      const newBdm = e.target.value;
                      const mappedLeader = BDM_LEADER_MAP[newBdm] || reassignForm.newLeaderName;
                      setReassignForm((prev) => ({
                        ...prev,
                        newBdmName: newBdm,
                        newLeaderName: mappedLeader || prev.newLeaderName,
                      }));
                    }}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800 cursor-pointer"
                  >
                    <option value="">-- Select New BDM from Team --</option>
                    {LMS_BDMS.filter((b) => b.toUpperCase() !== (reassignModalLead.bdmName1 || '').toUpperCase()).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Select the recipient BDM who will take over this lead.
                  </span>
                </div>

                {/* Form Input: Team Leader */}
                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">
                    Designated Team Leader <span className="text-slate-400 font-normal">(Optional / Auto-align)</span>
                  </label>
                  <select
                    value={reassignForm.newLeaderName}
                    onChange={(e) => setReassignForm({ ...reassignForm, newLeaderName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800 cursor-pointer"
                  >
                    {LMS_LEADERS.map((ldr) => (
                      <option key={ldr} value={ldr}>{ldr}</option>
                    ))}
                  </select>
                </div>

                {/* Form Input: Revocation Reason (Mandatory) */}
                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">
                    Reason for Revocation & Reassignment <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reassignForm.reason}
                    onChange={(e) => setReassignForm({ ...reassignForm, reason: e.target.value })}
                    required
                    placeholder="Explain why this lead is being revoked from current BDM and reassigned..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                  />

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">Quick Presets:</span>
                    {[
                      'Follow-up overdue for 5+ days without response',
                      'Scheduled follow-up missed; reassigned for rapid closing',
                      'Unattended follow-up; transferred for prompt deal recovery',
                      'Administrative team load rebalancing',
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReassignForm({ ...reassignForm, reason: preset })}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer transition border border-slate-200"
                      >
                        {preset.slice(0, 32)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Input: Next Follow-up Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      New Next Follow-up Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={reassignForm.nextFollowUpDate}
                      onChange={(e) => setReassignForm({ ...reassignForm, nextFollowUpDate: e.target.value })}
                      required
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      Handover Notes <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={reassignForm.handoverNotes}
                      onChange={(e) => setReassignForm({ ...reassignForm, handoverNotes: e.target.value })}
                      placeholder="e.g. Call client immediately"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>
                </div>

                {/* Notification Guarantee Notice */}
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] text-indigo-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Simultaneous Notification Dispatch:</strong> Upon clicking Confirm, <strong>{reassignModalLead.bdmName1}</strong> will receive an instant notification that this lead was revoked with your reason, and <strong>{reassignForm.newBdmName || 'the new BDM'}</strong> will receive a notification that this lead has been assigned to them.
                  </p>
                </div>
              </div>

              {/* Action Buttons - Fixed / Docked Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setReassignModalLead(null)}
                  disabled={isSubmittingReassign}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReassign}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReassign ? (
                    <span>Processing Reassignment...</span>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Confirm Revoke & Reassign</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DUPLICATE PHONE NUMBER POPUP (Clean, high-contrast, fully readable with cancel option) */}
      {duplicatePhonePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            onMouseEnter={() => {
              if (duplicatePhoneTimerRef.current) clearTimeout(duplicatePhoneTimerRef.current);
            }}
            onMouseLeave={() => {
              duplicatePhoneTimerRef.current = setTimeout(() => {
                setDuplicatePhonePopup(null);
              }, 4000);
            }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-300 text-center space-y-4 relative overflow-hidden"
          >
            {/* Top red alert accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500" />

            <button
              type="button"
              onClick={closeDuplicatePhonePopup}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Close and edit phone number"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7 text-rose-600 animate-pulse" />
            </div>

            <div>
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 mb-1.5">
                Duplicate Record Prevention
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                Mobile Number Already Registered
              </h3>
            </div>

            {/* Structured details card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left text-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Entered Mobile:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {form.mobileNo ? (form.mobileNo.startsWith('+') ? form.mobileNo : `+91 ${form.mobileNo}`) : '—'}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">
                {duplicatePhonePopup.detail || 'This mobile number is already linked to an existing client in the LMS.'}
              </p>
              <p className="text-[11px] text-slate-500 leading-snug">
                Every lead must have a unique 10-digit mobile number to prevent duplicate outreach and keep client pipelines clean.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={closeDuplicatePhonePopup}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                Got it, I'll update the number
              </button>
              <button
                type="button"
                onClick={closeDuplicatePhonePopup}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
