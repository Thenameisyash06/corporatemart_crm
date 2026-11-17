import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Building2,
  Briefcase,
  X,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

/**
 * Professional Sequential Meeting Alert Pop-up
 * Matches CorporateMart CRM's clean enterprise theme (Slate / White / Subtle Accents).
 *
 * Behavior:
 * - If there are multiple meetings today, displays them sequentially one by one (e.g. 4 seconds each).
 * - Meeting 1 displays for 4 seconds -> then transitions to Meeting 2 -> Meeting 3, etc.
 * - Pauses countdown on hover so the user can inspect details comfortably.
 * - Cancel button (X) at top right immediately removes/dismisses the pop-up queue.
 * - View in LMS navigates directly to the meeting in the LMS workbench.
 *
 * Props:
 * - meetings: Array of lead objects that have meetingDate scheduled for today
 * - onClose: Callback to dismiss the pop-up
 * - onNavigateToLms: Callback to switch active tab to LMS and highlight meeting
 * - durationMs: Duration in milliseconds before advancing to next meeting (default: 4000ms = 4s)
 */
export default function MeetingTodayPopup({
  meetings = [],
  onClose,
  onNavigateToLms,
  durationMs = 4000,
}) {
  if (!meetings || meetings.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  const activeMeeting = meetings[currentIndex] || meetings[0];
  const totalMeetings = meetings.length;

  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(durationMs);

  // Reset timer whenever currentIndex changes (advancing to next meeting in queue)
  useEffect(() => {
    remainingTimeRef.current = durationMs;
    startTimeRef.current = Date.now();
    setProgress(100);
  }, [currentIndex, durationMs]);

  // Sequential countdown timer (4 seconds per meeting) with pause-on-hover
  useEffect(() => {
    if (isPaused) return;

    startTimeRef.current = Date.now();
    const interval = 50;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentRemaining = Math.max(0, remainingTimeRef.current - elapsed);
      const pct = (currentRemaining / durationMs) * 100;
      setProgress(pct);

      if (currentRemaining <= 0) {
        clearInterval(timer);
        if (currentIndex < totalMeetings - 1) {
          // Advance to the next meeting popup in sequence
          setCurrentIndex((prev) => prev + 1);
        } else {
          // All popups in the queue have completed
          onClose();
        }
      }
    }, interval);

    return () => {
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
      clearInterval(timer);
    };
  }, [currentIndex, isPaused, durationMs, totalMeetings, onClose]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  const handleNextMeeting = () => {
    if (currentIndex < totalMeetings - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed top-16 right-4 sm:right-6 z-50 max-w-md w-[92vw] sm:w-[410px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden transform transition-all duration-300 animate-in fade-in slide-in-from-top-3"
    >
      {/* Top Corporate Brand Accent Line */}
      <div className="h-1 bg-slate-900" />

      {/* Header Bar */}
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                Scheduled Meeting
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wide">
                {totalMeetings > 1 ? `${currentIndex + 1} of ${totalMeetings}` : 'Today'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {totalMeetings > 1
                ? `Follow-up alert ${currentIndex + 1} of ${totalMeetings} scheduled for today`
                : 'Official client follow-up reminder'}
            </p>
          </div>
        </div>

        {/* Cancel button at top right to remove/dismiss popups */}
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition cursor-pointer"
          title="Cancel and dismiss all meeting alerts"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-3">
        {/* Animated Meeting Details Box */}
        <div
          key={activeMeeting.id || currentIndex}
          className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-2.5 animate-in fade-in slide-in-from-right-2 duration-200"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Company Name
                </span>
                <h4 className="text-sm font-bold text-slate-900 truncate" title={activeMeeting.companyName}>
                  {activeMeeting.companyName}
                </h4>
              </div>
            </div>

            {/* Closer Status Badge */}
            <div className="shrink-0 text-right">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Closer Status
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border mt-0.5 ${
                  activeMeeting.closerStatus === 'Lead Sharing'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                <Briefcase className="w-3 h-3" />
                <span>{activeMeeting.closerStatus || 'Self Closer'}</span>
              </span>
            </div>
          </div>

          {/* Meeting Details Row */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 text-slate-600 flex-wrap gap-2">
            <div className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-semibold text-slate-800">
                {activeMeeting.meetingStatus || 'Scheduled Meeting'}
              </span>
            </div>

            {activeMeeting.directorName && (
              <span className="text-[11px] text-slate-500 truncate max-w-[170px]" title={activeMeeting.directorName}>
                Contact: <strong className="text-slate-800">{activeMeeting.directorName}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Footer: Multi-meeting indicators & Actions */}
        <div className="flex items-center justify-between pt-0.5 gap-2">
          {totalMeetings > 1 ? (
            <div className="flex items-center gap-1.5">
              {meetings.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === currentIndex ? 'w-5 bg-slate-900' : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  title={`Jump to meeting ${i + 1}`}
                />
              ))}
              {currentIndex < totalMeetings - 1 && (
                <button
                  type="button"
                  onClick={handleNextMeeting}
                  className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold ml-1 flex items-center transition cursor-pointer"
                  title="Skip to next meeting"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 italic">
              Auto-closing in a moment...
            </span>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                if (onNavigateToLms) onNavigateToLms(activeMeeting);
                onClose();
              }}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <span>View in LMS</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Auto-dismiss Animated Progress Bar (resets for each 4-second meeting cycle) */}
      <div className="w-full bg-slate-100 h-1">
        <div
          className="bg-slate-800 h-full transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
