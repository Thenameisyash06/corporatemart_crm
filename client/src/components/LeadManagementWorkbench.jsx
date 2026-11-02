import React, { useState, useEffect, useMemo, useRef } from 'react';
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

export default function LeadManagementWorkbench({ currentUser, onConvertToDeal }) {
  const isAdmin = currentUser?.role === 'ADMIN';

  const [leads, setLeads] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Toggle Form Visibility
  const [isFormOpen, setIsFormOpen] = useState(true);

  // Quotation File Upload State
  const [quotationFile, setQuotationFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const quotationInputRef = useRef(null);

  // Form State (includes clientStatus default 'Warm')
  const initialFormState = {
    companyName: '',
    directorName: '',
    mobileNo: '',
    emailId: '',
    leaderName: LMS_LEADERS[0],
    bdmName1: LMS_BDMS[0],
    bdmName2: '',
    closerStatus: LMS_CLOSER_STATUSES[0],
    clientStatus: 'Warm',
    sourcingStatus: LMS_SOURCING_STATUSES[0],
    meetingStatus: LMS_MEETING_STATUSES[0],
    expectedDateOfCloser: '',
    leadStatus: 'OPEN',
    dealValue: '',
    remarks: '',
  };

  const [form, setForm] = useState(initialFormState);

  // Auto-fill BDM-I if current logged in user name matches one of the BDMs
  useEffect(() => {
    if (currentUser?.fullName) {
      const match = LMS_BDMS.find((b) =>
        currentUser.fullName.toLowerCase().includes(b.toLowerCase()) ||
        b.toLowerCase().includes(currentUser.fullName.toLowerCase())
      );
      if (match) {
        setForm((prev) => ({ ...prev, bdmName1: match }));
      }
    }
  }, [currentUser]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeaderFilter, setSelectedLeaderFilter] = useState('ALL');
  const [selectedBdmFilter, setSelectedBdmFilter] = useState('ALL');
  const [selectedCloserFilter, setSelectedCloserFilter] = useState('ALL');
  const [selectedClientStatusFilter, setSelectedClientStatusFilter] = useState('ALL');
  const [selectedSourcingFilter, setSelectedSourcingFilter] = useState('ALL');
  const [selectedMeetingFilter, setSelectedMeetingFilter] = useState('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');

  // Fetch Leads
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = {};
      if (!isAdmin) {
        params.scope = 'my';
      }
      if (selectedLeaderFilter !== 'ALL') params.leaderName = selectedLeaderFilter;
      if (selectedBdmFilter !== 'ALL') params.bdmName = selectedBdmFilter;
      if (selectedCloserFilter !== 'ALL') params.closerStatus = selectedCloserFilter;
      if (selectedClientStatusFilter !== 'ALL') params.clientStatus = selectedClientStatusFilter;
      if (selectedSourcingFilter !== 'ALL') params.sourcingStatus = selectedSourcingFilter;
      if (selectedMeetingFilter !== 'ALL') params.meetingStatus = selectedMeetingFilter;
      if (selectedStageFilter !== 'ALL') params.leadStatus = selectedStageFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/leads', { params });
      setLeads(res.data.leads || []);
      setAnalytics(res.data.analytics || null);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to load leads.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [
    selectedLeaderFilter,
    selectedBdmFilter,
    selectedCloserFilter,
    selectedClientStatusFilter,
    selectedSourcingFilter,
    selectedMeetingFilter,
    selectedStageFilter,
  ]);

  // Handle Search on Enter
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeads();
  };

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

  // Submit New Lead with Mandatory Quotation File & Client Status
  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setFeedback({ type: 'error', message: 'Company Name is required.' });
      return;
    }
    if (!form.mobileNo.trim()) {
      setFeedback({ type: 'error', message: 'Mobile Number is required.' });
      return;
    }
    if (!quotationFile) {
      setFeedback({ type: 'error', message: 'Quotation file is mandatory! Please upload a PDF or Word quotation document.' });
      setFileError('Quotation document (PDF or Word) is mandatory.');
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const formData = new FormData();
      formData.append('companyName', form.companyName.trim());
      formData.append('directorName', form.directorName.trim());
      formData.append('mobileNo', form.mobileNo.trim());
      formData.append('emailId', form.emailId.trim());
      formData.append('leaderName', form.leaderName);
      formData.append('bdmName1', form.bdmName1);
      formData.append('bdmName2', form.bdmName2);
      formData.append('closerStatus', form.closerStatus);
      formData.append('clientStatus', form.clientStatus || 'Warm');
      formData.append('sourcingStatus', form.sourcingStatus);
      formData.append('meetingStatus', form.meetingStatus);
      formData.append('expectedDateOfCloser', form.expectedDateOfCloser);
      formData.append('leadStatus', form.leadStatus);
      formData.append('dealValue', form.dealValue);
      formData.append('remarks', form.remarks.trim());
      formData.append('quotation', quotationFile);

      await api.post('/leads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFeedback({ type: 'success', message: `Lead for "${form.companyName}" successfully logged with Quotation!` });
      // Reset form (keep BDM & Leader selection)
      setForm({
        ...initialFormState,
        leaderName: form.leaderName,
        bdmName1: form.bdmName1,
      });
      setQuotationFile(null);
      setFileError(null);
      if (quotationInputRef.current) quotationInputRef.current.value = '';
      fetchLeads();
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

  // Preview Quotation PDF in New Tab
  const handlePreviewQuotation = (lead) => {
    const token = localStorage.getItem('cm_crm_token');
    const previewUrl = `/api/leads/${lead.id}/quotation?token=${encodeURIComponent(token || '')}`;
    window.open(previewUrl, '_blank');
  };

  // Quick Update Lead Fields (Client Status, Meeting Status, EDC, Stage)
  const handleQuickUpdateLead = async (leadId, updates) => {
    try {
      await api.patch(`/leads/${leadId}`, updates);
      setFeedback({ type: 'success', message: 'Lead updated successfully.' });
      fetchLeads();
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

  return (
    <div className="space-y-5">
      {/* 1. TOP HEADER & KPI SUMMARY */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
              <UserPlus className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Lead Management System (LMS)</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {isAdmin ? 'Master LMS Control' : 'BDM Workspace'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdmin
                  ? 'Track all BDM sales leads, client status temperatures (Hot/Warm/Lost), quotations, and closing deadlines'
                  : 'Capture prospective clients, tag client status (Hot/Warm/Lost), attach mandatory quotations, and convert to deals'}
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            onClick={() => exportLeadsToCsv(leads, isAdmin ? 'All_Company_LMS_Leads.csv' : 'My_BDM_LMS_Leads.csv')}
            disabled={leads.length === 0}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV ({leads.length})</span>
          </button>

          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isFormOpen ? 'Hide Lead Form' : 'Log New Lead'}</span>
            {isFormOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </button>
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
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* 2. ANALYTICS KPI TILES (With Client Status: Hot, Warm, Lost Breakdown) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Leads */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            {isAdmin ? 'Total Pipeline Leads' : 'My Logged Leads'}
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">
            {analytics?.totalLeads ?? leads.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-600" /> Active Database
          </div>
        </div>

        {/* Hot Clients */}
        <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <span>🔥</span> Hot Clients
          </span>
          <div className="text-xl font-extrabold text-rose-700 mt-0.5">
            {analytics?.byClientStatus?.Hot ?? 0}
          </div>
          <div className="text-[11px] text-rose-600 mt-1 font-semibold">
            High Intent to Close
          </div>
        </div>

        {/* Warm Clients */}
        <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <span>☀️</span> Warm Clients
          </span>
          <div className="text-xl font-extrabold text-amber-700 mt-0.5">
            {analytics?.byClientStatus?.Warm ?? 0}
          </div>
          <div className="text-[11px] text-amber-600 mt-1 font-semibold">
            Active Follow-ups
          </div>
        </div>

        {/* Lost Clients */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
            <span>❄️</span> Lost Clients
          </span>
          <div className="text-xl font-extrabold text-slate-700 mt-0.5">
            {analytics?.byClientStatus?.Lost ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Dropped / Inactive
          </div>
        </div>

        {/* Meetings Scheduled */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Meetings Scheduled
          </span>
          <div className="text-xl font-extrabold text-blue-600 mt-0.5">
            {(analytics?.byMeetingStatus?.['Google/Team Meet'] || 0) +
              (analytics?.byMeetingStatus?.['Conference Call'] || 0) +
              (analytics?.byMeetingStatus?.['Physical Meeting'] || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Physical: {analytics?.byMeetingStatus?.['Physical Meeting'] ?? 0}
          </div>
        </div>

        {/* Documents Received */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider block">
            Documents Received
          </span>
          <div className="text-xl font-extrabold text-cyan-600 mt-0.5">
            {analytics?.byMeetingStatus?.['Document Received'] ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Ready for Proposal
          </div>
        </div>

        {/* Overdue EDC */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
            Overdue EDC
          </span>
          <div className="text-xl font-extrabold text-purple-700 mt-0.5">
            {analytics?.overdueEdcCount ?? 0}
          </div>
          <div className="text-[11px] text-purple-600/80 mt-1">
            Urgent Follow-Up
          </div>
        </div>
      </div>

      {/* 3. LEAD CAPTURE FORM (Collapsible) */}
      {isFormOpen && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Log New Prospective Client (LMS Entry)
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">All fields with * are mandatory</span>
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
                    value={form.mobileNo}
                    onChange={(e) => setForm({ ...form, mobileNo: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
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

            {/* Row 2: Leader's Name, BDM-I, BDM-II, Closer Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Leader's Name <span className="text-rose-500">*</span>
                </label>
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
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  BDM's Name - I (Primary) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={form.bdmName1}
                  onChange={(e) => setForm({ ...form, bdmName1: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-slate-800 focus:outline-none"
                >
                  {LMS_BDMS.map((bdm) => (
                    <option key={bdm} value={bdm}>{bdm}</option>
                  ))}
                </select>
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
                  {LMS_BDMS.filter((b) => b !== form.bdmName1).map((bdm) => (
                    <option key={bdm} value={bdm}>{bdm}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Closer Status <span className="text-rose-500">*</span>
                </label>
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
              </div>
            </div>

            {/* Row 3: Client Status (Hot, Warm, Lost), Sourcing Status, Meeting Status, EDC Date, Estimated Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
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

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Expected Date of Closer (EDC)
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={form.expectedDateOfCloser}
                    onChange={(e) => setForm({ ...form, expectedDateOfCloser: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Estimated Deal Value (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={form.dealValue}
                  onChange={(e) => setForm({ ...form, dealValue: e.target.value })}
                  placeholder="e.g. 50000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-none font-mono"
                />
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

          {/* BDM Filter */}
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

      {/* 5. LEADS DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Company & Director</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Leader & BDM Team</th>
                <th className="py-3 px-4">Sourcing & Closer</th>
                <th className="py-3 px-4">Client Status</th>
                <th className="py-3 px-4">Meeting Status</th>
                <th className="py-3 px-4">Expected Closer (EDC)</th>
                <th className="py-3 px-4">Quotation Document</th>
                <th className="py-3 px-4">Pipeline Stage</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                    Loading LMS lead records...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                    No leads found matching current criteria. Click "Log New Lead" above to record your prospective client!
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const edcBadge = getEdcBadge(lead.expectedDateOfCloser, lead.leadStatus);
                  const currentStageMeta = LMS_LEAD_STAGES.find((s) => s.id === (lead.leadStatus || 'OPEN')) || LMS_LEAD_STAGES[0];
                  const isPdf = lead.quotationFileName?.toLowerCase().endsWith('.pdf');
                  const currentClientStatus = lead.clientStatus || 'Warm';

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                      {/* Company & Director */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{lead.companyName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-slate-400" />
                          <span>{lead.directorName || 'Director: Not Specified'}</span>
                        </div>
                        {lead.remarks && (
                          <div className="text-[10px] text-slate-500 italic mt-1 line-clamp-1 max-w-[200px]" title={lead.remarks}>
                            "{lead.remarks}"
                          </div>
                        )}
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-900 font-bold">
                          <Phone className="w-3 h-3 text-indigo-500" />
                          <a href={`tel:${lead.mobileNo}`} className="hover:underline">
                            {lead.mobileNo}
                          </a>
                        </div>
                        {lead.emailId && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <a href={`mailto:${lead.emailId}`} className="hover:underline truncate max-w-[150px]">
                              {lead.emailId}
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Leader & BDM Team */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-xs flex items-center gap-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Leader:</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-800">
                            {lead.leaderName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          <span className="text-slate-400 font-semibold">BDM I:</span> {lead.bdmName1}
                        </div>
                        {lead.bdmName2 && (
                          <div className="text-[10px] text-slate-500">
                            <span className="text-slate-400 font-semibold">BDM II:</span> {lead.bdmName2}
                          </div>
                        )}
                      </td>

                      {/* Sourcing & Closer */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Source: {lead.sourcingStatus}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            lead.closerStatus === 'Self Closer'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}>
                            {lead.closerStatus}
                          </span>
                        </div>
                      </td>

                      {/* Client Status (Hot, Warm, Lost) */}
                      <td className="py-3 px-4 min-w-[130px]">
                        <select
                          value={currentClientStatus}
                          onChange={(e) => handleQuickUpdateLead(lead.id, { clientStatus: e.target.value })}
                          className={`w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border transition focus:outline-none cursor-pointer ${
                            currentClientStatus === 'Hot'
                              ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                              : currentClientStatus === 'Lost'
                              ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                              : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                          }`}
                        >
                          <option value="Hot">🔥 Hot Client</option>
                          <option value="Warm">☀️ Warm Client</option>
                          <option value="Lost">❄️ Lost Client</option>
                        </select>
                      </td>

                      {/* Meeting Status */}
                      <td className="py-3 px-4 min-w-[160px]">
                        <select
                          value={lead.meetingStatus || LMS_MEETING_STATUSES[0]}
                          onChange={(e) => handleQuickUpdateLead(lead.id, { meetingStatus: e.target.value })}
                          className={`w-full text-xs font-semibold rounded-lg px-2 py-1.5 border focus:outline-none ${
                            lead.meetingStatus === 'Document Received'
                              ? 'bg-cyan-50 text-cyan-800 border-cyan-300'
                              : lead.meetingStatus === 'Physical Meeting'
                              ? 'bg-purple-50 text-purple-800 border-purple-300'
                              : lead.meetingStatus === 'Google/Team Meet'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-slate-50 text-slate-800 border-slate-300'
                          }`}
                        >
                          {LMS_MEETING_STATUSES.map((ms) => (
                            <option key={ms} value={ms}>{ms}</option>
                          ))}
                        </select>
                      </td>

                      {/* Expected Closer (EDC) */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${edcBadge.color}`}>
                            <Clock className="w-3 h-3" />
                            {edcBadge.label}
                          </span>
                          {lead.dealValue && (
                            <span className="text-[11px] font-bold text-slate-700">
                              Val: ₹{Number(lead.dealValue).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quotation Document */}
                      <td className="py-3 px-4 min-w-[150px]">
                        {lead.quotationFileName ? (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col max-w-[120px]">
                              <div className="flex items-center gap-1">
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                                  isPdf
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                  {lead.quotationFileName.split('.').pop()}
                                </span>
                                <span className="text-xs font-semibold text-slate-800 truncate" title={lead.quotationFileName}>
                                  {lead.quotationFileName}
                                </span>
                              </div>
                              {lead.quotationFileSize && (
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  {(lead.quotationFileSize / 1024).toFixed(0)} KB
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={() => handleDownloadQuotation(lead)}
                                disabled={downloadingId === lead.id}
                                title="Download Quotation Document"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              {isPdf && (
                                <button
                                  onClick={() => handlePreviewQuotation(lead)}
                                  title="Open Quotation PDF in New Tab"
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No document</span>
                        )}
                      </td>

                      {/* Pipeline Stage */}
                      <td className="py-3 px-4 min-w-[150px]">
                        <select
                          value={lead.leadStatus || 'OPEN'}
                          onChange={(e) => handleQuickUpdateLead(lead.id, { leadStatus: e.target.value })}
                          className={`w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border focus:outline-none ${currentStageMeta.color}`}
                        >
                          {LMS_LEAD_STAGES.map((stg) => (
                            <option key={stg.id} value={stg.id}>{stg.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Convert to Deal Button */}
                          <button
                            onClick={() => {
                              if (onConvertToDeal) {
                                onConvertToDeal({
                                  companyName: lead.companyName,
                                  clientName: lead.directorName || lead.companyName,
                                  clientPhone: lead.mobileNo,
                                  clientEmail: lead.emailId || '',
                                  remarks: `Converted from LMS (Client Status: ${lead.clientStatus || 'Warm'}, Leader: ${lead.leaderName}, Source: ${lead.sourcingStatus}). Quotation: ${lead.quotationFileName || 'None'}. ${lead.remarks || ''}`,
                                });
                              }
                            }}
                            title="Convert Lead into Active Deal"
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1 whitespace-nowrap"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>Deal</span>
                          </button>

                          {/* Delete Lead */}
                          {(isAdmin || lead.createdById === currentUser?.id) && (
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              title="Delete Lead"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
  );
}
