/**
 * Utilities for Lead Management System Meeting Notifications & Date Checks
 */

/**
 * Checks whether a given meetingDate string or Date object falls on today's calendar date.
 * Handles local date, UTC date, and ISO string formats without timezone distortion.
 *
 * @param {string | Date} meetingDate
 * @param {Date} [referenceDate=new Date()]
 * @returns {boolean}
 */
export function isTodayMeeting(meetingDate, referenceDate = new Date()) {
  if (!meetingDate) return false;

  const nowYear = referenceDate.getFullYear();
  const nowMonth = referenceDate.getMonth(); // 0-indexed
  const nowDate = referenceDate.getDate();

  // 1. Try Date object parsing
  const d = new Date(meetingDate);
  if (!isNaN(d.getTime())) {
    // Check local calendar day
    if (d.getFullYear() === nowYear && d.getMonth() === nowMonth && d.getDate() === nowDate) {
      return true;
    }
    // Check UTC calendar day (to handle database UTC midnight storage)
    if (d.getUTCFullYear() === nowYear && d.getUTCMonth() === nowMonth && d.getUTCDate() === nowDate) {
      return true;
    }
  }

  // 2. Direct string checking (handles 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ssZ', 'DD/MM/YYYY')
  if (typeof meetingDate === 'string') {
    const raw = meetingDate.trim();
    const isoDatePart = raw.split('T')[0].split(' ')[0];
    const nowIso = `${nowYear}-${String(nowMonth + 1).padStart(2, '0')}-${String(nowDate).padStart(2, '0')}`;
    if (isoDatePart === nowIso) return true;

    const ddmmyyyy = `${String(nowDate).padStart(2, '0')}/${String(nowMonth + 1).padStart(2, '0')}/${nowYear}`;
    const ddmmyyyyDash = `${String(nowDate).padStart(2, '0')}-${String(nowMonth + 1).padStart(2, '0')}-${nowYear}`;
    if (raw.includes(ddmmyyyy) || raw.includes(ddmmyyyyDash)) return true;
  }

  return false;
}

/**
 * Filter an array of LMS leads down to active leads scheduled for today.
 *
 * @param {Array} leads
 * @returns {Array}
 */
export function filterTodayMeetings(leads) {
  if (!Array.isArray(leads)) return [];
  return leads.filter((lead) => {
    if (!lead || !lead.meetingDate) return false;
    // Exclude leads that were closed lost
    if (lead.leadStatus === 'CLOSED_LOST') return false;
    return isTodayMeeting(lead.meetingDate);
  });
}

/**
 * Format today's date for header display.
 * @returns {string} e.g. "Tuesday, 17 Nov 2026"
 */
export function getTodayDateDisplay() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
