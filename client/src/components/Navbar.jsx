import React, { useState } from 'react';
import {
  Building2,
  LogOut,
  RefreshCw,
  Layers,
  Users,
  Briefcase,
  UserPlus,
  User,
} from 'lucide-react';
import api from '../lib/api';
import { toast } from '../context/ToastContext';
import MeetingNotificationDropdown from './MeetingNotificationDropdown';
import UserProfileModal from './UserProfileModal';

export default function Navbar({
  currentUser,
  onUserChange,
  onRefresh,
  todayMeetings = [],
  onNavigateToLms,
}) {
  const [switching, setSwitching] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
      toast.error('Failed to switch role: ' + (err.response?.data?.error || err.message));
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
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-4 sm:px-6 h-16 flex items-center shadow-xs">
      <div className="flex items-center justify-between w-full">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-slate-900 text-white shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">CorporateMart</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/90 font-bold uppercase tracking-wider">
                CRM
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Enterprise Compliance Workflow</p>
          </div>
        </div>

        {/* Operations Specialist Quick Switcher */}
        {currentUser?.role === 'OPERATIONS' && (
          <div className="hidden md:flex items-center bg-indigo-50/80 px-2.5 py-1 rounded-xl border border-indigo-200 gap-2 text-xs">
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
              className="bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-xs"
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
        <div className="flex items-center space-x-2">
          {/* Today's Meetings Notification Button with Indicator Dot (BDM Leaders & Members only - Removed from Admin) */}
          {currentUser?.role === 'BDM' && (
            <MeetingNotificationDropdown
              meetings={todayMeetings}
              onNavigateToLms={onNavigateToLms}
              currentUser={currentUser}
            />
          )}

          <button
            onClick={onRefresh}
            title="Refresh Data"
            className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {currentUser ? (
            <div className="flex items-center pl-3 border-l border-slate-200 space-x-2">
              {/* User Profile Button */}
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                title="Click to view Profile & Change Password"
                className="flex items-center space-x-2.5 p-1 -m-1 rounded-xl hover:bg-slate-100 transition-colors group cursor-pointer text-left"
              >
                {/* Profile Avatar Icon */}
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center ring-2 ring-indigo-100 shadow-xs group-hover:ring-indigo-300 transition-all">
                    {currentUser.fullName
                      ? currentUser.fullName
                          .trim()
                          .split(/\s+/)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : <User className="w-4 h-4" />}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" title="Active" />
                </div>

                <div className="hidden sm:block text-right">
                  <div className="text-sm font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                    {currentUser.fullName}
                  </div>
                  <div className="flex items-center justify-end space-x-1 mt-0.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                      {currentUser.role} PORTAL
                    </span>
                  </div>
                </div>
              </button>

              <button
                onClick={handleLogout}
                title="Sign out"
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500">Not signed in</div>
          )}
        </div>
      </div>

      {/* User Profile & Password Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(updatedUser) => {
          if (onUserChange) {
            onUserChange(updatedUser);
          }
        }}
      />
    </header>
  );
}
