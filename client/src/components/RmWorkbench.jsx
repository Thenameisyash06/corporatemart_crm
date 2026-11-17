import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  CheckCircle2,
  Calendar,
  RotateCcw,
  Check,
  Eye,
  Plus,
  Trash2,
  Briefcase,
  Lock,
  MessageSquare,
  Copy,
  ExternalLink,
  Layers,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  FolderOpen,
  Paperclip,
  AlertCircle,
  Clock,
  ShieldCheck,
  Download,
  Search,
  CheckCheck,
  HelpCircle,
  FileQuestion,
  RefreshCw,
} from 'lucide-react';
import api from '../lib/api';

const DEFAULT_RENEWAL_TEMPLATES = [
  { name: 'DIR-3 KYC Annual Filing (Director KYC)', dueMonths: 11, desc: 'Mandatory annual filing before September 30' },
  { name: 'Annual ROC Return (Form AOC-4 & MGT-7)', dueMonths: 12, desc: 'Annual statutory accounts & return filing' },
  { name: 'Monthly GST Returns (GSTR-1 & 3B)', dueMonths: 1, desc: 'Monthly compliance & tax return filing' },
  { name: 'Trademark 10-Year Renewal', dueMonths: 120, desc: 'Statutory trademark renewal at 10-year expiry' },
];

