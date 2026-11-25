import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Eye,
  ShieldCheck,
  Briefcase,
  History,
  FileCheck,
  Check,
  ExternalLink,
  IndianRupee,
  Lock,
  UserCheck,
  Building,
  MapPin,
  Trash2,
  Mail,
  Pencil,
  Plus,
  UploadCloud,
  AlertCircle,
} from 'lucide-react';
import api from '../lib/api';
import { toast } from '../context/ToastContext';
import { STAGE_CONFIG } from './DealsTable';
import CollectBalanceModal from './CollectBalanceModal';
import DealFinancialMetrics from './DealFinancialMetrics';

const STAGES_LIST = [
  { key: 'STAGE_01_PAYMENT_RECEIVED', label: '01. Payment' },
  { key: 'STAGE_02_DOCUMENTS_COLLECTED', label: '02. Docs' },
  { key: 'STAGE_04_ACCOUNTS_VERIFICATION', label: '04. Accounts' },
  { key: 'STAGE_05_LEGAL_VERIFICATION', label: '05. Legal' },
  { key: 'STAGE_06_OPERATIONS_PROCESSING', label: '06. Ops' },
  { key: 'STAGE_07_SERVICE_COMPLETED', label: '07. Completed' },
  { key: 'STAGE_08_FINAL_DOCS_DELIVERED', label: '08. Delivered' },
  { key: 'STAGE_09_RM_HANDOVER', label: '09. RM Success' },
];

