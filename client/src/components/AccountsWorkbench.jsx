import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  Percent,
  Check,
  RotateCcw,
  IndianRupee,
  Clock,
  UserCheck,
  User,
  Users,
  Edit2,
  Save,
  X,
  FileCheck2,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import api from '../lib/api';
import DealFinancialMetrics, { calculateGst } from './DealFinancialMetrics';

const COMMON_DISCREPANCY_REASONS = [
  'Bank statement credit not reflecting for this UTR reference',
  'Amount received does not match the logged CRM value',
  'TDS deducted without proper Form 16A or advance intimation',
  'GSTIN is inactive / cancelled on the GST portal',
  'Payment receipt / screenshot is unreadable or cropped',
  'Company PAN number mismatch or photo blurry/unreadable',
  'Cheque realization is still pending with the bank',
];

export default function AccountsWorkbench({ currentUser, onRefreshParent, onOpenDossier }) {
  const [deals, setDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('Payment, UTR, and PAN verified in bank statement & MCA.');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Transaction Remark state
  const [transactionRemark, setTransactionRemark] = useState('');
  const [savingRemark, setSavingRemark] = useState(false);

  // PAN Verification & Editing state
  const [isEditingPan, setIsEditingPan] = useState(false);
  const [panInput, setPanInput] = useState('');
  const [savingPan, setSavingPan] = useState(false);
  const [verifyingPan, setVerifyingPan] = useState(false);

  const fetchAccountsQueue = async () => {
    try {
      setLoading(true);
      const dealsRes = await api.get('/deals', { params: { roleFilter: 'ACCOUNTS' } });
      setDeals(dealsRes.data.deals);

      if (dealsRes.data.deals.length > 0) {
        if (selectedDeal) {
          const updated = dealsRes.data.deals.find((d) => d.id === selectedDeal.id);
          setSelectedDeal(updated || dealsRes.data.deals[0]);
        } else {
          setSelectedDeal(dealsRes.data.deals[0]);
        }
      } else {
        setSelectedDeal(null);
      }
    } catch (err) {
      console.error('Failed to load accounts queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsQueue(); // account begin fetched
  }, []);

  useEffect(() => {
    if (selectedDeal) {
      setTransactionRemark(selectedDeal.remarks || selectedDeal.payments?.[0]?.remarks || '');
      setPanInput(selectedDeal.client?.panNumber || '');
      setIsEditingPan(false);
    }
  }, [selectedDeal?.id]);



  const handleApprove = async () => {
    if (!selectedDeal) return;
    try {
      setActionLoading(true);
      setFeedback(null);
      await api.post(`/deals/${selectedDeal.id}/accounts-verify`, {
        action: 'APPROVE',
        notes: approvalNotes,
        transactionRemark: transactionRemark.trim() || undefined,
      });
      setFeedback({ type: 'success', message: `Deal ${selectedDeal.dealCode} approved and forwarded to Legal!` });
      await fetchAccountsQueue();
      onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Approval failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveTransactionRemark = async () => {
    if (!selectedDeal) return;
    try {
      setSavingRemark(true);
      setFeedback(null);
      await api.patch(`/deals/${selectedDeal.id}/transaction-remark`, {
        transactionRemark,
      });
      setFeedback({ type: 'success', message: 'Transaction remark updated successfully for accounts records!' });
      await fetchAccountsQueue();
      onRefreshParent?.();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to update transaction remark.' });
    } finally {
      setSavingRemark(false);
    }
  };

  const handleSavePan = async () => {
    if (!selectedDeal || !panInput.trim()) return;
    try {
      setSavingPan(true);
      setFeedback(null);
      await api.patch(`/deals/${selectedDeal.id}/pan`, {
        panNumber: panInput.trim().toUpperCase(),
      });
      setFeedback({ type: 'success', message: `Company PAN updated to ${panInput.trim().toUpperCase()}` });
      setIsEditingPan(false);
      await fetchAccountsQueue();
      onRefreshParent?.();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to update PAN number.' });
    } finally {
      setSavingPan(false);
    }
  };

  const handleVerifyPanDocument = async (docId, isVerified) => {
    try {
      setVerifyingPan(true);
      setFeedback(null);
      await api.patch(`/documents/${docId}/verify`, {
        isVerified,
        deficiencyNotes: isVerified ? null : 'Flagged during accounts verification',
      });
      setFeedback({
        type: isVerified ? 'success' : 'warning',
        message: isVerified ? 'Company PAN document verified by Accounts!' : 'PAN verification status updated.',
      });
      await fetchAccountsQueue();
      onRefreshParent?.();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to verify PAN document.' });
    } finally {
      setVerifyingPan(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDeal || !discrepancyNote.trim()) return;
    try {
      setActionLoading(true);
      setFeedback(null);
      await api.post(`/deals/${selectedDeal.id}/accounts-verify`, {
        action: 'REJECT',
        notes: discrepancyNote.trim(),
      });
      setFeedback({ type: 'warning', message: `Deal ${selectedDeal.dealCode} returned to BDM for correction.` });
      setDiscrepancyNote('');
      await fetchAccountsQueue();
      onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Rejection failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyBalancePayment = async (action, paymentId) => {
    if (!selectedDeal) return;
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await api.post(`/deals/${selectedDeal.id}/verify-balance-payment`, {
        paymentId,
        action,
        notes: action === 'APPROVE' ? 'Balance payment verified in bank account.' : discrepancyNote.trim(),
      });
      setFeedback({
        type: action === 'APPROVE' ? 'success' : 'warning',
        message: res.data.message || (action === 'APPROVE' ? 'Balance payment verified!' : 'Payment rejected.'),
      });
      if (action === 'REJECT') setDiscrepancyNote('');
      await fetchAccountsQueue();
      onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to verify balance payment.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreviewDoc = async (docId) => {
    try {
      const res = await api.get(`/documents/${docId}/signed-url`);
      setPreviewDoc(res.data);
    } catch (err) {
      alert('Failed to generate preview link: ' + (err.response?.data?.error || err.message));
    }
  };

  const pendingAmount = selectedDeal ? Number(selectedDeal.pendingAmount) : 0;
  const paymentProofDoc = selectedDeal?.documents?.find((d) => d.documentType === 'PAYMENT_PROOF');
  const companyPanDoc = selectedDeal?.documents?.find(
    (d) => d.documentType === 'COMPANY_PAN' || (d.documentType === 'KYC_PAN' && d.title?.toLowerCase().includes('pan'))
  );
  const pendingBalancePayment = selectedDeal?.payments?.find(
    (p) => p.status === 'PENDING_VERIFICATION' && p.trancheNumber > 1
  );
  const firstPayment = selectedDeal?.payments?.[0];

  return (
    <div className="space-y-4">
      {/* Workbench Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
              <CreditCard className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Accounts Verification Desk</h2>
              <p className="text-xs text-slate-500">
                Stage 04: Verify bank receipts, PAN details, transaction remarks & validate GST
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
            {deals.filter((d) => d.stage === 'STAGE_04_ACCOUNTS_VERIFICATION').length} Awaiting Verification
          </div>
          {deals.some((d) => d.stage === 'STAGE_04_ACCOUNTS_REJECTED') && (
            <div className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {deals.filter((d) => d.stage === 'STAGE_04_ACCOUNTS_REJECTED').length} Discrepancies
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
              Accounts Queue ({deals.length})
            </span>
            <button
              onClick={fetchAccountsQueue}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-medium px-2 py-1 rounded hover:bg-slate-200/60 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2.5 space-y-1.5">
            {deals.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                <CheckCircle2 className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                Queue is clear. No deals awaiting verification.
              </div>
            ) : (
              deals.map((d) => {
                const isSelected = selectedDeal?.id === d.id;
                const isRejected = d.stage === 'STAGE_04_ACCOUNTS_REJECTED';
                const hasBalancePending = d.payments?.some((p) => p.status === 'PENDING_VERIFICATION' && p.trancheNumber > 1);
                const firstPayment = d.payments?.[0];

                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDeal(d)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all border text-left ${
                      isSelected
                        ? 'bg-slate-50 border-slate-900 shadow-xs ring-1 ring-slate-900'
                        : 'bg-white border-slate-200/90 hover:bg-slate-50/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {d.dealCode}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          isRejected
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : hasBalancePending
                              ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {isRejected ? 'Discrepancy' : hasBalancePending ? 'Balance Pending' : 'Stage 04 Entry'}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-slate-900 mt-2 truncate">
                      {d.client.companyName}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                      <span className="text-emerald-700 font-bold font-mono tabular-nums">
                        Recv: ₹{Number(d.amountReceived).toLocaleString('en-IN')}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {firstPayment?.paymentMode || 'NEFT'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Verification Inspector & Action Desk (8 cols) */}
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
                  <p className="text-xs text-slate-600 mt-1">
                    Client: <strong className="text-slate-800">{selectedDeal.client.clientName}</strong> ({selectedDeal.client.phone}) • BDM:{' '}
                    <strong className="text-slate-800">{selectedDeal.bdm?.fullName}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onOpenDossier(selectedDeal.id)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Eye className="w-4 h-4" /> View Full Dossier
                  </button>
                </div>
              </div>



              {/* 1. FINANCIAL MATCHER LEDGER */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-600" /> 1. Financial Verification & Payment Match
                </div>

                <DealFinancialMetrics
                  standardAmount={selectedDeal.standardAmount || selectedDeal.totalAmount}
                  dealAmount={selectedDeal.totalAmount}
                  receivedAmount={selectedDeal.amountReceived}
                  pendingAmount={pendingAmount}
                  receivingAccount={selectedDeal.receivingAccount}
                />

                {/* All Tranches Ledger */}
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Payment Tranches Recorded ({selectedDeal.payments?.length || 0})
                  </div>
                  {selectedDeal.payments?.map((p) => {
                    const isTranchePending = p.status === 'PENDING_VERIFICATION';
                    const matchingDoc = selectedDeal.documents?.find((d) => d.fileUrl === p.paymentProofUrl);

                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${isTranchePending
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-white border-slate-200'
                          ? 'bg-amber-50/80 border-amber-300'
                          : 'bg-white border-slate-200'
                          }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              Tranche #{p.trancheNumber}: ₹{Number(p.amount).toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {p.paymentMode}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-semibold border ${p.status === 'VERIFIED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : p.status === 'REJECTED'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : p.status === 'REJECTED'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                                }`}
                            >
                              {p.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 font-mono mt-1 space-y-0.5">
                            <div>
                              UTR / Ref: <strong className="text-slate-900">{p.transactionReference}</strong> • {new Date(p.paymentDate).toLocaleDateString()}
                              {p.accountName && (
                                <span className="ml-2 font-sans font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                                  Account: {p.accountName}
                                </span>
                              )}
                              {p.paymentMode === 'CASH' && p.cashCollectorName && (
                                <span className="ml-2 font-sans font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[11px] border border-amber-300">
                                  Collected By: {p.cashCollectorName}
                                </span>
                              )}
                            </div>
                            {p.verificationNotes && <div className="text-slate-500">Note: {p.verificationNotes}</div>}
                          </div>
                          {p.remarks && (
                            <div className="mt-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 flex items-start gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                              <span><strong className="text-slate-800">Tranche Remark:</strong> {p.remarks}</span>
                            </div>
                          )}
                        </div>

                        {matchingDoc && (
                          <button
                            type="button"
                            onClick={() => handlePreviewDoc(matchingDoc.id)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold border border-slate-300 flex items-center gap-1.5 shadow-sm flex-shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Proof
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DEAL TRANSACTION REMARK (ACCOUNTS DESK) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-brand-600" /> Narration
                  </div>
                  {selectedDeal.remarks && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                      Logged on Deal
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  Record bank account credit notes, bank statement narration, TDS / deduction details, or specific transaction remarks for this deal.
                </p>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={transactionRemark}
                    onChange={(e) => setTransactionRemark(e.target.value)}
                    placeholder="e.g. Received via IMPS in ICICI A/c #91823. UTR verified against bank statement. Net of 2% TDS."
                    className="w-full bg-slate-50/50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white transition"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      Recorded as Accounts Desk Transaction Narration for this deal
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveTransactionRemark}
                      disabled={savingRemark}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingRemark ? 'Saving...' : 'Save Narration'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. COMPANY PAN & IDENTITY VERIFICATION */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-600" /> 2. Company PAN & Identity Verification
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${companyPanDoc?.isVerified
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : selectedDeal.client.panNumber && companyPanDoc
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : selectedDeal.client.panNumber && companyPanDoc
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                  >
                    {companyPanDoc?.isVerified ? (
                      <>
                        <Check className="w-3 h-3" /> PAN Verified
                      </>
                    ) : selectedDeal.client.panNumber && companyPanDoc ? (
                      <>
                        <Clock className="w-3 h-3" /> Ready for Accounts Verification
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" /> Incomplete PAN Info
                      </>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  {/* Company PAN Number Card */}
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" /> Company PAN Number
                      </span>
                      {!isEditingPan && (
                        <button
                          type="button"
                          onClick={() => {
                            setPanInput(selectedDeal.client?.panNumber || '');
                            setIsEditingPan(true);
                          }}
                          className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 hover:underline"
                        >
                          <Edit2 className="w-3 h-3" /> Edit PAN
                        </button>
                      )}
                    </div>

                    {!isEditingPan ? (
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-mono font-bold text-base text-slate-900 tracking-wider">
                          {selectedDeal.client?.panNumber || <span className="text-rose-500 italic font-normal text-xs">Not Provided</span>}
                        </span>
                        {selectedDeal.client?.panNumber ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-mono rounded border border-slate-200">
                            Valid Format
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[11px] rounded border border-rose-200">
                            Required
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={10}
                            value={panInput}
                            onChange={(e) => setPanInput(e.target.value.toUpperCase())}
                            placeholder="e.g. ABCDE1234F"
                            className="flex-1 uppercase font-mono font-bold text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-800"
                          />
                          <button
                            type="button"
                            onClick={handleSavePan}
                            disabled={savingPan || !panInput.trim()}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                          >
                            <Save className="w-3 h-3" /> {savingPan ? '...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPanInput(selectedDeal.client?.panNumber || '');
                              setIsEditingPan(false);
                            }}
                            className="px-2 py-1.5 text-slate-500 hover:text-slate-800 text-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Company PAN Photo / Document Card */}
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-slate-400" /> PAN Card Photo / Document
                      </span>
                      {companyPanDoc ? (
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${companyPanDoc.isVerified
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                        >
                          {companyPanDoc.isVerified ? '✓ Verified' : 'Pending Verification'}
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Missing Document
                        </span>
                      )}
                    </div>

                    {companyPanDoc ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-800 truncate" title={companyPanDoc.fileName}>
                            {companyPanDoc.fileName}
                          </span>
                          {companyPanDoc.fileSize && (
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                              {(companyPanDoc.fileSize / 1024).toFixed(0)} KB
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handlePreviewDoc(companyPanDoc.id)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold border border-slate-300 flex items-center gap-1.5 shadow-xs transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" /> Preview PAN Photo
                          </button>

                          <button
                            type="button"
                            onClick={() => handleVerifyPanDocument(companyPanDoc.id, !companyPanDoc.isVerified)}
                            disabled={verifyingPan}
                            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${companyPanDoc.isVerified
                                ? 'bg-emerald-100 hover:bg-rose-50 text-emerald-900 hover:text-rose-700 border border-emerald-300 hover:border-rose-300'
                                : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                              ? 'bg-emerald-100 hover:bg-rose-50 text-emerald-900 hover:text-rose-700 border border-emerald-300 hover:border-rose-300'
                              : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                              }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{companyPanDoc.isVerified ? 'Verified (Toggle)' : 'Verify PAN Photo'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <div className="text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2 text-xs">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                          <span>No PAN card photo uploaded by BDM. If required, return file to BDM with a discrepancy note.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. DEDICATED BALANCE PAYMENT VERIFICATION DESK (If Tranche 2+ is Pending) */}
              {pendingBalancePayment && (
                <div className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-4.5 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <IndianRupee className="w-4 h-4 text-amber-700" /> Action Required: Verify Balance Tranche #{pendingBalancePayment.trancheNumber}
                    </div>
                    {pendingBalancePayment.accountName && (
                      <span className="text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-300">
                        Account: {pendingBalancePayment.accountName}
                      </span>
                    )}
                  </div>

                  {/* 3 Metrics: Recieved Amount - Total recieved amount - pending amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-3 bg-white border border-amber-200 rounded-lg shadow-xs">
                      <span className="text-emerald-800 font-bold block text-[11px] uppercase tracking-wider">
                        Recieved Amount
                      </span>
                      <span className="font-bold text-emerald-700 text-sm mt-0.5 block font-mono">
                        ₹{Number(pendingBalancePayment.amount).toLocaleString('en-IN')}
                      </span>
                      <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-700">
                        <span>GST (18%):</span>
                        <span className="font-semibold font-mono">
                          ₹{calculateGst(pendingBalancePayment.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-amber-200 rounded-lg shadow-xs">
                      <span className="text-slate-600 font-bold block text-[11px] uppercase tracking-wider">
                        Total recieved amount
                      </span>
                      <span className="font-bold text-slate-900 text-sm mt-0.5 block font-mono">
                        ₹{(Number(selectedDeal.amountReceived) + Number(pendingBalancePayment.amount)).toLocaleString('en-IN')}
                      </span>
                      <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                        <span>GST (18%):</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          ₹{calculateGst(Number(selectedDeal.amountReceived) + Number(pendingBalancePayment.amount)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-amber-200 rounded-lg shadow-xs">
                      <span className="text-amber-800 font-bold block text-[11px] uppercase tracking-wider">
                        pending amount
                      </span>
                      <span className="font-bold text-amber-700 text-sm mt-0.5 block font-mono">
                        ₹{Math.max(0, pendingAmount - Number(pendingBalancePayment.amount)).toLocaleString('en-IN')}
                      </span>
                      <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-700">
                        <span>GST (18%):</span>
                        <span className="font-semibold font-mono">
                          ₹{calculateGst(Math.max(0, pendingAmount - Number(pendingBalancePayment.amount))).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-amber-900 bg-amber-100/60 p-2.5 rounded-lg border border-amber-200 space-y-1">
                    <div>
                      Payment Mode: <strong>{pendingBalancePayment.paymentMode}</strong> • Ref/UTR: <strong>{pendingBalancePayment.transactionReference}</strong>
                    </div>
                    {pendingBalancePayment.paymentMode === 'CASH' && pendingBalancePayment.cashCollectorName && (
                      <div className="font-semibold text-amber-950">
                        Cash Handover: Collected by <strong>{pendingBalancePayment.cashCollectorName}</strong> (Physical cash deposit)
                      </div>
                    )}
                    <div className="text-[11px] text-amber-800">
                      Once verified, the deal balance will update, removing the Part-Payment lock so Operations can release final deliverables.
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-amber-200">
                    <button
                      onClick={() => handleVerifyBalancePayment('REJECT', pendingBalancePayment.id)}
                      disabled={actionLoading}
                      className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 rounded-md text-xs font-medium border border-rose-300 transition disabled:opacity-40"
                    >
                      Reject Balance Tranche
                    </button>
                    <button
                      onClick={() => handleVerifyBalancePayment('APPROVE', pendingBalancePayment.id)}
                      disabled={actionLoading}
                      className="w-full sm:w-auto px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Verify Tranche & Mark Full Payment (Release Ops Delivery)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 4. GST DETAILS */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-slate-500" /> 3. GST & Invoice Details
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block text-xs font-medium">GST Applicable</span>
                    <span className="font-semibold text-sm text-slate-900 mt-0.5 block">
                      {selectedDeal.client.gstStatus ? 'Yes (Tax Invoice)' : 'No (Commercial Receipt)'}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block text-xs font-medium">GSTIN</span>
                    <span className="font-mono font-semibold text-sm text-slate-900 mt-0.5 block">
                      {selectedDeal.client.gstin || 'Non-GST'}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block text-xs font-medium">Billing Address</span>
                    <span className="text-slate-800 text-xs truncate mt-0.5 block" title={selectedDeal.client.billingAddress}>
                      {selectedDeal.client.billingAddress || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. ACCOUNTS VERIFICATION & HANDOVER DECISION (Visible for all deals requiring Accounts verification or discrepancy action) */}
              {(!selectedDeal.isAccountsVerified ||
                selectedDeal.stage === 'STAGE_04_ACCOUNTS_VERIFICATION' ||
                selectedDeal.stage === 'STAGE_04_ACCOUNTS_REJECTED' ||
                selectedDeal.payments?.some((p) => p.status === 'PENDING_VERIFICATION' && p.trancheNumber === 1)) && (
                  <div className="bg-white border-2 border-slate-900/10 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-slate-900" />
                        4. Accounts Verification & Handover Decision
                      </h4>
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
                        {firstPayment?.paymentMode === 'CASH' ? (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3 text-amber-600" /> Cash: {firstPayment?.cashCollectorName || 'Physical Cash Handover'}
                          </span>
                        ) : paymentProofDoc ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Payment Proof Attached
                          </span>
                        ) : (
                          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium flex items-center gap-1">
                            Bank Statement Credit Verification
                          </span>
                        )}
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 font-medium">
                          {companyPanDoc?.isVerified ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Company PAN Verified
                            </span>
                          ) : companyPanDoc ? (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> PAN Photo Uploaded
                            </span>
                          ) : selectedDeal.client?.panNumber ? (
                            <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono font-semibold">
                              PAN: {selectedDeal.client.panNumber}
                            </span>
                          ) : (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> PAN Number Missing
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-700 font-medium block">
                        Approval / Accounts Notes (forwarded to Legal):
                      </label>
                      <input
                        type="text"
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        placeholder="e.g. Payment, UTR, and PAN verified in bank statement & MCA."
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-xs text-slate-700 font-medium block">
                        Discrepancy Reason (if rejecting or returning file to BDM):
                      </label>
                      <select
                        onChange={(e) => setDiscrepancyNote(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                      >
                        <option value="">-- Choose standard discrepancy reason --</option>
                        {COMMON_DISCREPANCY_REASONS.map((r, i) => (
                          <option key={i} value={r}>{r}</option>
                        ))}
                      </select>

                      <textarea
                        rows={2}
                        value={discrepancyNote}
                        onChange={(e) => setDiscrepancyNote(e.target.value)}
                        placeholder="Type detailed discrepancy note for BDM correction..."
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={!discrepancyNote.trim() || actionLoading}
                        className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold border border-rose-300 transition disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reject with Discrepancy to BDM</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={actionLoading}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>Verify and Handover Deal to Legal (Stage 04 Clear)</span>
                      </button>
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
              Select a deal from the left queue to verify payment.
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

// this is AccountWorkBranch
