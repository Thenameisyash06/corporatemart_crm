import React from 'react';
import {
  Building2,
  LogOut,
  RefreshCw,
  Layers,
  Users,
  Briefcase,
  UserPlus,
} from 'lucide-react';
import api from '../lib/api';
import MeetingNotificationDropdown from './MeetingNotificationDropdown';

const QUICK_ROLES = [
  { label: 'BDM (Sales)', email: 'bdm@corporatemart.com', pass: 'bdm123', role: 'BDM' },
  { label: 'BDM (Leader)', email: 'leader@corporatemart.com', pass: 'leader123', role: 'BDM' },
  { label: 'Accounts', email: 'accounts@corporatemart.com', pass: 'accounts123', role: 'ACCOUNTS' },
  { label: 'Legal', email: 'legal@corporatemart.com', pass: 'legal123', role: 'LEGAL' },
  { label: 'Operations', email: 'ops@corporatemart.com', pass: 'ops123', role: 'OPERATIONS' },
  { label: 'RM', email: 'rm@corporatemart.com', pass: 'rm123', role: 'RM' },
  { label: 'Admin', email: 'admin@corporatemart.com', pass: 'admin123', role: 'ADMIN' },
];

export default function Navbar({
  currentUser,
  onUserChange,
  onRefresh,
  todayMeetings = [],
  onNavigateToLms,
}) {
  const [switching, setSwitching] = React.useState(false);

  const handleQuickSwitch = async (roleObj) => {
    try {
      setSwitching(true);
      const res = await api.post('/auth/login', {
        email: roleObj.email,
        password: roleObj.pass,
      });
      localStorage.setItem('cm_crm_token', res.data.token);
      localStorage.setItem('cm_crm_user', JSON.stringify(res.data.user));
      onUserChange(res.data.user);
    } catch (err) {
      alert('Failed to switch role: ' + (err.response?.data?.error || err.message));
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cm_crm_token');
    localStorage.removeItem('cm_crm_user');
    onUserChange(null);
  };

  // Only Admin has permission to switch across roles
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-slate-900 text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">CorporateMart</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                CRM
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Enterprise Compliance Workflow</p>
          </div>
        </div>

        {/* Center: Only ADMIN can see and use the Quick Role Switcher */}
        {isAdmin && (
          <div className="hidden lg:flex items-center bg-slate-100 p-1.5 rounded-lg border border-slate-200 space-x-1.5">
            <span className="text-xs text-slate-600 px-2 flex items-center gap-1.5 font-semibold">
              <Layers className="w-3.5 h-3.5 text-slate-400" /> Admin Switcher:
            </span>
            {QUICK_ROLES.map((r) => {
              const isActive = currentUser?.role === r.role;
              return (
                <button
                  key={r.role}
                  onClick={() => handleQuickSwitch(r)}
                  disabled={switching || isActive}
                  className={`text-xs px-3 py-1 rounded-md font-semibold transition ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        )}

        
        {/* Operations Specialist Quick Switcher */}
        {currentUser?.role === 'OPERATIONS' && (
          <div className="hidden md:flex items-center bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-200 gap-2 text-xs">
            <span className="text-[11px] text-indigo-900 font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" /> Specialist:
            </span>
            <select
              value={currentUser?.email}
              onChange={(e) => {
                const list = [
                  { label: 'Vikram Singh (Manager)', email: 'ops@corporatemart.com', pass: 'ops123', role: 'OPERATIONS' },
                  { label: 'Priya Sharma (ROC & Inc)', email: 'priya.sharma@corporatemart.com', pass: 'ops123', role: 'OPERATIONS' },
                  { label: 'Amit Patel (Pitch & Valuation)', email: 'amit.patel@corporatemart.com', pass: 'ops123', role: 'OPERATIONS' },
                  { label: 'Rahul Nair (Tech & Web)', email: 'rahul.nair@corporatemart.com', pass: 'ops123', role: 'OPERATIONS' },
                  { label: 'Siddharth Rawat (GeM & Tenders)', email: 'siddharth.rawat@corporatemart.com', pass: 'ops123', role: 'OPERATIONS' },
                  { label: 'Neha Joshi (Certifications)', email: 'ops2@corporatemart.com', pass: 'ops123', role: 'OPERATIONS' },
                ];
                const selected = list.find((u) => u.email === e.target.value);
                if (selected) handleQuickSwitch(selected);
              }}
              className="bg-white border border-indigo-200 rounded-md px-2 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-xs"
            >
              <option value="ops@corporatemart.com">Vikram Singh (Operations Manager)</option>
              <option value="priya.sharma@corporatemart.com">Priya Sharma (ROC & Incorporation)</option>
              <option value="amit.patel@corporatemart.com">Amit Patel (Financial & Pitch)</option>
              <option value="rahul.nair@corporatemart.com">Rahul Nair (Tech Lead & Full Stack)</option>
              <option value="siddharth.rawat@corporatemart.com">Siddharth Rawat (GeM & Tenders)</option>
              <option value="ops2@corporatemart.com">Neha Joshi (Operations Executive)</option>
            </select>
          </div>
        )}

        {/* Right: Active Profile & Sign Out */}
        <div className="flex items-center space-x-2.5">
          {/* Notification Center: Meetings & Reassignment Alerts (BDM Only - Hidden on Admin Portal) */}
          {currentUser && currentUser.role !== 'ADMIN' && (
            <MeetingNotificationDropdown
              meetings={todayMeetings}
              onNavigateToLms={onNavigateToLms}
              currentUser={currentUser}
            />
          )}

          <button
            onClick={onRefresh}
            title="Refresh Data"
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {currentUser ? (
            <div className="flex items-center pl-3.5 border-l border-slate-200 space-x-3.5">
              <div className="text-right">
                <div className="text-sm font-bold text-slate-900">{currentUser.fullName}</div>
                <div className="flex items-center justify-end space-x-1 mt-0.5">
                  <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                    {currentUser.role} PORTAL
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500">Not signed in</div>
          )}
        </div>
      </div>
    </header>
  );
}
