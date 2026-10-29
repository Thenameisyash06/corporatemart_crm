import React, { useState } from 'react';
import {
  CreditCard,
  Upload,
  AlertCircle,
  Check,
  X,
  FileText,
  IndianRupee,
  Clock,
  Building,
} from 'lucide-react';
import api from '../lib/api';
import { RECEIVING_ACCOUNTS, calculateGst } from './DealFinancialMetrics';

const PAYMENT_MODES = [
  'UPI',
  'NEFT_RTGS',
  'NET_BANKING',
  'CREDIT_DEBIT_CARD',
  'CHEQUE',
  'CASH',
  'PAYMENT_GATEWAY',
];

export default function CollectBalanceModal({ deal, isOpen, onClose, onSuccess }) {
  if (!isOpen || !deal) return null;

  const currentPending = Number(deal.pendingAmount) || 0;
  const currentReceived = Number(deal.amountReceived) || 0;

  const [accountName, setAccountName] = useState(deal.receivingAccount || RECEIVING_ACCOUNTS[0]);
  const [amount, setAmount] = useState(currentPending.toString());
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [cashCollectorName, setCashCollectorName] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const enteredVal = parseFloat(amount) || 0;
  const totalReceivedAfter = currentReceived + enteredVal;
  const pendingAmountAfter = Math.max(0, currentPending - enteredVal);
  const isCash = paymentMode === 'CASH';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Please enter a valid balance payment amount.');
      return;
    }

    if (val > currentPending) {
      setErrorMsg(`Amount cannot exceed the pending balance of ₹${currentPending.toLocaleString('en-IN')}.`);
      return;
    }

    if (isCash) {
      if (!cashCollectorName || !cashCollectorName.trim()) {
        setErrorMsg('Please enter the name of the person who collected the cash payment.');
        return;
      }
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('amount', val.toString());
      formData.append('accountName', accountName);
      formData.append('paymentMode', paymentMode);
      formData.append(
        'transactionReference',
        isCash
          ? (transactionReference.trim() || `Cash: Collected by ${cashCollectorName.trim()}`)
          : (transactionReference.trim() || `Balance: ${paymentMode} - ${accountName}`)
      );
      if (isCash) {
        formData.append('cashCollectorName', cashCollectorName.trim());
      }
      formData.append('paymentDate', paymentDate);
      formData.append('notes', notes.trim());
      if (file && !isCash) {
        formData.append('file', file);
      }

      await api.post(`/deals/${deal.id}/balance-payment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Collect balance error:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to submit balance payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header (Sticky at top) */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
              <IndianRupee className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Record Pending Amount Payment</h3>
              <p className="text-xs text-slate-500 font-mono">
                {deal.dealCode} • {deal.client?.companyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 overscroll-contain">
            {/* 1. Account Name At Front */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-600" />
                Account Name (Where Payment Is Received) *
              </label>
              <p className="text-[11px] text-slate-500">
                Select which company account received this pending balance tranche
              </p>
              <select
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800"
              >
                {RECEIVING_ACCOUNTS.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Pending Amount Metrics Box:
                   Recieved Amount - Total recieved amount - pending amount
                   with dedicated GST (18%) shown below each */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Recieved Amount */}
              <div className="p-3.5 bg-emerald-50/40 border border-emerald-200/70 rounded-xl shadow-xs">
                <span className="text-emerald-800 font-bold block text-[11px] uppercase tracking-wider">
                  Recieved Amount
                </span>
                <span className="font-bold text-emerald-700 text-base mt-1 block font-mono">
                  ₹{enteredVal.toLocaleString('en-IN')}
                </span>
                <div className="mt-1.5 pt-1.5 border-t border-emerald-100 flex items-center justify-between text-[11px] text-emerald-700">
                  <span>GST (18%):</span>
                  <span className="font-semibold font-mono">
                    ₹{calculateGst(enteredVal).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Total recieved amount */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                <span className="text-slate-600 font-bold block text-[11px] uppercase tracking-wider">
                  Total recieved amount
                </span>
                <span className="font-bold text-slate-900 text-base mt-1 block font-mono">
                  ₹{totalReceivedAfter.toLocaleString('en-IN')}
                </span>
                <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                  <span>GST (18%):</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    ₹{calculateGst(totalReceivedAfter).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* pending amount */}
              <div className="p-3.5 bg-amber-50/40 border border-amber-200/70 rounded-xl shadow-xs">
                <span className="text-amber-800 font-bold block text-[11px] uppercase tracking-wider">
                  pending amount
                </span>
                <span className="font-bold text-amber-700 text-base mt-1 block font-mono">
                  ₹{pendingAmountAfter.toLocaleString('en-IN')}
                </span>
                <div className="mt-1.5 pt-1.5 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-700">
                  <span>GST (18%):</span>
                  <span className="font-semibold font-mono">
                    ₹{calculateGst(pendingAmountAfter).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Amount input */}
            <div>
              <label className="text-slate-700 font-semibold block mb-1 text-xs">
                Balance Amount to Receive (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={currentPending}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                required
              />
            </div>

            {/* Payment Mode & Date */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-slate-700 font-semibold block mb-1 text-xs">
                  Payment Mode <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1 text-xs">
                  Payment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
                  required
                />
              </div>
            </div>

            {/* CASH Payment Mode Handling */}
            {isCash ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <IndianRupee className="w-4 h-4 text-amber-700" />
                  <span>Cash Payment Mode: No Screenshot / Receipt Required</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Physical cash collected directly. Enter the name of the executive who received the cash.
                </p>
                <div>
                  <label className="text-slate-800 font-bold block mb-1 text-xs">
                    Cash Collected By (Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cashCollectorName}
                    onChange={(e) => setCashCollectorName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-slate-800"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-slate-700 font-semibold block mb-1 text-xs">
                  Attach Payment Slip / Screenshot Proof <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="border border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-4 text-center bg-slate-50/50 transition">
                  <input
                    type="file"
                    id="balance-proof-file"
                    accept="application/pdf,image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="balance-proof-file"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                  >
                    <Upload className="w-5 h-5 text-slate-500" />
                    <span className="text-xs text-slate-700 font-medium">
                      {file ? file.name : 'Click to choose receipt PDF or image'}
                    </span>
                    {file && (
                      <span className="text-xs text-slate-500 font-mono">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* Optional Notes */}
            <div>
              <label className="text-slate-700 font-semibold block mb-1 text-xs">Remarks / Note for Accounts</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Client cleared full balance; credited to selected account."
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
              />
            </div>

            {/* Note banner */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5 leading-relaxed">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>
                Once logged, this balance payment tranche in <strong>{accountName}</strong> will be forwarded to <strong>Accounts Desk</strong> for verification. When Accounts verifies it, the deal is converted to Full Payment and Operations can release final deliverables.
              </span>
            </div>
          </div>

          {/* Sticky Actions Footer */}
          <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-end space-x-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs rounded-lg font-semibold border border-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs rounded-lg font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              {loading ? (
                <span>Recording...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Submit to Accounts Desk</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
