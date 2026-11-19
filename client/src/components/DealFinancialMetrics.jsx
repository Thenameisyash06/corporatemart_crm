import React from 'react';
import { IndianRupee, Building2 } from 'lucide-react';

export const RECEIVING_ACCOUNTS = [
  'Corporatemart private limited',
  'Corporatemart Services',
  'Tendermart private limited',
];

export const calculateGst = (val) => {
  const num = parseFloat(val) || 0;
  return Math.round(num * 0.18);
};

export default function DealFinancialMetrics({
  standardAmount = 0,
  dealAmount = 0,
  receivedAmount = 0,
  pendingAmount = 0,
  receivingAccount = null,
  compact = false,
  className = '',
  onEditDealAmount = null,
}) {
  const numStandard = parseFloat(standardAmount) || 0;
  const numDeal = parseFloat(dealAmount) || 0;
  const numReceived = parseFloat(receivedAmount) || 0;
  const numPending = parseFloat(pendingAmount) || 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {receivingAccount && (
        <div className="flex items-center justify-between text-xs px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Receiving Account:</span>
            <strong className="text-slate-900 font-semibold">{receivingAccount}</strong>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
            Designated Account
          </span>
        </div>
      )}

      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs`}>
        {/* 1. Standard Amount */}
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
            Standard Amount
          </div>
          <div className={`${compact ? 'text-base' : 'text-lg'} font-bold text-slate-900 mt-1`}>
            ₹{numStandard.toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>GST (18%):</span>
            <span className="font-semibold text-slate-800 font-mono">
              ₹{calculateGst(numStandard).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* 2. Deal Amount */}
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
              Deal Amount
            </div>
            {onEditDealAmount && (
              <button
                type="button"
                onClick={onEditDealAmount}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                title="Edit deal amount"
              >
                Edit
              </button>
            )}
          </div>
          <div className={`${compact ? 'text-base' : 'text-lg'} font-bold text-slate-900 mt-1`}>
            ₹{numDeal.toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>GST (18%):</span>
            <span className="font-semibold text-slate-800 font-mono">
              ₹{calculateGst(numDeal).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* 3. Received Amount */}
        <div className="p-3.5 bg-emerald-50/40 border border-emerald-200/70 rounded-xl shadow-xs">
          <div className="text-emerald-800 font-semibold text-[11px] uppercase tracking-wider">
            Received Amount
          </div>
          <div className={`${compact ? 'text-base' : 'text-lg'} font-bold text-emerald-700 mt-1`}>
            ₹{numReceived.toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-emerald-100 flex items-center justify-between text-[11px] text-emerald-700">
            <span>GST (18%):</span>
            <span className="font-semibold font-mono">
              ₹{calculateGst(numReceived).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* 4. Pending Amount */}
        <div className="p-3.5 bg-amber-50/40 border border-amber-200/70 rounded-xl shadow-xs">
          <div className="text-amber-800 font-semibold text-[11px] uppercase tracking-wider">
            Pending Amount
          </div>
          <div className={`${compact ? 'text-base' : 'text-lg'} font-bold text-amber-700 mt-1`}>
            ₹{numPending.toLocaleString('en-IN')}
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-700">
            <span>GST (18%):</span>
            <span className="font-semibold font-mono">
              ₹{calculateGst(numPending).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
