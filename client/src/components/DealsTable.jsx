import React from 'react';
import {
  FileText,
  Building,
  User,
  AlertCircle,
  Clock,
  ChevronRight,
  IndianRupee,
} from 'lucide-react';

export const STAGE_CONFIG = {
  STAGE_01_PAYMENT_RECEIVED: { label: '01. Payment Recv', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  STAGE_02_DOCUMENTS_COLLECTED: { label: '02. Docs Collected', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  STAGE_04_ACCOUNTS_VERIFICATION: { label: '04. Accounts Queue', color: 'bg-amber-50 text-amber-800 border-amber-200 font-medium' },
  STAGE_04_ACCOUNTS_REJECTED: { label: '04. Accounts Discrepancy', color: 'bg-rose-50 text-rose-800 border-rose-200 font-medium' },
  STAGE_05_LEGAL_VERIFICATION: { label: '05. Legal Scrutiny', color: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-medium' },
  STAGE_05_LEGAL_REJECTED: { label: '05. Legal Deficiency', color: 'bg-rose-50 text-rose-800 border-rose-200 font-medium' },
  STAGE_06_OPERATIONS_PROCESSING: { label: '06. Operations Filing', color: 'bg-sky-50 text-sky-800 border-sky-200 font-medium' },
  STAGE_07_SERVICE_COMPLETED: { label: '07. Service Completed', color: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium' },
  STAGE_08_FINAL_DOCS_DELIVERED: { label: '08. Delivered', color: 'bg-teal-50 text-teal-800 border-teal-200 font-medium' },
  STAGE_09_RM_HANDOVER: { label: '09. RM Handover', color: 'bg-purple-50 text-purple-800 border-purple-200 font-medium' },
  CLOSED: { label: 'Closed (Success)', color: 'bg-slate-100 text-slate-700 border-slate-200 font-medium' },
};

export default function DealsTable({
  deals,
  onSelectDeal,
  onCollectBalance,
  currentUser,
  loading,
  pagination,
  onPageChange,
  onLimitChange,
}) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
        <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
        <span className="text-xs">Loading records...</span>
      </div>
    );
  }

  if (!deals || deals.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <h3 className="text-sm font-semibold text-slate-800">No deals in this queue</h3>
        <p className="text-xs text-slate-500 mt-1">Switch queues or create a new deal entry.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
            <tr>
              <th className="py-3.5 px-4 font-semibold">Deal Code</th>
              <th className="py-3.5 px-4 font-semibold">Client Company</th>
              <th className="py-3.5 px-4 font-semibold">Services Scope</th>
              <th className="py-3.5 px-4 font-semibold">Financials</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {deals.map((deal) => {
              const stageConf = STAGE_CONFIG[deal.stage] || {
                label: deal.stage,
                color: 'bg-slate-100 text-slate-700 border-slate-200',
              };

              const pending = Number(deal.pendingAmount);
              const isRejected = deal.stage.includes('REJECTED');

              return (
                <tr
                  key={deal.id}
                  onClick={() => onSelectDeal(deal.id)}
                  className="hover:bg-slate-50/80 cursor-pointer transition"
                >
                  {/* Deal Code */}
                  <td className="py-4 px-4">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                      {deal.dealCode}
                    </span>
                    <div className="text-xs text-slate-500 mt-1">
                      BDM: {deal.bdm?.fullName || 'N/A'}
                      {deal.coBdms && deal.coBdms.length > 0 && (
                        <span
                          className="ml-1.5 text-[11px] font-semibold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded cursor-help"
                          title={`Co-BDMs: ${deal.coBdms.map((b) => b.fullName).join(', ')}`}
                        >
                          +{deal.coBdms.length} co-BDM{deal.coBdms.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Company & Client */}
                  <td className="py-4 px-4">
                    <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{deal.client.companyName}</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{deal.client.clientName}</span>
                      <span>•</span>
                      <span>{deal.client.phone}</span>
                    </div>
                  </td>

                  {/* Services */}
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1.5 max-w-sm">
                      {deal.services?.map((s, idx) => (
                        <span
                          key={s.id || idx}
                          className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                        >
                          {s.serviceName}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Financials */}
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900 text-sm">
                      Deal: ₹{Number(deal.totalAmount).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Std: ₹{Number(deal.standardAmount || deal.totalAmount).toLocaleString('en-IN')}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                      <span className="text-emerald-700 font-semibold">
                        Recv: ₹{Number(deal.amountReceived).toLocaleString('en-IN')}
                      </span>
                      {pending > 0 && (
                        <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          Due: ₹{pending.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    {deal.receivingAccount && (
                      <div className="mt-1 text-[10px] text-slate-600 truncate max-w-[170px]" title={deal.receivingAccount}>
                        🏦 {deal.receivingAccount}
                      </div>
                    )}
                  </td>

                  {/* Current Stage */}
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-medium ${stageConf.color}`}
                    >
                      {isRejected && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                      <span>{stageConf.label}</span>
                    </span>
                    {pending > 0 && (
                      <div className="mt-1.5">
                        {deal.payments?.some((p) => p.status === 'PENDING_VERIFICATION') ? (
                          <span className="inline-block text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 font-medium">
                            Balance Verification Pending
                          </span>
                        ) : (
                          <span className="inline-block text-xs text-slate-500 font-medium">
                            Part Payment
                          </span>
                        )}
                      </div>
                    )}
                    {deal.currentDiscrepancy && (
                      <div className="text-xs text-rose-600 mt-1 max-w-xs font-medium" title={deal.currentDiscrepancy}>
                        Query: {deal.currentDiscrepancy}
                      </div>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-4 px-4 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      {(currentUser?.role === 'BDM' || currentUser?.role === 'ADMIN') && pending > 0 && onCollectBalance && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCollectBalance(deal);
                          }}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-300 text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
                          title="Collect balance payment and submit proof to Accounts"
                        >
                          <IndianRupee className="w-3.5 h-3.5 text-amber-700" />
                          <span>Collect Balance</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDeal(deal.id);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-lg border border-slate-300 text-xs font-medium inline-flex items-center gap-1 transition shadow-sm"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.total > 0 && (
        <div className="bg-white border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
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
              of <strong className="text-slate-900">{pagination.total}</strong> deals
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition"
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
                      onClick={() => onPageChange && onPageChange(p)}
                      className={`w-7 h-7 rounded-lg font-semibold transition ${
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
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
