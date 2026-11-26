import React, { useState, useEffect, useMemo } from 'react';
import {
  Cog,
  CheckCircle2,
  FileCheck,
  RotateCcw,
  Check,
  Lock,
  Unlock,
  Layers,
  Eye,
  Send,
  User,
  UserCheck,
  Users,
  Download,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertCircle,
  Award,
  Presentation,
  Code,
  Building2,
  Landmark,
  Scale,
  FileText,
  ChevronRight,
  ExternalLink,
  Briefcase,
  Plus,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Trash2,
  Paperclip,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  File,
  CreditCard,
  IndianRupee,
} from 'lucide-react';
import api from '../lib/api';
import { toast } from '../context/ToastContext';
import {
  exportOpsServicesToCsv,
  exportOpsTeamWorkloadToCsv,
} from '../lib/exportCsv';

// -----------------------------------------------------------------------------
// DOCUMENT CATEGORIES FOR OPERATIONS
// -----------------------------------------------------------------------------
export const OPS_DOCUMENT_TYPES = [
  { value: 'INCORPORATION_FORM', label: 'Govt / MCA Filing Form / Challan Receipt' },
  { value: 'LEGAL_AGREEMENT', label: 'Service / Legal Agreement' },
  { value: 'OTHER', label: 'Working Paper / Objection Reply / Other Document' },
  { value: 'KYC_PAN', label: 'Director PAN Card' },
  { value: 'KYC_AADHAAR', label: 'Director Aadhaar Card' },
  { value: 'ADDRESS_PROOF', label: 'Office / Electricity Address Proof' },
  { value: 'DSC_TOKEN', label: 'DSC / Token Document' },
];

// -----------------------------------------------------------------------------
// EXPERTISE SECTORS CONFIGURATION (Mock Data - Swappable with Real List Later)
// -----------------------------------------------------------------------------
export const EXPERTISE_SECTORS = [
  {
    id: 'CERTIFICATION',
    name: 'Certifications & Quality',
    icon: Award,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'ISO 9001/14001, CE Mark, Halal, GMP, Startup India, MSME/Udyam',
    keywords: ['iso', 'certification', 'halal', 'ce', 'gmp', 'startup', 'msme', 'udyam', 'compliance', 'audit'],
    specialists: ['Neha Joshi (Certifications Specialist)', 'Vikram Singh (Operations Manager)'],
  },
  {
    id: 'PITCH_DECK',
    name: 'Pitch Decks & Valuation',
    icon: Presentation,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Investor Pitch Decks, Financial Modeling, CMA Data, Business Valuation',
    keywords: ['pitch', 'deck', 'valuation', 'financial model', 'cma', 'business plan', 'projection', 'investor'],
    specialists: ['Amit Patel (Financial & Pitch Specialist)', 'Vikram Singh (Operations Manager)'],
  },
  {
    id: 'DEVELOPMENT',
    name: 'Tech & Web Development',
    icon: Code,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Corporate Websites, E-Commerce Portals, Domain & Hosting, Web Applications',
    keywords: ['web', 'development', 'website', 'portal', 'app', 'domain', 'hosting', 'tech', 'software', 'ui'],
    specialists: ['Rahul Nair (Tech Lead & Full Stack)', 'Vikram Singh (Operations Manager)'],
  },
  {
    id: 'INCORPORATION',
    name: 'Incorporation & MCA',
    icon: Building2,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Pvt Ltd, LLP, OPC, Section 8, SPICe+ Part B, MoA/AoA, ROC Filings',
    keywords: ['incorporation', 'pvt ltd', 'llp', 'opc', 'spice', 'mca', 'roc', 'company registration', 'director'],
    specialists: ['Priya Sharma (ROC & Incorporation Specialist)', 'Vikram Singh (Operations Manager)'],
  },
  {
    id: 'GOVT_TENDERS',
    name: 'GeM Portal & Govt Tenders',
    icon: Landmark,
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'GeM Portal Vendor Registration, Bid Assessment, Tender Documentation',
    keywords: ['gem', 'tender', 'government tender', 'bid', 'vendor assessment', 'eprocure'],
    specialists: ['Siddharth Rawat (GeM & Tender Specialist)', 'Vikram Singh (Operations Manager)'],
  },
  {
    id: 'IP_TRADEMARKS',
    name: 'Trademarks & IP Rights',
    icon: Scale,
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Trademark Filing, Copyright, Provisional Patent, Objection Handling',
    keywords: ['trademark', 'copyright', 'patent', 'ip', 'brand', 'logo registration'],
    specialists: ['Neha Joshi (Certifications Specialist)', 'Vikram Singh (Operations Manager)'],
  },
];

// Helper to auto-categorize service into sector by keyword
function detectSector(serviceName = '') {
  const lower = serviceName.toLowerCase();
  for (const sector of EXPERTISE_SECTORS) {
    if (sector.keywords.some((kw) => lower.includes(kw))) {
      return sector;
    }
  }
  return EXPERTISE_SECTORS[3]; // Default to Incorporation & MCA
}

// Mock Team Members for Sectors (merged with actual DB users)
const MOCK_TEAM_SPECIALISTS = [
  {
    id: 'mock-amit-patel',
    fullName: 'Amit Patel (Financial & Pitch Specialist)',
    email: 'amit.patel@corporatemart.com',
    sectorId: 'PITCH_DECK',
    designation: 'Senior Financial Analyst',
  },
  {
    id: 'mock-rahul-nair',
    fullName: 'Rahul Nair (Tech Lead & Full Stack)',
    email: 'rahul.nair@corporatemart.com',
    sectorId: 'DEVELOPMENT',
    designation: 'Lead Solutions Architect',
  },
  {
    id: 'mock-priya-sharma',
    fullName: 'Priya Sharma (ROC & Incorporation Specialist)',
    email: 'priya.sharma@corporatemart.com',
    sectorId: 'INCORPORATION',
    designation: 'Company Law Executive',
  },
  {
    id: 'mock-siddharth-rawat',
    fullName: 'Siddharth Rawat (GeM & Tender Specialist)',
    email: 'siddharth.rawat@corporatemart.com',
    sectorId: 'GOVT_TENDERS',
    designation: 'Tender Consultant',
  },
];

