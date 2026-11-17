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
} from 'lucide-react';
import { getTodayDateDisplay } from '../lib/meetingUtils';

/**
 * Navbar Notification Button & Detailed Overview Flyout Panel
 * Matches CorporateMart CRM's clean enterprise theme (Slate / White / Subtle Accents).
 * Shows today's scheduled meetings with an indicator dot at the top-right.
 *
 * Props:
 * - meetings: Array of LMS leads scheduled for today
 * - onNavigateToLms: Function(lead) -> switches to LMS tab & views lead
 */
export default function MeetingNotificationDropdown({
  meetings = [],
  onNavigateToLms,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const hasMeetings = Array.isArray(meetings) && meetings.length > 0;
  const count = meetings.length;

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

  const handleSelectLead = (lead) => {
    setIsOpen(false);
    if (onNavigateToLms) {
      onNavigateToLms(lead);
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Navbar Notification Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={
          hasMeetings
            ? `${count} client meeting${count > 1 ? 's' : ''} scheduled for today`
            : "No meetings scheduled for today"
        }
        className={`relative p-2 rounded-lg border transition cursor-pointer ${
          isOpen
            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-4 h-4" />

        {/* Indicator Dot at top right when there is a meeting today */}
        {hasMeetings && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white" />
          </span>
        )}
      </button>

      {/* Detailed Overview Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[92vw] sm:w-[420px] max-w-[440px] bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden transform animate-in fade-in slide-in-from-top-2">
          {/* Panel Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-tight">Today's Scheduled Meetings</h3>
                <p className="text-[10px] text-slate-300 font-medium">{getTodayDateDisplay()}</p>
              </div>
            </div>

            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                hasMeetings
                  ? 'bg-rose-500/20 text-rose-200 border-rose-400/30'
                  : 'bg-white/10 text-slate-300 border-white/20'
              }`}
            >
              {hasMeetings ? `${count} Today` : '0 Scheduled'}
            </span>
          </div>

          {/* Panel Body */}
          <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100 bg-white">
            {!hasMeetings ? (
              <div className="py-10 px-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 mx-auto flex items-center justify-center text-slate-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">No Meetings Scheduled Today</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                  You're all caught up! When a lead's meeting date is set to today, it will appear here with instant reminders.
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
                          lead.closerStatus === 'Lead Sharing'
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
                      {/* Meeting Status */}
                      <div>
                        <span className="text-[9px] uppercase font-semibold text-slate-500 block">
                          Meeting Type
                        </span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1 truncate">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{lead.meetingStatus || 'Scheduled'}</span>
                        </span>
                      </div>

                      {/* Client Status */}
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

                      {/* Primary BDM */}
                      <div>
                        <span className="text-[9px] uppercase font-semibold text-slate-500 block">
                          Assigned BDM
                        </span>
                        <span className="font-medium text-slate-700 truncate block" title={lead.bdmName1}>
                          {lead.bdmName1 || 'BDM'}
                        </span>
                      </div>

                      {/* Deal Value */}
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
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-semibold transition flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
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

          {/* Panel Footer */}
          {hasMeetings && (
            <div className="p-2.5 px-4 bg-slate-50 border-t border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 font-medium">
                Click <strong>Open in LMS</strong> to review notes or log frozen follow-ups.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
