// utils/dayTitles.js
// Each calendar day can have a title. Existing diary entries already carry one:
//
//   October 18, 2026
//   "Power BI Crash Course and Unite"     <- the title, in quotation marks
//
//   9:56
//   I decided ...
//
// extractTitle() finds that quoted title; the calendar page applies it to the day
// automatically (only when the day has no title yet, so edits are never overwritten).

export const DAY_TITLES_KEY = '@calendar_day_titles';

const OPENING = ['"', '“', '”', '«', '„'];
const CLOSING = /["”“»]/;
const DATE_LINE_WITH_TITLE =
  /^[A-Za-z]+\.?\s+\d{1,2},?\s+\d{4}\s*["“”«„]([^"“”«»\n]{1,120})["”“»]/;

const clean = (s) => s.replace(/[\s*_]+$/g, '').replace(/^[\s*_]+/g, '').trim();

/** The quoted title near the top of an entry, or '' if there is none. */
export const extractTitle = (text) => {
  if (!text) return '';
  const lines = text.split('\n').slice(0, 4);

  // 1) a line that starts with a quotation mark -> everything up to the closing one
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || !OPENING.includes(line[0])) continue;
    const rest = line.slice(1);
    const close = rest.search(CLOSING);
    const title = clean(close === -1 ? rest : rest.slice(0, close)); // tolerate a missing closing quote
    if (title) return title;
  }

  // 2) title on the same line as the date:  September 4, 2026 "Meetup"
  const m = (lines[0] || '').trim().match(DATE_LINE_WITH_TITLE);
  return m ? clean(m[1]) : '';
};

/** Title for a day: taken from the latest entry of that day that has one. */
export const pickTitleForDay = (entries) => {
  const byTime = [...entries].sort((a, b) => b.timestamp - a.timestamp);
  for (const e of byTime) {
    const title = extractTitle(e.text);
    if (title) return title;
  }
  return '';
};

/**
 * Fill titles for days that have none yet. A day whose key already exists in
 * `titles` (even as '') is left alone, so clearing a title on purpose sticks.
 * Returns { titles, added }.
 */
export const seedTitles = (titles, entriesByDay) => {
  const next = { ...titles };
  let added = 0;
  for (const [dayKey, entries] of Object.entries(entriesByDay)) {
    if (Object.prototype.hasOwnProperty.call(next, dayKey)) continue;
    const title = pickTitleForDay(entries);
    if (title) {
      next[dayKey] = title;
      added += 1;
    }
  }
  return { titles: next, added };
};
