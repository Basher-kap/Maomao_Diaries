// utils/diaryDates.js
// Turns a diary entry into a real Date so it can be placed on a calendar.
//
// Entries are saved by useDiaryStorage with:
//   id        -> Date.now() at creation (epoch milliseconds)
//   createdAt -> new Date().toLocaleString()  (e.g. "10/18/2026, 9:32:55 PM")
// createdAt is locale-dependent, so it is parsed first (it is the time the
// user sees) and `id` is the fallback when the string can't be understood.

const EN_US_PATTERN =
  /(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?/;

export const parseLocaleString = (value) => {
  if (typeof value !== 'string') return null;
  // Newer JS engines use a narrow no-break space (U+202F) before AM/PM.
  const m = value.replace(/[\u202f\u00a0]/g, ' ').match(EN_US_PATTERN);
  if (!m) return null;

  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  let hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] || 0);
  const meridiem = m[7] ? m[7].toUpperCase() : null;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  const date = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getEntryDate = (item) => {
  const fromText = parseLocaleString(item?.createdAt);
  if (fromText) return fromText;

  if (typeof item?.id === 'number' && item.id > 0) {
    const fromId = new Date(item.id);
    if (!Number.isNaN(fromId.getTime())) return fromId;
  }

  const fromModified = parseLocaleString(item?.lastModified);
  return fromModified || null;
};

const pad = (n) => String(n).padStart(2, '0');

// "2026-10-18" in the device's local time zone (used as the calendar day key)
export const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatTime = (date) => {
  let h = date.getHours();
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad(date.getMinutes())} ${suffix}`;
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const formatLongDate = (date) =>
  `${WEEKDAY_SHORT[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

// Build the 6x7 grid of days for a month (Sunday first)
export const buildMonthGrid = (year, month) => {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

// "11/15/2026, 9:05:30 PM" — same shape the app has always saved in createdAt,
// but built by hand so it never depends on the phone's language settings.
export const formatLocaleString = (date) => {
  let h = date.getHours();
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}, ${h}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${suffix}`;
};

// Notes written on the calendar are filed in the month section ("November 2026"),
// matching how the existing diary is organised.
export const monthSectionName = (date) =>
  `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

// Same day as `day`, with the given 24h clock time
export const withTime = (day, hour24, minute, second = 0) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour24, minute, second);

// Consecutive days with at least one entry, counting back from today.
// If nothing is written today yet, the streak is still alive from yesterday.
export const computeStreak = (entriesByDay, today = new Date()) => {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!(entriesByDay[toDateKey(day)] || []).length) day.setDate(day.getDate() - 1);
  let streak = 0;
  while ((entriesByDay[toDateKey(day)] || []).length) {
    streak += 1;
    day.setDate(day.getDate() - 1);
  }
  return streak;
};

// The last `n` days ending today, oldest first: [{ key, label, isToday }]
export const lastNDays = (n, today = new Date()) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1 - i));
    return { key: toDateKey(d), label: WEEKDAY_SHORT[d.getDay()].slice(0, 1), isToday: i === n - 1 };
  });
