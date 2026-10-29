import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import api from '../lib/api';

export default function OperationsWorkbench({ currentUser, onRefreshParent, onOpenDossier }) {
  const [deals, setDeals] = useState([]);
  const [opsTeam, setOpsTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [deliverableFile, setDeliverableFile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchOpsData = async () => {
    try {
      setLoading(true);
      const [dealsRes, teamRes] = await Promise.all([
        api.get('/deals', { params: { roleFilter: 'OPERATIONS' } }),
        api.get('/users', { params: { role: 'OPERATIONS' } }),
      ]);
      setDeals(dealsRes.data.deals);
      setOpsTeam(teamRes.data.users);

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
      console.error('Failed to load ops queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpsData();
  }, []);

  const handleAssignDeal = async (targetUserId) => {
    if (!selectedDeal) return;
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await api.patch(`/deals/${selectedDeal.id}/assign`, {
        department: 'OPERATIONS',
        userId: targetUserId || null,
      });
      setFeedback({ type: 'success', message: res.data.message });
      await fetchOpsData();
      onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Assignment failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateMilestone = async (serviceId, status, govRef, assignedUserId) => {
    try {
      await api.patch(`/deals/${selectedDeal.id}/services/${serviceId}`, {
        status,
        govApplicationNumber: govRef,
        assignedOpsUserId: assignedUserId,
      });
      const res = await api.get(`/deals/${selectedDeal.id}`);
      setSelectedDeal(res.data.deal);
      setFeedback({ type: 'success', message: 'Milestone updated.' });
      onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to update milestone.' });
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
      onRefreshParent();
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
      onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Delivery dispatch failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const hasDeliverable = selectedDeal?.documents?.some((d) => d.documentType === 'FINAL_DELIVERABLE_CERTIFICATE');
  const isPartPaymentPending = selectedDeal && Number(selectedDeal.pendingAmount) > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
              <Cog className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Operations Processing Workbench</h2>
              <p className="text-xs text-slate-500">
                Stages 06–08: Assign team, track SRN/Govt reference numbers & upload final deliverable certificates
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
            {deals.filter((d) => d.stage === 'STAGE_06_OPERATIONS_PROCESSING').length} In Filing
          </div>
          <div className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
            {deals.filter((d) => d.stage === 'STAGE_07_SERVICE_COMPLETED').length} Ready for Delivery
          </div>
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

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
        {/* LEFT PANE: Active Ops Deals List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
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
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
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
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 flex items-center gap-1.5 transition shadow-sm"
                >
                  <Eye className="w-4 h-4" /> View Full Dossier
                </button>
              </div>

              {/* EXECUTIVE ASSIGNMENT (OPTION 1: CLAIM & REASSIGN) */}
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
                  {/* Claim button if unassigned or assigned to someone else */}
                  {selectedDeal.assignedOpsUserId !== currentUser?.id && (
                    <button
                      onClick={() => handleAssignDeal(currentUser?.id)}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                      title="Take ownership of this operations file"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Claim Deal</span>
                    </button>
                  )}

                  {/* Reassign dropdown for Operations Manager / Admin */}
                  <div className="flex items-center space-x-1">
                    <select
                      value={selectedDeal.assignedOpsUserId || ''}
                      onChange={(e) => handleAssignDeal(e.target.value || null)}
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
              </div>

              {/* SERVICE MILESTONES */}
              <div className="space-y-3.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-500" /> Service Filing Tasks ({selectedDeal.services?.length || 0})
                </div>

                {selectedDeal.services?.map((svc) => (
                  <div
                    key={svc.id}
                    className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{svc.serviceName}</h4>
                        <div className="text-xs text-slate-600 mt-0.5">
                          Service Fee: <strong className="text-slate-800">₹{Number(svc.serviceFee).toLocaleString('en-IN')}</strong>{' '}
                          {svc.govtFee && `• Govt Challan / Fee: ₹${Number(svc.govtFee).toLocaleString('en-IN')}`}
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
                          Assigned Executive
                        </label>
                        <select
                          defaultValue={svc.assignedOpsUserId || ''}
                          onChange={(e) =>
                            handleUpdateMilestone(svc.id, svc.status, svc.govApplicationNumber, e.target.value)
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                        >
                          <option value="">-- Select Executive --</option>
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
                            handleUpdateMilestone(svc.id, svc.status, e.target.value, svc.assignedOpsUserId)
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-800"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-600 font-medium block mb-1">Milestone Stage</label>
                        <select
                          defaultValue={svc.status}
                          onChange={(e) =>
                            handleUpdateMilestone(svc.id, e.target.value, svc.govApplicationNumber, svc.assignedOpsUserId)
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
                ))}
              </div>

              {/* DELIVERABLE CERTIFICATE UPLOAD & STAGE ACTIONS */}
              <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-sm">
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
                      className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Mark Service Completed (Stage 07 Gate)</span>
                    </button>
                  )}

                  {selectedDeal.stage === 'STAGE_07_SERVICE_COMPLETED' && (
                    <button
                      onClick={handleDeliverToClient}
                      disabled={actionLoading || isPartPaymentPending}
                      className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-40"
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
    </div>
  );
}