export default function DealDetailModal({ dealId, isOpen, onClose, currentUser, onRefreshParent, onEditDeal }) {
  if (!isOpen || !dealId) return null;

  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(false);

  const [queryModal, setQueryModal] = useState({ open: false, type: '', notes: '' });
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deliverableFile, setDeliverableFile] = useState(null);
  const [isCollectBalanceOpen, setIsCollectBalanceOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editingServiceFee, setEditingServiceFee] = useState('');
  const [isEditingTotalDeal, setIsEditingTotalDeal] = useState(false);
  const [editingTotalAmount, setEditingTotalAmount] = useState('');
  const [renewalForm, setRenewalForm] = useState({
    serviceName: 'Annual ROC Compliance & Filing',
    dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'Standard 1-year annual return filing',
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingDeal, setDeletingDeal] = useState(false);

  // Manual Customer Email Update State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', message: '', documentIds: [] });
  const [sendingEmail, setSendingEmail] = useState(false);

  // Vault document upload state
  const [uploadDocFile, setUploadDocFile] = useState(null);
  const [uploadDocType, setUploadDocType] = useState('OTHER');
  const [uploadDocTitle, setUploadDocTitle] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const handleUploadVaultDoc = async () => {
    if (!uploadDocFile) return;
    try {
      setIsUploadingDoc(true);
      const formData = new FormData();
      formData.append('dealId', deal.id);
      formData.append('documentType', uploadDocType || 'OTHER');
      formData.append('title', uploadDocTitle.trim() || uploadDocFile.name);
      formData.append('file', uploadDocFile);
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded to deal vault!');
      setUploadDocFile(null);
      setUploadDocTitle('');
      await fetchDeal();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload document.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from this deal?`)) return;
    try {
      await api.delete(`/documents/${docId}`);
      toast.success('Document deleted successfully.');
      await fetchDeal();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete document.');
    }
  };

  const handleSendEmailUpdate = async () => {
    try {
      setSendingEmail(true);
      const res = await api.post(`/deals/${deal.id}/send-email-update`, emailForm);
      toast.success(res.data?.message || 'Status email update sent to customer.');
      setEmailModalOpen(false);
      setEmailForm({ subject: '', message: '', documentIds: [] });
      await fetchDeal();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send email to client.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDeleteDeal = async () => {
    try {
      setDeletingDeal(true);
      await api.delete(`/deals/${deal.id}`);
      toast.success(`Deal ${deal.dealCode} deleted successfully.`);
      setDeleteConfirmOpen(false);
      onClose();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete deal.');
    } finally {
      setDeletingDeal(false);
    }
  };

  const fetchDeal = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/deals/${dealId}`);
      setDeal(res.data.deal);
    } catch (err) {
      toast.error('Failed to load deal record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeal();
  }, [dealId]);

  const handleResubmit = async () => {
    try {
      setActionLoading(true);
      await api.post(`/deals/${deal.id}/resubmit`);
      toast.success('File successfully resubmitted to Accounts for verification!');
      await fetchDeal();
      onRefreshParent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Resubmission failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccountsVerify = async (action, notes) => {
    try {
      setActionLoading(true);
      await api.post(`/deals/${deal.id}/accounts-verify`, { action, notes });
      toast.success(action === 'APPROVE' ? 'Accounts approved and forwarded to Legal!' : 'Discrepancy returned to BDM.');
      setQueryModal({ open: false, type: '', notes: '' });
      await fetchDeal();
      onRefreshParent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Accounts action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyBalance = async (action, paymentId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/deals/${deal.id}/verify-balance-payment`, {
        paymentId,
        action,
        notes: action === 'APPROVE' ? 'Balance payment verified in bank credit.' : 'Bank credit not reflecting.',
      });
      toast.success(res.data.message || 'Balance payment processed successfully.');
      await fetchDeal();
      onRefreshParent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Balance verification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLegalVerify = async (action, notes) => {
    try {
      setActionLoading(true);
      await api.post(`/deals/${deal.id}/legal-verify`, { action, notes });
      toast.success(action === 'APPROVE' ? 'Legal scrutiny cleared and forwarded to Operations!' : 'Deficiency raised.');
      setQueryModal({ open: false, type: '', notes: '' });
      await fetchDeal();
      onRefreshParent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Legal action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleServiceUpdate = async (serviceId, status, govRef) => {
    try {
      setActionLoading(true);
      await api.patch(`/deals/${deal.id}/services/${serviceId}`, {
        status,
        govApplicationNumber: govRef,
      });
      toast.success('Service status updated successfully!');
      await fetchDeal();
    } catch (err) {
      toast.error('Failed to update service milestone.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateServiceFee = async (serviceId, newFee) => {
    try {
      setActionLoading(true);
      await api.patch(`/deals/${deal.id}/services/${serviceId}`, {
        serviceFee: parseFloat(newFee) || 0,
      });
      toast.success('Service deal amount updated successfully.');
      await fetchDeal();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update service deal amount.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTotalDealAmount = async (newTotal) => {
    try {
      setActionLoading(true);
      await api.patch(`/deals/${deal.id}/deal-amount`, {
        totalAmount: parseFloat(newTotal) || 0,
      });
      toast.success('Total deal amount updated successfully.');
      await fetchDeal();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update total deal amount.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteService = async () => {
    try {
      setActionLoading(true);

      if (deliverableFile) {
        const formData = new FormData();
        formData.append('dealId', deal.id);
        formData.append('documentType', 'FINAL_DELIVERABLE_CERTIFICATE');
        formData.append('title', `Final Certificate - ${deliverableFile.name}`);
        formData.append('file', deliverableFile);
        await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await api.post(`/deals/${deal.id}/service-complete`, { outcomeNotes: 'All filings completed and verified.' });
      toast.success('Service completed successfully!');
      await fetchDeal();
      onRefreshParent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete service.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalDelivery = async () => {
    try {
      setActionLoading(true);
      await api.post(`/deals/${deal.id}/final-delivery`, {
        deliveryProof: 'Delivered via Email Portal & WhatsApp notification',
      });
      toast.success('Deliverables marked as delivered to client!');
      await fetchDeal();
      onRefreshParent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record delivery.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRmHandover = async () => {
    try {
      setActionLoading(true);
      await api.post(`/deals/${deal.id}/rm-handover`, {
        notes: 'Client confirmed receipt of all deliverables. Renewals scheduled in CRM calendar.',
        renewals: [renewalForm],
      });
      toast.success('Client handover complete! Workflow closed successfully.');
      await fetchDeal();
      onRefreshParent();
    } catch (err) {
      toast.error(err.response?.data?.error || 'RM handover failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreviewDocument = async (docId) => {
    try {
      const res = await api.get(`/documents/${docId}/signed-url`);
      setPreviewDoc(res.data);
    } catch (err) {
      toast.error('Failed to generate document preview link.');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-600 shadow-xl">
          <Clock className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
          <span className="text-xs">Loading Dossier...</span>
        </div>
      </div>
    );
  }

  if (!deal) return null;

  const currentStageIndex = STAGES_LIST.findIndex((s) => s.key === deal.stage);
  const pendingAmount = Number(deal.pendingAmount);
  const companyPanDoc = deal.documents?.find(
    (d) => d.documentType === 'COMPANY_PAN' || (d.documentType === 'KYC_PAN' && d.title?.toLowerCase().includes('pan'))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Dossier Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded bg-white border border-slate-300 shadow-xs">
              {deal.dealCode}
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {deal.client.companyName}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Contact: <strong className="text-slate-800">{deal.client.clientName}</strong> ({deal.client.phone}) • Lead BDM: <strong className="text-slate-800">{deal.bdm?.fullName}</strong>
                {deal.coBdms && deal.coBdms.length > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 bg-slate-200/70 text-slate-800 px-2 py-0.5 rounded text-[11px] font-medium">
                    Co-BDMs: <strong className="font-semibold">{deal.coBdms.map((b) => b.fullName).join(', ')}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${STAGE_CONFIG[deal.stage]?.color}`}>
              {STAGE_CONFIG[deal.stage]?.label}
            </span>

            {/* Email Client Button */}
            {deal.client?.email && (
              <button
                type="button"
                onClick={() => {
                  const autoDocIds = [];
                  (deal?.documents || []).forEach((d) => {
                    if (d.documentType === 'LEGAL_AGREEMENT' || d.documentType === 'FINAL_DELIVERABLE_CERTIFICATE') {
                      autoDocIds.push(d.id);
                    }
                  });
                  setEmailForm({
                    subject: `Status Update - Deal #${deal.dealCode} | Corporate Mart`,
                    message: `Your service dossier has advanced to ${STAGE_CONFIG[deal.stage]?.label || deal.stage}. Our operations and compliance specialists are actively progressing your filing.`,
                    documentIds: autoDocIds,
                  });
                  setEmailModalOpen(true);
                }}
                disabled={actionLoading || deletingDeal}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition shadow-2xs"
                title={`Send manual status email update to ${deal.client.email}`}
              >
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Email Client</span>
              </button>
            )}

            {/* Delete Deal Button */}
            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'BDM' || currentUser?.id === deal.bdmId) && (
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={actionLoading || deletingDeal}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition shadow-2xs"
                title="Permanently Delete this Deal"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Deal</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 9-Stage Progress Timeline */}
        <div className="bg-white px-6 py-4 border-b border-slate-200  overflow-x-auto overflow-y-hidden shrink-0 ">
          <div className="flex items-center space-x-3 w-max py-1">
            {STAGES_LIST.map((st, idx) => {
              const isPast = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;
              return (
                <React.Fragment key={st.key}>
                  <div
                    className={`flex items-center space-x-2 text-sm px-3.5 py-2 rounded-lg border transition whitespace-nowrap shadow-xs ${isCurrent
                      ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-sm ring-2 ring-slate-900/10'
                      : isPast
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                        : 'bg-slate-50 text-slate-400 border-slate-200 font-medium'
                      }`}
                  >
                    {isPast ? (
                      <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    ) : (
                      <span
                        className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isCurrent
                          ? 'bg-white text-slate-900'
                          : 'bg-slate-200 text-slate-600'
                          }`}
                      >
                        {idx + 1}
                      </span>
                    )}
                    <span>{st.label}</span>
                  </div>
                  {idx < STAGES_LIST.length - 1 && (
                    <span className="text-slate-300 text-sm font-bold select-none flex-shrink-0">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>


        {/* STAGE ACTION GATE BANNER */}
        <div className="p-4.5 mt-4 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-600" /> Stage Gate Action
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                Current Position: {STAGE_CONFIG[deal.stage]?.label}
              </div>
              {deal.currentDiscrepancy && (
                <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-rose-900">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>
                      <strong>{deal.stage.includes('LEGAL') ? 'Legal Deficiency' : 'Accounts Discrepancy'}:</strong> "{deal.currentDiscrepancy}"
                    </span>
                  </div>
                  {(currentUser?.role === 'BDM' || currentUser?.role === 'ADMIN') && onEditDeal && (
                    <button
                      onClick={() => onEditDeal(deal)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs transition flex-shrink-0 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Fix & Re-enter Application</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center space-x-2.5">
              {/* RESUBMISSION FOR REJECTED / DISCREPANCY DEALS */}
              {deal.stage.includes('REJECTED') && (currentUser?.role === 'BDM' || currentUser?.role === 'ADMIN') && (
                <div className="flex items-center gap-2">
                  {onEditDeal && (
                    <button
                      onClick={() => onEditDeal(deal)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      title="Edit all deal details, replace rejected documents, and resubmit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit & Re-Submit Application</span>
                    </button>
                  )}
                  <button
                    onClick={handleResubmit}
                    disabled={actionLoading}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Quick Resubmit to {deal.stage === 'STAGE_05_LEGAL_REJECTED' ? 'Legal' : 'Accounts'}</span>
                  </button>
                </div>
              )}

              {/* STAGE 04 ACCOUNTS GATE */}
              {(!deal.isAccountsVerified && (deal.stage === 'STAGE_04_ACCOUNTS_VERIFICATION' || deal.stage === 'STAGE_04_ACCOUNTS_REJECTED')) && (
                currentUser?.role === 'ACCOUNTS' || currentUser?.role === 'ADMIN' ? (
                  <>
                    <button
                      onClick={() => setQueryModal({ open: true, type: 'ACCOUNTS_REJECT', notes: '' })}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold border border-rose-300 transition"
                    >
                      Reject with Discrepancy to BDM
                    </button>
                    <button
                      onClick={() => handleAccountsVerify('APPROVE', 'Bank credit, PAN, and payment details verified.')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>Verify and Handover Deal to Legal (Stage 04)</span>
                    </button>
                  </>
                ) : (
                  deal.stage === 'STAGE_04_ACCOUNTS_VERIFICATION' && (
                    <span className="text-xs text-slate-500 italic">Under review by Accounts Team</span>
                  )
                )
              )}

              {/* STAGE 05 LEGAL GATE */}
              {deal.stage === 'STAGE_05_LEGAL_VERIFICATION' && (
                currentUser?.role === 'LEGAL' || currentUser?.role === 'ADMIN' ? (
                  <>
                    <button
                      onClick={() => setQueryModal({ open: true, type: 'LEGAL_REJECT', notes: '' })}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold border border-rose-300 transition"
                    >
                      Raise Deficiency
                    </button>
                    <button
                      onClick={() => handleLegalVerify('APPROVE', 'All compliance documents verified.')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>Clear Compliance & Forward to Ops (Stage 05)</span>
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-500 italic">Under scrutiny by Legal Compliance Team</span>
                )
              )}

              {/* STAGE 06 OPERATIONS GATE */}
              {deal.stage === 'STAGE_06_OPERATIONS_PROCESSING' && (
                currentUser?.role === 'OPERATIONS' || currentUser?.role === 'ADMIN' ? (
                  <div className="flex items-center space-x-2.5">
                    <label className="px-3.5 py-2 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer border border-slate-300 shadow-xs">
                      <span>{deliverableFile ? deliverableFile.name : 'Upload Deliverable Certificate'}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => setDeliverableFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    <button
                      onClick={handleCompleteService}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Complete Service (Stage 07)</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">Operations team is processing filing</span>
                )
              )}

              {/* STAGE 07 SERVICE COMPLETED */}
              {deal.stage === 'STAGE_07_SERVICE_COMPLETED' && (
                currentUser?.role === 'OPERATIONS' || currentUser?.role === 'ADMIN' ? (
                  <div className="flex items-center space-x-2.5">
                    {pendingAmount > 0 && (
                      <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-amber-600" />
                        <span>Part-Payment Hold (₹{pendingAmount.toLocaleString('en-IN')})</span>
                      </span>
                    )}
                    <button
                      onClick={handleFinalDelivery}
                      disabled={actionLoading || pendingAmount > 0}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-40"
                      title={pendingAmount > 0 ? 'Pending balance must be verified by Accounts before final delivery' : ''}
                    >
                      <Send className="w-4 h-4" />
                      <span>Deliver Final Certificate to Client (Stage 08)</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic font-medium">Deliverable ready for client dispatch</span>
                )
              )}

              {/* STAGE 08 DELIVERED */}
              {deal.stage === 'STAGE_08_FINAL_DOCS_DELIVERED' && (
                currentUser?.role === 'RM' || currentUser?.role === 'ADMIN' ? (
                  <button
                    onClick={handleRmHandover}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Confirm Handover & Close Workflow (Stage 09)</span>
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 italic">Delivered. Waiting for RM Handover</span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 mt-4 space-x-8 text-sm font-medium">
          {[
            { id: 'overview', label: 'Overview & Financials' },
            { id: 'services', label: `Services Scope (${deal.services?.length || 0})` },
            { id: 'documents', label: `Documents Vault (${deal.documents?.length || 0})` },
            { id: 'audit', label: `Audit Trail (${deal.auditLogs?.length || 0})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-3 border-b-2 text-sm transition ${activeTab === t.id
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial Metrics Card - Standard Amount - Deal Amount - Received Amount - Pending Amount */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span>Deal Financial Summary</span>
                  <span
                    className={`inline-block text-[11px] px-2.5 py-0.5 rounded font-semibold border ${pendingAmount === 0
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100/70 text-amber-900 border-amber-300'
                      }`}
                  >
                    {deal.paymentType.replace('_', ' ')}
                  </span>
                </div>
                <DealFinancialMetrics
                  standardAmount={deal.standardAmount || deal.totalAmount}
                  dealAmount={deal.totalAmount}
                  receivedAmount={deal.amountReceived}
                  pendingAmount={pendingAmount}
                  receivingAccount={deal.receivingAccount}
                  onEditDealAmount={() => {
                    setIsEditingTotalDeal(true);
                    setEditingTotalAmount(deal.totalAmount || 0);
                  }}
                />

                {isEditingTotalDeal && (
                  <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-950">Adjust Total Deal Amount:</span>
                      <span className="font-bold text-slate-700">₹</span>
                      <input
                        type="number"
                        min="1"
                        value={editingTotalAmount}
                        onChange={(e) => setEditingTotalAmount(e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        className="w-36 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-800"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await handleUpdateTotalDealAmount(editingTotalAmount);
                          setIsEditingTotalDeal(false);
                        }}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingTotalDeal(false)}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 text-xs font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Departmental Workflow & Desks */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-slate-500" /> Departmental Workflow & Desks
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-xs text-slate-500 font-medium block">Accounts Desk</span>
                    <span className="font-bold text-sm text-slate-900 block mt-1">
                      {deal.assignedAccountsUser?.fullName || 'Pooja Verma (Accounts)'}
                    </span>
                    <span className="text-xs text-slate-600 font-medium mt-1.5 block">
                      {deal.isAccountsVerified ? '✓ Verified by Accounts' : 'Pending Verification'}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-xs text-slate-500 font-medium block">Legal Scrutiny</span>
                    <span className="font-bold text-sm text-slate-900 block mt-1">
                      {deal.assignedLegalUser?.fullName || 'Adv. Ananya Roy (Legal)'}
                    </span>
                    <span className="text-xs text-slate-600 font-medium mt-1.5 block">
                      {deal.isLegalVerified ? '✓ Scrutiny Passed' : 'Pending Scrutiny'}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-xs text-slate-500 font-medium block">Lead Operations</span>
                    <span className="font-bold text-sm text-slate-900 block mt-1">
                      {deal.assignedOpsUser ? deal.assignedOpsUser.fullName : 'Unassigned (Open in Pool)'}
                    </span>
                    <span className="text-xs text-slate-600 font-medium mt-1.5 block">
                      {deal.serviceCompletedAt ? '✓ Services Completed' : 'In Filing'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client Profile & Registration Information Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-500" /> Client Profile & Business Information
                  </div>
                  {deal.client.gstStatus && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      GST Registered
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Company PAN */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <span className="text-slate-500 font-medium block">Company PAN</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-slate-900 tracking-wider">
                        {deal.client.panNumber || 'N/A'}
                      </span>
                      {companyPanDoc && (
                        <button
                          onClick={() => handlePreviewDocument(companyPanDoc.id)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> View PAN Proof
                        </button>
                      )}
                    </div>
                  </div>

                  {/* GSTIN */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <span className="text-slate-500 font-medium block">GSTIN Number</span>
                    <span className="font-mono font-bold text-sm text-slate-900 block">
                      {deal.client.gstin || (deal.client.gstStatus ? 'Pending' : 'Non-GST')}
                    </span>
                  </div>

                  {/* CA / Consultant Name */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <span className="text-slate-500 font-medium block">CA / Consultant Name</span>
                    <span className="font-bold text-sm text-slate-900 block">
                      {deal.client.consultantName || 'Direct / None'}
                    </span>
                  </div>

                  {/* Industry */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <span className="text-slate-500 font-medium block">Industry</span>
                    <span className="font-semibold text-sm text-slate-900 block">
                      {deal.client.industry || 'Not Specified'}
                    </span>
                  </div>

                  {/* Sector */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <span className="text-slate-500 font-medium block">Sector</span>
                    <span className="font-semibold text-sm text-slate-900 block">
                      {deal.client.sector || 'Not Specified'}
                    </span>
                  </div>

                  {/* Location (City, State, Pincode) */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <span className="text-slate-500 font-medium block">City / State / Pincode</span>
                    <span className="font-semibold text-sm text-slate-900 block">
                      {[deal.client.city, deal.client.state, deal.client.pincode].filter(Boolean).join(', ') || 'Not Specified'}
                    </span>
                  </div>
                </div>

                {/* Office / Registered Address */}
                {deal.client.billingAddress && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="text-slate-500 font-medium block mb-1">Registered / Office Address:</span>
                    <span className="font-medium text-slate-900 text-sm">{deal.client.billingAddress}</span>
                  </div>
                )}
              </div>

              {/* Directors Table Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Company Directors ({deal.client.directors?.length || 0})
                  </h3>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold text-xs">Director Name</th>
                        <th className="py-3 px-4 font-semibold text-xs">DIN</th>
                        <th className="py-3 px-4 font-semibold text-xs">PAN</th>
                        <th className="py-3 px-4 font-semibold text-xs">Mobile Number</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deal.client.directors?.map((d) => (
                        <tr key={d.id} className="text-slate-800 hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-bold text-slate-900 text-sm">{d.name}</td>
                          <td className="py-3 px-4 font-mono font-medium text-xs">{d.din || 'N/A'}</td>
                          <td className="py-3 px-4 font-mono font-medium text-xs">{d.pan || 'N/A'}</td>
                          <td className="py-3 px-4 text-slate-600 text-xs">{d.phone || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments Tranches Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Payment History & Proofs ({deal.payments?.length || 0})
                  </h3>
                  {(currentUser?.role === 'BDM' || currentUser?.role === 'ADMIN') && pendingAmount > 0 && (
                    <button
                      onClick={() => setIsCollectBalanceOpen(true)}
                      className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-300 text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs"
                    >
                      <IndianRupee className="w-3.5 h-3.5 text-amber-700" />
                      <span>Collect & Log Balance Payment</span>
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {deal.payments?.map((p) => {
                    const isPending = p.status === 'PENDING_VERIFICATION';
                    const matchingDoc = deal.documents?.find((d) => d.fileUrl === p.paymentProofUrl);
                    const canAccountsVerify =
                      isPending && (currentUser?.role === 'ACCOUNTS' || currentUser?.role === 'ADMIN');

                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-lg border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 transition ${
                          p.status === 'VERIFIED'
                            ? 'bg-emerald-50/80 border-emerald-300'
                            : p.status === 'REJECTED'
                            ? 'bg-rose-50/80 border-rose-300'
                            : 'bg-amber-50/80 border-amber-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-slate-900 text-sm">
                              Tranche #{p.trancheNumber}: ₹{Number(p.amount).toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                              {p.paymentMode}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded text-xs font-bold border shadow-xs ${
                                p.status === 'VERIFIED'
                                  ? 'bg-emerald-700 text-white border-emerald-800'
                                  : p.status === 'REJECTED'
                                  ? 'bg-rose-700 text-white border-rose-800'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                            >
                              {p.status === 'VERIFIED' ? '✓ VERIFIED' : p.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 font-mono mt-1 space-y-0.5">
                            <div>
                              Ref / UTR: <strong className="text-slate-900">{p.transactionReference}</strong> • {new Date(p.paymentDate).toLocaleDateString()}
                              {p.accountName && (
                                <span className="ml-2 font-sans font-semibold text-slate-700 bg-slate-200/70 px-1.5 py-0.5 rounded text-[11px]">
                                  Account: {p.accountName}
                                </span>
                              )}
                              {p.paymentMode === 'CASH' && p.cashCollectorName && (
                                <span className="ml-2 font-sans font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">
                                  Collected By: {p.cashCollectorName}
                                </span>
                              )}
                            </div>
                            {p.verificationNotes && <div className="text-slate-500">Accounts Note: {p.verificationNotes}</div>}
                          </div>
                          {(p.remarks || (p.trancheNumber === 1 && deal.remarks)) && (
                            <div className="text-xs text-slate-700 mt-1.5 p-2 bg-white rounded border border-slate-200">
                              <span className="font-semibold text-slate-800">Payment Remark:</span>{' '}
                              <span>{p.remarks || deal.remarks}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {matchingDoc && (
                            <button
                              onClick={() => handlePreviewDocument(matchingDoc.id)}
                              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold border border-slate-300 flex items-center gap-1.5 shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Slip
                            </button>
                          )}

                          {canAccountsVerify && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleVerifyBalance('REJECT', p.id)}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 rounded-md text-xs font-semibold border border-rose-300 transition"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleVerifyBalance('APPROVE', p.id)}
                                disabled={actionLoading}
                                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                              >
                                <Check className="w-3.5 h-3.5" /> Verify
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SERVICES */}
          {activeTab === 'services' && (
            <div className="space-y-3.5">
              {deal.services?.map((svc) => (
                <div
                  key={svc.id}
                  className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{svc.serviceName}</h4>
                      <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                        <span>
                          Deal Amount:{' '}
                          {editingServiceId === svc.id ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="font-bold text-slate-700">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={editingServiceFee}
                                onChange={(e) => setEditingServiceFee(e.target.value)}
                                onWheel={(e) => e.target.blur()}
                                className="w-24 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-800"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleUpdateServiceFee(svc.id, editingServiceFee);
                                  setEditingServiceId(null);
                                }}
                                className="px-2 py-0.5 text-white bg-slate-900 hover:bg-slate-800 rounded text-[10px] font-bold cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingServiceId(null)}
                                className="px-1.5 py-0.5 text-slate-500 hover:text-slate-800 text-[10px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <strong className="text-slate-900 font-bold">
                                ₹{Number(svc.serviceFee || 0).toLocaleString('en-IN')}
                              </strong>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingServiceId(svc.id);
                                  setEditingServiceFee(svc.serviceFee || 0);
                                }}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                              >
                                Edit Amount
                              </button>
                            </span>
                          )}
                        </span>
                        {svc.standardAmount && (
                          <span className="text-slate-400">
                            • Standard: ₹{Number(svc.standardAmount).toLocaleString('en-IN')}
                          </span>
                        )}
                        {svc.govtFee && (
                          <span className="text-slate-400">
                            • Govt Fee: ₹{Number(svc.govtFee).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-md bg-white text-slate-800 border border-slate-300 font-semibold self-start sm:self-auto shadow-xs">
                      {svc.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs">
                    <div>
                      <label className="text-xs text-slate-600 font-medium block mb-1">
                        Govt Application / SRN Number
                      </label>
                      <input
                        type="text"
                        defaultValue={svc.govApplicationNumber || ''}
                        onBlur={(e) => handleServiceUpdate(svc.id, svc.status, e.target.value)}
                        placeholder="e.g. SRN91823719"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 font-medium block mb-1">Milestone Status</label>
                      <select
                        defaultValue={svc.status}
                        onChange={(e) => handleServiceUpdate(svc.id, e.target.value, svc.govApplicationNumber)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="GOVT_SUBMITTED">GOVT_SUBMITTED</option>
                        <option value="QUERY_RAISED">QUERY_RAISED</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              {/* Inline Upload Bar for BDM / Admin */}
              {(currentUser?.role === 'BDM' || currentUser?.role === 'ADMIN') && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-indigo-600" />
                    <span>Attach New Document to Deal Vault</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={uploadDocType}
                      onChange={(e) => setUploadDocType(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-800"
                    >
                      <option value="COMPANY_PAN">Company PAN Card</option>
                      <option value="PAYMENT_PROOF">Payment Proof / Receipt</option>
                      <option value="KYC_PAN">Director PAN Card</option>
                      <option value="KYC_AADHAAR">Director Aadhaar Card</option>
                      <option value="ADDRESS_PROOF">Registered Address Proof</option>
                      <option value="INCORPORATION_FORM">Incorporation / Government Form</option>
                      <option value="BOARD_RESOLUTION">Board Resolution</option>
                      <option value="OTHER">Other Compliance Document</option>
                    </select>

                    <input
                      type="text"
                      value={uploadDocTitle}
                      onChange={(e) => setUploadDocTitle(e.target.value)}
                      placeholder="Document Title (e.g. Corrected PAN Card)"
                      className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="modal-vault-file-input"
                        onChange={(e) => setUploadDocFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleUploadVaultDoc}
                        disabled={!uploadDocFile || isUploadingDoc}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-xs disabled:opacity-40 whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isUploadingDoc ? 'Uploading...' : 'Upload'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(!deal.documents || deal.documents.length === 0) ? (
                  <div className="col-span-2 p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                    No documents currently uploaded to this deal vault.
                  </div>
                ) : (
                  deal.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center justify-between text-xs shadow-xs"
                    >
                      <div className="flex items-center space-x-3 truncate mr-2">
                        <div className="p-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-xs flex-shrink-0">
                          <FileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-sm text-slate-900 truncate" title={doc.title}>{doc.title}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                            <span className="px-1.5 py-0.2 bg-white border border-slate-200 rounded font-sans font-bold text-slate-700 text-[10px]">
                              {doc.documentType}
                            </span>
                            <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                            {doc.isVerified && (
                              <span className="text-emerald-700 font-sans font-bold text-[10px]">✓ Verified</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePreviewDocument(doc.id)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-300 text-xs font-semibold flex items-center gap-1 transition shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                        {(currentUser?.role === 'BDM' || currentUser?.role === 'ADMIN') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id, doc.title)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT */}
          {activeTab === 'audit' && (
            <div className="space-y-2.5">
              {deal.auditLogs?.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl flex items-start space-x-3 text-xs shadow-xs"
                >
                  <History className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{log.action}</span>
                      <span className="text-xs text-slate-500 font-medium">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">{log.remarks}</p>
                    {log.user && (
                      <span className="text-xs text-slate-500 font-mono mt-1 block">
                        Actor: <strong className="text-slate-800">{log.user.fullName}</strong> ({log.user.role})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DISCREPANCY MODAL */}
      {queryModal.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">
              {queryModal.type === 'ACCOUNTS_REJECT' ? 'Return File to BDM (Discrepancy)' : 'Raise Legal Deficiency'}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Explain what needs to be rectified by BDM or Client.
            </p>
            <textarea
              rows={4}
              value={queryModal.notes}
              onChange={(e) => setQueryModal({ ...queryModal, notes: e.target.value })}
              placeholder="Enter discrepancy remark..."
              className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 mb-3"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setQueryModal({ open: false, type: '', notes: '' })}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (queryModal.type === 'ACCOUNTS_REJECT') {
                    handleAccountsVerify('REJECT', queryModal.notes);
                  } else {
                    handleLegalVerify('REJECT', queryModal.notes);
                  }
                }}
                disabled={!queryModal.notes.trim() || actionLoading}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-semibold text-xs text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                {previewDoc.fileName}
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={previewDoc.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-xs text-slate-700 rounded border border-slate-300 flex items-center gap-1 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> New Tab
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 font-bold"
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

        {/* COLLECT BALANCE PAYMENT MODAL */}
        <CollectBalanceModal
          deal={deal}
          isOpen={isCollectBalanceOpen}
          onClose={() => setIsCollectBalanceOpen(false)}
          onSuccess={async () => {
            toast.success('Balance payment logged! Sent to Accounts for verification.');
            await fetchDeal();
            onRefreshParent();
          }}
        />

      {/* DELETE DEAL CONFIRMATION MODAL */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">Delete Deal?</h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              Are you sure you want to permanently delete deal <strong className="text-slate-800">{deal.dealCode}</strong> ({deal.client?.companyName})?
              All associated payments, service line items, audit logs, and documents will be removed.
            </p>
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 text-[11px] text-rose-700 font-medium mb-5 text-center">
              ⚠️ Warning: This action is irreversible and will remove all revenue and metrics associated with this deal.
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={deletingDeal}
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 py-2 px-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingDeal}
                onClick={handleDeleteDeal}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deletingDeal ? 'Deleting...' : 'Yes, Delete Deal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER EMAIL UPDATE MODAL */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Email Customer Update</h3>
                  <p className="text-[11px] text-slate-500">Send an official Corporate Mart notification email</p>
                </div>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">To Recipient:</span>
                  <span className="font-bold text-slate-900 font-mono">{deal.client?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Company:</span>
                  <span className="font-semibold text-slate-800">{deal.client?.companyName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Current Position:</span>
                  <span className="font-semibold text-indigo-700">{STAGE_CONFIG[deal.stage]?.label || deal.stage}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  placeholder="Subject line..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Custom Message / Milestone Note</label>
                <textarea
                  rows={4}
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  placeholder="Enter custom progress note or instructions for the customer..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-800 leading-relaxed"
                />
              </div>

              {/* Attach Documents Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 block text-xs">Attach Documents (Agreement, Certificates, KYC)</label>
                  <span className="text-[11px] font-semibold text-indigo-700 font-mono">
                    {emailForm.documentIds.length} attached
                  </span>
                </div>

                {(!deal.documents || deal.documents.length === 0) ? (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 text-xs text-center">
                    No documents currently uploaded to this deal dossier.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    {deal.documents.map((doc) => {
                      const isChecked = emailForm.documentIds.includes(doc.id);
                      const isAgreement = doc.documentType === 'LEGAL_AGREEMENT';
                      const isCertificate = doc.documentType === 'FINAL_DELIVERABLE_CERTIFICATE';

                      return (
                        <label
                          key={doc.id}
                          className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition ${
                            isChecked
                              ? 'bg-indigo-50/90 border-indigo-300 text-slate-900 font-semibold shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate mr-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newIds = e.target.checked
                                  ? [...emailForm.documentIds, doc.id]
                                  : emailForm.documentIds.filter((id) => id !== doc.id);
                                setEmailForm({ ...emailForm, documentIds: newIds });
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="truncate">{doc.title || doc.fileName}</span>
                          </div>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-mono flex-shrink-0 ${
                              isAgreement
                                ? 'bg-purple-100 text-purple-800 border-purple-200 font-bold'
                                : isCertificate
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {isAgreement ? '📜 Agreement' : isCertificate ? '🎓 Certificate' : doc.documentType}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                ℹ️ The customer will receive an official high-contrast status email with deal details, step update, and complete payment tranche ledger breakdown.
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={sendingEmail}
                onClick={() => setEmailModalOpen(false)}
                className="flex-1 py-2 px-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingEmail || !deal.client?.email}
                onClick={handleSendEmailUpdate}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
              >
                {sendingEmail ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Notification</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
