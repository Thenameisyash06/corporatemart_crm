import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Calendar,
  Clock,
  Building2,
  Briefcase,
  Phone,
  Mail,
  ChevronRight,
  UserX,
  UserCheck,
  AlertTriangle,
  CheckCheck,
} from 'lucide-react';
import api from '../lib/api';
import { getTodayDateDisplay } from '../lib/meetingUtils';

/**
 * Navbar Notification Dropdown & Alert Center
 * Enterprise styling (Slate / White / Subtle Accents).
 * Displays:
 * 1. Alerts & Reassignments (Lead Revocations with reason & Assignments)
 * 2. Today's Scheduled Meetings
 */
export default function MeetingNotificationDropdown({
  meetings = [],
  onNavigateToLms,
  currentUser,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALERTS'); // 'ALERTS' | 'MEETINGS'
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);

  const hasMeetings = Array.isArray(meetings) && meetings.length > 0;
  const meetingsCount = meetings.length;
  const totalBadges = unreadCount + meetingsCount;

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/leads/notifications/my');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
      // Auto-switch to alerts tab if there are unread alerts
      if (res.data.unreadCount > 0) {
        setActiveTab('ALERTS');
      }
    } catch (err) {
      // Silently fail if not logged in or endpoint busy
      console.warn('[LMS Notifications] fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleLeadsChanged = () => {
      fetchNotifications();
    };

    window.addEventListener('lms_leads_changed', handleLeadsChanged);
    window.addEventListener('lead_notifications_changed', handleLeadsChanged);

    // 60s auto-refresh, paused when browser tab is inactive to protect DB connection pool
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchNotifications();
      }
    }, 60000);

    return () => {
      window.removeEventListener('lms_leads_changed', handleLeadsChanged);
      window.removeEventListener('lead_notifications_changed', handleLeadsChanged);
      clearInterval(interval);
    };
  }, [currentUser]);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/leads/notifications/mark-read', {});
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.warn('[LMS Notifications] mark read error:', err.message);
    }
  };

  const handleSelectLead = (lead) => {
    setIsOpen(false);
    if (onNavigateToLms) {
      onNavigateToLms(lead);
    }
  };

  const handleOpenLeadFromNotification = (notif) => {
    setIsOpen(false);
    if (notif.leadId && onNavigateToLms) {
      onNavigateToLms({ id: notif.leadId, companyName: notif.companyName });
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Navbar Notification Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen && unreadCount > 0) {
            handleMarkAllRead();
          }
        }}
        title={
          totalBadges > 0
            ? `${unreadCount} unread alert${unreadCount !== 1 ? 's' : ''}, ${meetingsCount} meeting${meetingsCount !== 1 ? 's' : ''} today`
            : 'Notifications & Alerts'
        }
        className={`relative p-2 rounded-lg border transition cursor-pointer ${
          isOpen
            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-4 h-4" />

        {/* Badge counter at top right */}
        {totalBadges > 0 && (
          <span
            className={`absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full border-2 border-white shadow-xs ${
              unreadCount > 0 ? 'bg-rose-600' : 'bg-indigo-600'
            }`}
          >
            {totalBadges > 99 ? '99+' : totalBadges}
          </span>
        )}
      </button>

      {/* Detailed Overview Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[92vw] sm:w-[440px] max-w-[460px] bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden transform animate-in fade-in slide-in-from-top-2">
          {/* Panel Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-tight">Notification Center</h3>
                <p className="text-[10px] text-slate-300 font-medium">Overdue alerts, revocations & meetings</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition cursor-pointer"
                title="Mark all alerts as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark read</span>
              </button>
            )}
          </div>

          {/* Segmented Tab Controls */}
          <div className="grid grid-cols-2 bg-slate-100 border-b border-slate-200 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('ALERTS')}
              className={`py-1.5 px-3 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'ALERTS'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Alerts & Revocations</span>
              {unreadCount > 0 && (
                <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-bold font-mono">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MEETINGS')}
              className={`py-1.5 px-3 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'MEETINGS'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Meetings Today</span>
              {meetingsCount > 0 && (
                <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded-full font-bold font-mono">
                  {meetingsCount}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: ALERTS & REASSIGNMENTS */}
          {activeTab === 'ALERTS' && (
            <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100 bg-white">
              {notifications.length === 0 ? (
                <div className="py-10 px-6 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 mx-auto flex items-center justify-center text-slate-400">
                    <CheckCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">No New Notifications</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    You have no pending revocation or reassignment alerts. Keep up with your scheduled follow-ups!
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const isRevoked = n.type === 'LEAD_REVOKED';
                  const isAssigned = n.type === 'LEAD_ASSIGNED';

                  return (
                    <div
                      key={n.id}
                      className={`p-3.5 transition space-y-2 ${
                        !n.isRead ? 'bg-amber-50/30' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {isRevoked ? (
                            <span className="p-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                              <UserX className="w-3.5 h-3.5" />
                            </span>
                          ) : isAssigned ? (
                            <span className="p-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              <UserCheck className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN') : 'Just now'}
                            </span>
                          </div>
                        </div>

                        {!n.isRead && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                            New
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-700 leading-relaxed bg-slate-50 border border-slate-200/80 rounded-lg p-2 font-medium">
                        {n.message}
                      </p>

                      {n.reason && (
                        <div className="text-[11px] text-slate-600 flex items-start gap-1.5 pt-0.5">
                          <span className="font-bold text-slate-800 shrink-0">Reason:</span>
                          <span className="italic text-slate-700">"{n.reason}"</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        {n.leadId && isAssigned && (
                          <button
                            type="button"
                            onClick={() => handleOpenLeadFromNotification(n)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-semibold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <span>Open Lead in LMS</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: TODAY'S MEETINGS */}
          {activeTab === 'MEETINGS' && (
            <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100 bg-white">
              {!hasMeetings ? (
                <div className="py-10 px-6 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 mx-auto flex items-center justify-center text-slate-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">No Meetings Scheduled Today</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    You're all caught up! When a lead's meeting date is set to today ({getTodayDateDisplay()}), it will appear here.
                  </p>
                </div>
              ) : (
                meetings.map((lead) => {
                  const clientStatus = lead.clientStatus || 'Warm';
                  const isHot = clientStatus.toLowerCase() === 'hot';
                  const isLost = clientStatus.toLowerCase() === 'lost';

                  return (
                    <div
                      key={lead.id}
                      className="p-3.5 hover:bg-slate-50/80 transition space-y-2.5 group"
                    >
                      {/* Header: Company & Closer Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <h4 className="text-xs font-bold text-slate-900 truncate" title={lead.companyName}>
                              {lead.companyName}
                            </h4>
                          </div>
                          {lead.directorName && (
                            <span className="text-[10px] text-slate-500 ml-5 block truncate">
                              Contact: <strong className="text-slate-700">{lead.directorName}</strong>
                            </span>
                          )}
                        </div>

                        {/* Closer Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold border shrink-0 ${
                            (lead.closerStatus || '').toUpperCase().includes('LEAD SHARING')
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                          title={`Closer Status: ${lead.closerStatus}`}
                        >
                          <Briefcase className="w-2.5 h-2.5" />
                          <span>{lead.closerStatus || 'Self Closer'}</span>
                        </span>
                      </div>

                      {/* Meta Info Row */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                        <div>
                          <span className="text-[9px] uppercase font-semibold text-slate-500 block">
                            Meeting Type
                          </span>
                          <span className="font-semibold text-slate-800 flex items-center gap-1 truncate">
                            <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{lead.meetingStatus || 'Scheduled'}</span>
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] uppercase font-semibold text-slate-500 block">
                            Client Status
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 font-bold text-[10px] ${
                              isHot
                                ? 'text-rose-600'
                                : isLost
                                ? 'text-slate-600'
                                : 'text-amber-700'
                            }`}
                          >
                            {isHot ? '🔥 Hot' : isLost ? '❄️ Lost' : '☀️ Warm'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] uppercase font-semibold text-slate-500 block">
                            Assigned BDM
                          </span>
                          <span className="font-medium text-slate-700 truncate block" title={lead.bdmName1}>
                            {lead.bdmName1 || 'BDM'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] uppercase font-semibold text-slate-500 block">
                            Deal Value
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {lead.dealValue ? `₹${Number(lead.dealValue).toLocaleString('en-IN')}` : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Quick Contacts & Action Button */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-2.5 text-xs">
                          {lead.mobileNo && (
                            <a
                              href={`tel:${lead.mobileNo}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 font-mono hover:underline"
                              title="Call customer"
                            >
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{lead.mobileNo}</span>
                            </a>
                          )}

                          {lead.emailId && (
                            <a
                              href={`mailto:${lead.emailId}`}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                              title="Send email"
                            >
                              <Mail className="w-3 h-3 text-slate-400" />
                            </a>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectLead(lead)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-semibold transition flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                        >
                          <span>Open in LMS</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Panel Footer */}
          <div className="p-2.5 px-4 bg-slate-50 border-t border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-medium">
              Overdue follow-ups can be tracked and managed directly inside <strong>LMS Master Control</strong>.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
