import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  X,
  Calendar,
  Award,
  Crown,
  Briefcase,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import api from '../lib/api';
import { toast } from '../context/ToastContext';

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'password'

  // Change Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Edit Phone State
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneVal, setPhoneVal] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setPhoneVal(currentUser.phone || '');
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isOpen) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordError('');
      setPasswordSuccess('');
      setIsEditingPhone(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentUser) return null;

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'BDM':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'ACCOUNTS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'LEGAL':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'OPERATIONS':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'RM':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordSuccess(res.data.message || 'Password updated successfully!');
      toast.success('Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update password.';
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSavePhone = async () => {
    try {
      setPhoneLoading(true);
      const res = await api.put('/auth/profile', { phone: phoneVal });
      toast.success('Phone number updated successfully.');
      setIsEditingPhone(false);
      if (onUserUpdated && res.data.user) {
        onUserUpdated(res.data.user);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update phone number.');
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header with User Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xl font-extrabold shadow-md border-2 border-white/20 flex-shrink-0">
              {getInitials(currentUser.fullName)}
            </div>
            <div className="truncate pr-6">
              <h3 className="text-lg font-bold text-white leading-tight truncate">
                {currentUser.fullName}
              </h3>
              <p className="text-xs text-indigo-200 truncate mt-0.5">{currentUser.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border tracking-wider uppercase ${getRoleBadgeColor(
                    currentUser.role
                  )}`}
                >
                  {currentUser.role} Portal
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-5 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'password'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Change Password</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {activeTab === 'details' && (
            <div className="space-y-3.5">
              {/* Full Name */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Full Name
                    </span>
                    <span className="text-xs font-bold text-slate-900">{currentUser.fullName}</span>
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200">
                <div className="flex items-center gap-3 truncate mr-2">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs flex-shrink-0">
                    <Mail className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Work Email
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate block">
                      {currentUser.email}
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              </div>

              {/* Mobile Phone Number */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs">
                      <Phone className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Contact Number / Mobile
                      </span>
                      {!isEditingPhone ? (
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {currentUser.phone || <span className="text-slate-400 font-normal italic">Not specified</span>}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {!isEditingPhone ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingPhone(true)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      {currentUser.phone ? 'Edit' : 'Add Mobile'}
                    </button>
                  ) : null}
                </div>

                {isEditingPhone && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80">
                    <input
                      type="text"
                      value={phoneVal}
                      onChange={(e) => setPhoneVal(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={handleSavePhone}
                      disabled={phoneLoading}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
                    >
                      {phoneLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingPhone(false)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Portal Role & Privileges */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs">
                    <Shield className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Role & Workspace Desk
                    </span>
                    <span className="text-xs font-bold text-slate-900">{currentUser.role} Workspace</span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-medium">Enterprise Access</span>
              </div>

              {/* BDM / Leader Specific Details */}
              {currentUser.role === 'BDM' && (
                <>
                  {currentUser.leaderName && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs">
                          <Crown className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Reporting Team Leader
                          </span>
                          <span className="text-xs font-bold text-slate-900">{currentUser.leaderName}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentUser.salesTarget && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs">
                          <Award className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Monthly Sales Target
                          </span>
                          <span className="text-xs font-bold text-emerald-800 font-mono">
                            ₹{Number(currentUser.salesTarget).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Enter your current password to authorize the change, followed by your new password (minimum 6 characters).
                </span>
              </div>

              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter existing password"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Minimum 6 characters"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordForm.newPassword && passwordForm.newPassword.length < 6 && (
                  <span className="text-[11px] text-rose-600 font-medium mt-1 block">
                    Password must be at least 6 characters.
                  </span>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter new password"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <span className="text-[11px] text-rose-600 font-medium mt-1 block">
                    Passwords do not match.
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{passwordLoading ? 'Updating Password...' : 'Change Password'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <span>Signed in as <strong>{currentUser.email}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
