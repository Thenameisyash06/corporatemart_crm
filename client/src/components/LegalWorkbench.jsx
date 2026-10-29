import React, { useState, useEffect } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Eye,
  FileCheck,
  FileText,
  User,
  RotateCcw,
  Check,
  ShieldCheck,
  UserCheck,
  Building,
  CreditCard,
  Briefcase,
  MapPin,
  Clock,
  Phone,
  Mail,
  Users,
  Percent,
  FileBox,
  AlertCircle,
  MessageSquare,
  UploadCloud,
  Send,
  FileCheck2,
  X,
} from 'lucide-react';
import api from '../lib/api';
import DealFinancialMetrics from './DealFinancialMetrics';

const COMMON_LEGAL_DEFICIENCIES = [
  'Director name spelling mismatch between PAN card and Aadhaar',
  'Electricity bill / Address proof is older than 2 months (MCA requires < 60 days)',
  'Digital Signature Certificate (DSC) not active or unverified on MCA portal',
  'Company object clause requires regulatory approval / RBI / SEBI NOC',
  'Registered office NOC not signed by property owner',
  'Director passport photo is blurry / does not meet white background spec',
  'Company PAN Card image is illegible or does not match entered PAN number',
];

export default function LegalWorkbench({ currentUser, onRefreshParent, onOpenDossier }) {
  const [deals, setDeals] = useState([]);
  const [legalTeam, setLegalTeam] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deficiencyNotes, setDeficiencyNotes] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Legal Agreement upload state
  const [agreementFile, setAgreementFile] = useState(null);
  const [uploadingAgreement, setUploadingAgreement] = useState(false);
  const [isReplacingAgreement, setIsReplacingAgreement] = useState(false);

  const fetchLegalQueue = async () => {
    try {
      setLoading(true);
      const [dealsRes, teamRes] = await Promise.all([
        api.get('/deals', { params: { roleFilter: 'LEGAL' } }),
        api.get('/users', { params: { role: 'LEGAL' } }),
      ]);
      setDeals(dealsRes.data.deals);
      setLegalTeam(teamRes.data.users);

      if (dealsRes.data.deals.length > 0) {
        const targetDeal = selectedDeal
          ? dealsRes.data.deals.find((d) => d.id === selectedDeal.id) || dealsRes.data.deals[0]
          : dealsRes.data.deals[0];
        
        setSelectedDeal(targetDeal);
        // Also fetch full deal details to ensure all relations (coBdms, services, etc.) are freshest
        try {
          const detailRes = await api.get(`/deals/${targetDeal.id}`);
          if (detailRes.data?.deal) {
            setSelectedDeal(detailRes.data.deal);
          }
        } catch {
          // Fall back to targetDeal
        }
      } else {
        setSelectedDeal(null);
      }
    } catch (err) {
      console.error('Failed to load legal queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegalQueue();
  }, []);

  const handleSelectDeal = async (dealSummary) => {
    setSelectedDeal(dealSummary);
    setAgreementFile(null);
    setIsReplacingAgreement(false);
    try {
      const res = await api.get(`/deals/${dealSummary.id}`);
      if (res.data?.deal) {
        setSelectedDeal(res.data.deal);
      }
    } catch (err) {
      console.error('Failed to fetch full deal dossier:', err);
    }
  };

  const handleAssignDeal = async (targetUserId) => {
    if (!selectedDeal) return;
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await api.patch(`/deals/${selectedDeal.id}/assign`, {
        department: 'LEGAL',
        userId: targetUserId || null,
      });
      setFeedback({ type: 'success', message: res.data.message });
      await fetchLegalQueue();
      onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Assignment failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadAgreement = async (e) => {
    if (e) e.preventDefault();
    if (!agreementFile || !selectedDeal) return;
    try {
      setUploadingAgreement(true);
      setFeedback(null);
      const formData = new FormData();
      formData.append('file', agreementFile);
      const res = await api.post(`/deals/${selectedDeal.id}/legal-agreement`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFeedback({
        type: 'success',
        message: 'Legal Agreement uploaded successfully and stored in vault! Queued for client handover email.',
      });
      setAgreementFile(null);
      setIsReplacingAgreement(false);
      if (res.data?.deal) {
        setSelectedDeal(res.data.deal);
      }
      await fetchLegalQueue();
      onRefreshParent?.();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to upload legal agreement.',
      });
    } finally {
      setUploadingAgreement(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedDeal) return;
    try {
      setActionLoading(true);
      setFeedback(null);
      await api.post(`/deals/${selectedDeal.id}/legal-verify`, {
        action: 'APPROVE',
        notes: 'Legal scrutiny passed. All KYC, statutory documents, and entity details verified.',
      });
      setFeedback({ type: 'success', message: `Deal ${selectedDeal.dealCode} cleared and forwarded to Operations!` });
      await fetchLegalQueue();
      onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Clearance failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDeal || !deficiencyNotes.trim()) return;
    try {
      setActionLoading(true);
      setFeedback(null);
      await api.post(`/deals/${selectedDeal.id}/legal-verify`, {
        action: 'REJECT',
        notes: deficiencyNotes.trim(),
      });
      setFeedback({ type: 'warning', message: `Deficiency raised on ${selectedDeal.dealCode}. Returned to BDM/Client.` });
      setDeficiencyNotes('');
      await fetchLegalQueue();
      onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to raise deficiency.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDocVerify = async (docId, currentStatus) => {
    try {
      await api.patch(`/documents/${docId}/verify`, {
        isVerified: !currentStatus,
      });
      const res = await api.get(`/deals/${selectedDeal.id}`);
      setSelectedDeal(res.data.deal);
      setDeals((prev) => prev.map((d) => (d.id === selectedDeal.id ? res.data.deal : d)));
    } catch (err) {
      alert('Failed to update document status.');
    }
  };

  const handlePreviewDoc = async (docId) => {
    try {
      const res = await api.get(`/documents/${docId}/signed-url`);
      setPreviewDoc(res.data);
    } catch (err) {
      alert('Failed to preview document.');
    }
  };

  // Helper document finders
  const allDocs = selectedDeal?.documents || [];
  const companyPanDoc = allDocs.find(
    (d) => d.documentType === 'COMPANY_PAN' || (d.documentType === 'KYC_PAN' && d.title?.toLowerCase().includes('pan'))
  );
  const legalAgreementDoc = allDocs.find(
    (d) =>
      d.documentType === 'LEGAL_AGREEMENT' ||
      (d.fileUrl && d.fileUrl === selectedDeal?.legalAgreementUrl) ||
      d.title?.toLowerCase().includes('legal service agreement')
  );
  const paymentProofDocs = allDocs.filter((d) => d.documentType === 'PAYMENT_PROOF');
  const directorKycDocs = allDocs.filter((d) => ['KYC_PAN', 'KYC_AADHAAR', 'ADDRESS_PROOF'].includes(d.documentType));
  const statutoryDocs = allDocs.filter((d) =>
    ['COMPANY_PAN', 'INCORPORATION_FORM', 'BOARD_RESOLUTION', 'DSC_TOKEN'].includes(d.documentType)
  );
  const otherDocs = allDocs.filter(
    (d) =>
      ![
        'COMPANY_PAN',
        'INCORPORATION_FORM',
        'BOARD_RESOLUTION',
        'DSC_TOKEN',
        'KYC_PAN',
        'KYC_AADHAAR',
        'ADDRESS_PROOF',
        'PAYMENT_PROOF',
        'LEGAL_AGREEMENT',
      ].includes(d.documentType) && d.id !== legalAgreementDoc?.id
  );

  const verifiedDocsCount = allDocs.filter((d) => d.isVerified).length;
  const firstPayment = selectedDeal?.payments?.[0];

  return (
    <div className="space-y-4">
      {/* Workbench Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
              <Scale className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Legal Scrutiny & Compliance Desk</h2>
              <p className="text-xs text-slate-500">
                Stage 05: Scrutinize complete BDM deal dossier, upload legal service agreement & verify statutory compliance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
            {deals.filter((d) => d.stage === 'STAGE_05_LEGAL_VERIFICATION').length} Awaiting Scrutiny
          </div>
          {deals.some((d) => d.stage === 'STAGE_05_LEGAL_REJECTED') && (
            <div className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {deals.filter((d) => d.stage === 'STAGE_05_LEGAL_REJECTED').length} Deficiencies
            </div>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : feedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
        {/* LEFT PANE: Queue List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Legal Scrutiny Queue ({deals.length})
            </span>
            <button
              onClick={fetchLegalQueue}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-medium px-2 py-1 rounded hover:bg-slate-200/60 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2.5 space-y-1.5">
            {deals.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                <CheckCircle2 className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                Queue is clear. No files awaiting legal scrutiny.
              </div>
            ) : (
              deals.map((d) => {
                const isSelected = selectedDeal?.id === d.id;
                const isRejected = d.stage === 'STAGE_05_LEGAL_REJECTED';

                return (
                  <div
                    key={d.id}
                    onClick={() => handleSelectDeal(d)}
                    className={`p-3.5 rounded-lg cursor-pointer transition border text-left ${
                      isSelected
                        ? 'bg-slate-50 border-slate-800 shadow-sm ring-1 ring-slate-800/20'
                        : 'bg-white border-slate-200/70 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {d.dealCode}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded border ${
                          isRejected
                            ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
                        }`}
                      >
                        {isRejected ? 'Deficiency' : 'Verified by Accts'}
                      </span>
                    </div>

                    <div className="font-semibold text-sm text-slate-900 mt-2 truncate">
                      {d.client.companyName}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                      <span>Services: <strong className="text-slate-800">{d.services?.length || 0}</strong></span>
                      <span className="text-slate-600 font-medium">Docs: <strong className="text-slate-800">{d.documents?.length || 0}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Scrutiny Checklist & Decision (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          {selectedDeal ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Active Deal Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-slate-200 gap-3">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                      {selectedDeal.dealCode}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{selectedDeal.client.companyName}</h3>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>Client: <strong className="text-slate-800">{selectedDeal.client.clientName}</strong> ({selectedDeal.client.phone})</span>
                    <span>•</span>
                    <span>Lead BDM: <strong className="text-slate-800">{selectedDeal.bdm?.fullName}</strong></span>
                    {selectedDeal.coBdms?.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          Co-BDMs: <strong className="text-slate-800">{selectedDeal.coBdms.map((b) => b.fullName).join(', ')}</strong>
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">✓ Accounts Cleared</span>
                  </div>
                </div>

                <button
                  onClick={() => onOpenDossier(selectedDeal.id)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 flex items-center gap-1.5 transition shadow-sm flex-shrink-0"
                >
                  <Eye className="w-4 h-4" /> View Full Dossier
                </button>
              </div>

              {/* EXECUTIVE ASSIGNMENT */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3">
                  <span className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-xs">
                    <UserCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs text-slate-500 block font-medium">Assigned Legal Associate</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {selectedDeal.assignedLegalUser ? selectedDeal.assignedLegalUser.fullName : 'Unassigned (Open in Pool)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedDeal.assignedLegalUserId !== currentUser?.id && (
                    <button
                      onClick={() => handleAssignDeal(currentUser?.id)}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                      title="Take ownership of this scrutiny"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Claim Deal</span>
                    </button>
                  )}

                  <div className="flex items-center space-x-1">
                    <select
                      value={selectedDeal.assignedLegalUserId || ''}
                      onChange={(e) => handleAssignDeal(e.target.value || null)}
                      disabled={actionLoading}
                      className="bg-white border border-slate-300 text-slate-800 text-xs font-medium rounded-md px-2.5 py-1.5 focus:outline-none focus:border-slate-800"
                    >
                      <option value="">-- Assign Associate --</option>
                      {legalTeam.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 1. COMPLETE CLIENT & ENTITY PROFILE (FILLED BY BDM) */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-600" /> 1. Client & Entity Profile (Filled by BDM)
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono">
                    Client ID: {selectedDeal.clientId ? selectedDeal.clientId.substring(0, 8) : 'N/A'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Company Name & Contact Person */}
                  <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1">
                    <span className="text-slate-500 text-[11px] font-medium block">Company & Primary Contact</span>
                    <div className="font-bold text-sm text-slate-900 truncate">{selectedDeal.client.companyName}</div>
                    <div className="text-slate-700 font-medium flex items-center gap-1.5 mt-0.5">
                      <User className="w-3 h-3 text-slate-400" /> {selectedDeal.client.clientName}
                    </div>
                    <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" /> {selectedDeal.client.phone}
                    </div>
                    <div className="text-slate-500 text-[11px] flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-slate-400" /> {selectedDeal.client.email}
                    </div>
                  </div>

                  {/* Company PAN & CA Consultant */}
                  <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px] font-medium">Company PAN</span>
                      {companyPanDoc && (
                        <button
                          type="button"
                          onClick={() => handlePreviewDoc(companyPanDoc.id)}
                          className="text-[11px] text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1 hover:underline"
                        >
                          <Eye className="w-3 h-3" /> Preview PAN Card
                        </button>
                      )}
                    </div>
                    <div className="font-mono font-bold text-sm text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-200 flex items-center justify-between">
                      <span>{selectedDeal.client.panNumber || 'Not Provided'}</span>
                      {selectedDeal.client.panNumber && (
                        <span className="text-[10px] text-emerald-700 font-sans font-semibold">Valid Format</span>
                      )}
                    </div>
                    <div className="pt-1">
                      <span className="text-slate-500 text-[11px] font-medium block">CA / Consultant Name:</span>
                      <div className="font-medium text-slate-800 mt-0.5">
                        {selectedDeal.client.consultantName || <span className="text-slate-400 italic">Direct Client (No Consultant)</span>}
                      </div>
                    </div>
                  </div>

                  {/* Industry, Sector & GST */}
                  <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1.5">
                    <div>
                      <span className="text-slate-500 text-[11px] font-medium block">Business Classification</span>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {selectedDeal.client.industry || 'Not Specified'} • {selectedDeal.client.sector || 'General'}
                      </div>
                    </div>
                    <div className="pt-1 border-t border-slate-100">
                      <span className="text-slate-500 text-[11px] font-medium block">GST Status & GSTIN</span>
                      <div className="font-mono font-semibold text-slate-900 mt-0.5">
                        {selectedDeal.client.gstStatus ? (
                          <span className="text-emerald-700">GST: {selectedDeal.client.gstin || 'Active'}</span>
                        ) : (
                          <span className="text-slate-500 font-sans">Non-GST Applicable</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Registered / Billing Address */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Registered Address & Location:</span>
                  </div>
                  <div className="text-slate-800 font-medium leading-relaxed">
                    {selectedDeal.client.billingAddress || 'No detailed address provided'}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 font-mono">
                    <span>City: <strong className="text-slate-800 font-sans">{selectedDeal.client.city || 'N/A'}</strong></span>
                    <span>•</span>
                    <span>State: <strong className="text-slate-800 font-sans">{selectedDeal.client.state || 'N/A'}</strong></span>
                    <span>•</span>
                    <span>Pincode: <strong className="text-slate-800">{selectedDeal.client.pincode || 'N/A'}</strong></span>
                  </div>
                </div>
              </div>

              {/* 2. SERVICES & COMMERCIAL DETAILS (FILLED BY BDM) */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-600" /> 2. Services & Commercial Terms (Filled by BDM)
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedDeal.services?.length || 0} Service{(selectedDeal.services?.length || 0) === 1 ? '' : 's'} Booked
                  </span>
                </div>

                {/* Services Table */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Service Name</th>
                        <th className="py-2 px-3 font-semibold text-right">Professional Fee</th>
                        <th className="py-2 px-3 font-semibold text-right">Govt Fee</th>
                        <th className="py-2 px-3 font-semibold text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedDeal.services?.map((svc) => (
                        <tr key={svc.id} className="text-slate-800 hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{svc.serviceName}</td>
                          <td className="py-2.5 px-3 font-mono text-right text-slate-700">
                            ₹{Number(svc.serviceFee).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-right text-slate-500">
                            ₹{Number(svc.govtFee).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900">
                            ₹{(Number(svc.serviceFee) + Number(svc.govtFee)).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary (Standard Amount - Deal Amount - Received Amount - Pending Amount with GST) */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Deal Financial Summary
                  </div>
                  <DealFinancialMetrics
                    standardAmount={
                      parseFloat(selectedDeal.standardAmount) > 0
                        ? selectedDeal.standardAmount
                        : selectedDeal.services?.reduce(
                            (sum, s) =>
                              sum + (parseFloat(s.standardAmount) || (parseFloat(s.serviceFee) || 0) + (parseFloat(s.govtFee) || 0)),
                            0
                          ) || selectedDeal.totalAmount
                    }
                    dealAmount={selectedDeal.totalAmount}
                    receivedAmount={selectedDeal.amountReceived}
                    pendingAmount={selectedDeal.pendingAmount}
                    receivingAccount={selectedDeal.receivingAccount}
                  />
                </div>

                {/* All Payment Tranches & Verification Notes */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                    <span>Recorded Payment Tranches ({selectedDeal.payments?.length || 0})</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {selectedDeal.payments?.filter((p) => p.status === 'VERIFIED').length} of {selectedDeal.payments?.length || 0} Tranches Verified
                    </span>
                  </div>

                  {selectedDeal.payments && selectedDeal.payments.length > 0 ? (
                    selectedDeal.payments.map((p) => {
                      const isVerified = p.status === 'VERIFIED';
                      const isPending = p.status === 'PENDING_VERIFICATION';
                      const isRejected = p.status === 'REJECTED';

                      return (
                        <div
                          key={p.id}
                          className={`p-3.5 bg-white border rounded-lg shadow-xs text-xs space-y-2 ${
                            isPending
                              ? 'border-amber-300 bg-amber-50/20'
                              : isRejected
                              ? 'border-rose-300 bg-rose-50/20'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                              <span className="font-bold text-slate-900 text-sm">
                                Tranche #{p.trancheNumber}: ₹{Number(p.amount).toLocaleString('en-IN')}
                              </span>
                              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                                {p.paymentMode}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                                  isVerified
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : isRejected
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                }`}
                              >
                                {isVerified ? '✓ Verified by Accounts' : isRejected ? '✕ Rejected' : '⏳ Awaiting Accounts Verification'}
                              </span>
                              {p.accountName && (
                                <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                  A/c: {p.accountName}
                                </span>
                              )}
                              {p.paymentMode === 'CASH' && p.cashCollectorName && (
                                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
                                  Cash Collector: {p.cashCollectorName}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-slate-600 text-[11px]">
                              UTR / Ref: <strong className="text-slate-900">{p.transactionReference}</strong> • {new Date(p.paymentDate).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Tranche Remark / Payment Note */}
                          {p.remarks && (
                            <div className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 flex items-start gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-semibold text-slate-900">
                                  {p.trancheNumber === 1 ? 'Narration / Payment Remark: ' : `Tranche #${p.trancheNumber} Remark: `}
                                </span>
                                <span>{p.remarks}</span>
                              </div>
                            </div>
                          )}

                          {/* Tranche Verification Note */}
                          {p.verificationNotes && (
                            <div className="text-emerald-800 bg-emerald-50/60 p-2 rounded border border-emerald-200 flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-semibold">Accounts Verification Clearance Note: </span>
                                <span>{p.verificationNotes}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 text-slate-400 text-center italic bg-slate-50 rounded border border-slate-200">
                      No payment tranches recorded.
                    </div>
                  )}

                  {/* Narration & Clearance Notes from Accounts Desk (if recorded on deal level) */}
                  {(selectedDeal.remarks || selectedDeal.accountsNotes) && (
                    <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs text-xs space-y-2 mt-1.5">
                      {selectedDeal.remarks && (
                        <div className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-900">Narration (Accounts Desk): </span>
                            <span>{selectedDeal.remarks}</span>
                          </div>
                        </div>
                      )}

                      {selectedDeal.accountsNotes && (
                        <div className="text-emerald-800 bg-emerald-50/60 p-2 rounded border border-emerald-200 flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-semibold">Accounts Verification Clearance Note: </span>
                            <span>{selectedDeal.accountsNotes}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. DIRECTORS & GOVERNANCE IDENTITY (FILLED BY BDM) */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" /> 3. Director Information Consistency (Filled by BDM)
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedDeal.client.directors?.length || 0} Director{(selectedDeal.client.directors?.length || 0) === 1 ? '' : 's'}
                  </span>
                </div>

                {selectedDeal.client.directors?.length > 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3.5 font-semibold">Director Name</th>
                          <th className="py-2.5 px-3.5 font-semibold">DIN</th>
                          <th className="py-2.5 px-3.5 font-semibold">PAN</th>
                          <th className="py-2.5 px-3.5 font-semibold">Email</th>
                          <th className="py-2.5 px-3.5 font-semibold">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedDeal.client.directors?.map((d) => (
                          <tr key={d.id} className="text-slate-800 hover:bg-slate-50/50">
                            <td className="py-2.5 px-3.5 font-bold text-slate-900">{d.name}</td>
                            <td className="py-2.5 px-3.5 font-mono font-medium">{d.din || 'New Allotment'}</td>
                            <td className="py-2.5 px-3.5 font-mono font-medium">{d.pan || 'N/A'}</td>
                            <td className="py-2.5 px-3.5 text-slate-600">{d.email || 'N/A'}</td>
                            <td className="py-2.5 px-3.5 text-slate-600">{d.phone || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-slate-200 rounded-lg text-slate-500 text-xs italic text-center">
                    No directors were entered by BDM during initial onboarding.
                  </div>
                )}
              </div>

              {/* 4. COMPLETE DOCUMENT SCRUTINY VAULT (ALL DOCUMENTS UPLOADED BY BDM) */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-brand-600" /> 4. Complete Document Scrutiny Vault ({allDocs.length} Documents)
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-full font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200">
                      ✓ {verifiedDocsCount} / {allDocs.length} Verified
                    </span>
                    {allDocs.length - verifiedDocsCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full font-semibold border bg-amber-50 text-amber-800 border-amber-200">
                        {allDocs.length - verifiedDocsCount} Pending
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Tick each document to mark legal verification. Click <strong>Preview</strong> to inspect the uploaded original document in high-res view.
                </p>

                {allDocs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-white border border-slate-200 rounded-xl">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No documents have been uploaded for this deal yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Category: Company & Statutory */}
                    {statutoryDocs.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-500" /> Company Statutory & Registration Documents ({statutoryDocs.length})
                        </span>
                        <div className="space-y-1.5">
                          {statutoryDocs.map((doc) => (
                            <DocRow
                              key={doc.id}
                              doc={doc}
                              onToggleVerify={handleToggleDocVerify}
                              onPreview={handlePreviewDoc}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Category: Director KYC */}
                    {directorKycDocs.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" /> Director KYC Documents ({directorKycDocs.length})
                        </span>
                        <div className="space-y-1.5">
                          {directorKycDocs.map((doc) => (
                            <DocRow
                              key={doc.id}
                              doc={doc}
                              onToggleVerify={handleToggleDocVerify}
                              onPreview={handlePreviewDoc}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Category: Payment Proofs */}
                    {paymentProofDocs.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Payment Proofs & Bank Receipts ({paymentProofDocs.length})
                        </span>
                        <div className="space-y-1.5">
                          {paymentProofDocs.map((doc) => (
                            <DocRow
                              key={doc.id}
                              doc={doc}
                              onToggleVerify={handleToggleDocVerify}
                              onPreview={handlePreviewDoc}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Category: Other Documents */}
                    {otherDocs.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <FileBox className="w-3.5 h-3.5 text-slate-500" /> Other Supporting Attachments ({otherDocs.length})
                        </span>
                        <div className="space-y-1.5">
                          {otherDocs.map((doc) => (
                            <DocRow
                              key={doc.id}
                              doc={doc}
                              onToggleVerify={handleToggleDocVerify}
                              onPreview={handlePreviewDoc}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 5. LEGAL SERVICE AGREEMENT (CLIENT HANDOVER DOCUMENT) */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-600" /> 5. Legal Service Agreement (Client Handover Document)
                  </div>
                  {legalAgreementDoc || selectedDeal.legalAgreementUrl ? (
                    <span className="px-2.5 py-0.5 rounded-full font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200 text-xs flex items-center gap-1">
                      <Check className="w-3 h-3" /> Agreement Stored in Vault
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full font-semibold border bg-amber-50 text-amber-800 border-amber-200 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Agreement Pending Upload
                    </span>
                  )}
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-start gap-2 text-slate-600">
                    <FileText className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="leading-relaxed">
                        Upload the finalized legal service agreement drafted by the Legal department. This document is saved securely in storage and attached to the deal record (ready for client email dispatch when handover notification is implemented in the future).
                      </p>
                    </div>
                  </div>
                </div>

                {/* If agreement already uploaded and not in replacing mode */}
                {(legalAgreementDoc || selectedDeal.legalAgreementUrl) && !isReplacingAgreement ? (
                  <div className="p-4 bg-white border-2 border-emerald-200 rounded-xl shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3 truncate">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center flex-shrink-0">
                          <FileCheck2 className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 truncate">
                              {legalAgreementDoc?.title || `Legal Service Agreement - ${selectedDeal.client?.companyName}`}
                            </span>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                              LEGAL AGREEMENT
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-mono mt-0.5 block truncate">
                            {legalAgreementDoc?.fileName || 'service_agreement.pdf'}
                            {legalAgreementDoc?.fileSize ? ` • ${(legalAgreementDoc.fileSize / 1024).toFixed(0)} KB` : ''}
                            {legalAgreementDoc?.createdAt ? ` • Uploaded ${new Date(legalAgreementDoc.createdAt).toLocaleDateString()}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {legalAgreementDoc && (
                          <button
                            type="button"
                            onClick={() => handlePreviewDoc(legalAgreementDoc.id)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> Preview Agreement
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsReplacingAgreement(true)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Re-upload / Replace
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Storage Vault: <strong className="text-slate-800">Stored and linked to deal record</strong></span>
                      </span>
                      <span className="font-mono text-emerald-700 font-semibold">Status: Saved & Verified</span>
                    </div>
                  </div>
                ) : (
                  /* Upload form when not uploaded or when replacing */
                  <form onSubmit={handleUploadAgreement} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <UploadCloud className="w-4 h-4 text-brand-600" />
                        <span>{isReplacingAgreement ? 'Upload Revised Legal Agreement' : 'Upload Legal Agreement File'}</span>
                      </label>
                      {isReplacingAgreement && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsReplacingAgreement(false);
                            setAgreementFile(null);
                          }}
                          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel Replace
                        </button>
                      )}
                    </div>

                    <div>
                      <input
                        type="file"
                        id="legal-agreement-file-input"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                        onChange={(e) => setAgreementFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label
                        htmlFor="legal-agreement-file-input"
                        className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center ${
                          agreementFile
                            ? 'border-brand-500 bg-brand-50/40 text-brand-900'
                            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {agreementFile ? (
                          <div className="space-y-1">
                            <FileCheck2 className="w-7 h-7 text-emerald-600 mx-auto" />
                            <div className="text-xs font-bold text-slate-900">{agreementFile.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {(agreementFile.size / 1024).toFixed(0)} KB • Click to choose a different file
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <UploadCloud className="w-7 h-7 text-slate-400 mx-auto" />
                            <div className="text-xs font-bold text-slate-800">
                              Click to browse or drag & drop client agreement
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Accepted: PDF, DOCX, DOC, Images (Max 50MB)
                            </div>
                          </div>
                        )}
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <span className="text-[11px] text-slate-400">
                        File will be safely saved to storage vault and attached to Deal #{selectedDeal.dealCode}
                      </span>
                      <button
                        type="submit"
                        disabled={!agreementFile || uploadingAgreement}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-40"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>{uploadingAgreement ? 'Uploading to Storage...' : 'Upload & Save Legal Agreement'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* 6. LEGAL DECISION CONTROLS */}
              <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    6. Scrutiny Clearance / Deficiency Action
                  </h4>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      {selectedDeal.client.panNumber ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> PAN Present
                        </span>
                      ) : (
                        <span className="text-rose-700 font-semibold flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" /> PAN Missing
                        </span>
                      )}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      {legalAgreementDoc || selectedDeal.legalAgreementUrl ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Agreement Attached
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> Agreement Pending
                        </span>
                      )}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      {allDocs.length > 0 && verifiedDocsCount === allDocs.length ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> All Docs Verified
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {verifiedDocsCount}/{allDocs.length} Verified
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-700 font-medium block">
                    Deficiency Reason (if returning to BDM):
                  </label>
                  <select
                    onChange={(e) => setDeficiencyNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                  >
                    <option value="">-- Choose standard deficiency reason --</option>
                    {COMMON_LEGAL_DEFICIENCIES.map((r, i) => (
                      <option key={i} value={r}>{r}</option>
                    ))}
                  </select>

                  <textarea
                    rows={2}
                    value={deficiencyNotes}
                    onChange={(e) => setDeficiencyNotes(e.target.value)}
                    placeholder="Describe missing documents, spelling discrepancies, or corrections needed..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                  <button
                    onClick={handleReject}
                    disabled={!deficiencyNotes.trim() || actionLoading}
                    className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold border border-rose-300 transition disabled:opacity-40"
                  >
                    Raise Deficiency (Return to BDM)
                  </button>

                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Clear Compliance & Forward to Operations (Stage 05)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
              Select a file from the legal queue to review compliance.
            </div>
          )}
        </div>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-semibold text-xs text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                {previewDoc.fileName}
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
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

// Subcomponent for each document row
function DocRow({ doc, onToggleVerify, onPreview }) {
  return (
    <div
      className={`p-3 rounded-lg border flex items-center justify-between text-xs transition ${
        doc.isVerified
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <div className="flex items-center space-x-3 truncate">
        <button
          type="button"
          onClick={() => onToggleVerify(doc.id, doc.isVerified)}
          className={`w-5 h-5 rounded flex items-center justify-center transition border flex-shrink-0 ${
            doc.isVerified
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'bg-white border-slate-300 hover:border-slate-500 text-transparent'
          }`}
          title={doc.isVerified ? 'Click to unverify' : 'Click to verify'}
        >
          {doc.isVerified && <Check className="w-3.5 h-3.5" />}
        </button>

        <div className="truncate">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-900 truncate">{doc.title}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {doc.documentType}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono mt-0.5 block truncate">
            {doc.fileName} {doc.fileSize ? `• ${(doc.fileSize / 1024).toFixed(0)} KB` : ''} •{' '}
            {doc.isVerified ? (
              <span className="text-emerald-700 font-sans font-semibold">
                ✓ Verified ({doc.verifiedByRole || 'LEGAL'})
              </span>
            ) : (
              <span className="text-amber-700 font-sans font-medium">Pending Verification</span>
            )}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPreview(doc.id)}
        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition shadow-sm flex-shrink-0 ml-2"
      >
        <Eye className="w-3.5 h-3.5" /> Preview
      </button>
    </div>
  );
}
