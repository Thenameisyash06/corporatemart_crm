import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import api from '../lib/api';

const DEFAULT_RENEWAL_TEMPLATES = [
  { name: 'DIR-3 KYC Annual Filing (Director KYC)', dueMonths: 11, desc: 'Mandatory annual filing before September 30' },
  { name: 'Annual ROC Return (Form AOC-4 & MGT-7)', dueMonths: 12, desc: 'Annual statutory accounts & return filing' },
  { name: 'Monthly GST Returns (GSTR-1 & 3B)', dueMonths: 1, desc: 'Monthly compliance & tax return filing' },
  { name: 'Trademark 10-Year Renewal', dueMonths: 120, desc: 'Statutory trademark renewal at 10-year expiry' },
];

export default function RmWorkbench({ onRefreshParent, onOpenDossier }) {
  const [deals, setDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
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
  const [feedback, setFeedback] = useState(null);

  const fetchRmQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/deals', {
        params: { roleFilter: 'RM' },
      });
      setDeals(res.data.deals);

      if (res.data.deals.length > 0) {
        if (selectedDeal) {
          const updated = res.data.deals.find((d) => d.id === selectedDeal.id);
          setSelectedDeal(updated || res.data.deals[0]);
        } else {
          setSelectedDeal(res.data.deals[0]);
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
      onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'RM handover failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const pendingHandoverCount = deals.filter((d) => d.stage === 'STAGE_08_FINAL_DOCS_DELIVERED').length;
  const closedCount = deals.filter((d) => d.stage === 'CLOSED').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
              <Send className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Relationship Manager (RM) Handover Desk</h2>
              <p className="text-xs text-slate-500">
                Stage 09: Confirm client document receipt, setup recurring compliance renewals & close workflow
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
            {pendingHandoverCount} Awaiting RM Handover
          </div>
          <div className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
            {closedCount} Closed Workflows
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

      {/* Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[600px]">
        {/* LEFT PANE: Queue List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Delivered Files Queue ({deals.length})
            </span>
            <button
              onClick={fetchRmQueue}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-medium px-2 py-1 rounded hover:bg-slate-200/60 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2.5 space-y-1.5">
            {deals.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                <CheckCircle2 className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                No pending handovers in queue.
              </div>
            ) : (
              deals.map((d) => {
                const isSelected = selectedDeal?.id === d.id;
                const isClosed = d.stage === 'CLOSED';

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
                          isClosed
                            ? 'bg-slate-100 text-slate-700 border-slate-200 font-semibold'
                            : 'bg-purple-50 text-purple-700 border-purple-200 font-semibold'
                        }`}
                      >
                        {isClosed ? 'Closed' : 'Needs Handover'}
                      </span>
                    </div>

                    <div className="font-semibold text-sm text-slate-900 mt-2 truncate">
                      {d.client.companyName}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                      <span className="font-medium text-slate-700">{d.client.clientName}</span>
                      <span className="text-slate-500 font-mono font-medium">{d.client.phone}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Handover Checklist & Renewal Scheduler (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          {selectedDeal ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-800 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {selectedDeal.dealCode}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{selectedDeal.client.companyName}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Client: {selectedDeal.client.clientName} • Email: {selectedDeal.client.email} • Mobile:{' '}
                    {selectedDeal.client.phone}
                  </p>
                </div>

                <button
                  onClick={() => onOpenDossier(selectedDeal.id)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md border border-slate-300 flex items-center gap-1 transition shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> Full Dossier
                </button>
              </div>

              {/* 1. HANDOVER VERIFICATION */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" /> 1. Client Delivery Confirmation
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-md flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                    <span>Deliverables Dispatched by Operations</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-md flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                    <span>Account Balance Cleared (100% Paid)</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">
                    Client Handover Communication Notes:
                  </label>
                  <textarea
                    rows={2}
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    placeholder="Document conversation with client, confirmation of certificate receipt..."
                    className="w-full bg-white border border-slate-300 rounded-md p-2 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* 2. RECURRING COMPLIANCE RENEWAL SCHEDULER */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" /> 2. Annual Renewals & Recurring Compliance Pool
                  </div>
                </div>

                {/* Quick Add Presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-xs text-slate-600 font-semibold self-center">Presets:</span>
                  {DEFAULT_RENEWAL_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
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
                        <span className="text-xs block text-slate-500 font-medium mb-1">Statutory Due Date</span>
                        <input
                          type="date"
                          value={r.dueDate}
                          onChange={(e) => {
                            const updated = [...renewals];
                            updated[index].dueDate = e.target.value;
                            setRenewals(updated);
                          }}
                          className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                        />
                      </div>

                      <div className="sm:col-span-3 text-slate-700">
                        <span className="text-xs block text-slate-500 font-medium mb-1">Reminder Date</span>
                        <input
                          type="date"
                          value={r.remindAt}
                          onChange={(e) => {
                            const updated = [...renewals];
                            updated[index].remindAt = e.target.value;
                            setRenewals(updated);
                          }}
                          className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                        />
                      </div>

                      <div className="sm:col-span-1 text-right">
                        <button
                          onClick={() => handleRemoveRenewal(index)}
                          className="text-rose-600 hover:text-rose-700 p-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. WORKFLOW CLOSURE GATE */}
              <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Final Stage 09: Complete Handover & Close Workflow
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Closes active onboarding and records client into annual compliance retention.
                    </p>
                  </div>

                  {selectedDeal.stage !== 'CLOSED' ? (
                    <button
                      onClick={handleCompleteHandover}
                      disabled={actionLoading}
                      className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Close CRM Workflow (Stage 09 Complete)</span>
                    </button>
                  ) : (
                    <div className="px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Workflow Closed
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
              Select a delivered file to complete relationship manager handover.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