const STAGE_LABELS = {
  STAGE_01_PROSPECT: { label: 'Prospect / Draft', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  STAGE_02_ENGAGEMENT_LETTER: { label: 'Engagement Letter', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  STAGE_03_PAYMENT_PROOF_ATTACHED: { label: 'Payment Attached', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  STAGE_04_ACCOUNTS_VERIFICATION: { label: 'Accounts Verification', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  STAGE_04_ACCOUNTS_REJECTED: { label: 'Accounts Hold', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  STAGE_05_LEGAL_VERIFICATION: { label: 'Legal Verification', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  STAGE_05_LEGAL_REJECTED: { label: 'Legal Hold', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  STAGE_06_OPERATIONS_PROCESSING: { label: 'Operations Filing Active', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  STAGE_07_SERVICE_COMPLETED: { label: 'Services Completed (Ops)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  STAGE_08_FINAL_DOCS_DELIVERED: { label: 'Deliverables Dispatched', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  STAGE_09_RM_HANDOVER: { label: 'Awaiting RM Handover', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  CLOSED: { label: 'Workflow Closed', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export default function RmWorkbench({ currentUser, onRefreshParent, onOpenDossier }) {
  const [deals, setDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE_FILING' | 'READY_HANDOVER' | 'CLOSED'
  const [searchQuery, setSearchQuery] = useState('');

  // RM Communication state
  const [copiedServiceId, setCopiedServiceId] = useState(null);
  const [commModes, setCommModes] = useState({}); // svcId -> 'ACQUIRE_DETAILS' | 'STATUS_UPDATE'
  const [customMessages, setCustomMessages] = useState({}); // svcId -> edited message string
  const [commNotes, setCommNotes] = useState({});
  const [savingCommServiceId, setSavingCommServiceId] = useState(null);

  // Preview document state
  const [previewDoc, setPreviewDoc] = useState(null);

  // Stage 09 Handover state
  const [handoverNotes, setHandoverNotes] = useState('Client confirmed receipt of incorporation documents. Next steps briefed.');
  const [renewals, setRenewals] = useState([
    {
      serviceName: 'Annual ROC Compliance (AOC-4 & MGT-7)',
      dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      remindAt: new Date(Date.now() + 330 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '1-year annual return filing',
    },
    {
      serviceName: 'DIR-3 KYC (Director Annual KYC)',
      dueDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      remindAt: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Due by September 30 for all active DIN holders',
    },
  ]);

  const fetchRmQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/deals', {
        params: { roleFilter: 'RM' },
      });
      const fetchedDeals = res.data.deals || [];
      setDeals(fetchedDeals);

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
      console.error('Failed to load RM queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRmQueue();
  }, []);

  const handleAddRenewal = (template) => {
    const futureDate = new Date(Date.now() + template.dueMonths * 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const reminderDate = new Date(Date.now() + (template.dueMonths * 30 - 30) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    setRenewals((prev) => [
      ...prev,
      {
        serviceName: template.name,
        dueDate: futureDate,
        remindAt: reminderDate,
        notes: template.desc,
      },
    ]);
  };

  const handleRemoveRenewal = (index) => {
    setRenewals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCompleteHandover = async () => {
    if (!selectedDeal) return;
    try {
      setActionLoading(true);
      setFeedback(null);

      await api.post(`/deals/${selectedDeal.id}/rm-handover`, {
        notes: handoverNotes,
        renewals: renewals,
      });

      setFeedback({
        type: 'success',
        message: `Deal ${selectedDeal.dealCode} closed! Handover confirmed & renewals recorded in CRM.`,
      });

      await fetchRmQueue();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'RM handover failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreviewDocument = async (docId) => {
    try {
      const res = await api.get(`/documents/${docId}/preview`);
      setPreviewDoc(res.data.document);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to preview document.' });
    }
  };

  // Generate default communication text depending on service state & RM intent
  const getDefaultMessage = (svc) => {
    if (!selectedDeal) return '';
    const clientName = selectedDeal.client?.clientName || 'Valued Client';
    const companyName = selectedDeal.client?.companyName || 'your company';
    const serviceName = svc.serviceName;
    const rmName = currentUser?.fullName || 'Relationship Manager';
    const mode = commModes[svc.id] || (svc.status === 'COMPLETED' ? 'COMPLETED' : 'ACQUIRE_DETAILS');

    if (svc.status === 'COMPLETED') {
      const ref = svc.govApplicationNumber ? `Govt Reference / SRN: ${svc.govApplicationNumber}` : 'Status: Cleared & Verified';
      return `Dear ${clientName},\n\nGreetings from Corporate Mart!\n\nWe are pleased to inform you that the service "${serviceName}" for ${companyName} has been successfully COMPLETED by our operations team.\n\n${ref}\nCompletion Date: ${svc.completedAt ? new Date(svc.completedAt).toLocaleDateString('en-IN') : 'Recently'}\n\nOur team is working diligently on your entire engagement. Feel free to reach out if you need additional certificates or copies.\n\nWarm regards,\n${rmName}\nCorporate Mart Relationship Desk`;
    }

    if (mode === 'ACQUIRE_DETAILS') {
      return `Dear ${clientName},\n\nGreetings from Corporate Mart!\n\nWe are currently processing the service "${serviceName}" for ${companyName}. To proceed with the drafting and official government filing, our operations team requires a few additional details / documents from your side:\n\n• Required: [Specify details, e.g., Electricity bill, signed form, PAN/Aadhaar copy, DSC, etc.]\n\nPlease share the requested information at your earliest convenience so we can complete this filing smoothly.\n\nWarm regards,\n${rmName}\nCorporate Mart Relationship Desk`;
    }

    // Default to STATUS_UPDATE for incomplete service
    const srnInfo = svc.govApplicationNumber ? `\nGovt Application / SRN: ${svc.govApplicationNumber}` : '';
    return `Dear ${clientName},\n\nGreetings from Corporate Mart!\n\nThis is a quick progress update regarding your ongoing service "${serviceName}" for ${companyName}.\n\nCurrent Status: ${svc.status}${srnInfo}\n\nOur team is actively processing your application with the relevant authorities, and we will update you as soon as the next milestone is achieved.\n\nWarm regards,\n${rmName}\nCorporate Mart Relationship Desk`;
  };

  // Get active text (custom edited if present, else default)
  const getActiveMessageText = (svc) => {
    if (customMessages[svc.id] !== undefined) {
      return customMessages[svc.id];
    }
    return getDefaultMessage(svc);
  };

  const handleCopyMessage = (svc) => {
    const text = getActiveMessageText(svc);
    navigator.clipboard.writeText(text);
    setCopiedServiceId(svc.id);
    setTimeout(() => setCopiedServiceId(null), 3000);
  };

  const handleRecordCommunication = async (svc) => {
    if (!selectedDeal) return;
    try {
      setSavingCommServiceId(svc.id);
      const isCompleted = svc.status === 'COMPLETED';
      const mode = commModes[svc.id] || (isCompleted ? 'COMPLETED' : 'ACQUIRE_DETAILS');
      const typeLabel = isCompleted
        ? 'Completion & Deliverable Sharing'
        : mode === 'ACQUIRE_DETAILS'
        ? 'Acquiring Details / Documents'
        : 'Milestone Progress Update';

      const note = commNotes[svc.id] || `Client contacted via WhatsApp / Direct regarding ${typeLabel}.`;

      await api.post(`/deals/${selectedDeal.id}/rm-communication`, {
        serviceId: svc.id,
        channel: 'WhatsApp / Call',
        communicationType: typeLabel,
        notes: note,
      });

      setFeedback({
        type: 'success',
        message: `Client communication regarding "${svc.serviceName}" successfully logged in CRM audit trail!`,
      });
      setCommNotes((prev) => ({ ...prev, [svc.id]: '' }));
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to record communication.' });
    } finally {
      setSavingCommServiceId(null);
    }
  };

  // Filter deals
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      // Tab filter
      const totalServices = d.services?.length || 0;
      const completedServices = (d.services || []).filter((s) => s.status === 'COMPLETED').length;
      const allServicesDone = totalServices > 0 && completedServices === totalServices;

      if (activeTab === 'ACTIVE_FILING') {
        if (d.stage === 'CLOSED' || allServicesDone) return false;
      } else if (activeTab === 'READY_HANDOVER') {
        if (d.stage === 'CLOSED' || !allServicesDone) return false;
      } else if (activeTab === 'CLOSED') {
        if (d.stage !== 'CLOSED') return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = d.dealCode?.toLowerCase() || '';
        const comp = d.client?.companyName?.toLowerCase() || '';
        const client = d.client?.clientName?.toLowerCase() || '';
        const phone = d.client?.phone?.toLowerCase() || '';
        const bdm = d.bdm?.fullName?.toLowerCase() || '';
        if (!code.includes(q) && !comp.includes(q) && !client.includes(q) && !phone.includes(q) && !bdm.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [deals, activeTab, searchQuery]);

  // Derived selected deal status
  const selectedDealTotalServices = selectedDeal?.services?.length || 0;
  const selectedDealCompletedServices = (selectedDeal?.services || []).filter((s) => s.status === 'COMPLETED').length;
  const selectedDealAllServicesDone = selectedDealTotalServices > 0 && selectedDealCompletedServices === selectedDealTotalServices;
  const selectedDealIncompleteCount = selectedDealTotalServices - selectedDealCompletedServices;

  // Global counts
  const totalCount = deals.length;
  const activeFilingCount = deals.filter((d) => d.stage !== 'CLOSED' && !(d.services?.length > 0 && d.services.every((s) => s.status === 'COMPLETED'))).length;
  const readyHandoverCount = deals.filter((d) => d.stage !== 'CLOSED' && d.services?.length > 0 && d.services.every((s) => s.status === 'COMPLETED')).length;
  const closedCount = deals.filter((d) => d.stage === 'CLOSED').length;

  return (
    <div className="space-y-4">
      {/* Top RM Desk Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
              <Send className="w-4 h-4 text-cyan-700" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Relationship Manager (RM) Client Dossier & Handover Desk
              </h2>
              <p className="text-xs text-slate-500">
                Track full deal lifecycle from BDM form entry, monitor real-time Operations milestones, acquire required client details, and communicate updates for both in-progress and completed services.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-2.5 py-1 rounded-md border font-medium transition ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Deals ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('ACTIVE_FILING')}
            className={`px-2.5 py-1 rounded-md border font-medium transition ${
              activeTab === 'ACTIVE_FILING'
                ? 'bg-sky-700 text-white border-sky-700'
                : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
            }`}
          >
            Ops Filing Active ({activeFilingCount})
          </button>
          <button
            onClick={() => setActiveTab('READY_HANDOVER')}
            className={`px-2.5 py-1 rounded-md border font-medium transition ${
              activeTab === 'READY_HANDOVER'
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Ready to Close ({readyHandoverCount})
          </button>
          <button
            onClick={() => setActiveTab('CLOSED')}
            className={`px-2.5 py-1 rounded-md border font-medium transition ${
              activeTab === 'CLOSED'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            Closed ({closedCount})
          </button>
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
          <span className="font-medium">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Main Split Layout: Deals Queue (4 cols) & Live Dossier / Communication Desk (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[650px]">
        {/* LEFT PANE: Deals Queue List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-xs">
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                RM Deal Queue ({filteredDeals.length})
              </span>
              <button
                onClick={fetchRmQueue}
                disabled={loading}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-medium px-2 py-1 rounded hover:bg-slate-200/60 transition"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search deal code, client, company, BDM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
            {filteredDeals.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                No deals match current filter.
              </div>
            ) : (
              filteredDeals.map((d) => {
                const isSelected = selectedDeal?.id === d.id;
                const totalSvc = d.services?.length || 0;
                const doneSvc = (d.services || []).filter((s) => s.status === 'COMPLETED').length;
                const allDone = totalSvc > 0 && doneSvc === totalSvc;
                const stageMeta = STAGE_LABELS[d.stage] || { label: d.stage, color: 'bg-slate-100 text-slate-700 border-slate-200' };

                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDeal(d)}
                    className={`p-3 rounded-lg cursor-pointer transition border text-left ${
                      isSelected
                        ? 'bg-slate-50 border-slate-800 shadow-xs ring-1 ring-slate-800/20'
                        : 'bg-white border-slate-200/70 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {d.dealCode}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${stageMeta.color}`}>
                        {stageMeta.label}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-slate-900 mt-1.5 truncate">
                      {d.client?.companyName}
                    </div>

                    <div className="text-xs text-slate-500 mt-0.5 truncate flex items-center justify-between">
                      <span>{d.client?.clientName}</span>
                      <span className="font-mono text-[11px] text-slate-600">{d.client?.phone}</span>
                    </div>

                    {/* Progress Indicator */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        BDM: <strong className="text-slate-700">{d.bdm?.fullName?.split(' ')[0] || 'N/A'}</strong>
                      </span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          allDone
                            ? 'text-emerald-700'
                            : 'text-sky-700'
                        }`}
                      >
                        {allDone ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>All Done ({doneSvc}/{totalSvc})</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-sky-600" />
                            <span>{doneSvc}/{totalSvc} Done</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Deal Dossier, Live Ops Tracker, & Client Communication Desk */}
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
                    <h3 className="text-base font-bold text-slate-900">{selectedDeal.client?.companyName}</h3>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                        STAGE_LABELS[selectedDeal.stage]?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {STAGE_LABELS[selectedDeal.stage]?.label || selectedDeal.stage}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>Client: <strong className="text-slate-800">{selectedDeal.client?.clientName}</strong></span>
                    <span>•</span>
                    <span>Phone: <strong className="text-slate-800 font-mono">{selectedDeal.client?.phone}</strong></span>
                    <span>•</span>
                    <span>Email: <strong className="text-slate-800">{selectedDeal.client?.email}</strong></span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenDossier && onOpenDossier(selectedDeal.id)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 flex items-center gap-1.5 transition shadow-xs whitespace-nowrap"
                >
                  <Eye className="w-4 h-4 text-slate-500" /> Full Modal Dossier
                </button>
              </div>

              {/* DEAL STATUS & CLOSURE READINESS BANNER */}
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                  selectedDeal.stage === 'CLOSED'
                    ? 'bg-slate-50 border-slate-300 text-slate-800'
                    : selectedDealAllServicesDone
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-sky-50 border-sky-300 text-sky-900'
                }`}
              >
                {selectedDeal.stage === 'CLOSED' ? (
                  <CheckCheck className="w-5 h-5 text-slate-700 mt-0.5 flex-shrink-0" />
                ) : selectedDealAllServicesDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" />
                ) : (
                  <Clock className="w-5 h-5 text-sky-700 mt-0.5 flex-shrink-0" />
                )}

                <div className="flex-1 space-y-0.5">
                  <div className="font-bold text-sm">
                    {selectedDeal.stage === 'CLOSED'
                      ? 'Workflow Closed — Client Handover & Compliance Renewals Completed'
                      : selectedDealAllServicesDone
                      ? 'Ready to Close Deal — All Services Completed by Operations Team'
                      : `Deal Status: OPEN — Operations Filing in Progress (${selectedDealCompletedServices}/${selectedDealTotalServices} Services Completed)`}
                  </div>
                  <div className="text-xs leading-relaxed opacity-90">
                    {selectedDeal.stage === 'CLOSED'
                      ? 'This client has received all deliverables and has been enrolled into the annual compliance renewal schedule.'
                      : selectedDealAllServicesDone
                      ? 'Every service in this deal has been cleared by operations specialists. RM can perform final handover verification, schedule recurring renewals, and close the workflow.'
                      : `A deal is an overarching file containing multiple services. It will remain OPEN until all ${selectedDealTotalServices} services are completed by operations (${selectedDealIncompleteCount} pending). RM can communicate with the client to acquire necessary details or provide updates for in-progress services, and deliver completed filings.`}
                  </div>
                </div>
              </div>

              {/* 1. BDM ONBOARDING DOSSIER DETAILS */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h4 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" /> 1. BDM Onboarding Dossier & Details
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Filled by BDM: <strong className="text-slate-800">{selectedDeal.bdm?.fullName || 'BDM'}</strong>
                    {selectedDeal.coBdms?.length > 0 && ` + ${selectedDeal.coBdms.map((c) => c.fullName).join(', ')}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Company & Tax IDs</span>
                    <div className="font-bold text-slate-900">{selectedDeal.client?.companyName}</div>
                    <div className="text-slate-600 font-mono text-[11px]">
                      PAN: <strong>{selectedDeal.client?.panNumber || 'N/A'}</strong>
                    </div>
                    {selectedDeal.client?.gstin && (
                      <div className="text-slate-600 font-mono text-[11px]">
                        GSTIN: <strong>{selectedDeal.client.gstin}</strong>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Registered Office</span>
                    <div className="text-slate-800 leading-snug">
                      {selectedDeal.client?.billingAddress || 'No street address provided'}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {[selectedDeal.client?.city, selectedDeal.client?.state, selectedDeal.client?.pincode]
                        .filter(Boolean)
                        .join(', ') || 'Location N/A'}
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Commercial Terms</span>
                    <div className="font-bold text-slate-900 text-sm">
                      Total: ₹{Number(selectedDeal.totalAmount || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="text-emerald-700 font-medium text-[11px]">
                      Received: ₹{Number(selectedDeal.amountReceived || 0).toLocaleString('en-IN')}
                    </div>
                    {Number(selectedDeal.pendingAmount) > 0 ? (
                      <div className="text-amber-700 font-medium text-[11px]">
                        Pending Balance: ₹{Number(selectedDeal.pendingAmount).toLocaleString('en-IN')}
                      </div>
                    ) : (
                      <div className="text-emerald-700 font-bold text-[11px]">✓ 100% Paid in Full</div>
                    )}
                  </div>
                </div>

                {/* Directors */}
                {selectedDeal.client?.directors?.length > 0 && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Directors on File ({selectedDeal.client.directors.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedDeal.client.directors.map((dir, idx) => (
                        <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-100 text-[11px]">
                          <div className="font-semibold text-slate-900">{dir.name}</div>
                          {dir.din && <div className="text-slate-500 font-mono text-[10px]">DIN: {dir.din}</div>}
                          {dir.pan && <div className="text-slate-500 font-mono text-[10px]">PAN: {dir.pan}</div>}
                          {dir.phone && <div className="text-slate-500 font-mono text-[10px]">{dir.phone}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks / BDM Handover Note */}
                {selectedDeal.remarks && (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                    <strong>BDM Notes:</strong> {selectedDeal.remarks}
                  </div>
                )}

                {/* Attached Files Quick Tray */}
                {selectedDeal.documents?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Deal Files & Verification Documents ({selectedDeal.documents.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedDeal.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2 truncate mr-2">
                            <FileText className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                            <span className="font-medium text-slate-800 truncate" title={doc.title || doc.fileName}>
                              {doc.title || doc.fileName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePreviewDocument(doc.id)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1 transition"
                          >
                            <Eye className="w-3 h-3" /> Preview
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. LIVE OPERATIONS SERVICES & FILING MILESTONES (Real-Time Reflection) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" /> 2. Operations Live Milestone Tracker ({selectedDeal.services?.length || 0})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Live Status: <strong className="text-slate-800">{selectedDealCompletedServices} of {selectedDealTotalServices}</strong> Services Completed
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedDeal.services?.map((svc) => {
                    const isCompleted = svc.status === 'COMPLETED';

                    return (
                      <div
                        key={svc.id}
                        className={`p-3.5 rounded-xl border transition ${
                          isCompleted
                            ? 'bg-emerald-50/40 border-emerald-300'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-slate-900">{svc.serviceName}</h5>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-white text-slate-700 border-slate-300'
                                }`}
                              >
                                {svc.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                              <span>Fee: ₹{Number(svc.serviceFee || 0).toLocaleString('en-IN')}</span>
                              <span>•</span>
                              <span>
                                Assigned Specialist: <strong className="text-slate-700">{svc.assignedOpsUser?.fullName || 'In Operations Pool'}</strong>
                              </span>
                              {svc.govApplicationNumber && (
                                <>
                                  <span>•</span>
                                  <span>
                                    SRN / Govt Ref: <strong className="font-mono text-slate-800">{svc.govApplicationNumber}</strong>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="self-start sm:self-auto">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-md text-xs font-semibold shadow-xs">
                                <Check className="w-3.5 h-3.5" /> Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-sky-800 border border-sky-300 rounded-md text-xs font-semibold shadow-xs">
                                <Clock className="w-3.5 h-3.5 text-sky-600" /> In Progress
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. CLIENT COMMUNICATION DESK (FOR BOTH INCOMPLETE & COMPLETED SERVICES) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-1.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      3. Client Communication Desk
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                    Acquire Details, Update Progress & Deliver Filings
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">
                    <strong>RM Client Desk Guidelines:</strong> RM can communicate with the client for <strong>incomplete services</strong> to acquire missing documents/details or provide filing status updates, and for <strong>completed services</strong> to share final deliverables and acknowledgments.
                  </span>
                </div>

                <div className="space-y-4 pt-1">
                  {selectedDeal.services?.map((svc) => {
                    const isCompleted = svc.status === 'COMPLETED';
                    const isCopied = copiedServiceId === svc.id;
                    const isSaving = savingCommServiceId === svc.id;
                    const currentMode = commModes[svc.id] || (isCompleted ? 'COMPLETED' : 'ACQUIRE_DETAILS');
                    const messageText = getActiveMessageText(svc);
                    const cleanPhone = (selectedDeal.client?.phone || '').replace(/\D/g, '');
                    const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(messageText)}`;

                    return (
                      <div
                        key={svc.id}
                        className={`p-4 rounded-xl space-y-3 shadow-xs border transition ${
                          isCompleted
                            ? 'bg-emerald-50/30 border-2 border-emerald-300'
                            : 'bg-white border border-slate-200 ring-1 ring-slate-100'
                        }`}
                      >
                        {/* Service Communication Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`p-1 rounded ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-sky-100 text-sky-700'
                                }`}
                              >
                                {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                              </span>
                              <h5 className="text-sm font-bold text-slate-900">{svc.serviceName}</h5>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-sky-50 text-sky-800 border-sky-300'
                                }`}
                              >
                                {isCompleted ? 'COMPLETED & READY FOR CLIENT' : `STATUS: ${svc.status}`}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              {svc.govApplicationNumber ? (
                                <>Govt Ref: <strong className="font-mono text-slate-800">{svc.govApplicationNumber}</strong> • </>
                              ) : (
                                <>Assigned: <strong className="text-slate-800">{svc.assignedOpsUser?.fullName || 'Operations Team'}</strong> • </>
                              )}
                              {isCompleted && svc.completedAt
                                ? `Completed on ${new Date(svc.completedAt).toLocaleDateString('en-IN')}`
                                : 'In Progress by Operations'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(svc)}
                              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                              <span>{isCopied ? 'Copied!' : 'Copy Message'}</span>
                            </button>

                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Send via WhatsApp</span>
                            </a>
                          </div>
                        </div>

                        {/* Communication Intent Switcher for Incomplete Services */}
                        {!isCompleted && (
                          <div className="flex items-center gap-2 text-xs pt-1 border-t border-slate-100">
                            <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
                              Communication Intent:
                            </span>
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setCommModes((prev) => ({ ...prev, [svc.id]: 'ACQUIRE_DETAILS' }));
                                  setCustomMessages((prev) => {
                                    const copy = { ...prev };
                                    delete copy[svc.id];
                                    return copy;
                                  });
                                }}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                                  currentMode === 'ACQUIRE_DETAILS'
                                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Acquire Details / Docs
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCommModes((prev) => ({ ...prev, [svc.id]: 'STATUS_UPDATE' }));
                                  setCustomMessages((prev) => {
                                    const copy = { ...prev };
                                    delete copy[svc.id];
                                    return copy;
                                  });
                                }}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                                  currentMode === 'STATUS_UPDATE'
                                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Progress Status Update
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Editable Message Box */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                            <span className="font-medium">
                              Client Message Draft ({isCompleted ? 'Completion Announcement' : currentMode === 'ACQUIRE_DETAILS' ? 'Detail Acquisition Template' : 'Milestone Progress Update'}):
                            </span>
                            {customMessages[svc.id] !== undefined && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomMessages((prev) => {
                                    const copy = { ...prev };
                                    delete copy[svc.id];
                                    return copy;
                                  });
                                }}
                                className="text-slate-500 hover:text-slate-800 underline text-[10px]"
                              >
                                Reset to Default Template
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={5}
                            value={messageText}
                            onChange={(e) => setCustomMessages((prev) => ({ ...prev, [svc.id]: e.target.value }))}
                            className="w-full bg-slate-50/70 border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white leading-relaxed"
                          />
                        </div>

                        {/* Quick RM Communication Log */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-slate-100">
                          <input
                            type="text"
                            placeholder="Record client communication note in CRM (e.g. Requested utility bill via WhatsApp; client confirmed sending by evening)..."
                            value={commNotes[svc.id] || ''}
                            onChange={(e) => setCommNotes({ ...commNotes, [svc.id]: e.target.value })}
                            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => handleRecordCommunication(svc)}
                            disabled={isSaving}
                            className="w-full sm:w-auto px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 whitespace-nowrap shadow-xs"
                          >
                            {isSaving ? 'Saving...' : 'Log Note'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. WORKFLOW CLOSURE GATE & RECURRING RENEWALS (ENABLED ONLY WHEN ALL SERVICES ARE COMPLETED) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-purple-600" /> 4. Final Handover & Recurring Compliance Gate
                  </h4>
                  <span className="text-[11px] text-slate-500">Stage 09 Closure Gate</span>
                </div>

                {!selectedDealAllServicesDone ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <div className="font-bold text-sm">Deal Closure Locked: Services Still in Progress</div>
                      <div className="leading-relaxed">
                        A deal cannot be closed while individual services remain pending. There are currently <strong>{selectedDealIncompleteCount} service(s)</strong> still being processed by the Operations team. Once all services reach <strong>COMPLETED</strong>, this closure gate will unlock automatically.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Handover Verification */}
                    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3 text-xs">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Client Delivery Verification
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                        <div className="p-2.5 bg-white border border-slate-200 rounded-md flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                          <span>All {selectedDealTotalServices} Services Completed & Verified</span>
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 rounded-md flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                          <span>Accounts Clearance / Balance Check</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-slate-600 font-medium block mb-1">
                          Client Handover Communication Notes:
                        </label>
                        <textarea
                          rows={2}
                          value={handoverNotes}
                          onChange={(e) => setHandoverNotes(e.target.value)}
                          placeholder="Document conversation with client, confirmation of certificate receipt, next steps briefed..."
                          className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                        />
                      </div>
                    </div>

                    {/* Recurring Compliance Renewal Scheduler */}
                    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-500" /> Annual Renewals & Recurring Compliance Pool
                        </div>
                      </div>

                      {/* Quick Add Presets */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="text-xs text-slate-600 font-semibold self-center">Presets:</span>
                        {DEFAULT_RENEWAL_TEMPLATES.map((tmpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddRenewal(tmpl)}
                            className="text-xs px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-medium flex items-center gap-1.5 transition shadow-xs"
                          >
                            <Plus className="w-3 h-3 text-slate-500" /> {tmpl.name.split(' ')[0]} {tmpl.name.split(' ')[1]}
                          </button>
                        ))}
                      </div>

                      {/* Scheduled Renewals List */}
                      <div className="space-y-2 pt-1">
                        {renewals.map((r, index) => (
                          <div
                            key={index}
                            className="p-3 bg-white border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs"
                          >
                            <div className="sm:col-span-5 font-semibold text-slate-900">
                              {r.serviceName}
                              <div className="text-xs text-slate-500 font-normal mt-0.5">{r.notes}</div>
                            </div>

                            <div className="sm:col-span-3 text-slate-700">
                              <span className="text-[11px] block text-slate-500 font-medium mb-1">Statutory Due Date</span>
                              <input
                                type="date"
                                value={r.dueDate}
                                onChange={(e) => {
                                  const updated = [...renewals];
                                  updated[index].dueDate = e.target.value;
                                  setRenewals(updated);
                                }}
                                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                              />
                            </div>

                            <div className="sm:col-span-3 text-slate-700">
                              <span className="text-[11px] block text-slate-500 font-medium mb-1">Reminder Date</span>
                              <input
                                type="date"
                                value={r.remindAt}
                                onChange={(e) => {
                                  const updated = [...renewals];
                                  updated[index].remindAt = e.target.value;
                                  setRenewals(updated);
                                }}
                                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                              />
                            </div>

                            <div className="sm:col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveRenewal(index)}
                                className="text-rose-600 hover:text-rose-700 p-1.5"
                                title="Remove Reminder"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stage 09 Handover Action Button */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">Stage 09: Complete Handover & Close CRM Workflow</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Enrolls client into annual compliance retention and completes onboarding.
                        </div>
                      </div>

                      {selectedDeal.stage !== 'CLOSED' ? (
                        <button
                          type="button"
                          onClick={handleCompleteHandover}
                          disabled={actionLoading}
                          className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                        >
                          <Briefcase className="w-4 h-4" />
                          <span>Close CRM Workflow (Stage 09 Complete)</span>
                        </button>
                      ) : (
                        <div className="px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" /> Workflow Closed
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
              Select an operations file to view dossier details and communicate with client.
            </div>
          )}
        </div>
      </div>

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
