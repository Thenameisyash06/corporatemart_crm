import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Building,
  Check,
  AlertCircle,
  UploadCloud,
  FileText,
  Briefcase,
  Users,
  UserPlus,
  IndianRupee,
  Wallet,
} from 'lucide-react';
import api from '../lib/api';
import DealFinancialMetrics, { RECEIVING_ACCOUNTS } from './DealFinancialMetrics';

export const DEFAULT_SERVICES = [
  { name: 'Private Limited Company Incorporation', standardAmount: '18000', govtFee: '3000' },
  { name: 'Limited Liability Partnership (LLP) Registration', standardAmount: '12000', govtFee: '2000' },
  { name: 'One Person Company (OPC) Registration', standardAmount: '14000', govtFee: '2000' },
  { name: 'GST Registration & Filing', standardAmount: '5000', govtFee: '0' },
  { name: 'Trademark Application & Search', standardAmount: '9000', govtFee: '4500' },
  { name: 'Import Export Code (IEC)', standardAmount: '4000', govtFee: '500' },
  { name: 'MSME / Udyam Registration', standardAmount: '3000', govtFee: '0' },
  { name: 'Annual ROC Compliance & Filing', standardAmount: '15000', govtFee: '0' },
  { name: 'FSSAI Food License', standardAmount: '7500', govtFee: '2000' },
];

