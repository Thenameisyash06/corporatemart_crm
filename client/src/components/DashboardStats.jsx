import React, { useState } from 'react';
import {
  FileText,
  BadgeAlert,
  Scale,
  Cog,
  CheckCircle2,
  Send,
  IndianRupee,
  Clock,
  Target,
  TrendingUp,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import api from '../lib/api';

export default function DashboardStats({
  stats,
  activeFilter,
  onSelectFilter,
  currentUser,
  onRefreshStats,
}) {
  if (!stats) return null;

  const { counts, financials } = stats;
  const isBdm = currentUser?.role === 'BDM' || Boolean(stats.bdmMetrics);

  const bdmMetrics = stats.bdmMetrics || {
    target: currentUser?.salesTarget ? Number(currentUser.salesTarget) : 500000,
    achievement: Number(financials?.totalCollected) || 0,
    pending: Math.max(
      0,
      (currentUser?.salesTarget ? Number(currentUser.salesTarget) : 500000) -
        (Number(financials?.totalCollected) || 0)
    ),
    progressPercent: 0,
  };

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(bdmMetrics.target));
  const [savingTarget, setSavingTarget] = useState(false);

  const handleSaveTarget = async () => {
    const val = parseFloat(targetInput);
    if (isNaN(val) || val < 0) return;
    try {
      setSavingTarget(true);
      await api.patch(`/users/${currentUser.id}/sales-target`, { salesTarget: val });
      setIsEditingTarget(false);
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('Failed to update sales target:', err);
    } finally {
      setSavingTarget(false);
    }
  };

  const cards = [
    {
      id: 'ALL',
      title: 'Total Deals',
      count: counts.totalDeals,
      subtext: 'All pipelines',
      icon: FileText,
    },
    {
      id: 'ACCOUNTS_QUEUE',
      stageKey: 'STAGE_04_ACCOUNTS_VERIFICATION',
      title: 'Accounts Queue',
      count: counts.pendingAccounts,
      alertCount: counts.accountsRejected,
      subtext: counts.accountsRejected ? `${counts.accountsRejected} returned` : 'Awaiting verify',
      icon: BadgeAlert,
    },
    {
      id: 'LEGAL_QUEUE',
      stageKey: 'STAGE_05_LEGAL_VERIFICATION',
      title: 'Legal Scrutiny',
      count: counts.pendingLegal,
      alertCount: counts.legalRejected,
      subtext: counts.legalRejected ? `${counts.legalRejected} deficiencies` : 'Doc verification',
      icon: Scale,
    },
    {
      id: 'OPS_QUEUE',
      stageKey: 'STAGE_06_OPERATIONS_PROCESSING',
      title: 'Operations Desk',
      count: counts.inOperations,
      subtext: 'Active filing',
      icon: Cog,
    },
    {
      id: 'RM_QUEUE',
      stageKey: 'STAGE_08_FINAL_DOCS_DELIVERED',
      title: 'RM Handover',
      count: counts.pendingRmHandover,
      subtext: 'Client handover',
      icon: Send,
    },
    {
      id: 'CLOSED',
      stageKey: 'CLOSED',
      title: 'Closed Deals',
      count: counts.closedDeals,
      subtext: 'Completed',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Financial Metrics Strip:
          For BDM -> Target - Achievement - Pending (Taken from BDM specific sales target)
          For other roles -> Total Deal Volume - Amount Collected - Pending Balance */}
      {isBdm ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* 1. Target */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="flex-1 mr-2">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase font-bold text-slate-600 tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-slate-700" />
                  Target
                </div>
                {currentUser?.id && !isEditingTarget && (
                  <button
                    onClick={() => {
                      setTargetInput(String(bdmMetrics.target));
                      setIsEditingTarget(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                    title="Edit Sales Target"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {isEditingTarget ? (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-xs font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    className="w-28 bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-800"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveTarget}
                    disabled={savingTarget}
                    className="p-1 bg-slate-900 text-white rounded hover:bg-slate-800"
                    title="Save Target"
                  >
                    <Save className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setIsEditingTarget(false)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                    ₹{Number(bdmMetrics.target).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Specific BDM Sales Target</div>
                </>
              )}
            </div>
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl border border-slate-200 flex-shrink-0">
              <Target className="w-5 h-5" />
            </div>
          </div>

          {/* 2. Achievement */}
          <div className="bg-white border border-emerald-200/80 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="flex-1 mr-2">
              <div className="text-xs uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Achievement
              </div>
              <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
                ₹{Number(bdmMetrics.achievement).toLocaleString('en-IN')}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, bdmMetrics.progressPercent)}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-emerald-800">
                  {bdmMetrics.progressPercent}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* 3. Pending */}
          <div className="bg-white border border-amber-200/80 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-bold text-amber-800 tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Pending
              </div>
              <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">
                ₹{Number(bdmMetrics.pending).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-amber-700/90 mt-1 font-medium">
                {bdmMetrics.pending === 0
                  ? '🎉 Target 100% Achieved!'
                  : 'Remaining to hit sales target'}
              </div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                Total Deal Volume
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                ₹{Number(financials.totalDealValue).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                Amount Collected
              </div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                ₹{Number(financials.totalCollected).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                Pending Balance
              </div>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                ₹{Number(financials.totalPending).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Stage Queue Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map((c) => {
          const isSelected = activeFilter === c.id;
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => onSelectFilter(c.id, c.stageKey)}
              className={`text-left p-3.5 rounded-xl border transition shadow-sm ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-semibold truncate ${
                    isSelected ? 'text-slate-200' : 'text-slate-600'
                  }`}
                >
                  {c.title}
                </span>
                <Icon className={`w-4 h-4 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`} />
              </div>
              <div className="text-xl font-bold tracking-tight">{c.count}</div>
              <div
                className={`text-xs mt-1 truncate ${
                  isSelected ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {c.subtext}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
