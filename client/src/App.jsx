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
import LeadAlertPopup from './components/LeadAlertPopup';
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
  const [activeTab, setActiveTab] = useState('lms');
  const [stats, setStats] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [balanceModalDeal, setBalanceModalDeal] = useState(null);
  const [newDealInitialData, setNewDealInitialData] = useState(null);
  const [dealToEdit, setDealToEdit] = useState(null);

  // Today's Meetings State & Notification Alerts
  const [todayMeetings, setTodayMeetings] = useState([]);
  const [showMeetingPopup, setShowMeetingPopup] = useState(false);
  const [highlightLeadId, setHighlightLeadId] = useState(null);

  // Filters for Pipeline tab
  const [activeFilterId, setActiveFilterId] = useState('ALL');
  const [activeStageKey, setActiveStageKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [dealsPage, setDealsPage] = useState(1);
  const [dealsLimit, setDealsLimit] = useState(10);
  const [dealsPagination, setDealsPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [previousCrmTab, setPreviousCrmTab] = useState('pipeline');
  const [isLeadAlertShowing, setIsLeadAlertShowing] = useState(false);
  const currentMode = activeTab === 'lms' ? 'LMS' : 'CRM';

  // 350ms Debounce search input to prevent query hammering
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
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
          // Refresh user profile from server to keep latest stored leaderName & targets
          api.get('/auth/me').then((res) => {
            if (res.data?.user) {
              setCurrentUser(res.data.user);
              localStorage.setItem('cm_crm_user', JSON.stringify(res.data.user));
            }
          }).catch(() => {});
        } else {
          throw new Error('Invalid user payload');
        }
      } catch {
        localStorage.removeItem('cm_crm_user');
        localStorage.removeItem('cm_crm_token');
        setCurrentUser(null);
      }
    }
  }, []);

  const setDefaultTabForRole = (role) => {
    if (role === 'ADMIN') setActiveTab('admin');
    else if (role === 'ACCOUNTS') setActiveTab('accounts');
    else if (role === 'LEGAL') setActiveTab('legal');
    else if (role === 'OPERATIONS') setActiveTab('operations');
    else if (role === 'RM') setActiveTab('rm');
    else setActiveTab('lms');
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

  const fetchData = async (page = dealsPage, limit = dealsLimit) => {
    if (!currentUser) return;
    try {
      setLoading(true);

      const params = {
        page,
        limit,
      };
      if (activeStageKey) {
        params.stage = activeStageKey;
      }
      if (debouncedSearchQuery.trim()) {
        params.search = debouncedSearchQuery.trim();
      }

      const [statsRes, dealsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/deals', { params }),
      ]);

      setStats(statsRes.data);
      setDeals(dealsRes.data.deals || []);
      if (dealsRes.data.pagination) {
        setDealsPagination(dealsRes.data.pagination);
      } else {
        setDealsPagination({
          page,
          limit,
          total: dealsRes.data.deals?.length || 0,
          totalPages: 1,
        });
      }
    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch today's meetings for BDM users (leaders & members only - removed for admin)
  const fetchTodayMeetings = async () => {
    if (!currentUser || currentUser.role !== 'BDM') {
      setTodayMeetings([]);
      setShowMeetingPopup(false);
      return;
    }
    try {
      const res = await api.get('/leads', { params: { todayMeetings: 'true', limit: 100 } });
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
      fetchData(dealsPage, dealsLimit);
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

  // Re-fetch deals when stage filter or debounced search changes
  useEffect(() => {
    if (currentUser) {
      setDealsPage(1);
      fetchData(1, dealsLimit);
    }
  }, [activeStageKey, debouncedSearchQuery]);

  const handleNavigateToLms = (lead) => {
    setActiveTab('lms');
    if (lead?.id) {
      setHighlightLeadId(lead.id);
    }
  };

  const handleFilterSelect = (filterId, stageKey) => {
    setActiveFilterId(filterId);
    setActiveStageKey(stageKey || null);
    setDealsPage(1);
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
        { id: 'lms', label: 'LMS', icon: UserPlus },
        { id: 'pipeline', label: 'CRM', icon: Layers, badge: deals.length },
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
  const canCreateDeals = currentUser?.role === 'BDM';

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
                placeholder="name@corporatemart.com"
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800"
                required
              />
            </div>

            <div>
              <label className="text-slate-600 font-medium block mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="Enter password"
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800"
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

      {/* LEAD REVOCATION & ASSIGNMENT POP-UP ALERT (FOR BOTH BDMs) */}
      {currentUser?.role === 'BDM' && (
        <LeadAlertPopup
          currentUser={currentUser}
          onNavigateToLms={handleNavigateToLms}
          onAlertActiveChange={setIsLeadAlertShowing}
        />
      )}

      {/* TODAY'S MEETING ALERT POPUP (3-4 SECONDS ON LOGIN / REFRESH - ONLY WHEN NO URGENT LEAD REVOCATION POPUP IS ACTIVE) */}
      {currentUser?.role === 'BDM' && !isLeadAlertShowing && showMeetingPopup && todayMeetings.length > 0 && (
        <MeetingTodayPopup
          meetings={todayMeetings}
          onClose={() => setShowMeetingPopup(false)}
          onNavigateToLms={handleNavigateToLms}
          durationMs={4000}
        />
      )}

      {/* Main Container */}
      <main className="flex-1 px-4 sm:px-6 py-5 max-w-7xl mx-auto w-full space-y-5">
        {/* WORKBENCH SEGMENTED CONTROL BAR (Hidden for Admin as Admin uses the Command Center Navigation) */}
        {currentUser?.role !== 'ADMIN' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
            <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/90 shadow-xs">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
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

            {/* New Deal Entry Trigger: ONLY VISIBLE TO BDM WHEN NOT ON LMS */}
            {canCreateDeals && activeTab !== 'lms' && (
              <button
                onClick={() => setIsNewDealOpen(true)}
                className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all self-stretch sm:self-auto justify-center"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
                <span>New Deal Entry (BDM Stage 01-03)</span>
              </button>
            )}
          </div>
        )}

        {/* 0. ADMIN COMMAND CENTER */}
        {currentUser?.role === 'ADMIN' && (
          <AdminDashboard
            currentUser={currentUser}
            onOpenDossier={(id) => setSelectedDealId(id)}
            onRefreshParent={fetchData}
            initialDeals={deals}
            initialStats={stats}
            stats={stats}
            onConvertToDeal={(leadData) => {
              setNewDealInitialData(leadData);
              setIsNewDealOpen(true);
            }}
            onCollectBalance={(deal) => setBalanceModalDeal(deal)}
            onEditDeal={(deal) => setDealToEdit(deal)}
            highlightLeadId={highlightLeadId}
          />
        )}


        {/* LMS: LEAD MANAGEMENT SYSTEM (For BDM) */}
        {currentUser?.role !== 'ADMIN' && activeTab === 'lms' && currentUser?.role === 'BDM' && (
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
        {currentUser?.role !== 'ADMIN' && activeTab === 'pipeline' && (
          <div className="space-y-4">
            <DashboardStats
              stats={stats}
              activeFilter={activeFilterId}
              onSelectFilter={handleFilterSelect}
              currentUser={currentUser}
              onRefreshStats={fetchData}
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search company, client name, or deal code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
                />
              </div>

              <div className="text-xs sm:text-sm text-slate-500 font-medium self-end sm:self-auto">
                Showing <strong className="text-slate-900 font-bold font-mono tabular-nums">{currentUser?.role === 'BDM' ? (dealsPagination?.total ?? deals.length) : deals.length}</strong> {currentUser?.role === 'BDM' ? 'personal deals' : 'active deals'}
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
              onEditDeal={(deal) => setDealToEdit(deal)}
              pagination={dealsPagination}
              onPageChange={(p) => {
                setDealsPage(p);
                fetchData(p, dealsLimit);
              }}
              onLimitChange={(l) => {
                setDealsLimit(l);
                setDealsPage(1);
                fetchData(1, l);
              }}
            />
          </div>
        )}

        {/* 2. ACCOUNTS WORKBENCH (Only Accounts) */}
        {currentUser?.role !== 'ADMIN' && activeTab === 'accounts' && currentUser?.role === 'ACCOUNTS' && (
          <AccountsWorkbench
            currentUser={currentUser}
            onRefreshParent={fetchData}
            onOpenDossier={(id) => setSelectedDealId(id)}
          />
        )}

        {/* 3. LEGAL WORKBENCH (Only Legal) */}
        {currentUser?.role !== 'ADMIN' && activeTab === 'legal' && currentUser?.role === 'LEGAL' && (
          <LegalWorkbench
            currentUser={currentUser}
            onRefreshParent={fetchData}
            onOpenDossier={(id) => setSelectedDealId(id)}
          />
        )}

        {/* 4. OPERATIONS WORKBENCH (Only Operations) */}
        {currentUser?.role !== 'ADMIN' && activeTab === 'operations' && currentUser?.role === 'OPERATIONS' && (
          <OperationsWorkbench
            currentUser={currentUser}
            onRefreshParent={fetchData}
            onOpenDossier={(id) => setSelectedDealId(id)}
          />
        )}

        {/* 5. RM WORKBENCH (Only RM) */}
        {currentUser?.role !== 'ADMIN' && activeTab === 'rm' && currentUser?.role === 'RM' && (
          <RmWorkbench
            currentUser={currentUser}
            onRefreshParent={fetchData}
            onOpenDossier={(id) => setSelectedDealId(id)}
          />
        )}
      </main>

      {/* MODALS */}
      <NewDealWizardModal
        isOpen={isNewDealOpen || Boolean(dealToEdit)}
        initialData={newDealInitialData}
        dealToEdit={dealToEdit}
        currentUser={currentUser}
        onClose={() => {
          setIsNewDealOpen(false);
          setNewDealInitialData(null);
          setDealToEdit(null);
        }}
        onSuccess={(newDealId) => {
          fetchData();
          setSelectedDealId(newDealId);
          setIsNewDealOpen(false);
          setNewDealInitialData(null);
          setDealToEdit(null);
        }}
      />

      <DealDetailModal
        dealId={selectedDealId}
        isOpen={Boolean(selectedDealId)}
        onClose={() => setSelectedDealId(null)}
        currentUser={currentUser}
        onRefreshParent={fetchData}
        onEditDeal={(deal) => {
          setSelectedDealId(null);
          setDealToEdit(deal);
        }}
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
