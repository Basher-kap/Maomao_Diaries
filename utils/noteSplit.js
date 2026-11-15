// utils/noteSplit.js
// A migrated diary entry looks like this:
//
//   August 5, 2026                      <- header (date + quoted title), becomes the day title
//   "Black Cat with Bell"
//
//   9:56                                <- a time on its own line starts a new part
//   I decided for now ...
//
//   20:22 - 23:00                       <- ranges start at the first time
//   Playing ...
//
//   18:00 - ML                          <- "time - label" keeps the label as the first line
//
// splitNoteByTime() cuts the entry into one part per time. Times are 24-hour
// (an explicit am/pm is understood too). Times mentioned inside a sentence are
// NOT split points; only lines that start with a time are.

const TIME_LINE = /^\s*(\d{1,2}):(\d{2})\s*([AaPp]\.?[Mm]\.?)?\s*(.*?)\s*$/;
const DASH = /^[-–—]\s*/;
const RANGE_REST = /^[-–—]\s*\d{1,2}:\d{2}/;
const QUOTE_START = /^["“”«„]/;
const DATE_ONLY =
  /^[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}\s*(["“”«„][^\n]*)?$/; // "October 1, 2026" (+ optional same-line title)

const imageId = (uri) => uri.split('/').pop();
const tidy = (s) => s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

export const parseTimeLine = (line) => {
  const m = line.match(TIME_LINE);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const meridiem = m[3] ? m[3].replace(/\./g, '').toLowerCase() : null;
  const rest = m[4];

  if (minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }

  let label = '';
  if (rest) {
    // "10:00 I woke up" is a sentence, not a time marker
    if (!DASH.test(rest)) return null;
    label = RANGE_REST.test(rest) ? line.trim() : rest.replace(DASH, '').trim();
  }
  return { hour, minute, label };
};

const isHeaderLine = (line) => {
  const t = line.trim();
  return !t || DATE_ONLY.test(t) || QUOTE_START.test(t);
};

/**
 * Split one note into parts by the times written in it.
 * Returns [{ hour, minute, text, images }] or null when there is nothing to split
 * (no time lines, or no content after them).
 */
export const splitNoteByTime = (note) => {
  const lines = String(note.text || '').split('\n');
  const marks = [];
  lines.forEach((line, i) => {
    const t = parseTimeLine(line);
    if (t) marks.push({ i, ...t });
  });
  if (!marks.length) return null;

  // Whatever is before the first time: drop the header (date + title line), keep anything else
  const leftover = tidy(
    lines
      .slice(0, marks[0].i)
      .filter((l) => !isHeaderLine(l))
      .join('\n')
  );

  const parts = marks
    .map((mk, k) => {
      const end = k + 1 < marks.length ? marks[k + 1].i : lines.length;
      const body = lines.slice(mk.i + 1, end).join('\n');
      return { hour: mk.hour, minute: mk.minute, text: tidy([mk.label, body].filter(Boolean).join('\n')) };
    })
    .filter((p) => p.text); // a time with nothing after it carries no content

  if (leftover) {
    if (parts.length) parts[0].text = `${leftover}\n\n${parts[0].text}`;
    else parts.push({ hour: marks[0].hour, minute: marks[0].minute, text: leftover });
  }
  if (!parts.length) return null;

  // Photos follow the part that holds their ⟦img:...⟧ tag
  const images = note.images || [];
  parts.forEach((p) => {
    p.images = images.filter((uri) => p.text.includes(`⟦img:${imageId(uri)}⟧`));
  });
  const placed = new Set(parts.flatMap((p) => p.images));
  parts[0].images.push(...images.filter((uri) => !placed.has(uri))); // never orphan a photo

  return parts;
};
