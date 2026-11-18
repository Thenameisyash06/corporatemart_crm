import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardStats from './components/DashboardStats';
import DealsTable from './components/DealsTable';
import NewDealWizardModal from './components/NewDealWizardModal';
import DealDetailModal from './components/DealDetailModal';
import CollectBalanceModal from './components/CollectBalanceModal';
import AccountsWorkbench from './components/AccountsWorkbench';
import LegalWorkbench from './components/LegalWorkbench';
import OperationsWorkbench from './components/OperationsWorkbench';
import RmWorkbench from './components/RmWorkbench';
import AdminDashboard from './components/AdminDashboard';
import LeadManagementWorkbench from './components/LeadManagementWorkbench';
import MeetingTodayPopup from './components/MeetingTodayPopup';
import { filterTodayMeetings } from './lib/meetingUtils';
import api from './lib/api';
import {
  Plus,
  UserPlus,
  Search,
  Layers,
  CreditCard,
  Scale,
  Cog,
  Send,
  Lock,
  Building2,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [stats, setStats] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [balanceModalDeal, setBalanceModalDeal] = useState(null);
  const [newDealInitialData, setNewDealInitialData] = useState(null);

  // Today's Meetings State & Notification Alerts
  const [todayMeetings, setTodayMeetings] = useState([]);
  const [showMeetingPopup, setShowMeetingPopup] = useState(false);
  const [highlightLeadId, setHighlightLeadId] = useState(null);

  // Filters for Pipeline tab
  const [activeFilterId, setActiveFilterId] = useState('ALL');
  const [activeStageKey, setActiveStageKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previousCrmTab, setPreviousCrmTab] = useState('pipeline');
  const currentMode = activeTab === 'lms' ? 'LMS' : 'CRM';

  const handleSwitchMode = (targetMode) => {
    if (targetMode === 'LMS') {
      if (activeTab !== 'lms') {
        setPreviousCrmTab(activeTab);
      }
      setActiveTab('lms');
    } else {
      const fallback = currentUser?.role === 'ADMIN' ? 'admin' : 'pipeline';
      setActiveTab(previousCrmTab && previousCrmTab !== 'lms' ? previousCrmTab : fallback);
    }
  };


  // Login form state (if logged out)
  const [loginForm, setLoginForm] = useState({ email: 'bdm@corporatemart.com', password: 'bdm123' });
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('cm_crm_user');
    const token = localStorage.getItem('cm_crm_token');

    if (savedUser && token) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.role) {
          setCurrentUser(parsed);
          setDefaultTabForRole(parsed.role);
        } else {
          throw new Error('Invalid user payload');
        }
      } catch {
        localStorage.removeItem('cm_crm_user');
        localStorage.removeItem('cm_crm_token');
        handleDirectLogin('bdm@corporatemart.com', 'bdm123');
      }
    } else {
      // Default initial login as BDM
      handleDirectLogin('bdm@corporatemart.com', 'bdm123');
    }
  }, []);

  const setDefaultTabForRole = (role) => {
    if (role === 'ADMIN') setActiveTab('admin');
    else if (role === 'ACCOUNTS') setActiveTab('accounts');
    else if (role === 'LEGAL') setActiveTab('legal');
    else if (role === 'OPERATIONS') setActiveTab('operations');
    else if (role === 'RM') setActiveTab('rm');
    else setActiveTab('pipeline');
  };

  const handleDirectLogin = async (email, password) => {
    try {
      setLoginLoading(true);
      setLoginError(null);
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('cm_crm_token', res.data.token);
      localStorage.setItem('cm_crm_user', JSON.stringify(res.data.user));
      setCurrentUser(res.data.user);
      setDefaultTabForRole(res.data.user.role);
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Login failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleUserChange = (user) => {
    setCurrentUser(user);
    if (user) {
      setDefaultTabForRole(user.role);
      fetchData();
    } else {
      setStats(null);
      setDeals([]);
    }
  };

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);

      const params = {};
      if (activeStageKey) {
        params.stage = activeStageKey;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      // If BDM, only load BDM-relevant deals
      if (currentUser.role === 'BDM') {
        params.roleFilter = 'BDM';
      }

      const [statsRes, dealsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/deals', { params }),
      ]);

      setStats(statsRes.data);
      setDeals(dealsRes.data.deals);
    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch today's meetings for BDM and Admin users
  const fetchTodayMeetings = async () => {
    if (!currentUser || (currentUser.role !== 'BDM' && currentUser.role !== 'ADMIN')) {
      setTodayMeetings([]);
      setShowMeetingPopup(false);
      return;
    }
    try {
      const res = await api.get('/leads');
      const leads = res.data?.leads || [];
      const meetingsToday = filterTodayMeetings(leads);
      setTodayMeetings(meetingsToday);

      // Trigger popup upon login or page refresh if meetings exist today
      if (meetingsToday.length > 0) {
        setShowMeetingPopup(true);
      }
    } catch (err) {
      console.warn('[LMS] Could not fetch today meetings:', err.message);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
      fetchTodayMeetings();
    }

    const handleLeadsChanged = () => {
      fetchTodayMeetings();
    };

    window.addEventListener('lms_leads_changed', handleLeadsChanged);
    return () => {
      window.removeEventListener('lms_leads_changed', handleLeadsChanged);
    };
  }, [currentUser]);

  const handleNavigateToLms = (lead) => {
    setActiveTab('lms');
    if (lead?.id) {
      setHighlightLeadId(lead.id);
    }
  };

  const handleFilterSelect = (filterId, stageKey) => {
    setActiveFilterId(filterId);
    setActiveStageKey(stageKey || null);
  };

  // ---------------------------------------------------------------------------
  // STRICT ROLE-BASED ACCESS CONTROL (RBAC) FOR TABS
  // ---------------------------------------------------------------------------
  const getVisibleTabs = () => {
    if (!currentUser) return [];

    const role = currentUser.role;

        if (role === 'ADMIN') {
      return [
        { id: 'admin', label: 'Admin Command Center', icon: ShieldCheck },
        { id: 'pipeline', label: 'Master Pipeline', icon: Layers, badge: stats?.counts?.totalDeals },
        { id: 'lms', label: 'LMS', icon: UserPlus },
        { id: 'accounts', label: 'Accounts Desk', icon: CreditCard, badge: stats?.counts?.pendingAccounts },
        { id: 'legal', label: 'Legal Scrutiny', icon: Scale, badge: stats?.counts?.pendingLegal },
        { id: 'operations', label: 'Operations Desk', icon: Cog, badge: stats?.counts?.inOperations },
        { id: 'rm', label: 'RM Handover', icon: Send, badge: stats?.counts?.pendingRmHandover },
      ];
    }

        if (role === 'BDM') {
      return [
        { id: 'pipeline', label: 'CRM', icon: Layers, badge: deals.length },
        { id: 'lms', label: 'LMS', icon: UserPlus },
      ];
    }

    if (role === 'ACCOUNTS') {
      return [
        { id: 'accounts', label: 'Accounts Verification Queue', icon: CreditCard, badge: stats?.counts?.pendingAccounts },
        { id: 'pipeline', label: 'All Transactions Ledger', icon: Layers },
      ];
    }

    if (role === 'LEGAL') {
      return [
        { id: 'legal', label: 'Legal Scrutiny Queue', icon: Scale, badge: stats?.counts?.pendingLegal },
      ];
    }

    if (role === 'OPERATIONS') {
      return [
        { id: 'operations', label: 'Operations Processing Desk', icon: Cog, badge: stats?.counts?.inOperations },
      ];
    }

    if (role === 'RM') {
      return [
        { id: 'rm', label: 'RM Handover & Renewals', icon: Send, badge: stats?.counts?.pendingRmHandover },
      ];
    }

    return [{ id: 'pipeline', label: 'Pipeline', icon: Layers }];
  };

  const visibleTabs = getVisibleTabs();
  const canCreateDeals = currentUser?.role === 'BDM' || currentUser?.role === 'ADMIN';

  // LOGIN SCREEN (if user logged out)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-lg">
          <div className="flex items-center space-x-2.5 mb-6">
            <div className="p-2 rounded-xl bg-slate-900 text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">CorporateMart CRM</h2>
              <p className="text-xs text-slate-500">Sign in to your departmental portal</p>
            </div>
          </div>

          {loginError && (
            <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {loginError}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDirectLogin(loginForm.email, loginForm.password);
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="text-slate-600 font-medium block mb-1">Corporate Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-slate-800"
                required
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium block mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-slate-800"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition disabled:opacity-50"
            >
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick presets for office team */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <span className="text-xs text-slate-500 block mb-2 font-semibold">Quick Department Logins:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { label: 'BDM (Sales)', email: 'bdm@corporatemart.com', pass: 'bdm123' },
                { label: 'BDM (Leader)', email: 'leader@corporatemart.com', pass: 'leader123' },
                { label: 'Accounts', email: 'accounts@corporatemart.com', pass: 'accounts123' },
                { label: 'Legal', email: 'legal@corporatemart.com', pass: 'legal123' },
                { label: 'Operations', email: 'ops@corporatemart.com', pass: 'ops123' },
                { label: 'RM', email: 'rm@corporatemart.com', pass: 'rm123' },
                { label: 'Admin', email: 'admin@corporatemart.com', pass: 'admin123' },
              ].map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDirectLogin(p.email, p.pass)}
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-md border border-slate-200 font-medium truncate"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar with Notification Bell & Indicator Dot */}
      <Navbar
        currentUser={currentUser}
        onUserChange={handleUserChange}
        onRefresh={() => {
          fetchData();
          fetchTodayMeetings();
        }}
        todayMeetings={todayMeetings}
        onNavigateToLms={handleNavigateToLms}
      />

      {/* TODAY'S MEETING ALERT POPUP (3-4 SECONDS ON LOGIN / REFRESH) */}
      {showMeetingPopup && todayMeetings.length > 0 && (
        <MeetingTodayPopup
          meetings={todayMeetings}
          onClose={() => setShowMeetingPopup(false)}
          onNavigateToLms={handleNavigateToLms}
          durationMs={4000}
        />
      )}

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-5">
        {/* WORKBENCH SEGMENTED CONTROL BAR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* New Deal Entry Trigger: ONLY VISIBLE TO BDM & ADMIN */}
          {canCreateDeals && (
            <button
              onClick={() => setIsNewDealOpen(true)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition self-stretch sm:self-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Deal Entry (BDM Stage 01-03)</span>
            </button>
          )}
        </div>

        {/* 0. ADMIN COMMAND CENTER */}
        {activeTab === 'admin' && currentUser?.role === 'ADMIN' && (
          <AdminDashboard
            onOpenDossier={(id) => setSelectedDealId(id)}
            onRefreshParent={fetchData}
            initialDeals={deals}
            initialStats={stats}
            onConvertToDeal={(leadData) => {
              setNewDealInitialData(leadData);
              setIsNewDealOpen(true);
            }}
          />
        )}


        {/* LMS: LEAD MANAGEMENT SYSTEM (For BDM and ADMIN) */}
        {activeTab === 'lms' && (currentUser?.role === 'BDM' || currentUser?.role === 'ADMIN') && (
          <LeadManagementWorkbench
            currentUser={currentUser}
            highlightLeadId={highlightLeadId}
            onConvertToDeal={(leadData) => {
              setNewDealInitialData(leadData);
              setIsNewDealOpen(true);
            }}
          />
        )}

        {/* 1. MASTER / MY DEALS PIPELINE VIEW */}
        {activeTab === 'pipeline' && (
          <div className="space-y-4">
            <DashboardStats
              stats={stats}
              activeFilter={activeFilterId}
              onSelectFilter={handleFilterSelect}
              currentUser={currentUser}
              onRefreshStats={fetchData}
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search company, client name, or deal code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="text-sm text-slate-500">
                Showing <strong className="text-slate-900">{deals.length}</strong> {currentUser?.role === 'BDM' ? 'personal deals' : 'active deals'}
              </div>
            </div>

            <DealsTable
              deals={currentUser?.role === 'BDM'
                ? deals.filter((d) => d.bdmId === currentUser.id || d.coBdms?.some((b) => b.id === currentUser.id))
                : deals}
              loading={loading}
              currentUser={currentUser}
              onSelectDeal={(id) => setSelectedDealId(id)}
              onCollectBalance={(deal) => setBalanceModalDeal(deal)}
            />
          </div>
        )}

        {/* 2. ACCOUNTS WORKBENCH (Only Accounts & Admin) */}
        {activeTab === 'accounts' && (currentUser?.role === 'ACCOUNTS' || currentUser?.role === 'ADMIN') && (
          <AccountsWorkbench
            currentUser={currentUser}
            onRefreshParent={fetchData}
            onOpenDossier={(id) => setSelectedDealId(id)}
          />
        )}

        {/* 3. LEGAL WORKBENCH (Only Legal & Admin) */}
        {activeTab === 'legal' && (currentUser?.role === 'LEGAL' || currentUser?.role === 'ADMIN') && (
          <LegalWorkbench
            currentUser={currentUser}
            onRefreshParent={fetchData}
            onOpenDossier={(id) => setSelectedDealId(id)}
          />
        )}

        {/* 4. OPERATIONS WORKBENCH (Only Operations & Admin) */}
        {activeTab === 'operations' && (currentUser?.role === 'OPERATIONS' || currentUser?.role === 'ADMIN') && (
          <OperationsWorkbench
            currentUser={currentUser}
            onRefreshParent={fetchData}
            onOpenDossier={(id) => setSelectedDealId(id)}
          />
        )}

        {/* 5. RM WORKBENCH (Only RM & Admin) */}
        {activeTab === 'rm' && (currentUser?.role === 'RM' || currentUser?.role === 'ADMIN') && (
          <RmWorkbench
            currentUser={currentUser}
            onRefreshParent={fetchData}
            onOpenDossier={(id) => setSelectedDealId(id)}
          />
        )}
      </main>

      {/* MODALS */}
      <NewDealWizardModal
        isOpen={isNewDealOpen}
        initialData={newDealInitialData}
        onClose={() => {
          setIsNewDealOpen(false);
          setNewDealInitialData(null);
        }}
        onSuccess={(newDealId) => {
          fetchData();
          setSelectedDealId(newDealId);
          setIsNewDealOpen(false);
          setNewDealInitialData(null);
        }}
      />

      <DealDetailModal
        dealId={selectedDealId}
        isOpen={Boolean(selectedDealId)}
        onClose={() => setSelectedDealId(null)}
        currentUser={currentUser}
        onRefreshParent={fetchData}
      />

      <CollectBalanceModal
        deal={balanceModalDeal}
        isOpen={Boolean(balanceModalDeal)}
        onClose={() => setBalanceModalDeal(null)}
        onSuccess={() => {
          fetchData();
          setBalanceModalDeal(null);
        }}
      />
    </div>
  );
}
