import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  UserCheck,
  Building2,
  X,
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import api from '../lib/api';

/**
 * LeadAlertPopup
 * Displays real-time sequential pop-up notifications for BDMs when:
 * 1. A lead is REVOKED from their pipeline (with administrative reason)
 * 2. A new lead is ASSIGNED to their pipeline (with handover notes)
 *
 * Features:
 * - Sequential display with auto-countdown (5 seconds per alert)
 * - Pause countdown on mouse hover so user can read carefully
 * - Quick "Acknowledge" and "Open in LMS" actions
 * - Marks notification as read in database upon dismissal/action
 */
export default function LeadAlertPopup({ currentUser, onNavigateToLms, onAlertActiveChange }) {
  const [alerts, setAlerts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  const durationMs = 5500; // 5.5s per alert
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(durationMs);

  const fetchAlerts = async () => {
    if (!currentUser || currentUser.role !== 'BDM') return;
    try {
      const res = await api.get('/leads/notifications/my');
      const unreadAlerts = (res.data.notifications || []).filter(
        (n) => !n.isRead && (n.type === 'LEAD_REVOKED' || n.type === 'LEAD_ASSIGNED')
      );
      setAlerts(unreadAlerts);
      if (unreadAlerts.length === 0) {
        setCurrentIndex(0);
      }
    } catch (err) {
      // ignore network errors
    }
  };

  useEffect(() => {
    fetchAlerts();

    const handleNotificationsChanged = () => {
      fetchAlerts();
    };

    window.addEventListener('lead_notifications_changed', handleNotificationsChanged);
    window.addEventListener('lms_leads_changed', handleNotificationsChanged);

    // 45s poll, paused when browser tab is inactive to protect DB connection pool
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchAlerts();
      }
    }, 45000);

    return () => {
      window.removeEventListener('lead_notifications_changed', handleNotificationsChanged);
      window.removeEventListener('lms_leads_changed', handleNotificationsChanged);
      clearInterval(interval);
    };
  }, [currentUser]);

  // Inform parent whether an alert is currently showing
  useEffect(() => {
    if (onAlertActiveChange) {
      onAlertActiveChange(alerts.length > 0);
    }
  }, [alerts.length, onAlertActiveChange]);

  const activeAlert = alerts[currentIndex] || alerts[0];
  const totalAlerts = alerts.length;

  // Reset timer on index change
  useEffect(() => {
    remainingTimeRef.current = durationMs;
    startTimeRef.current = Date.now();
    setProgress(100);
  }, [currentIndex, durationMs, activeAlert]);

  // Sequential countdown timer
  useEffect(() => {
    if (!activeAlert || isPaused || totalAlerts === 0) return;

    startTimeRef.current = Date.now();
    const interval = 50;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentRemaining = Math.max(0, remainingTimeRef.current - elapsed);
      const pct = (currentRemaining / durationMs) * 100;
      setProgress(pct);

      if (currentRemaining <= 0) {
        clearInterval(timer);
        handleAdvance(false);
      }
    }, interval);

    return () => {
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
      clearInterval(timer);
    };
  }, [currentIndex, isPaused, durationMs, totalAlerts, activeAlert]);

  const markAlertAsRead = async (notifId) => {
    try {
      await api.post('/leads/notifications/mark-read', { id: notifId });
      window.dispatchEvent(new CustomEvent('lead_notifications_changed'));
    } catch (err) {
      // ignore
    }
  };

  const handleAdvance = (userInitiated = false) => {
    if (!activeAlert) return;
    if (userInitiated) {
      markAlertAsRead(activeAlert.id);
    }

    if (currentIndex < totalAlerts - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Dismiss popup
      setAlerts([]);
      setCurrentIndex(0);
    }
  };

  const handleDismissAll = async () => {
    try {
      await api.post('/leads/notifications/mark-read', {});
      window.dispatchEvent(new CustomEvent('lead_notifications_changed'));
    } catch (err) {
      // ignore
    }
    setAlerts([]);
    setCurrentIndex(0);
  };

  const handleOpenInLms = async () => {
    if (!activeAlert) return;
    await markAlertAsRead(activeAlert.id);
    if (onNavigateToLms) {
      onNavigateToLms({ id: activeAlert.leadId, companyName: activeAlert.companyName });
    }
    handleAdvance(false);
  };

  if (!activeAlert || totalAlerts === 0) return null;

  const isRevoked = activeAlert.type === 'LEAD_REVOKED';

  return (
    <div
      role="alert"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="fixed top-16 right-4 sm:right-6 z-50 max-w-md w-[92vw] sm:w-[420px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all duration-300 animate-in fade-in slide-in-from-top-3"
    >
      {/* Top Brand Accent Color Line */}
      <div className={`h-1.5 ${isRevoked ? 'bg-rose-600' : 'bg-emerald-600'}`} />

      {/* Header Bar */}
      <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              isRevoked
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {isRevoked ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <UserCheck className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight">
                {isRevoked ? 'Lead Revoked by Admin' : 'New Lead Assigned to You'}
              </span>
              {totalAlerts > 1 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {currentIndex + 1} of {totalAlerts}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {isRevoked
                ? 'Administrative lead pipeline transfer'
                : 'Opportunity allocated to your dashboard'}
            </p>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismissAll}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition cursor-pointer"
          title="Dismiss all alert popups"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Alert Content Box */}
      <div className="p-4 space-y-3">
        {/* Company & Deal Info */}
        <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                Opportunity / Client
              </span>
              <h4 className="text-sm font-black text-slate-900 leading-snug">
                {activeAlert.companyName || 'Corporate Lead'}
              </h4>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isRevoked
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {isRevoked ? 'Revoked' : 'Assigned'}
            </span>
          </div>

          {/* Reason / Admin Handover Notes Box */}
          <div
            className={`p-2.5 rounded-lg border text-xs leading-relaxed ${
              isRevoked
                ? 'bg-rose-50/60 border-rose-200/70 text-rose-950'
                : 'bg-emerald-50/60 border-emerald-200/70 text-emerald-950'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 opacity-75">
              <span>{isRevoked ? 'Reason for Revocation:' : 'Admin Notes & Instructions:'}</span>
            </div>
            <p className="font-medium italic">
              "{activeAlert.reason || activeAlert.message || 'Administrative pipeline rebalancing.'}"
            </p>
          </div>
        </div>

        {/* Action Controls & Auto-dismiss countdown bar */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-slate-400 italic">
            {isPaused ? 'Timer paused on hover' : 'Auto-dismissing...'}
          </span>
          <div className="flex items-center gap-2">
            {!isRevoked && (
              <button
                type="button"
                onClick={handleOpenInLms}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <span>Open in LMS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleAdvance(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-slate-200 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Acknowledge</span>
            </button>
          </div>
        </div>
      </div>

      {/* Countdown Progress Line at Bottom */}
      <div className="h-1 bg-slate-100 w-full overflow-hidden">
        <div
          className={`h-full transition-all duration-75 ${
            isRevoked ? 'bg-rose-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