// -----------------------------------------------------------------------------
// CATEGORIZED DOSSIER & PAYMENT TRANCHES VIEW COMPONENT
// -----------------------------------------------------------------------------
function DealDossierDocumentsView({ deal, isManager, onPreview, onDelete }) {
  if (!deal) return null;

  const totalAmount = Number(deal.totalAmount || 0);
  const amountReceived = Number(deal.amountReceived || 0);
  const pendingAmount = Math.max(0, totalAmount - amountReceived);

  const docs = deal.documents || [];
  const payments = deal.payments || [];

  // Group documents by category
  const paymentDocs = docs.filter((d) => d.documentType === 'PAYMENT_PROOF');
  const kycDocs = docs.filter(
    (d) =>
      d.documentType?.startsWith('KYC_') ||
      d.documentType === 'INCORPORATION_FORM' ||
      d.documentType === 'DIRECTOR_ID'
  );
  const legalDocs = docs.filter(
    (d) => d.documentType === 'LEGAL_AGREEMENT' || d.documentType === 'SERVICE_AGREEMENT'
  );
  const deliverableDocs = docs.filter(
    (d) =>
      d.documentType === 'FINAL_DELIVERABLE_CERTIFICATE' ||
      d.documentType === 'DELIVERABLE_CERTIFICATE' ||
      d.documentType === 'GOVT_FILING_CHALLAN' ||
      d.documentType === 'MCA_FORM'
  );
  const otherDocs = docs.filter(
    (d) =>
      d.documentType !== 'PAYMENT_PROOF' &&
      !d.documentType?.startsWith('KYC_') &&
      d.documentType !== 'INCORPORATION_FORM' &&
      d.documentType !== 'DIRECTOR_ID' &&
      d.documentType !== 'LEGAL_AGREEMENT' &&
      d.documentType !== 'SERVICE_AGREEMENT' &&
      d.documentType !== 'FINAL_DELIVERABLE_CERTIFICATE' &&
      d.documentType !== 'DELIVERABLE_CERTIFICATE' &&
      d.documentType !== 'GOVT_FILING_CHALLAN' &&
      d.documentType !== 'MCA_FORM'
  );

  const renderDocCard = (doc) => {
    const isPaymentProofVerified = (() => {
      if (doc.documentType !== 'PAYMENT_PROOF') return false;
      const verifiedPayments = payments.filter((p) => p.status === 'VERIFIED');
      if (verifiedPayments.length === 0) return false;
      if (payments.length > 0 && payments.every((p) => p.status === 'VERIFIED')) return true;
      const paymentProofDocs = docs.filter((d) => d.documentType === 'PAYMENT_PROOF');
      const docIdx = paymentProofDocs.findIndex((d) => d.id === doc.id);
      if (docIdx !== -1 && docIdx < verifiedPayments.length) return true;
      return verifiedPayments.some((p) => {
        if (p.paymentProofUrl && p.paymentProofUrl === doc.fileUrl) return true;
        if (p.transactionReference && doc.title && doc.title.toLowerCase().includes(p.transactionReference.toLowerCase())) return true;
        if (!doc.title) return false;
        const tLower = doc.title.toLowerCase();
        const trNum = String(p.trancheNumber || '');
        return (
          (trNum && (
            tLower.includes('tranche #' + trNum) ||
            tLower.includes('tranche ' + trNum) ||
            tLower.includes('tranche-' + trNum) ||
            tLower.includes('tranche_' + trNum) ||
            tLower.includes('tranche' + trNum) ||
            tLower.includes('#' + trNum)
          )) ||
          (p.trancheNumber === 1 && !tLower.includes('tranche'))
        );
      });
    })();
    const isDocVerified = Boolean(doc.isVerified || isPaymentProofVerified);

    return (
      <div
        key={doc.id}
        className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs transition shadow-2xs"
      >
        <div className="flex items-center space-x-2.5 truncate mr-2">
          <div className="p-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg shadow-2xs flex-shrink-0">
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="truncate">
            <div className="font-semibold text-slate-900 truncate" title={doc.title}>
              {doc.title}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.2 rounded font-sans font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {doc.documentType}
              </span>
              {doc.fileSize && <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>}
              {isDocVerified && (
                <span className="text-emerald-700 font-bold font-sans whitespace-nowrap flex items-center gap-0.5">
                  <Check className="w-3 h-3 text-emerald-600" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => onPreview(doc.id)}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-300 text-xs font-semibold flex items-center gap-1 transition shadow-xs cursor-pointer"
            title="Preview Document"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          {!isManager && (
            <button
              type="button"
              onClick={() => onDelete(doc.id, doc.title)}
              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
              title="Delete Document"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. PAYMENT TRANCHES & FINANCIAL SETTLEMENT */}
      <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3.5">
        {/* Financial Summary Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Payment Tranches & Settlement
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-medium text-slate-700 shadow-2xs">
              Total Deal: <strong className="text-slate-900 font-bold">₹{totalAmount.toLocaleString('en-IN')}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 font-medium text-emerald-800 shadow-2xs">
              Received: <strong className="font-bold">₹{amountReceived.toLocaleString('en-IN')}</strong>
            </span>
            <span
              className={`px-2.5 py-1 rounded-md border font-medium shadow-2xs ${pendingAmount > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
            >
              Pending: <strong className={pendingAmount > 0 ? 'text-amber-700' : 'text-slate-700'}>
                ₹{pendingAmount.toLocaleString('en-IN')}
              </strong>
            </span>
          </div>
        </div>

        {/* Tranche Cards */}
        <div className="space-y-2.5">
          {payments.length === 0 ? (
            <div className="p-4 bg-white border border-slate-200 rounded-lg text-center text-xs text-slate-500">
              No payment tranches recorded yet.
            </div>
          ) : (
            payments
              .slice()
              .sort((a, b) => (a.trancheNumber || 1) - (b.trancheNumber || 1))
              .map((p) => {
                const isVerified = p.status === 'VERIFIED';
                const isRejected = p.status === 'REJECTED';
                const matchingDoc = docs.find(
                  (d) =>
                    d.documentType === 'PAYMENT_PROOF' &&
                    ((p.paymentProofUrl && d.fileUrl === p.paymentProofUrl) ||
                      (p.transactionReference && d.title?.toLowerCase().includes(p.transactionReference.toLowerCase())) ||
                      (p.trancheNumber && d.title?.toLowerCase().includes('tranche #' + p.trancheNumber)) ||
                      (p.trancheNumber === 1 && !d.title?.toLowerCase().includes('tranche')))
                );

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-xl border transition ${isVerified
                        ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
                        : isRejected
                          ? 'bg-rose-50/60 border-rose-200'
                          : 'bg-amber-50/60 border-amber-200'
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            Tranche #{p.trancheNumber}: ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {p.paymentMode}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs ${isVerified
                                ? 'bg-emerald-700 text-white border-emerald-800'
                                : isRejected
                                  ? 'bg-rose-700 text-white border-rose-800'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                          >
                            {isVerified ? '✓ VERIFIED' : p.status ? p.status.replace(/_/g, ' ') : 'PENDING'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 font-mono mt-1 space-y-0.5">
                          <div>
                            {p.transactionReference && (
                              <span>Ref / UTR: <strong className="text-slate-800">{p.transactionReference}</strong> • </span>
                            )}
                            <span>Date: {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                            {p.accountName && (
                              <span className="ml-2 font-sans font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                                Bank: {p.accountName}
                              </span>
                            )}
                            {p.paymentMode === 'CASH' && p.cashCollectorName && (
                              <span className="ml-2 font-sans font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[11px] border border-amber-200">
                                Cash Collected By: {p.cashCollectorName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-auto">
                        {matchingDoc ? (
                          <button
                            type="button"
                            onClick={() => onPreview(matchingDoc.id)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-300 text-xs font-semibold flex items-center gap-1 transition shadow-xs cursor-pointer"
                            title="Preview Proof Slip"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                            <span>View Proof Slip</span>
                          </button>
                        ) : p.paymentProofUrl ? (
                          <span className="text-[11px] text-slate-400 italic">Proof on File</span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No slip attached</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
          )}

          {/* Pending Balance Tranche Notice */}
          {pendingAmount > 0 ? (
            <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div>
                  <span className="font-bold">Pending Balance Tranche: ₹{pendingAmount.toLocaleString('en-IN')}</span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Remaining balance to be collected and verified before final stage closure.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-amber-800 border border-amber-300">
                Pending
              </span>
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold">All payment tranches verified — Deal balance is fully cleared (₹0 pending).</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. KYC & CLIENT IDENTIFICATION */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> KYC & Identification Documents ({kycDocs.length})
          </h5>
          <span className="text-[10px] text-slate-500 font-medium">PAN, Aadhaar, DIN & Forms</span>
        </div>
        {kycDocs.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
            No KYC documents attached.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {kycDocs.map(renderDocCard)}
          </div>
        )}
      </div>

      {/* 3. LEGAL AGREEMENTS & MANDATES */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-sky-600" /> Legal Agreements & Mandates ({legalDocs.length})
          </h5>
          <span className="text-[10px] text-slate-500 font-medium">Service Agreements & POA</span>
        </div>
        {legalDocs.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
            No legal agreements attached.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {legalDocs.map(renderDocCard)}
          </div>
        )}
      </div>

      {/* 5. ADDITIONAL ATTACHMENTS (IF ANY) */}
      {otherDocs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-slate-500" /> Additional Attachments ({otherDocs.length})
            </h5>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {otherDocs.map(renderDocCard)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OperationsWorkbench({ currentUser, onRefreshParent, onOpenDossier }) {
  // Role Detection: Manager (Vikram Singh / Admin) vs Execution Specialist (Priya, Amit, Rahul, etc.)
  const isManager = Boolean(
    currentUser?.role === 'ADMIN' ||
    currentUser?.email === 'ops@corporatemart.com' ||
    (currentUser?.fullName || '').toLowerCase().includes('manager')
  );

  // Navigation Tabs:
  // Manager: 'allocation' | 'team' | 'dossier'
  // Specialist: 'my_tasks' (Unified Tasks & Dossier) | 'pool'
  const [activeTab, setActiveTab] = useState(isManager ? 'allocation' : 'my_tasks');

  useEffect(() => {
    if (isManager) {
      if (activeTab === 'my_tasks' || activeTab === 'pool') setActiveTab('allocation');
    } else {
      if (activeTab === 'allocation' || activeTab === 'team' || activeTab === 'dossier') setActiveTab('my_tasks');
    }
  }, [isManager, currentUser?.id, currentUser?.email]);

  const [deals, setDeals] = useState([]);
  const [opsTeam, setOpsTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [deliverableFile, setDeliverableFile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Specialist Unified Workspace & Files State
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [viewMode, setViewMode] = useState('workspace'); // 'workspace' | 'table'
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [uploadDocType, setUploadDocType] = useState('INCORPORATION_FORM');
  const [uploadDocTitle, setUploadDocTitle] = useState('');
  const [uploadDocFile, setUploadDocFile] = useState(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isEmailingCerts, setIsEmailingCerts] = useState(false);

  // Dynamic Deliverable Input Slots (default: 1 slot)
  const [deliverableSlots, setDeliverableSlots] = useState([
    { id: 1, file: null, title: '' },
  ]);

  // Staged Milestone Status Map (tracks milestone set to COMPLETED before deliverable upload & submission)
  const [milestoneStatusMap, setMilestoneStatusMap] = useState({});

  // Filters for Specialist & Manager
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ACTIVE');
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState('ALL');
  const [selectedUrgencyFilter, setSelectedUrgencyFilter] = useState('ALL'); // 'ALL' | 'OVERDUE' | 'DUE_48H' | 'THIS_WEEK'

  // Fetch Deals and Operations Users
  const fetchOpsData = async () => {
    try {
      setLoading(true);
      const [dealsRes, teamRes] = await Promise.all([
        api.get('/deals', { params: { roleFilter: 'OPERATIONS' } }),
        api.get('/users', { params: { role: 'OPERATIONS' } }),
      ]);

      const fetchedDeals = dealsRes.data.deals || [];
      const fetchedTeam = teamRes.data.users || [];

      setDeals(fetchedDeals);

      // Merge real users with mock specialist metadata
      const combinedTeam = fetchedTeam.map((u) => {
        const specMeta = MOCK_TEAM_SPECIALISTS.find((s) => s.email === u.email);
        return {
          ...u,
          sectorId: specMeta?.sectorId,
          designation: specMeta?.designation || (u.role === 'OPERATIONS' ? 'Operations Specialist' : u.role),
        };
      });

      // If any specialist is not yet returned in fetchedTeam, add as fallback
      MOCK_TEAM_SPECIALISTS.forEach((spec) => {
        if (!combinedTeam.some((u) => u.email === spec.email || u.id === spec.id)) {
          combinedTeam.push(spec);
        }
      });
      setOpsTeam(combinedTeam);

      if (fetchedDeals.length > 0) {
        if (selectedDeal) {
          const updated = fetchedDeals.find((d) => d.id === selectedDeal.id);
          setSelectedDeal(updated || fetchedDeals[0]);
        } else {
          setSelectedDeal(fetchedDeals[0]);
        }
      } else {
        setSelectedDeal(null);
      }
    } catch (err) {
      console.error('Failed to load operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpsData();

    const handleGlobalRefresh = () => {
      fetchOpsData();
    };
    window.addEventListener('app_refresh_all', handleGlobalRefresh);
    return () => {
      window.removeEventListener('app_refresh_all', handleGlobalRefresh);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // FLATTEN ALL SERVICES ACROSS ACTIVE DEALS FOR MANAGER ALLOCATION HUB
  // ---------------------------------------------------------------------------
  const allServices = useMemo(() => {
    const list = [];
    deals.forEach((d) => {
      (d.services || []).forEach((s) => {
        const sector = detectSector(s.serviceName);
        const targetDate = s.targetCompletionDate ? new Date(s.targetCompletionDate) : null;
        const now = new Date();
        const isOverdue = targetDate && targetDate < now && s.status !== 'COMPLETED';
        const diffMs = targetDate ? targetDate - now : null;
        const daysLeft = diffMs !== null ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : null;

        let deadlineStatus = 'No Deadline';
        if (isOverdue) deadlineStatus = `Overdue by ${Math.abs(daysLeft)}d`;
        else if (daysLeft === 0) deadlineStatus = 'Due Today';
        else if (daysLeft === 1) deadlineStatus = 'Due Tomorrow';
        else if (daysLeft > 1) deadlineStatus = `${daysLeft} days left`;

        list.push({
          ...s,
          dealId: d.id,
          dealCode: d.dealCode,
          dealStage: d.stage,
          companyName: d.client?.companyName || 'N/A',
          clientName: d.client?.clientName || 'N/A',
          clientPhone: d.client?.phone || 'N/A',
          sectorId: sector.id,
          sectorName: sector.name,
          sectorBadge: sector.badgeColor,
          isOverdue,
          daysLeft,
          deadlineStatus,
          deal: d,
        });
      });
    });
    return list;
  }, [deals]);

  // Detect specialist's core sector
  const specialistSector = useMemo(() => {
    if (isManager) return null;
    const name = currentUser?.fullName || '';
    const email = currentUser?.email || '';
    for (const sector of EXPERTISE_SECTORS) {
      if (
        sector.specialists.some(
          (s) =>
            name.toLowerCase().includes(s.toLowerCase().split(' ')[0]) ||
            email.toLowerCase().includes(s.toLowerCase().split(' ')[0])
        )
      ) {
        return sector;
      }
    }
    return EXPERTISE_SECTORS[3]; // Default to Incorporation
  }, [currentUser, isManager]);

  // Specialist's personal assigned services
  const myServices = useMemo(() => {
    return allServices.filter(
      (s) =>
        s.assignedOpsUserId === currentUser?.id ||
        (currentUser?.email && s.assignedOpsUser?.email === currentUser?.email)
    );
  }, [allServices, currentUser]);

  // Unassigned General Pool
  // Deals assigned specifically to the logged-in Operations Manager
  const managerDossierDeals = useMemo(() => {
    return deals.filter((d) => {
      const isDealAssigned =
        (currentUser?.id && d.assignedOpsUserId === currentUser.id) ||
        (currentUser?.email && d.assignedOpsUser?.email === currentUser.email);
      const hasAssignedService = (d.services || []).some(
        (s) =>
          (currentUser?.id && s.assignedOpsUserId === currentUser.id) ||
          (currentUser?.email && s.assignedOpsUser?.email === currentUser.email)
      );
      return isDealAssigned || hasAssignedService;
    });
  }, [deals, currentUser?.id, currentUser?.email]);

  const activeDossierDeal = useMemo(() => {
    if (!selectedDeal) return managerDossierDeals[0] || null;
    return managerDossierDeals.find((d) => d.id === selectedDeal.id) || managerDossierDeals[0] || null;
  }, [selectedDeal, managerDossierDeals]);

  const poolServices = useMemo(() => {
    return allServices.filter((s) => !s.assignedOpsUserId);
  }, [allServices]);

  // Filtered Services for Specialist Personal View
  const filteredMyServices = useMemo(() => {
    return myServices.filter((s) => {
      const statusUpper = (s.status || '').toUpperCase();

      // Only status === 'COMPLETED' is completed and cleared.
      // APPROVED is authority approved but not completed, so it remains active.
      if (selectedStatusFilter === 'ACTIVE') {
        if (statusUpper === 'COMPLETED') return false;
      } else if (selectedStatusFilter === 'COMPLETED') {
        if (statusUpper !== 'COMPLETED') return false;
      } else if (selectedStatusFilter === 'NOT_STARTED') {
        if (statusUpper !== 'PENDING' && statusUpper !== 'ASSIGNED' && statusUpper !== 'NOT_STARTED') return false;
      } else if (selectedStatusFilter !== 'ALL' && statusUpper !== selectedStatusFilter.toUpperCase()) {
        return false;
      }

      if (selectedUrgencyFilter === 'OVERDUE' && !s.isOverdue) return false;
      if (selectedUrgencyFilter === 'DUE_48H') {
        if (s.daysLeft === null || s.daysLeft < 0 || s.daysLeft > 2) return false;
      }
      if (selectedUrgencyFilter === 'THIS_WEEK') {
        if (s.daysLeft === null || s.daysLeft < 0 || s.daysLeft > 7) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (s.dealCode || '').toLowerCase().includes(q);
        const matchCompany = (s.companyName || '').toLowerCase().includes(q);
        const matchService = (s.serviceName || '').toLowerCase().includes(q);
        const matchSRN = (s.govApplicationNumber || '').toLowerCase().includes(q);
        if (!matchCode && !matchCompany && !matchService && !matchSRN) {
          return false;
        }
      }

      return true;
    });
  }, [myServices, selectedStatusFilter, selectedUrgencyFilter, searchQuery]);

  // Active Selected Task & Deal for the Unified Section
  const activeTask = useMemo(() => {
    if (filteredMyServices.length === 0) return null;
    if (selectedTaskId) {
      const found = filteredMyServices.find((s) => s.id === selectedTaskId);
      if (found) return found;
    }
    return filteredMyServices[0];
  }, [filteredMyServices, selectedTaskId]);

  const activeDeal = useMemo(() => {
    if (activeTask?.dealId) {
      return deals.find((d) => d.id === activeTask.dealId) || activeTask.deal || null;
    }
    return selectedDeal || deals[0] || null;
  }, [activeTask, deals, selectedDeal]);

  // Active Desk Service Milestone & Lock State
  const isServiceLocked = activeTask?.status === 'COMPLETED';
  const currentMilestone = activeTask
    ? milestoneStatusMap[activeTask.id] || activeTask.status || 'PENDING'
    : 'PENDING';
  const isMilestoneSetToComplete = currentMilestone === 'COMPLETED';

  // Filtered Services for Manager View
  const filteredServices = useMemo(() => {
    return allServices.filter((s) => {
      if (selectedSectorFilter !== 'ALL' && s.sectorId !== selectedSectorFilter) return false;

      // Status Filter: ACTIVE by default removes completed services from active allocation table
      const statusUpper = (s.status || '').toUpperCase();
      if (selectedStatusFilter === 'ACTIVE') {
        if (statusUpper === 'COMPLETED') return false;
      } else if (selectedStatusFilter === 'COMPLETED') {
        if (statusUpper !== 'COMPLETED') return false;
      } else if (selectedStatusFilter === 'NOT_STARTED') {
        if (statusUpper !== 'PENDING' && statusUpper !== 'ASSIGNED' && statusUpper !== 'NOT_STARTED') return false;
      } else if (selectedStatusFilter !== 'ALL' && statusUpper !== selectedStatusFilter.toUpperCase()) {
        return false;
      }

      // Assignee Filter
      if (selectedAssigneeFilter === 'UNASSIGNED') {
        if (s.assignedOpsUserId) return false;
      } else if (selectedAssigneeFilter === 'MY_TASKS') {
        if (s.assignedOpsUserId !== currentUser?.id) return false;
      } else if (selectedAssigneeFilter !== 'ALL') {
        if (s.assignedOpsUserId !== selectedAssigneeFilter) return false;
      }

      // Urgency Filter
      if (selectedUrgencyFilter === 'OVERDUE' && !s.isOverdue) return false;
      if (selectedUrgencyFilter === 'DUE_48H') {
        if (s.daysLeft === null || s.daysLeft < 0 || s.daysLeft > 2) return false;
      }
      if (selectedUrgencyFilter === 'THIS_WEEK') {
        if (s.daysLeft === null || s.daysLeft < 0 || s.daysLeft > 7) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (s.dealCode || '').toLowerCase().includes(q);
        const matchCompany = (s.companyName || '').toLowerCase().includes(q);
        const matchService = (s.serviceName || '').toLowerCase().includes(q);
        const matchSRN = (s.govApplicationNumber || '').toLowerCase().includes(q);
        const matchAssignee = (s.assignedOpsUser?.fullName || '').toLowerCase().includes(q);
        if (!matchCode && !matchCompany && !matchService && !matchSRN && !matchAssignee) {
          return false;
        }
      }

      return true;
    });
  }, [allServices, selectedSectorFilter, selectedStatusFilter, selectedAssigneeFilter, selectedUrgencyFilter, searchQuery, currentUser]);

  // ---------------------------------------------------------------------------
  // TEAM CAPACITY & WORKLOAD METRICS
  // ---------------------------------------------------------------------------
  const teamWorkload = useMemo(() => {
    return opsTeam.map((member) => {
      const assigned = allServices.filter(
        (s) => s.assignedOpsUserId === member.id || (member.email && s.assignedOpsUser?.email === member.email)
      );
      const inProgress = assigned.filter((s) => ['IN_PROGRESS', 'GOVT_SUBMITTED', 'QUERY_RAISED', 'APPROVED'].includes(s.status));
      const completed = assigned.filter((s) => s.status === 'COMPLETED');
      const overdue = assigned.filter((s) => s.isOverdue);
      const completionRate = assigned.length > 0 ? Math.round((completed.length / assigned.length) * 100) : 0;

      // Find matching sector for this member
      const matchingSector = EXPERTISE_SECTORS.find((sec) =>
        sec.specialists.some((name) => member.fullName.includes(name.split(' ')[0]))
      ) || EXPERTISE_SECTORS[0];

      return {
        ...member,
        sectorName: matchingSector.name,
        badgeColor: matchingSector.badgeColor,
        totalAssigned: assigned.length,
        inProgress: inProgress.length,
        completed: completed.length,
        overdue: overdue.length,
        completionRate,
        tasks: assigned,
      };
    });
  }, [opsTeam, allServices]);

  // ---------------------------------------------------------------------------
  // SERVICE & MILESTONE UPDATE HANDLERS
  // ---------------------------------------------------------------------------
  const handleUpdateService = async (dealId, serviceId, updates) => {
    try {
      const svc = allServices.find((s) => s.id === serviceId);

      // Requirement 3: Once a service is completed, it cannot be changed or edited again
      if (svc?.status === 'COMPLETED') {
        toast.warning(
          'This service has already been completed and is permanently locked. It cannot be edited or modified again.',
          'Service Locked'
        );
        setFeedback({
          type: 'warning',
          message: 'This service has already been completed and is locked. Completed services cannot be edited.',
        });
        return;
      }

      // Requirements 1 & 2: When marking a service as COMPLETED
      if (updates.status === 'COMPLETED') {
        const deal = activeDeal || selectedDeal || (deals || []).find((d) => d.id === dealId);
        const total = Math.round(Number(deal?.totalAmount || 0));
        const received = Math.round(Number(deal?.amountReceived || 0));
        const pending = Math.max(0, Math.round(Number(deal?.pendingAmount || (total - received))));
        const hasUnverified = (deal?.payments || []).some((p) => p.status !== 'VERIFIED');

        // Requirement 1: If payment is pending, service cannot complete
        if (pending > 0 || hasUnverified || (deal && !deal.isAccountsVerified)) {
          toast.error(
            `Service cannot be completed because payment is pending (Pending Balance: ₹${pending.toLocaleString('en-IN')}). All payment tranches must be verified and cleared first.`,
            'Payment Pending'
          );
          setFeedback({
            type: 'error',
            message: `Service cannot be completed because payment is pending (Pending Balance: ₹${pending.toLocaleString('en-IN')}). All payment tranches must be verified and cleared first.`,
          });
          return;
        }

        // Requirement 2: If deliverable not submitted, service cannot complete
        const docs = deal?.documents || [];
        const hasDeliverable = docs.some(
          (d) =>
            d.documentType === 'FINAL_DELIVERABLE_CERTIFICATE' ||
            d.documentType === 'DELIVERABLE_CERTIFICATE' ||
            d.title?.toLowerCase().includes('deliverable') ||
            d.title?.toLowerCase().includes('certificate')
        );

        if (!hasDeliverable) {
          toast.error(
            'Service cannot be completed because no deliverable certificate has been submitted yet. Please upload and submit the deliverable certificate first.',
            'Deliverable Required'
          );
          setFeedback({
            type: 'error',
            message: 'Service cannot be completed because no deliverable certificate has been submitted yet. Please upload and submit the filing deliverable certificate first.',
          });
          return;
        }
      }

      setActionLoading(true);
      await api.patch(`/deals/${dealId}/services/${serviceId}`, updates);
      if (updates.status === 'COMPLETED') {
        toast.success('Service marked as COMPLETED and locked! All filings and deliverables finalized.', 'Service Completed');
        setFeedback({
          type: 'success',
          message: 'Service marked as COMPLETED and locked! All filings and deliverables are finalized.',
        });
      } else {
        setFeedback({ type: 'success', message: 'Service task updated successfully.' });
      }
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to update service.';
      toast.error(errMsg, 'Update Failed');
      setFeedback({ type: 'error', message: errMsg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelfAssignService = async (dealId, serviceId) => {
    if (!currentUser?.id) return;
    await handleUpdateService(dealId, serviceId, {
      assignedOpsUserId: currentUser.id,
      status: 'IN_PROGRESS',
    });
    setFeedback({ type: 'success', message: 'Service task assigned to you.' });
  };

  const handleAssignDealLead = async (targetUserId) => {
    if (!selectedDeal) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/deals/${selectedDeal.id}/assign`, {
        department: 'OPERATIONS',
        userId: targetUserId || null,
      });
      setFeedback({ type: 'success', message: res.data.message });
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Assignment failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteService = async (dealTarget) => {
    const target = dealTarget || selectedDeal;
    if (!target) return;

    // A deal is not self-completable: all individual services must be completed first
    const incompleteServices = (target.services || []).filter((s) => s.status !== 'COMPLETED');
    if (incompleteServices.length > 0) {
      setFeedback({
        type: 'error',
        message: `Cannot complete deal. All ${target.services?.length || 0} services must be completed by operations first (${incompleteServices.length} still in progress).`,
      });
      return;
    }

    try {
      setActionLoading(true);
      setFeedback(null);

      if (deliverableFile) {
        const formData = new FormData();
        formData.append('dealId', target.id);
        formData.append('documentType', 'FINAL_DELIVERABLE_CERTIFICATE');
        formData.append('title', `Final Deliverable Certificate - ${deliverableFile.name}`);
        formData.append('file', deliverableFile);
        await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await api.post(`/deals/${target.id}/service-complete`, {
        outcomeNotes: 'All filings completed, government certificates generated and verified.',
      });

      setFeedback({ type: 'success', message: `Deal ${target.dealCode} marked as Service Completed (Stage 07)!` });
      setDeliverableFile(null);
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to complete service.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmailCertificatesToClient = async (dealTarget) => {
    const target = dealTarget || selectedDeal;
    if (!target || !target.client?.email) {
      setFeedback({ type: 'warning', message: 'No client email address configured for this deal.' });
      return;
    }
    try {
      setIsEmailingCerts(true);
      setFeedback(null);
      const svcNames = (target.services || []).map((s) => s.serviceName).filter(Boolean).join(', ') || 'Service';
      await api.post(`/deals/${target.id}/send-email-update`, {
        event: 'OPERATIONS_FINAL_DELIVERABLE',
        serviceName: svcNames,
        subject: `Final Deliverable Certificate(s): ${svcNames} - Deal #${target.dealCode} | Corporate Mart`,
        message: `We are pleased to deliver your official service certificate(s) and completion documents for ${target.client?.companyName || 'your company'}. Please find the official files attached to this notification for your compliance and regulatory records.`,
        stepCompleted: `Completed: ${svcNames}`,
        attachCertificates: true,
        hideNote: true,
      });
      setFeedback({
        type: 'success',
        message: `Service certificate email dispatched with attachment to ${target.client.email}!`,
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to dispatch email with certificates.' });
    } finally {
      setIsEmailingCerts(false);
    }
  };

  const handleDeliverToClient = async (dealTarget) => {
    const target = dealTarget || selectedDeal;
    if (!target) return;
    try {
      setActionLoading(true);
      setFeedback(null);

      await api.post(`/deals/${target.id}/final-delivery`, {
        deliveryProof: 'Delivered via Email Portal & WhatsApp Notification',
      });

      setFeedback({ type: 'success', message: `Deliverables released to client (Stage 08)! Ready for RM Handover.` });
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Delivery dispatch failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // DELIVERABLE SLOTS & MULTI-DELIVERABLE HANDLERS
  // ---------------------------------------------------------------------------
  const handleMilestoneStatusChange = async (dealId, serviceId, newStatus) => {
    const svc = allServices.find((s) => s.id === serviceId);
    if (svc?.status === 'COMPLETED') {
      toast.warning(
        'This service has already been completed and is permanently locked. It cannot be edited or modified again.',
        'Service Locked'
      );
      setFeedback({
        type: 'warning',
        message: 'This service has already been completed and is locked. Completed services cannot be edited.',
      });
      return;
    }

    if (newStatus === 'COMPLETED') {
      const deal = (deals || []).find((d) => d.id === dealId) || activeDeal;
      const total = Math.round(Number(deal?.totalAmount || 0));
      const received = Math.round(Number(deal?.amountReceived || 0));
      const pending = Math.max(0, Math.round(Number(deal?.pendingAmount ?? (total - received))));
      const hasUnverified = (deal?.payments || []).some((p) => p.status !== 'VERIFIED');

      // Requirement 1: If payment is pending, service cannot complete
      if (pending > 0 || hasUnverified || (deal && !deal.isAccountsVerified)) {
        toast.error(
          `Service cannot be marked as COMPLETED because payment is pending (Pending Balance: ₹${pending.toLocaleString('en-IN')}). All payment tranches must be verified and cleared by Accounts first.`,
          'Payment Pending'
        );
        setFeedback({
          type: 'error',
          message: `Service milestone cannot be set to COMPLETED because payment is pending (Pending Balance: ₹${pending.toLocaleString('en-IN')}). Clear with Accounts first.`,
        });
        return;
      }

      // Unlock deliverable submission gate
      setMilestoneStatusMap((prev) => ({ ...prev, [serviceId]: 'COMPLETED' }));
      toast.info(
        'Milestone status set to COMPLETED! Deliverable upload section is now unlocked below. Please attach the deliverable certificate(s) and click "Upload & Submit Deliverable(s)" to finalize.',
        'Deliverables Unlocked'
      );
      setFeedback({
        type: 'success',
        message: 'Milestone set to COMPLETED. Deliverables upload is now open. Attach certificate(s) below and click "Upload & Submit Deliverable(s)" to finalize.',
      });
    } else {
      // Revert or switch to another in-progress milestone
      setMilestoneStatusMap((prev) => {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      });
      await handleUpdateService(dealId, serviceId, { status: newStatus });
    }
  };

  const handleAddDeliverableSlot = () => {
    if (activeTask?.status === 'COMPLETED') {
      toast.warning('This service has already been completed and is locked. No further deliverables can be added.', 'Service Locked');
      return;
    }
    setDeliverableSlots((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), file: null, title: '' },
    ]);
  };

  const handleRemoveDeliverableSlot = (id) => {
    setDeliverableSlots((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((slot) => slot.id !== id);
    });
  };

  const handleUpdateDeliverableSlot = (id, field, value) => {
    setDeliverableSlots((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot))
    );
  };

  const handleSubmitAllDeliverables = async (dealId, serviceId) => {
    if (!dealId || !serviceId) return;

    const svc = allServices.find((s) => s.id === serviceId);

    // Requirement 3: Once a service is completed, it cannot be changed or edited
    if (svc?.status === 'COMPLETED') {
      toast.warning(
        'This service has already been completed and is locked. Deliverables cannot be modified or re-submitted.',
        'Service Locked'
      );
      setFeedback({
        type: 'error',
        message: 'This service has already been completed and is locked. Deliverables cannot be modified.',
      });
      return;
    }

    const currentMilestone = milestoneStatusMap[serviceId] || svc?.status;
    if (currentMilestone !== 'COMPLETED') {
      toast.error(
        'Milestone status must be set to COMPLETED before submitting deliverables.',
        'Milestone Incomplete'
      );
      return;
    }

    const filesToUpload = deliverableSlots.filter((slot) => Boolean(slot.file));
    if (filesToUpload.length === 0) {
      toast.warning('Please select at least one deliverable file to submit.', 'No Files Selected');
      setFeedback({
        type: 'error',
        message: 'Please choose at least one deliverable file before submitting.',
      });
      return;
    }

    try {
      setIsUploadingDoc(true);
      setFeedback(null);

      // 1. Upload all deliverable files
      for (const slot of filesToUpload) {
        const formData = new FormData();
        formData.append('dealId', dealId);
        formData.append('documentType', 'FINAL_DELIVERABLE_CERTIFICATE');
        formData.append(
          'title',
          slot.title?.trim() || `Deliverable Certificate - ${slot.file.name}`
        );
        formData.append('file', slot.file);

        await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 2. Mark service as officially COMPLETED in the backend
      await api.patch(`/deals/${dealId}/services/${serviceId}`, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      });

      // Clear staged milestone
      setMilestoneStatusMap((prev) => {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      });

      // 3. Automatically dispatch deliverable certificate email to client
      try {
        const targetDeal = (deals || []).find((d) => d.id === dealId) || activeDeal;
        const clientEmail = targetDeal?.client?.email;
        if (clientEmail) {
          const currentServiceName = svc?.serviceName || 'Service';
          await api.post(`/deals/${dealId}/send-email-update`, {
            event: 'OPERATIONS_FINAL_DELIVERABLE',
            serviceName: currentServiceName,
            subject: `Final Deliverable Certificate(s): ${currentServiceName} - Deal #${targetDeal?.dealCode || dealId} | Corporate Mart`,
            message: `We are pleased to inform you that your filing for "${currentServiceName}" has been completed, and the official deliverable certificate(s) have been generated. Please find the official deliverable document(s) attached to this email.`,
            stepCompleted: `Completed: ${currentServiceName}`,
            attachCertificates: true,
            hideNote: true,
          });
          toast.success(`Deliverable document(s) sent via email to ${clientEmail}!`, 'Email Sent');
        }
      } catch (emailErr) {
        console.warn('Auto deliverable email send error:', emailErr);
      }

      toast.success(
        `Successfully submitted ${filesToUpload.length} deliverable certificate(s) and completed service! Moved to Complete section.`,
        'Service Completed'
      );
      setFeedback({
        type: 'success',
        message: `Successfully uploaded ${filesToUpload.length} deliverable certificate(s) and marked service as COMPLETED! Moved to Complete section.`,
      });

      // Reset to 1 default empty deliverable slot
      setDeliverableSlots([{ id: Date.now(), file: null, title: '' }]);
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();

      // Automatically transition to the Complete section and select this completed filing
      setSelectedStatusFilter('COMPLETED');
      setSelectedTaskId(serviceId);
    } catch (err) {
      console.error('Submit deliverables error:', err);
      toast.error(err.response?.data?.error || 'Failed to submit deliverables.', 'Upload Error');
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to submit deliverables.',
      });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // ---------------------------------------------------------------------------
  // DOCUMENT VAULT & FILE ATTACHMENT HANDLERS
  // ---------------------------------------------------------------------------
  const handleDirectDeliverableUpload = async (dealId, fileOverride = null) => {
    const fileToUpload = fileOverride || deliverableFile;
    if (!dealId || !fileToUpload) return;
    try {
      setIsUploadingDoc(true);
      setFeedback(null);
      const formData = new FormData();
      formData.append('dealId', dealId);
      formData.append('documentType', 'FINAL_DELIVERABLE_CERTIFICATE');
      formData.append('title', `Final Deliverable Certificate - ${fileToUpload.name}`);
      formData.append('file', fileToUpload);
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFeedback({ type: 'success', message: `Deliverable certificate "${fileToUpload.name}" attached successfully!` });
      setDeliverableFile(null);
      const fileInput = document.getElementById('deliverable-file-input');
      if (fileInput) fileInput.value = '';
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to upload certificate.' });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleUploadDocument = async (dealId) => {
    if (!dealId) {
      setFeedback({ type: 'error', message: 'No active deal selected to attach document.' });
      return;
    }
    if (!uploadDocFile) {
      setFeedback({ type: 'error', message: 'Please select a file to attach.' });
      return;
    }

    try {
      setIsUploadingDoc(true);
      setFeedback(null);
      const formData = new FormData();
      formData.append('dealId', dealId);
      formData.append('documentType', uploadDocType || 'OTHER');
      formData.append('title', uploadDocTitle.trim() || uploadDocFile.name);
      formData.append('file', uploadDocFile);

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFeedback({ type: 'success', message: `File "${uploadDocFile.name}" attached successfully to deal dossier!` });
      setUploadDocFile(null);
      setUploadDocTitle('');
      const fileInput = document.getElementById('ops-doc-file-input');
      if (fileInput) fileInput.value = '';

      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to attach document.' });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handlePreviewDocument = async (docId) => {
    try {
      const res = await api.get(`/documents/${docId}/signed-url`);
      setPreviewDoc(res.data);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to generate document preview link.' });
    }
  };

  const handleDeleteDocument = async (docId, docTitle) => {
    if (!window.confirm(`Are you sure you want to remove document "${docTitle}" from the deal dossier?`)) return;
    try {
      setActionLoading(true);
      await api.delete(`/documents/${docId}`);
      setFeedback({ type: 'success', message: 'Document removed from deal dossier.' });
      await fetchOpsData();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to delete document.' });
    } finally {
      setActionLoading(false);
    }
  };

  const hasDeliverable = selectedDeal?.documents?.some((d) => d.documentType === 'FINAL_DELIVERABLE_CERTIFICATE');
  const isPartPaymentPending = selectedDeal && Number(selectedDeal.pendingAmount) > 0;

  // Unassigned tasks count
  const unassignedCount = allServices.filter((s) => !s.assignedOpsUserId).length;
  const overdueCount = allServices.filter((s) => s.isOverdue).length;

  return (
    <div className="space-y-5">
      {/* 1. TOP HEADER & WORKBENCH VIEW SWITCHER */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className={`p-2 rounded-xl text-white shadow-xs ${isManager ? 'bg-slate-900' : 'bg-emerald-600'}`}>
              {isManager ? <Cog className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {isManager ? 'Operations Command & Allocation Suite' : `Specialist Execution Desk — ${currentUser?.fullName || 'Filing Portal'}`}
                </h2>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${isManager
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                >
                  {isManager ? 'Manager Portal' : specialistSector?.name || 'Specialist Desk'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isManager
                  ? 'Allocate multi-deal services by team expertise, manage deadlines, self-execute filings, and export reports'
                  : `Focused compliance workspace for ${currentUser?.fullName}. Manage your assigned filings, update milestone SRN numbers, and claim pool tasks.`}
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-stretch md:self-auto justify-center">
          {isManager ? (
            <>
              <button
                onClick={() => setActiveTab('allocation')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${activeTab === 'allocation'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                <span>Service Allocation Hub</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-50 text-indigo-700">
                  {allServices.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('team')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${activeTab === 'team'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Team & Expertise Capacity</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-50 text-emerald-700">
                  {teamWorkload.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('dossier')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${activeTab === 'dossier'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-cyan-600" />
                <span>Deal Dossier & Dispatch</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-cyan-50 text-cyan-700">
                  {managerDossierDeals.length}
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('my_tasks')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${activeTab === 'my_tasks'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                <span>My Assigned Tasks & Deal Dossier</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-50 text-emerald-700">
                  {myServices.filter((s) => s.status !== 'COMPLETED').length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('pool')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${activeTab === 'pool'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>General Task Pool</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-50 text-amber-700">
                  {poolServices.length}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between border ${feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}

      {/* ----------------------------------------------------------------------- */}
      {/* TAB: SPECIALIST MY ASSIGNED TASKS */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'my_tasks' && (
        <div className="space-y-4">
          {/* Top Specialist Personal Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div
              onClick={() => setSelectedStatusFilter('ACTIVE')}
              className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition ${selectedStatusFilter === 'ACTIVE'
                  ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                My Active Filings
              </span>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                {myServices.filter((s) => s.status !== 'COMPLETED').length}{' '}
                <span className="text-xs font-normal text-slate-500">pending tasks</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Value: ₹{myServices.filter((s) => s.status !== 'COMPLETED').reduce((sum, s) => sum + Number(s.serviceFee || 0), 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div
              onClick={() => setSelectedStatusFilter('IN_PROGRESS')}
              className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition ${selectedStatusFilter === 'IN_PROGRESS'
                  ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                In Progress / Submitted
              </span>
              <div className="text-xl font-extrabold text-blue-600 mt-0.5">
                {myServices.filter((s) => ['IN_PROGRESS', 'GOVT_SUBMITTED', 'QUERY_RAISED', 'APPROVED'].includes(s.status)).length}
              </div>
              <div className="text-[11px] text-blue-700/80 mt-1">
                Under active compliance
              </div>
            </div>

            <div
              onClick={() => setSelectedUrgencyFilter(selectedUrgencyFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
              className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition ${selectedUrgencyFilter === 'OVERDUE'
                  ? 'bg-rose-50/50 border-rose-500 ring-1 ring-rose-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                Overdue / Urgent
              </span>
              <div className="text-xl font-extrabold text-rose-600 mt-0.5">
                {myServices.filter((s) => s.isOverdue && s.status !== 'COMPLETED').length}
              </div>
              <div className="text-[11px] text-rose-700/80 mt-1">
                Immediate Action Required
              </div>
            </div>

            <div
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED')}
              className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition ${selectedStatusFilter === 'COMPLETED'
                  ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Completed & Cleared
              </span>
              <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
                {myServices.filter((s) => s.status === 'COMPLETED').length}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-1">
                Removed from workspace
              </div>
            </div>
          </div>

          {/* Unified Controls: Search, Filters & View Mode Switcher */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search assigned tasks by deal code, company, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-between sm:justify-end">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
              >
                <option value="ACTIVE">Active Tasks (In Workspace)</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="GOVT_SUBMITTED">Govt / MCA Submitted</option>
                <option value="QUERY_RAISED">Query Raised</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="COMPLETED">Completed History</option>
                <option value="ALL">All Statuses</option>
              </select>

              <select
                value={selectedUrgencyFilter}
                onChange={(e) => setSelectedUrgencyFilter(e.target.value)}
                className="h-9 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
              >
                <option value="ALL">All Deadlines</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="DUE_48H">Due Next 48 Hours</option>
                <option value="THIS_WEEK">Due This Week</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('workspace')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${viewMode === 'workspace'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                  title="Workspace View"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Workspace View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${viewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Table View</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: UNIFIED WORKSPACE (SPLIT DESK) */}
          {viewMode === 'workspace' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
              {/* LEFT COLUMN: Assigned Task Queue (4 cols) */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-xs">
                <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                      My Assigned Tasks ({filteredMyServices.length})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Select a filing to manage dossier, documents, & status
                    </span>
                  </div>
                  <button
                    onClick={fetchOpsData}
                    className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-slate-200/60 transition"
                    title="Refresh tasks"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5 max-h-[750px]">
                  {filteredMyServices.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      No assigned filings found matching filters. Pick up tasks from the General Task Pool!
                    </div>
                  ) : (
                    filteredMyServices.map((svc) => {
                      const isSelected = activeTask?.id === svc.id;
                      const svcDeal = svc.deal || deals.find((d) => d.id === svc.dealId);
                      const docCount = svcDeal?.documents?.length || 0;

                      return (
                        <div
                          key={svc.id}
                          onClick={() => setSelectedTaskId(svc.id)}
                          className={`p-3 rounded-xl cursor-pointer transition border text-left ${isSelected
                              ? 'bg-slate-50 border-slate-900 shadow-xs ring-1 ring-slate-900/20'
                              : 'bg-white border-slate-200/70 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {svc.dealCode}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${svc.status === 'COMPLETED' || svc.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : svc.status === 'GOVT_SUBMITTED'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : svc.status === 'QUERY_RAISED'
                                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                                      : svc.status === 'IN_PROGRESS'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                            >
                              {svc.status?.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="font-bold text-slate-900 text-xs mt-1.5 truncate">
                            {svc.companyName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {svc.clientName} ({svc.clientPhone})
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                              {svc.serviceName}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold text-[10px] border ${svc.isOverdue
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : svc.daysLeft !== null && svc.daysLeft <= 2
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                            >
                              {svc.deadlineStatus}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-mono">SRN: {svc.govApplicationNumber || 'Pending'}</span>
                            <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                              <Paperclip className="w-3 h-3 text-slate-400" /> {docCount} {docCount === 1 ? 'file' : 'files'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Unified Deal Dossier, Files, & Task Status Controls (8 cols) */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-xs">
                {activeTask && activeDeal ? (
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* WORKSPACE HEADER */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-slate-200 gap-3">
                      <div>
                        <div className="flex items-center space-x-2.5">
                          <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                            {activeDeal.dealCode}
                          </span>
                          <h3 className="text-base font-bold text-slate-900">{activeDeal.client?.companyName || activeTask.companyName}</h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${activeTask.sectorBadge}`}>
                            {activeTask.sectorName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Client: <strong className="text-slate-800">{activeDeal.client?.clientName}</strong> ({activeDeal.client?.phone}) • Email: <span className="font-mono">{activeDeal.client?.email || 'N/A'}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => onOpenDossier(activeDeal.id)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 flex items-center gap-1.5 transition shadow-xs whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Full Modal Dossier
                      </button>
                    </div>

                    {/* 1. MY ASSIGNED TASK STATUS & FILING MILESTONE CONTROLS */}
                    <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{activeTask.serviceName}</h4>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${activeTask.sectorBadge}`}>
                              My Assigned Filing
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Service Fee: <strong className="text-slate-800">₹{Number(activeTask.serviceFee || 0).toLocaleString('en-IN')}</strong>{' '}
                            {activeTask.govtFee && `• Govt Challan Fee: ₹${Number(activeTask.govtFee).toLocaleString('en-IN')}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {activeTask.status === 'COMPLETED' && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                            </span>
                          )}
                        </div>
                      </div>

                      {(() => {
                        const totalDealAmt = Math.round(Number(activeDeal.totalAmount || 0));
                        const receivedDealAmt = Math.round(Number(activeDeal.amountReceived || 0));
                        const pendingDealAmt = Math.max(0, Math.round(Number(activeDeal.pendingAmount ?? (totalDealAmt - receivedDealAmt))));
                        const hasUnverifiedPymts = (activeDeal.payments || []).some((p) => p.status !== 'VERIFIED');
                        const isPaymentPending = pendingDealAmt > 0 || hasUnverifiedPymts || !activeDeal.isAccountsVerified;
                        const activeDealDocs = activeDeal.documents || [];
                        const hasDeliverableUploaded = activeDealDocs.some(
                          (d) =>
                            d.documentType === 'FINAL_DELIVERABLE_CERTIFICATE' ||
                            d.documentType === 'DELIVERABLE_CERTIFICATE' ||
                            (d.title && d.title.toLowerCase().includes('deliverable')) ||
                            (d.title && d.title.toLowerCase().includes('certificate'))
                        );

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-xs">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-slate-700 font-semibold block">
                                  Update Milestone Status
                                </label>
                                {isServiceLocked ? (
                                  <span className="text-[10px] text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" /> Locked
                                  </span>
                                ) : isMilestoneSetToComplete ? (
                                  <span className="text-[10px] text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Ready for Deliverables
                                  </span>
                                ) : null}
                              </div>
                              <select
                                value={currentMilestone}
                                onChange={(e) =>
                                  handleMilestoneStatusChange(activeTask.dealId, activeTask.id, e.target.value)
                                }
                                disabled={actionLoading || isServiceLocked}
                                className={`w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border focus:outline-none ${isServiceLocked
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 cursor-not-allowed opacity-90'
                                    : currentMilestone === 'COMPLETED'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400'
                                      : currentMilestone === 'APPROVED'
                                        ? 'bg-teal-50 text-teal-800 border-teal-300'
                                        : currentMilestone === 'GOVT_SUBMITTED'
                                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                                          : currentMilestone === 'QUERY_RAISED'
                                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                                            : currentMilestone === 'IN_PROGRESS'
                                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                                              : 'bg-white text-slate-700 border-slate-300'
                                  }`}
                              >
                                <option value="PENDING">PENDING (Not Started)</option>
                                <option value="IN_PROGRESS">IN_PROGRESS (Drafting)</option>
                                <option value="GOVT_SUBMITTED">GOVT_SUBMITTED (Filed)</option>
                                <option value="QUERY_RAISED">QUERY_RAISED (Resubmission)</option>
                                <option value="APPROVED">APPROVED (Authority Cleared)</option>
                                <option
                                  value="COMPLETED"
                                  disabled={!isServiceLocked && isPaymentPending}
                                  title={
                                    isPaymentPending
                                      ? `Payment pending (₹${pendingDealAmt.toLocaleString('en-IN')}) — accounts clearance required`
                                      : 'Set milestone to COMPLETED to unlock deliverable submission below'
                                  }
                                >
                                  COMPLETED {isServiceLocked ? '(Locked)' : isPaymentPending ? '(Blocked: Payment Pending)' : '(Unlocks Deliverables)'}
                                </option>
                              </select>
                              {!isServiceLocked && isPaymentPending && (
                                <p className="text-[10px] text-amber-700 mt-1 font-medium leading-tight">
                                  ⚠️ Payment pending (₹{pendingDealAmt.toLocaleString('en-IN')}) — clear with Accounts before milestone can be completed.
                                </p>
                              )}
                              {!isServiceLocked && !isPaymentPending && !isMilestoneSetToComplete && (
                                <p className="text-[10px] text-slate-500 mt-1 font-medium leading-tight">
                                  ℹ️ Set Milestone to COMPLETED to open deliverable submission below.
                                </p>
                              )}
                              {!isServiceLocked && !isPaymentPending && isMilestoneSetToComplete && (
                                <p className="text-[10px] text-emerald-700 mt-1 font-bold leading-tight">
                                  ✓ Milestone set to COMPLETED. Attach deliverable file(s) below to finalize.
                                </p>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-slate-700 font-semibold block">
                                  Govt Application / SRN Number
                                </label>
                                {isServiceLocked && (
                                  <span className="text-[10px] text-slate-400 font-medium">Read-only</span>
                                )}
                              </div>
                              <input
                                type="text"
                                defaultValue={activeTask.govApplicationNumber || ''}
                                placeholder="e.g. SRN29182371 / Ref"
                                disabled={isServiceLocked}
                                onBlur={(e) => {
                                  if (!isServiceLocked && e.target.value !== (activeTask.govApplicationNumber || '')) {
                                    handleUpdateService(activeTask.dealId, activeTask.id, {
                                      govApplicationNumber: e.target.value.trim() || null,
                                    });
                                  }
                                }}
                                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none ${isServiceLocked
                                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-slate-800'
                                  }`}
                              />
                            </div>

                        <div>
                          <label className="text-xs text-slate-700 font-semibold block mb-1">
                            Target Deadline <span className="text-[10px] text-slate-400 font-normal">(Set by Manager)</span>
                          </label>
                          <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {activeTask.targetCompletionDate
                                ? new Date(activeTask.targetCompletionDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                                : 'Pending Manager Allocation'}
                            </span>
                            {activeTask.targetCompletionDate && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${new Date(activeTask.targetCompletionDate) < new Date()
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-800'
                                  }`}
                              >
                                {new Date(activeTask.targetCompletionDate) < new Date()
                                  ? 'Overdue'
                                  : `${Math.ceil((new Date(activeTask.targetCompletionDate) - new Date()) / (1000 * 60 * 60 * 24))}d left`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                    {/* 2. DEAL DOSSIER: COMPANY DETAILS & DIRECTORS */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-slate-500" /> Deal Dossier & Client Profile
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Stage: <strong className="text-slate-800">{activeDeal.stage?.replace(/_/g, ' ')}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-medium block">GSTIN</span>
                          <span className="font-mono font-bold text-slate-900 mt-0.5 block truncate">
                            {activeDeal.client?.gstin || (activeDeal.client?.gstStatus ? 'Pending' : 'Non-GST')}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-medium block">Company PAN</span>
                          <span className="font-mono font-bold text-slate-900 mt-0.5 block truncate">
                            {activeDeal.client?.pan || 'Not Provided'}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-medium block">Industry / Sector</span>
                          <span className="font-semibold text-slate-900 mt-0.5 block truncate">
                            {activeDeal.client?.industry || activeDeal.client?.sector || 'General Corporate'}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] text-slate-500 font-medium block">City / State</span>
                          <span className="font-semibold text-slate-900 mt-0.5 block truncate">
                            {[activeDeal.client?.city, activeDeal.client?.state].filter(Boolean).join(', ') || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {activeDeal.client?.billingAddress && (
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-xs">
                          <span className="text-[10px] font-medium text-slate-500 block mb-0.5">Registered / Office Address:</span>
                          <span className="font-medium text-slate-800">{activeDeal.client.billingAddress}</span>
                        </div>
                      )}

                      {/* Company Directors */}
                      {activeDeal.client?.directors && activeDeal.client.directors.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[11px] font-bold text-slate-700 block mb-2">
                            Directors ({activeDeal.client.directors.length}):
                          </span>
                          <div className="border border-slate-200 rounded-lg overflow-x-auto">
                            <table className="w-full text-left text-xs min-w-[450px]">
                              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-bold tracking-wider">
                                <tr>
                                  <th className="py-2 px-3">Name</th>
                                  <th className="py-2 px-3">DIN</th>
                                  <th className="py-2 px-3">PAN</th>
                                  <th className="py-2 px-3">Mobile</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                                {activeDeal.client.directors.map((d) => (
                                  <tr key={d.id} className="hover:bg-slate-50/70">
                                    <td className="py-2 px-3 font-bold text-slate-900">{d.name}</td>
                                    <td className="py-2 px-3 font-mono text-[11px]">{d.din || 'N/A'}</td>
                                    <td className="py-2 px-3 font-mono text-[11px]">{d.pan || 'N/A'}</td>
                                    <td className="py-2 px-3 text-slate-600">{d.phone || 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. DEAL DOSSIER & ATTACHED FILES (CATEGORIZED & TRANCHE-WISE) */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <FolderOpen className="w-4 h-4 text-cyan-600" /> Deal Dossier & Attached Files ({activeDeal.documents?.length || 0})
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Categorized Dossier & Payment Tranches
                        </span>
                      </div>

                      <DealDossierDocumentsView
                        deal={activeDeal}
                        isManager={isManager}
                        onPreview={handlePreviewDocument}
                        onDelete={handleDeleteDocument}
                      />
                    </div>

                    {/* 4. FILING DELIVERABLE(S) SUBMISSION GATE */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-emerald-600" /> Filing Deliverable(s) & Certificates
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Upload final certificates (COI, licenses, registration certificates) to conclude this filing.
                          </p>
                        </div>

                        {/* Add Deliverable Button */}
                        {!isServiceLocked && (
                          <button
                            type="button"
                            onClick={handleAddDeliverableSlot}
                            disabled={!isMilestoneSetToComplete}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition flex-shrink-0 ${
                              !isMilestoneSetToComplete
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                            }`}
                            title={
                              !isMilestoneSetToComplete
                                ? 'Set Milestone Status to COMPLETED above to unlock deliverable addition'
                                : 'Add another deliverable file field'
                            }
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Deliverable</span>
                          </button>
                        )}
                      </div>

                      {/* Status Banner (Only when service is finalized & locked) */}
                      {isServiceLocked && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2.5">
                          <Lock className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                          <div className="leading-relaxed">
                            <strong>Service Completed & Locked:</strong> This filing has been completed and verified. Deliverables and milestone settings are permanently archived and read-only.
                          </div>
                        </div>
                      )}

                      {/* Deliverable Upload Fields (Only when service is active) */}
                      {!isServiceLocked && (
                        <div className={`space-y-3 ${!isMilestoneSetToComplete ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                          {deliverableSlots.map((slot, idx) => (
                            <div
                              key={slot.id}
                              className="p-3 rounded-lg space-y-2 text-xs border bg-slate-50/70 border-slate-200"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                                  Deliverable Field #{idx + 1}
                                </span>
                                {deliverableSlots.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDeliverableSlot(slot.id)}
                                    disabled={!isMilestoneSetToComplete}
                                    className="text-slate-400 hover:text-rose-600 text-xs flex items-center gap-1 cursor-pointer"
                                    title="Remove this deliverable field"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                                    Deliverable Title / Note
                                  </label>
                                  <input
                                    type="text"
                                    value={slot.title}
                                    disabled={!isMilestoneSetToComplete}
                                    onChange={(e) => handleUpdateDeliverableSlot(slot.id, 'title', e.target.value)}
                                    placeholder="e.g. Certificate of Incorporation / License PDF"
                                    className="w-full bg-white border border-slate-300 text-slate-800 focus:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                                    Select Deliverable File
                                  </label>
                                  <input
                                    type="file"
                                    disabled={!isMilestoneSetToComplete}
                                    accept="application/pdf,image/*,.doc,.docx"
                                    onChange={(e) => handleUpdateDeliverableSlot(slot.id, 'file', e.target.files?.[0] || null)}
                                    className="w-full text-xs text-slate-700 file:mr-2.5 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                                  />
                                </div>
                              </div>

                              {slot.file && (
                                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5 pt-1">
                                  <Check className="w-3 h-3 text-emerald-600" /> Selected: {slot.file.name} ({(slot.file.size / 1024).toFixed(0)} KB)
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Submit Deliverables Bar (Only when active) */}
                      {!isServiceLocked && (
                        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <span className="text-xs text-slate-500 font-medium">
                            {!isMilestoneSetToComplete
                              ? 'Milestone status must be set to COMPLETED above to open deliverable upload & submission.'
                              : 'Attach deliverable document(s) and click button to finalize and move service to Complete section.'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleSubmitAllDeliverables(activeDeal.id, activeTask.id)}
                            disabled={
                              !isMilestoneSetToComplete ||
                              isUploadingDoc ||
                              !deliverableSlots.some((s) => Boolean(s.file))
                            }
                            className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition ${
                              !isMilestoneSetToComplete ||
                              isUploadingDoc ||
                              !deliverableSlots.some((s) => Boolean(s.file))
                                ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                            }`}
                            title={
                              !isMilestoneSetToComplete
                                ? 'Blocked: Set Milestone Status to COMPLETED above to unlock'
                                : !deliverableSlots.some((s) => Boolean(s.file))
                                  ? 'Select at least one deliverable file to submit'
                                  : 'Upload deliverable(s) and move service to Complete section'
                            }
                          >
                            <UploadCloud className="w-4 h-4" />
                            <span>
                              {isUploadingDoc
                                ? 'Submitting Deliverables...'
                                : !isMilestoneSetToComplete
                                  ? 'Blocked (Set Milestone to COMPLETED)'
                                  : 'Upload & Submit Deliverable(s)'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                    <h3 className="text-base font-bold text-slate-800">Workspace Queue Clear</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      {selectedStatusFilter === 'ACTIVE'
                        ? 'All your assigned service filings are completed! Pick up new tasks from the General Task Pool matching your sector.'
                        : 'No filings found matching your search and filter criteria.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: TABLE WITH EXPANDABLE DOSSIER & FILES DRAWER */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Deal / Company</th>
                      <th className="py-3 px-4">Service Task & Sector</th>
                      <th className="py-3 px-4">My Milestone Status</th>
                      <th className="py-3 px-4">SRN / MCA Reference</th>
                      <th className="py-3 px-4">Target Deadline</th>
                      <th className="py-3 px-4 text-center">Dossier & Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredMyServices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                          {selectedStatusFilter === 'COMPLETED'
                            ? 'No completed filings found in your history.'
                            : selectedStatusFilter === 'ACTIVE'
                              ? 'All your assigned service filings are completed! Pick up new tasks from the General Task Pool.'
                              : 'No service filings matching the selected filter.'}
                        </td>
                      </tr>
                    ) : (
                      filteredMyServices.map((svc) => {
                        const isExpanded = expandedTaskId === svc.id;
                        const svcDeal = svc.deal || deals.find((d) => d.id === svc.dealId);
                        const docCount = svcDeal?.documents?.length || 0;

                        return (
                          <React.Fragment key={svc.id}>
                            <tr className={`hover:bg-slate-50/70 transition ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                    {svc.dealCode}
                                  </span>
                                  <button
                                    onClick={() => onOpenDossier(svc.dealId)}
                                    title="Open Deal Dossier Modal"
                                    className="text-slate-400 hover:text-slate-800"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="font-bold text-slate-900 mt-1 truncate max-w-[200px]">
                                  {svc.companyName}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {svc.clientName} ({svc.clientPhone})
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900 text-sm">{svc.serviceName}</div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${svc.sectorBadge}`}>
                                    {svc.sectorName}
                                  </span>
                                  <span className="text-[11px] text-slate-500">Fee: ₹{Number(svc.serviceFee || 0).toLocaleString('en-IN')}</span>
                                </div>
                              </td>

                              <td className="py-3 px-4 min-w-[180px]">
                                {(() => {
                                  const isTableSvcLocked = svc.status === 'COMPLETED';
                                  const svcMilestone = milestoneStatusMap[svc.id] || svc.status || 'NOT_STARTED';
                                  const svcPendingAmt = Math.max(0, Math.round(Number(svcDeal?.pendingAmount ?? (Number(svcDeal?.totalAmount || 0) - Number(svcDeal?.amountReceived || 0)))));
                                  const svcHasUnverifiedPymts = (svcDeal?.payments || []).some((p) => p.status !== 'VERIFIED');
                                  const isSvcPaymentPending = svcPendingAmt > 0 || svcHasUnverifiedPymts || !svcDeal?.isAccountsVerified;

                                  return (
                                    <div>
                                      <select
                                        value={svcMilestone}
                                        onChange={(e) =>
                                          handleMilestoneStatusChange(svc.dealId, svc.id, e.target.value)
                                        }
                                        disabled={actionLoading || isTableSvcLocked}
                                        className={`w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border focus:outline-none ${isTableSvcLocked
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 cursor-not-allowed opacity-90'
                                            : svcMilestone === 'COMPLETED'
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400'
                                              : svcMilestone === 'APPROVED'
                                                ? 'bg-teal-50 text-teal-800 border-teal-300'
                                                : svcMilestone === 'GOVT_SUBMITTED'
                                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                                  : svcMilestone === 'QUERY_RAISED'
                                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                                    : svcMilestone === 'IN_PROGRESS'
                                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                                      : 'bg-slate-50 text-slate-700 border-slate-300'
                                          }`}
                                      >
                                        <option value="NOT_STARTED">Not Started</option>
                                        <option value="IN_PROGRESS">In Progress (Drafting)</option>
                                        <option value="GOVT_SUBMITTED">Govt / MCA Submitted</option>
                                        <option value="QUERY_RAISED">Query / Resubmission</option>
                                        <option value="APPROVED">APPROVED (Authority Cleared)</option>
                                        <option
                                          value="COMPLETED"
                                          disabled={!isTableSvcLocked && isSvcPaymentPending}
                                          title={
                                            isSvcPaymentPending
                                              ? `Payment pending (₹${svcPendingAmt.toLocaleString('en-IN')}) — accounts clearance required`
                                              : 'Set milestone to COMPLETED to open deliverable submission'
                                          }
                                        >
                                          COMPLETED {isTableSvcLocked ? '(Locked)' : isSvcPaymentPending ? '(Blocked: Payment)' : '(Ready to Complete)'}
                                        </option>
                                      </select>
                                      {isTableSvcLocked && (
                                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5 mt-0.5">
                                          <Lock className="w-2.5 h-2.5" /> Locked
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>

                              <td className="py-3 px-4 min-w-[160px]">
                                <input
                                  type="text"
                                  defaultValue={svc.govApplicationNumber || ''}
                                  placeholder="Enter SRN / Ref..."
                                  disabled={svc.status === 'COMPLETED'}
                                  onBlur={(e) => {
                                    if (svc.status !== 'COMPLETED' && e.target.value !== (svc.govApplicationNumber || '')) {
                                      handleUpdateService(svc.dealId, svc.id, {
                                        govApplicationNumber: e.target.value.trim(),
                                      });
                                    }
                                  }}
                                  className={`w-full border rounded px-2.5 py-1 text-xs font-mono focus:outline-none ${svc.status === 'COMPLETED'
                                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-800'
                                    }`}
                                />
                              </td>

                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border ${svc.isOverdue
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : svc.daysLeft !== null && svc.daysLeft <= 2
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {svc.deadlineStatus}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedTaskId(isExpanded ? null : svc.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition border ${isExpanded
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                      }`}
                                    title="View Dossier & Files"
                                  >
                                    <Paperclip className="w-3.5 h-3.5" />
                                    <span>{docCount} Files</span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>

                                  {svc.status === 'COMPLETED' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3" /> Done
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleUpdateService(svc.dealId, svc.id, {
                                          status: 'COMPLETED',
                                          completedAt: new Date().toISOString(),
                                        })
                                      }
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition shadow-xs flex items-center gap-1"
                                      title="Mark task completed"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* EXPANDABLE ROW: INLINE DOSSIER & FILES DRAWER */}
                            {isExpanded && svcDeal && (
                              <tr className="bg-slate-50/90 border-b border-slate-200">
                                <td colSpan={6} className="p-4">
                                  <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-4 shadow-sm">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-slate-800 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                                          {svcDeal.dealCode}
                                        </span>
                                        <h4 className="font-bold text-slate-900 text-sm">{svcDeal.client?.companyName}</h4>
                                        <span className="text-xs text-slate-500 font-mono">
                                          • {svcDeal.client?.clientName} ({svcDeal.client?.phone})
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => onOpenDossier(svcDeal.id)}
                                        className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
                                      >
                                        <Eye className="w-3.5 h-3.5" /> Full Modal Dossier
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                      {/* Col 1: Dossier Details */}
                                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                                          Company & Director Dossier
                                        </span>
                                        <div className="space-y-1">
                                          <div><span className="text-slate-500">GSTIN:</span> <strong className="font-mono text-slate-900">{svcDeal.client?.gstin || 'Pending/Non-GST'}</strong></div>
                                          <div><span className="text-slate-500">PAN:</span> <strong className="font-mono text-slate-900">{svcDeal.client?.pan || 'N/A'}</strong></div>
                                          <div><span className="text-slate-500">Industry:</span> <span className="font-medium text-slate-900">{svcDeal.client?.industry || 'N/A'}</span></div>
                                          <div><span className="text-slate-500">Address:</span> <span className="font-medium text-slate-900">{svcDeal.client?.billingAddress || 'N/A'}</span></div>
                                        </div>

                                        {svcDeal.client?.directors && svcDeal.client.directors.length > 0 && (
                                          <div className="pt-2 border-t border-slate-200/70">
                                            <span className="text-[11px] font-bold text-slate-700 block mb-1">Directors:</span>
                                            <div className="space-y-1">
                                              {svcDeal.client.directors.map((d) => (
                                                <div key={d.id} className="text-[11px] text-slate-800 font-medium">
                                                  • {d.name} {d.din ? `(DIN: ${d.din})` : ''}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Col 2: Attached Documents */}
                                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                                            Attached Files ({svcDeal.documents?.length || 0})
                                          </span>
                                        </div>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                          {!svcDeal.documents || svcDeal.documents.length === 0 ? (
                                            <p className="text-[11px] text-slate-400 italic">No files attached yet</p>
                                          ) : (
                                            svcDeal.documents.map((doc) => (
                                              <div
                                                key={doc.id}
                                                className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                                              >
                                                <div className="truncate mr-2">
                                                  <div className="font-semibold text-slate-900 truncate" title={doc.title}>
                                                    {doc.title}
                                                  </div>
                                                  <div className="text-[10px] text-slate-500 font-mono">
                                                    {doc.documentType} {doc.fileSize && `• ${(doc.fileSize / 1024).toFixed(0)} KB`}
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={() => handlePreviewDocument(doc.id)}
                                                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                                                  >
                                                    Preview
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteDocument(doc.id, doc.title)}
                                                    className="p-0.5 text-slate-400 hover:text-rose-600 rounded"
                                                    title="Delete"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* TAB: GENERAL TASK POOL (UNASSIGNED SERVICES) */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'pool' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-amber-900">General Unassigned Filing Pool</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Client services waiting for allocation. Pick up services matching your expertise ({specialistSector?.name || 'All Sectors'}) to add to your queue.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs border border-amber-300 whitespace-nowrap">
              {poolServices.length} Available Tasks
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Deal / Company</th>
                    <th className="py-3 px-4">Service Task & Sector</th>
                    <th className="py-3 px-4">Service Fee</th>
                    <th className="py-3 px-4">Target Deadline</th>
                    <th className="py-3 px-4 text-center">Claim Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {poolServices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                        All client services are currently assigned! Check back later.
                      </td>
                    </tr>
                  ) : (
                    poolServices.map((svc) => {
                      const isRecommendedForMe = specialistSector && svc.sectorId === specialistSector.id;
                      return (
                        <tr key={svc.id} className={`hover:bg-slate-50/70 transition ${isRecommendedForMe ? 'bg-indigo-50/30' : ''}`}>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              {svc.dealCode}
                            </span>
                            <div className="font-bold text-slate-900 mt-1 truncate max-w-[200px]">
                              {svc.companyName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {svc.clientName}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              {svc.serviceName}
                              {isRecommendedForMe && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  ⭐ Your Sector Match
                                </span>
                              )}
                            </div>
                            <div className="mt-1">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${svc.sectorBadge}`}>
                                {svc.sectorName}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-900">
                            ₹{Number(svc.serviceFee || 0).toLocaleString('en-IN')}
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-slate-600 text-xs">
                              <Clock className="w-3.5 h-3.5 text-slate-400" /> {svc.deadlineStatus}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleSelfAssignService(svc.dealId, svc.id)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1.5 mx-auto"
                            >
                              <Plus className="w-3.5 h-3.5" /> Claim Task
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: MANAGER SERVICE ALLOCATION HUB */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'allocation' && (
        <div className="space-y-4">
          {/* Top Operational Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div
              onClick={() => {
                setSelectedStatusFilter('ACTIVE');
                setSelectedUrgencyFilter('ALL');
                setSelectedAssigneeFilter('ALL');
              }}
              className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition ${selectedStatusFilter === 'ACTIVE' && selectedAssigneeFilter === 'ALL' && selectedUrgencyFilter === 'ALL'
                  ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Active Services in Filing
              </span>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                {allServices.filter((s) => s.status !== 'COMPLETED').length}{' '}
                <span className="text-xs font-normal text-slate-500">active filings</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Value: ₹{allServices.filter((s) => s.status !== 'COMPLETED').reduce((sum, s) => sum + Number(s.serviceFee || 0), 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div
              onClick={() => {
                setSelectedAssigneeFilter(selectedAssigneeFilter === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED');
                setSelectedStatusFilter('ACTIVE');
              }}
              className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition ${selectedAssigneeFilter === 'UNASSIGNED'
                  ? 'bg-amber-50/50 border-amber-500 ring-1 ring-amber-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                Unassigned Tasks
              </span>
              <div className="text-xl font-extrabold text-amber-600 mt-0.5">
                {unassignedCount} <span className="text-xs font-normal text-slate-500">need allocation</span>
              </div>
              <div className="text-[11px] text-amber-700/80 mt-1">
                Open in General Pool
              </div>
            </div>

            <div
              onClick={() => {
                setSelectedUrgencyFilter(selectedUrgencyFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE');
              }}
              className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition ${selectedUrgencyFilter === 'OVERDUE'
                  ? 'bg-rose-50/50 border-rose-500 ring-1 ring-rose-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                Overdue / Urgent Tasks
              </span>
              <div className="text-xl font-extrabold text-rose-600 mt-0.5">
                {overdueCount} <span className="text-xs font-normal text-slate-500">past target deadline</span>
              </div>
              <div className="text-[11px] text-rose-700/80 mt-1">
                Immediate Action Required
              </div>
            </div>

            <div
              onClick={() => {
                setSelectedStatusFilter(selectedStatusFilter === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED');
                setSelectedUrgencyFilter('ALL');
                setSelectedAssigneeFilter('ALL');
              }}
              className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition ${selectedStatusFilter === 'COMPLETED'
                  ? 'bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Completed & Cleared
              </span>
              <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
                {allServices.filter((s) => s.status === 'COMPLETED').length}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-1">
                Cleared from active queue
              </div>
            </div>
          </div>

          {/* Controls Bar: Search, Sector Filter, Status Filter, Urgency Filter, Assignee Filter, Export */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search service, deal code, client, or SRN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
                />
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
              >
                <option value="ACTIVE">Active Filings (Hide Completed)</option>
                <option value="ALL">All Statuses (Include Completed)</option>
                <option value="PENDING">Pending Allocation</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="GOVT_SUBMITTED">Govt Submitted</option>
                <option value="QUERY_RAISED">Query Raised</option>
                <option value="COMPLETED">Completed History</option>
              </select>

              {/* Sector Filter */}
              <select
                value={selectedSectorFilter}
                onChange={(e) => setSelectedSectorFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">All Expertise Sectors</option>
                {EXPERTISE_SECTORS.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>

              {/* Urgency Filter */}
              <select
                value={selectedUrgencyFilter}
                onChange={(e) => setSelectedUrgencyFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">All Deadlines</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="DUE_48H">Due in 48 Hours</option>
                <option value="THIS_WEEK">Due This Week</option>
              </select>

              {/* Assignee Filter */}
              <select
                value={selectedAssigneeFilter}
                onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-800"
              >
                <option value="ALL">All Assignees</option>
                <option value="UNASSIGNED">Unassigned (In Pool)</option>
                <option value="MY_TASKS">Assigned to Me (Manager)</option>
                {opsTeam.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Reports Buttons */}
            <div className="flex items-center gap-2 self-end lg:self-auto">
              <button
                onClick={() => exportOpsServicesToCsv(filteredServices)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Allocation ({filteredServices.length})</span>
              </button>
            </div>
          </div>

          {/* Services Allocation Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Deal / Client</th>
                    <th className="py-3 px-4">Service Task & Sector</th>
                    <th className="py-3 px-4">Assigned Specialist</th>
                    <th className="py-3 px-4">
                      Target Deadline <span className="text-rose-500 font-extrabold">*</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                        No service tasks found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((svc) => {
                      const isAssignedToMe = svc.assignedOpsUserId === currentUser?.id;
                      const sectorMeta = EXPERTISE_SECTORS.find((s) => s.id === svc.sectorId) || EXPERTISE_SECTORS[0];

                      return (
                        <tr key={svc.id} className="hover:bg-slate-50/70 transition">
                          {/* Deal / Client */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                {svc.dealCode}
                              </span>
                              <button
                                onClick={() => onOpenDossier(svc.dealId)}
                                title="Open Deal Dossier Modal"
                                className="text-slate-400 hover:text-slate-800"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="font-bold text-slate-900 mt-1 truncate max-w-[180px]">
                              {svc.companyName}
                            </div>
                            <div className="text-[11px] text-slate-500">{svc.clientName}</div>
                          </td>

                          {/* Service Task & Sector */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm">{svc.serviceName}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${sectorMeta.badgeColor}`}>
                                {sectorMeta.name}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Fee: ₹{Number(svc.serviceFee || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </td>

                          {/* Assigned Specialist */}
                          <td className="py-3.5 px-4 min-w-[200px]">
                            <select
                              value={svc.assignedOpsUserId || ''}
                              onChange={(e) => {
                                const newSpecialistId = e.target.value || null;
                                if (newSpecialistId && !svc.targetCompletionDate) {
                                  toast.warning(
                                    'Target Deadline is mandatory. Please select a deadline date before or when assigning a specialist.',
                                    'Target Deadline Mandatory'
                                  );
                                  setFeedback({
                                    type: 'error',
                                    message: 'Target Deadline is mandatory for this service. Please set a target deadline date.',
                                  });
                                  const dateInput = document.getElementById(`deadline-${svc.id}`);
                                  if (dateInput) {
                                    dateInput.focus();
                                    dateInput.showPicker?.();
                                  }
                                  return;
                                }
                                handleUpdateService(svc.dealId, svc.id, {
                                  assignedOpsUserId: newSpecialistId,
                                });
                              }}
                              disabled={actionLoading}
                              className={`w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none ${svc.assignedOpsUserId
                                  ? 'bg-white border-slate-300 text-slate-900'
                                  : 'bg-amber-50/70 border-amber-300 text-amber-800'
                                }`}
                            >
                              <option value="">-- Unassigned (Open in Pool) --</option>
                              <optgroup label="Sector Recommended Specialists">
                                {opsTeam
                                  .filter((m) =>
                                    sectorMeta.specialists.some((name) => m.fullName.includes(name.split(' ')[0]))
                                  )
                                  .map((m) => (
                                    <option key={m.id} value={m.id}>
                                      ⭐ {m.fullName}
                                    </option>
                                  ))}
                              </optgroup>
                              <optgroup label="Other Operations Members">
                                {opsTeam
                                  .filter(
                                    (m) =>
                                      !sectorMeta.specialists.some((name) => m.fullName.includes(name.split(' ')[0]))
                                  )
                                  .map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.fullName}
                                    </option>
                                  ))}
                              </optgroup>
                            </select>
                            {isAssignedToMe && (
                              <div className="text-[10px] text-indigo-700 font-semibold mt-1">
                                Assigned to You
                              </div>
                            )}
                          </td>

                          {/* Target Deadline */}
                          <td className="py-3.5 px-4 min-w-[150px]">
                            <input
                              id={`deadline-${svc.id}`}
                              type="date"
                              required
                              defaultValue={
                                svc.targetCompletionDate
                                  ? new Date(svc.targetCompletionDate).toISOString().split('T')[0]
                                  : ''
                              }
                              onChange={(e) => {
                                const newDate = e.target.value;
                                if (!newDate) {
                                  toast.warning('Target Deadline is mandatory and cannot be cleared.', 'Target Deadline Required');
                                  return;
                                }
                                handleUpdateService(svc.dealId, svc.id, {
                                  targetCompletionDate: newDate,
                                });
                              }}
                              className={`w-full rounded-lg px-2 py-1 text-xs focus:outline-none ${!svc.targetCompletionDate
                                  ? 'bg-rose-50 border-2 border-rose-300 text-rose-900 font-bold focus:border-rose-500'
                                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-slate-800'
                                }`}
                            />
                            {!svc.targetCompletionDate ? (
                              <div className="text-[10px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-rose-500" /> Deadline Mandatory *
                              </div>
                            ) : (
                              <div className="mt-1">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${svc.isOverdue
                                      ? 'bg-rose-100 text-rose-800'
                                      : svc.daysLeft <= 2
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                >
                                  {svc.deadlineStatus}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* TAB 2: TEAM & EXPERTISE CAPACITY */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Operations Team Capacity & Workload Balance</h3>
              <p className="text-xs text-slate-500">
                Track specialist allocations across Certifications, Pitch Decks, Tech Development, and Incorporations
              </p>
            </div>
            <button
              onClick={() => exportOpsTeamWorkloadToCsv(teamWorkload)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Team Capacity</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamWorkload.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{member.fullName}</h4>
                    <p className="text-xs text-slate-500">{member.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${member.badgeColor}`}>
                      {member.sectorName}
                    </span>
                  </div>
                  <span className="p-2 rounded-lg bg-slate-100 text-slate-700">
                    <UserCheck className="w-4 h-4" />
                  </span>
                </div>

                {/* Workload Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Completion Rate</span>
                    <span className="font-bold text-slate-900">{member.completionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all duration-500"
                      style={{ width: `${member.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Capacity Counter Grid */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Total</span>
                    <span className="font-extrabold text-slate-900">{member.totalAssigned}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-50 border border-purple-100">
                    <span className="text-[10px] text-purple-700 block uppercase font-bold">Active</span>
                    <span className="font-extrabold text-purple-800">{member.inProgress}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 block uppercase font-bold">Done</span>
                    <span className="font-extrabold text-emerald-800">{member.completed}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-100">
                    <span className="text-[10px] text-rose-700 block uppercase font-bold">Overdue</span>
                    <span className="font-extrabold text-rose-800">{member.overdue}</span>
                  </div>
                </div>

                {/* Quick Task List preview */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    Assigned Tasks ({member.tasks?.length || 0}):
                  </span>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {member.tasks?.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No tasks currently assigned</p>
                    ) : (
                      member.tasks.map((t) => (
                        <div
                          key={t.id}
                          className="text-[11px] bg-slate-50 px-2 py-1 rounded border border-slate-200/60 flex items-center justify-between gap-1"
                        >
                          <span className="truncate font-medium text-slate-800">{t.serviceName}</span>
                          <span className="text-[10px] font-bold text-slate-500 font-mono">{t.dealCode}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* TAB 3: DEAL DOSSIER & FINAL DISPATCH (Original File Execution) */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'dossier' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
          {/* LEFT PANE: Active Ops Deals List (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Operations Queue ({managerDossierDeals.length})
              </span>
              <button
                onClick={fetchOpsData}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-medium px-2 py-1 rounded hover:bg-slate-200/60 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2.5 space-y-1.5">
              {managerDossierDeals.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">
                  <CheckCircle2 className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  No operations files currently assigned to you.
                </div>
              ) : (
                managerDossierDeals.map((d) => {
                  const isSelected = selectedDeal?.id === d.id;
                  const isReadyDelivery = d.stage === 'STAGE_07_SERVICE_COMPLETED';

                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDeal(d)}
                      className={`p-3.5 rounded-lg cursor-pointer transition border text-left ${isSelected
                          ? 'bg-slate-50 border-slate-800 shadow-xs ring-1 ring-slate-800/20'
                          : 'bg-white border-slate-200/70 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {d.dealCode}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded border ${isReadyDelivery
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
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-xs">
            {activeDossierDeal ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-slate-200 gap-3">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                        {activeDossierDeal.dealCode}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{activeDossierDeal.client.companyName}</h3>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Client: <strong className="text-slate-800">{activeDossierDeal.client.clientName}</strong> ({activeDossierDeal.client.phone}) • Accounts & Legal Verified: <strong className="text-emerald-700">✓ Yes</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => onOpenDossier(activeDossierDeal.id)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Eye className="w-4 h-4" /> View Full Dossier
                  </button>
                </div>

                {/* SERVICES IN THIS DEAL (Only Unassigned/Operable Tasks Shown to Manager) */}
                {(() => {
                  const managerOperableServices = (activeDossierDeal.services || []).filter(
                    (svc) => !svc.assignedOpsUserId || (currentUser?.id && svc.assignedOpsUserId === currentUser.id)
                  );
                  const assignedToSpecialistsCount = (activeDossierDeal.services || []).length - managerOperableServices.length;

                  return (
                    <div className="space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-slate-500" /> Service Filing Tasks ({managerOperableServices.length})
                        </div>
                        {assignedToSpecialistsCount > 0 && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {assignedToSpecialistsCount} assigned to specialist desk{assignedToSpecialistsCount > 1 ? 's' : ''} (hidden from manager execution)
                          </span>
                        )}
                      </div>

                      {managerOperableServices.length === 0 ? (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-800">
                              All services in this deal are assigned to team specialists.
                            </p>
                            <p className="mt-0.5 text-slate-500">
                              Assigned services are operated directly by specialists in their assigned workspaces and cannot be operated from the manager dossier view. To reallocate, use the Team Dispatch & Workload tab.
                            </p>
                          </div>
                        </div>
                      ) : (
                        managerOperableServices.map((svc) => {
                          const sector = detectSector(svc.serviceName);

                          return (
                            <div
                              key={svc.id}
                              className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3.5"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-900">{svc.serviceName}</h4>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${sector.badgeColor}`}>
                                      {sector.name}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-600 mt-0.5">
                                    Service Fee: <strong className="text-slate-800">₹{Number(svc.serviceFee).toLocaleString('en-IN')}</strong>{' '}
                                    {svc.govtFee && `• Govt Challan: ₹${Number(svc.govtFee).toLocaleString('en-IN')}`}
                                  </div>
                                </div>

                                <span className="text-xs px-2.5 py-1 rounded-md bg-white text-slate-800 border border-slate-300 font-semibold self-start sm:self-auto shadow-xs">
                                  {svc.status}
                                </span>
                              </div>

                              {/* Execution Controls Grid */}
                              {(() => {
                                const isModalSvcLocked = svc.status === 'COMPLETED';
                                const dTotal = Math.round(Number(activeDossierDeal?.totalAmount || 0));
                                const dReceived = Math.round(Number(activeDossierDeal?.amountReceived || 0));
                                const dPending = Math.max(0, Math.round(Number(activeDossierDeal?.pendingAmount ?? (dTotal - dReceived))));
                                const dHasUnverified = (activeDossierDeal?.payments || []).some((p) => p.status !== 'VERIFIED');
                                const dIsPaymentPending = dPending > 0 || dHasUnverified || !activeDossierDeal?.isAccountsVerified;
                                const dHasDeliverable = (activeDossierDeal?.documents || []).some(
                                  (d) =>
                                    d.documentType === 'FINAL_DELIVERABLE_CERTIFICATE' ||
                                    d.documentType === 'DELIVERABLE_CERTIFICATE' ||
                                    (d.title && d.title.toLowerCase().includes('deliverable')) ||
                                    (d.title && d.title.toLowerCase().includes('certificate'))
                                );

                                return (
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-xs">
                                    <div>
                                      <label className="text-xs text-slate-600 font-medium block mb-1">
                                        Assign Specialist {isModalSvcLocked && <span className="text-[10px] text-slate-400">(Locked)</span>}
                                      </label>
                                      <select
                                        value={svc.assignedOpsUserId || ''}
                                        disabled={isModalSvcLocked}
                                        onChange={(e) =>
                                          handleUpdateService(activeDossierDeal.id, svc.id, {
                                            assignedOpsUserId: e.target.value || null,
                                          })
                                        }
                                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none ${isModalSvcLocked
                                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                            : 'bg-white border-slate-300 focus:border-slate-800'
                                          }`}
                                      >
                                        <option value="">-- Select Specialist --</option>
                                        {opsTeam.map((u) => (
                                          <option key={u.id} value={u.id}>{u.fullName}</option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-xs text-slate-600 font-medium block mb-1">
                                        Govt Application / SRN Number {isModalSvcLocked && <span className="text-[10px] text-slate-400">(Locked)</span>}
                                      </label>
                                      <input
                                        type="text"
                                        defaultValue={svc.govApplicationNumber || ''}
                                        placeholder="e.g. SRN29182371"
                                        disabled={isModalSvcLocked}
                                        onBlur={(e) => {
                                          if (!isModalSvcLocked) {
                                            handleUpdateService(activeDossierDeal.id, svc.id, {
                                              govApplicationNumber: e.target.value.trim() || null,
                                            });
                                          }
                                        }}
                                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none ${isModalSvcLocked
                                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                            : 'bg-white border-slate-300 focus:border-slate-800'
                                          }`}
                                      />
                                    </div>

                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs text-slate-600 font-medium block">Milestone Stage</label>
                                        {isModalSvcLocked && (
                                          <span className="text-[10px] text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                                            <Lock className="w-2.5 h-2.5" /> Locked
                                          </span>
                                        )}
                                      </div>
                                      <select
                                        value={milestoneStatusMap[svc.id] || svc.status || 'PENDING'}
                                        disabled={isModalSvcLocked}
                                        onChange={(e) =>
                                          handleMilestoneStatusChange(activeDossierDeal.id, svc.id, e.target.value)
                                        }
                                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none ${isModalSvcLocked
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 cursor-not-allowed'
                                            : 'bg-white border-slate-300 text-slate-800 focus:border-slate-800'
                                          }`}
                                      >
                                        <option value="PENDING">PENDING</option>
                                        <option value="IN_PROGRESS">IN_PROGRESS (Drafting)</option>
                                        <option value="GOVT_SUBMITTED">GOVT_SUBMITTED (Filed)</option>
                                        <option value="QUERY_RAISED">QUERY_RAISED (Resubmit)</option>
                                        <option value="APPROVED">APPROVED (Authority Cleared)</option>
                                        <option
                                          value="COMPLETED"
                                          disabled={!isModalSvcLocked && dIsPaymentPending}
                                          title={
                                            dIsPaymentPending
                                              ? `Payment pending (₹${dPending.toLocaleString('en-IN')}) — accounts clearance required`
                                              : 'Set milestone to COMPLETED to open deliverable submission'
                                          }
                                        >
                                          COMPLETED {isModalSvcLocked ? '(Locked)' : dIsPaymentPending ? '(Blocked: Payment)' : ''}
                                        </option>
                                      </select>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })()}

                {/* DEAL DOSSIER: ATTACHED DOCUMENTS & VAULT (CATEGORIZED & TRANCHE-WISE) */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FolderOpen className="w-4 h-4 text-cyan-600" /> Deal Dossier Documents ({activeDossierDeal.documents?.length || 0})
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Categorized Dossier & Payment Tranches
                    </span>
                  </div>

                  <DealDossierDocumentsView
                    deal={activeDossierDeal}
                    isManager={isManager}
                    onPreview={handlePreviewDocument}
                    onDelete={handleDeleteDocument}
                  />
                </div>

                {/* DELIVERABLE CERTIFICATE UPLOAD & STAGE ACTIONS */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" /> Deliverable Certificate & Completion Gate
                    </h4>
                  </div>

                  <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-3">
                    {/* List of Attached Deliverable Certificates */}
                    {(() => {
                      const dossierDeliverables = (activeDossierDeal.documents || []).filter(
                        (d) =>
                          d.documentType === 'FINAL_DELIVERABLE_CERTIFICATE' ||
                          d.documentType === 'DELIVERABLE_CERTIFICATE'
                      );
                      if (dossierDeliverables.length === 0) {
                        return (
                          <div className="p-3 bg-white border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
                            No deliverable certificates submitted by operations team yet.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                            Submitted Deliverable Certificates ({dossierDeliverables.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {dossierDeliverables.map((doc) => (
                              <div
                                key={doc.id}
                                className="p-2.5 bg-white border border-emerald-200 rounded-lg flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate" title={doc.title}>
                                      {doc.title}
                                    </p>
                                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-600" /> Deliverable on Record
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handlePreviewDocument(doc)}
                                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer flex-shrink-0"
                                >
                                  <Eye className="w-3 h-3" /> Preview
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {hasDeliverable && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-200">
                        <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Final Certificate on file in Object Storage.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEmailCertificatesToClient(activeDossierDeal)}
                          disabled={actionLoading || isEmailingCerts}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
                          title={`Email service certificate(s) to ${activeDossierDeal.client?.email || 'client'}`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isEmailingCerts ? 'Sending...' : 'Email Certificate to Client'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Part-payment lock warning */}
                  {isPartPaymentPending && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">
                        <strong>Part-Payment Hold:</strong> Client has ₹{Number(activeDossierDeal.pendingAmount).toLocaleString('en-IN')} pending balance. Service completion is permitted, but final certificate dispatch (Stage 08) requires balance verification by Accounts Desk.
                      </span>
                    </div>
                  )}

                  {/* Stage Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                    {activeDossierDeal.stage === 'STAGE_06_OPERATIONS_PROCESSING' && (
                      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {(() => {
                          const incompleteCount = (activeDossierDeal.services || []).filter((s) => s.status !== 'COMPLETED').length;
                          const totalServices = (activeDossierDeal.services || []).length;
                          const allDone = totalServices > 0 && incompleteCount === 0;

                          return (
                            <>
                              <div className="text-xs text-slate-500">
                                {allDone ? (
                                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                                    <Check className="w-4 h-4 text-emerald-600" /> All {totalServices} services completed. Ready to close deal stage.
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-medium">
                                    ⏳ Filing Active: {totalServices - incompleteCount}/{totalServices} services completed ({incompleteCount} pending).
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={handleCompleteService}
                                disabled={actionLoading || !allDone || (!deliverableFile && !hasDeliverable)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                                title={!allDone ? `Cannot complete: ${incompleteCount} service(s) still in progress` : ''}
                              >
                                <FileCheck className="w-4 h-4" />
                                <span>Mark Service Completed (Stage 07 Gate)</span>
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {activeDossierDeal.stage === 'STAGE_07_SERVICE_COMPLETED' && (
                      <button
                        onClick={handleDeliverToClient}
                        disabled={actionLoading || isPartPaymentPending}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-40"
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
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-semibold text-xs text-slate-800 flex items-center gap-2 truncate mr-3">
                <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span className="font-bold truncate">{previewDoc.title || previewDoc.fileName}</span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">({previewDoc.fileName})</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={previewDoc.signedUrl}
                  download={previewDoc.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-300 text-xs font-semibold flex items-center gap-1 transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 font-bold text-sm"
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
    </div>
  );
}