export default function NewDealWizardModal({ isOpen, onClose, onSuccess, initialData }) {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);


  useEffect(() => {
    if (initialData && isOpen) {
      setForm((prev) => ({
        ...prev,
        companyName: initialData.companyName || prev.companyName,
        clientName: initialData.clientName || prev.clientName,
        clientEmail: initialData.clientEmail || prev.clientEmail,
        clientPhone: initialData.clientPhone || prev.clientPhone,
        remarks: initialData.remarks || prev.remarks,
        directors: [
          {
            name: initialData.clientName || '',
            email: initialData.clientEmail || '',
            phone: initialData.clientPhone || '',
            din: '',
            pan: '',
          },
          { name: '', din: '', pan: '', email: '', phone: '' },
        ],
      }));
    }
  }, [initialData, isOpen]);

  // Form State
  const [form, setForm] = useState({
    companyName: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    coBdmIds: [], // Associated BDMs for this deal
    panNumber: '',
    gstStatus: false,
    gstin: '',
    consultantName: '',
    industry: '',
    sector: '',
    billingAddress: '',
    city: '',
    state: '',
    pincode: '',
    remarks: '',

    // Designated account where payment is received
    accountName: RECEIVING_ACCOUNTS[0],
    cashCollectorName: '',

    directors: [
      { name: '', din: '', pan: '', email: '', phone: '' },
      { name: '', din: '', pan: '', email: '', phone: '' },
    ],

    services: [
      {
        serviceName: DEFAULT_SERVICES[0].name,
        standardAmount: DEFAULT_SERVICES[0].standardAmount,
        dealAmount: '15000',
        govtFee: DEFAULT_SERVICES[0].govtFee,
      },
    ],

    standardAmount: '18000',
    totalAmount: '18000',
    amountReceived: '10000',
    paymentType: 'PART_PAYMENT',
    paymentMode: 'UPI',
    transactionReference: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  const [companyPanFile, setCompanyPanFile] = useState(null);
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [kycFiles, setKycFiles] = useState([]);
  const [bdmList, setBdmList] = useState([]);

  useEffect(() => {
    if (isOpen) {
      api.get('/users?role=BDM')
        .then((res) => {
          setBdmList(res.data.users || []);
        })
        .catch((err) => {
          console.error('Failed to load BDMs list:', err);
        });
    }
  }, [isOpen]);

  const handleAddCoBdm = (bdmId) => {
    if (!bdmId) return;
    if (form.coBdmIds.includes(bdmId)) return;
    setForm((prev) => ({ ...prev, coBdmIds: [...prev.coBdmIds, bdmId] }));
  };

  const handleRemoveCoBdm = (bdmId) => {
    setForm((prev) => ({ ...prev, coBdmIds: prev.coBdmIds.filter((id) => id !== bdmId) }));
  };

  const standardVal = parseFloat(form.standardAmount) || 0;
  const totalVal = parseFloat(form.totalAmount) || 0;
  const receivedVal = parseFloat(form.amountReceived) || 0;
  const pendingVal = Math.max(0, totalVal - receivedVal);

  const handleDirectorChange = (index, field, value) => {
    const updated = [...form.directors];
    updated[index][field] = value;
    setForm({ ...form, directors: updated });
  };

  const addDirector = () => {
    setForm({
      ...form,
      directors: [...form.directors, { name: '', din: '', pan: '', email: '', phone: '' }],
    });
  };

  const removeDirector = (index) => {
    if (form.directors.length <= 1) return;
    const updated = form.directors.filter((_, i) => i !== index);
    setForm({ ...form, directors: updated });
  };

  const calculateTotals = (servicesList) => {
    let std = 0;
    let tot = 0;
    servicesList.forEach((s) => {
      std += parseFloat(s.standardAmount) || 0;
      tot += (parseFloat(s.dealAmount !== undefined ? s.dealAmount : s.serviceFee) || 0) + (parseFloat(s.govtFee) || 0);
    });
    return { std: String(std), tot: String(tot) };
  };

  const addService = () => {
    const catalogItem = DEFAULT_SERVICES[form.services.length % DEFAULT_SERVICES.length] || DEFAULT_SERVICES[0];
    const newServices = [
      ...form.services,
      {
        serviceName: catalogItem.name,
        standardAmount: catalogItem.standardAmount,
        dealAmount: catalogItem.standardAmount,
        govtFee: catalogItem.govtFee,
      },
    ];
    const { std, tot } = calculateTotals(newServices);
    setForm({
      ...form,
      services: newServices,
      standardAmount: std,
      totalAmount: tot,
    });
  };

  const removeService = (index) => {
    if (form.services.length <= 1) return;
    const updated = form.services.filter((_, i) => i !== index);
    const { std, tot } = calculateTotals(updated);
    setForm({
      ...form,
      services: updated,
      standardAmount: std,
      totalAmount: tot,
    });
  };

  const handleServiceNameChange = (index, serviceName) => {
    const updated = [...form.services];
    updated[index].serviceName = serviceName;
    const catalogMatch = DEFAULT_SERVICES.find(
      (d) => d.name.toLowerCase() === serviceName.trim().toLowerCase()
    );
    if (catalogMatch) {
      updated[index].standardAmount = catalogMatch.standardAmount;
      updated[index].govtFee = catalogMatch.govtFee;
      const stdVal = parseFloat(catalogMatch.standardAmount) || 0;
      const currentDeal = parseFloat(updated[index].dealAmount) || 0;
      if (currentDeal > stdVal) {
        updated[index].dealAmount = catalogMatch.standardAmount;
        updated[index].serviceFee = catalogMatch.standardAmount;
      }
    }
    const { std, tot } = calculateTotals(updated);
    setForm({
      ...form,
      services: updated,
      standardAmount: std,
      totalAmount: tot,
    });
  };

  const handleDealAmountChange = (index, value) => {
    const updated = [...form.services];
    const std = parseFloat(updated[index].standardAmount) || 0;
    let numVal = parseFloat(value);

    // Deal amount will not be more than standard amount
    if (!isNaN(numVal) && std > 0 && numVal > std) {
      numVal = std;
      setError(`Deal amount cannot exceed the standard amount of ₹${std.toLocaleString('en-IN')}`);
    } else {
      setError(null);
    }

    const finalVal = isNaN(numVal) ? value : String(numVal);
    updated[index].dealAmount = finalVal;
    updated[index].serviceFee = finalVal;

    const { std: newStd, tot: newTot } = calculateTotals(updated);
    setForm({
      ...form,
      services: updated,
      standardAmount: newStd,
      totalAmount: newTot,
    });
  };

  const handleGovtFeeChange = (index, value) => {
    const updated = [...form.services];
    updated[index].govtFee = value;
    const { std: newStd, tot: newTot } = calculateTotals(updated);
    setForm({
      ...form,
      services: updated,
      standardAmount: newStd,
      totalAmount: newTot,
    });
  };

  const handleKycFileSelect = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setKycFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeKycFile = (index) => {
    setKycFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep1 = () => {
    if (!form.companyName.trim()) {
      setError('Company Name is required.');
      return false;
    }
    if (!form.clientName.trim()) {
      setError('Primary Client Name is required.');
      return false;
    }
    if (!form.clientEmail.trim()) {
      setError('Client Email is required.');
      return false;
    }
    if (!form.clientPhone.trim()) {
      setError('Client Phone Number is required.');
      return false;
    }
    if (!form.panNumber.trim()) {
      setError('Company PAN Number is mandatory.');
      return false;
    }
    if (!companyPanFile) {
      setError('Company PAN Card Image / PDF upload is mandatory.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (totalVal <= 0) {
      setError('Total Deal Amount must be greater than zero.');
      return false;
    }
    if (receivedVal <= 0) {
      setError('Amount received must be greater than zero.');
      return false;
    }
    for (const s of form.services) {
      const std = parseFloat(s.standardAmount) || 0;
      const deal = parseFloat(s.dealAmount !== undefined ? s.dealAmount : s.serviceFee) || 0;
      if (std > 0 && deal > std) {
        setError(
          `Deal amount (₹${deal.toLocaleString('en-IN')}) cannot be greater than Standard Amount (₹${std.toLocaleString('en-IN')}) for "${s.serviceName}".`
        );
        return false;
      }
    }
    if (form.paymentMode === 'CASH') {
      if (!form.cashCollectorName || !form.cashCollectorName.trim()) {
        setError('Please enter the name of the person who collected the cash.');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!validateStep2()) {
      setStep(2);
      return;
    }
    setSubmitting(true);

    try {
      const dealRes = await api.post('/deals', {
        ...form,
        standardAmount: standardVal,
        totalAmount: totalVal,
        amountReceived: receivedVal,
        paymentType: pendingVal > 0 ? 'PART_PAYMENT' : 'FULL_PAYMENT',
        services: form.services.map((s) => ({
          serviceName: s.serviceName,
          standardAmount: parseFloat(s.standardAmount) || 0,
          dealAmount: parseFloat(s.dealAmount !== undefined ? s.dealAmount : s.serviceFee) || 0,
          serviceFee: parseFloat(s.dealAmount !== undefined ? s.dealAmount : s.serviceFee) || 0,
          govtFee: parseFloat(s.govtFee) || 0,
        })),
      });

      const dealId = dealRes.data.dealId;

      // 1. Upload mandatory Company PAN document
      if (companyPanFile) {
        const panFormData = new FormData();
        panFormData.append('dealId', dealId);
        panFormData.append('documentType', 'COMPANY_PAN');
        panFormData.append('title', `Company PAN - ${form.companyName}`);
        panFormData.append('file', companyPanFile);
        await api.post('/documents/upload', panFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 2. Upload Payment Proof (only if not CASH)
      if (form.paymentMode !== 'CASH' && paymentProofFile) {
        const formData = new FormData();
        formData.append('dealId', dealId);
        formData.append('documentType', 'PAYMENT_PROOF');
        formData.append('title', `Payment Proof - ${form.transactionReference || 'UTR'}`);
        formData.append('file', paymentProofFile);
        await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 3. Upload additional KYC files
      for (const file of kycFiles) {
        const formData = new FormData();
        formData.append('dealId', dealId);
        formData.append('documentType', 'KYC_PAN');
        formData.append('title', file.name);
        formData.append('file', file);
        await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSuccess(dealId);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Failed to submit deal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-700" />
              New Deal & Client Onboarding Wizard
            </h2>
            <p className="text-xs text-slate-500">Stages 01 – 03: Sales / BDM File Entry</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-white text-xs text-center font-medium">
          {[
            { num: 1, label: '1. Client & Directors' },
            { num: 2, label: '2. Services & Commercials' },
            { num: 3, label: '3. Documents Checklist & Handover' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => {
                if (s.num > step) {
                  if (step === 1 && !validateStep1()) return;
                  if (step === 2 && !validateStep2()) return;
                }
                setStep(s.num);
              }}
              className={`py-3.5 border-b-2 text-xs transition ${
                step === s.num
                  ? 'border-slate-900 text-slate-900 font-bold bg-slate-50'
                  : step > s.num
                  ? 'border-emerald-600 text-emerald-800 font-semibold'
                  : 'border-transparent text-slate-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Client & Directors */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Card 1: Company & Primary Contact */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-600" /> Company & Primary Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      placeholder="e.g. Nexus FinTech Private Limited"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Primary Client Name *</label>
                    <input
                      type="text"
                      value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                      placeholder="e.g. Ramesh Chandra"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Email ID *</label>
                    <input
                      type="email"
                      value={form.clientEmail}
                      onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                      placeholder="client@company.com"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      value={form.clientPhone}
                      onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">CA / Consultant Name</label>
                    <input
                      type="text"
                      value={form.consultantName}
                      onChange={(e) => setForm({ ...form, consultantName: e.target.value })}
                      placeholder="e.g. CA Ramesh & Co. (or Direct Client)"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card 1B: Associated BDMs / Deal Co-Owners */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-600" /> Associated BDMs / Deal Co-Owners
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                    {form.coBdmIds.length} Co-BDM{form.coBdmIds.length === 1 ? '' : 's'} Added
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  Select additional Business Development Managers (BDMs) who co-own or share this client deal:
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <select
                      value=""
                      onChange={(e) => {
                        handleAddCoBdm(e.target.value);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="">+ Select BDM from list to add...</option>
                      {bdmList
                        .filter((b) => !form.coBdmIds.includes(b.id))
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.fullName} ({b.email})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Selected BDMs Chips */}
                {form.coBdmIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {form.coBdmIds.map((bId) => {
                      const bdmObj = bdmList.find((b) => b.id === bId);
                      return (
                        <div
                          key={bId}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 shadow-xs"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                          <span className="font-semibold text-slate-900">{bdmObj ? bdmObj.fullName : 'BDM'}</span>
                          {bdmObj?.email && (
                            <span className="text-slate-400 text-[11px]">({bdmObj.email})</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveCoBdm(bId)}
                            className="ml-1 p-0.5 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Remove BDM"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card 2: Company PAN & GST (MANDATORY PAN) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-600" /> Company PAN & Tax Registration (Mandatory)
                  </h3>
                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    PAN Number & Image Required *
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      Company PAN Number *
                    </label>
                    <input
                      type="text"
                      value={form.panNumber}
                      onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-slate-800 focus:outline-none tracking-wider"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block">10-character Permanent Account Number</span>
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      Company PAN Image / Document *
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id="company-pan-input"
                        accept="image/*,application/pdf"
                        onChange={(e) => setCompanyPanFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label
                        htmlFor="company-pan-input"
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg border cursor-pointer transition text-xs ${
                          companyPanFile
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
                            : 'bg-white border-slate-300 hover:border-slate-400 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {companyPanFile ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <UploadCloud className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          )}
                          <span className="truncate">
                            {companyPanFile ? companyPanFile.name : 'Upload PAN Card (Image / PDF)...'}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-1 bg-slate-900 text-white rounded">
                          {companyPanFile ? 'Change' : 'Browse'}
                        </span>
                      </label>
                    </div>
                    {companyPanFile && (
                      <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">
                        ✓ Selected ({(companyPanFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2.5 pt-2">
                    <input
                      type="checkbox"
                      id="gstStatus"
                      checked={form.gstStatus}
                      onChange={(e) => setForm({ ...form, gstStatus: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0"
                    />
                    <label htmlFor="gstStatus" className="text-xs text-slate-800 font-semibold cursor-pointer">
                      GST Billing Applicable?
                    </label>
                  </div>

                  {form.gstStatus && (
                    <div>
                      <label className="text-xs text-slate-700 font-semibold block mb-1">GSTIN Number</label>
                      <input
                        type="text"
                        value={form.gstin}
                        onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                        placeholder="27ABCDE1234F1Z5"
                        maxLength={15}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-800 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Business Classification (Industry & Sector) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-600" /> Business Classification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Industry</label>
                    <input
                      type="text"
                      list="industry-datalist"
                      value={form.industry}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                      placeholder="e.g. Information Technology"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                    <datalist id="industry-datalist">
                      <option value="Information Technology" />
                      <option value="Financial Services" />
                      <option value="Healthcare & Pharma" />
                      <option value="E-Commerce & Retail" />
                      <option value="Manufacturing & Engineering" />
                      <option value="Real Estate & Construction" />
                      <option value="Consulting & Advisory" />
                      <option value="Education & Training" />
                      <option value="Hospitality & Tourism" />
                      <option value="Logistics & Transport" />
                    </datalist>
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Sector</label>
                    <input
                      type="text"
                      value={form.sector}
                      onChange={(e) => setForm({ ...form, sector: e.target.value })}
                      placeholder="e.g. FinTech, SaaS, EdTech"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Address Details */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Office / Registered Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                  <div className="md:col-span-4">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Office / Street Address</label>
                    <input
                      type="text"
                      value={form.billingAddress}
                      onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
                      placeholder="e.g. Unit 402, 4th Floor, Signature Towers, Sector 62"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="e.g. Gurugram"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">State</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      placeholder="e.g. Haryana"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Pincode</label>
                    <input
                      type="text"
                      value={form.pincode}
                      onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                      placeholder="e.g. 122002"
                      maxLength={6}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Directors Section */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Company Directors / Promoters (MCA Required)
                  </h3>
                  <button
                    onClick={addDirector}
                    className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3" /> Add Director
                  </button>
                </div>

                <div className="space-y-2.5">
                  {form.directors.map((d, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                        <span>Director {index + 1}</span>
                        {form.directors.length > 1 && (
                          <button
                            onClick={() => removeDirector(index)}
                            className="text-rose-600 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder="Full Name (as per PAN)"
                          value={d.name}
                          onChange={(e) => handleDirectorChange(index, 'name', e.target.value)}
                          className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                        />
                        <input
                          type="text"
                          placeholder="DIN (if existing)"
                          value={d.din}
                          onChange={(e) => handleDirectorChange(index, 'din', e.target.value)}
                          className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                        />
                        <input
                          type="text"
                          placeholder="Director PAN"
                          value={d.pan}
                          onChange={(e) => handleDirectorChange(index, 'pan', e.target.value.toUpperCase())}
                          className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                        />
                        <input
                          type="tel"
                          placeholder="Mobile Number"
                          value={d.phone}
                          onChange={(e) => handleDirectorChange(index, 'phone', e.target.value)}
                          className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Services & Commercials (Unified Services & Payment) */}
          {step === 2 && (
            <div className="space-y-5">
              {/* 1. Account Name At Front */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-700" />
                  <label className="text-xs text-slate-800 font-bold uppercase tracking-wider block">
                    Account Name (Payment Receiving Account) *
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  Select the designated company bank account where the payment was received
                </p>
                <select
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  {RECEIVING_ACCOUNTS.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Services Scope & Bifurcation */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Service Line Items & Commercial Bifurcation
                    </h3>
                    <p className="text-xs text-slate-500">
                      Bifurcate Standard Amount vs agreed Deal Amount per service line
                    </p>
                  </div>
                  <button
                    onClick={addService}
                    type="button"
                    className="text-xs px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Service Line
                  </button>
                </div>

                <div className="space-y-3">
                  {form.services.map((s, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs"
                    >
                      <div className="md:col-span-5">
                        <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                          Service Line Item
                        </label>
                        <input
                          type="text"
                          list="services-list"
                          value={s.serviceName}
                          onChange={(e) => handleServiceNameChange(index, e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                        />
                        <datalist id="services-list">
                          {DEFAULT_SERVICES.map((item) => (
                            <option key={item.name} value={item.name} />
                          ))}
                        </datalist>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                          Standard Amount (₹) <span className="text-[10px] text-slate-400 font-normal">(Fixed)</span>
                        </label>
                        <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold select-none cursor-not-allowed">
                          ₹{Number(s.standardAmount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                          Deal Amount (₹) * <span className="text-[10px] text-slate-400 font-normal">(Max: ₹{Number(s.standardAmount || 0).toLocaleString('en-IN')})</span>
                        </label>
                        <input
                          type="number"
                          max={s.standardAmount}
                          value={s.dealAmount !== undefined ? s.dealAmount : (s.serviceFee || '')}
                          onChange={(e) => handleDealAmountChange(index, e.target.value)}
                          placeholder={`Max ₹${Number(s.standardAmount || 0).toLocaleString('en-IN')}`}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 font-mono font-bold"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                          Govt Fee (₹)
                        </label>
                        <input
                          type="number"
                          value={s.govtFee || ''}
                          onChange={(e) => handleGovtFeeChange(index, e.target.value)}
                          placeholder="0"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 font-mono"
                        />
                      </div>

                      <div className="md:col-span-1 text-right pt-4">
                        {form.services.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeService(index)}
                            className="text-rose-600 hover:text-rose-700 p-1"
                            title="Remove Line Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Deal Financial Summary (Standard Amount - Deal Amount - Received Amount - Pending Amount) */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>Deal Commercial Summary</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Dedicated GST (18%) calculated below each metric
                  </span>
                </div>
                <DealFinancialMetrics
                  standardAmount={standardVal}
                  dealAmount={totalVal}
                  receivedAmount={receivedVal}
                  pendingAmount={pendingVal}
                  receivingAccount={form.accountName}
                />
              </div>

              {/* 4. Payment Tranche & Settlement Information */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-slate-600" /> Initial Payment Tranche & Proof
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      Amount Received (₹) *
                    </label>
                    <input
                      type="number"
                      value={form.amountReceived}
                      onChange={(e) => setForm({ ...form, amountReceived: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-emerald-700 font-bold font-mono focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      Payment Mode *
                    </label>
                    <select
                      value={form.paymentMode}
                      onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                    >
                      <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                      <option value="NEFT_RTGS">Bank Transfer (NEFT / RTGS / IMPS)</option>
                      <option value="NET_BANKING">Net Banking</option>
                      <option value="CREDIT_DEBIT_CARD">Credit / Debit Card</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">CASH (Physical Cash Handover)</option>
                      <option value="PAYMENT_GATEWAY">Payment Gateway (Razorpay)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      value={form.paymentDate}
                      onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  {/* Cash Mode: Takes name of person who collected payment, NO screenshot required */}
                  {form.paymentMode === 'CASH' ? (
                    <div className="md:col-span-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <IndianRupee className="w-4 h-4 text-amber-700" />
                        <span>Cash Payment Selected: Screenshot upload not required</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Enter the full name of the representative / executive who received this physical cash payment.
                      </p>
                      <div>
                        <label className="text-xs text-slate-800 font-semibold block mb-1">
                          Cash Collected By (Name) *
                        </label>
                        <input
                          type="text"
                          value={form.cashCollectorName}
                          onChange={(e) => setForm({ ...form, cashCollectorName: e.target.value })}
                          placeholder="e.g. Rahul Sharma (BDM / Executive)"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="md:col-span-3">
                      <label className="text-xs text-slate-700 font-semibold block mb-1">
                        Payment Proof / Screenshot <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-900 file:text-white hover:file:bg-slate-800 w-full"
                      />
                      {paymentProofFile && (
                        <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1 truncate">
                          <Check className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{paymentProofFile.name} ({(paymentProofFile.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="md:col-span-3">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      Payment Remarks / Commercial Notes
                    </label>
                    <textarea
                      rows={2}
                      value={form.remarks}
                      onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                      placeholder="e.g. Received via client HDFC account; balance tranche due upon incorporation certificate generation."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Documents Checklist & Handover */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Required Client Documents Checklist & Handover
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attach Director PAN, Aadhaar, Electricity Bill, MOA/AOA, and DSC documents before handover to Accounts.
                </p>
              </div>

              {/* Key Verification Documents Status */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Key Verification Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    companyPanFile ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-bold">Company PAN Card * (Mandatory)</div>
                        <div className="text-[11px] truncate">
                          {companyPanFile ? `${companyPanFile.name} (${(companyPanFile.size / 1024).toFixed(0)} KB)` : 'Missing (Mandatory in Step 1)'}
                        </div>
                      </div>
                    </div>
                    {companyPanFile && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                  </div>

                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    form.paymentMode === 'CASH'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : paymentProofFile
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-bold">Initial Payment Proof (Optional)</div>
                        <div className="text-[11px] truncate">
                          {form.paymentMode === 'CASH'
                            ? `Cash Mode: Collected by ${form.cashCollectorName || 'Staff'} (No file required)`
                            : paymentProofFile
                            ? `${paymentProofFile.name} (${(paymentProofFile.size / 1024).toFixed(0)} KB)`
                            : 'Optional / Not attached'}
                        </div>
                      </div>
                    </div>
                    {(form.paymentMode === 'CASH' || paymentProofFile) && (
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              {/* Multi-file batch upload */}
              <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-5 text-center bg-slate-50/50 transition">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                <div className="text-xs font-semibold text-slate-700">
                  Select or drag multiple KYC & service documents
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Supported formats: PDF, PNG, JPG
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleKycFileSelect}
                  className="hidden"
                  id="kyc-multi-upload"
                />
                <label
                  htmlFor="kyc-multi-upload"
                  className="mt-3 inline-block px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm"
                >
                  Browse Files
                </label>
              </div>

              {kycFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Ready to Upload ({kycFiles.length} files)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {kycFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-900 font-medium truncate">{file.name}</span>
                          <span className="text-slate-500 text-xs font-mono">({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          onClick={() => removeKycFile(idx)}
                          className="text-rose-600 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
                <strong>Stage 03 Control Enforcement:</strong> Once created, this deal file will be saved under the designated account (<em>{form.accountName}</em>). You can review all required fields and handover to Accounts Desk for verification.
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50/70">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || submitting}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 transition"
          >
            Back
          </button>

          <div className="flex items-center space-x-2.5">
            {step < 3 ? (
              <button
                onClick={() => {
                  if (step === 1 && !validateStep1()) return;
                  if (step === 2 && !validateStep2()) return;
                  setStep(step + 1);
                }}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition shadow-sm"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Creating Deal...' : 'Save & Initialize Deal Record'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
