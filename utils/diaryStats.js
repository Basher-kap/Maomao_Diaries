// utils/diaryStats.js
// Turns the calendar's entries ({ "2026-10-18": [note, ...] }) into the numbers
// behind the dashboard reports. Pure functions: no storage, no React.

import { getTone } from './moods';
import { toDateKey } from './diaryDates';

const DAY = 86400000;

export const wordCount = (text) => {
  const t = String(text || '').replace(/⟦img:[^⟧]+⟧/g, ' ').trim();
  return t ? t.split(/\s+/).length : 0;
};

const keyToDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / DAY);

export const formatCount = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const formatCompact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

export const formatHour = (h) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

/** Longest run of consecutive days with a note. */
const longestStreakOf = (sortedKeys) => {
  let best = 0;
  let run = 0;
  let prev = null;
  for (const key of sortedKeys) {
    const date = keyToDate(key);
    run = prev && daysBetween(prev, date) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
};

/** Week columns (Sunday first) for a GitHub-style heatmap ending this week. */
const buildHeatmap = (perDay, now, weeks = 53) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setDate(start.getDate() - today.getDay() - (weeks - 1) * 7);

  // quartiles of written words decide the colour level (relative to your own writing)
  const sorted = Object.values(perDay)
    .map((d) => d.words)
    .filter((w) => w > 0)
    .sort((a, b) => a - b);
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] || 0;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  const levelOf = (words) => (words <= 0 ? 0 : words <= q1 ? 1 : words <= q2 ? 2 : words <= q3 ? 3 : 4);

  const columns = [];
  const monthLabels = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w += 1) {
    const col = [];
    for (let d = 0; d < 7; d += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const key = toDateKey(date);
      const info = perDay[key];
      col.push({
        key,
        future: date > today,
        notes: info ? info.notes : 0,
        words: info ? info.words : 0,
        level: info ? levelOf(info.words) : 0,
      });
    }
    const firstOfCol = new Date(start);
    firstOfCol.setDate(start.getDate() + w * 7);
    if (firstOfCol.getMonth() !== lastMonth) {
      monthLabels.push({ col: w, month: firstOfCol.getMonth() });
      lastMonth = firstOfCol.getMonth();
    }
    columns.push(col);
  }
  return { columns, monthLabels };
};

export const computeStats = (entriesByDay, now = new Date()) => {
  const dayKeys = Object.keys(entriesByDay).sort();
  const perDay = {};
  const hours = Array(24).fill(0);
  const weekdays = Array(7).fill(0);
  const months = Array.from({ length: 12 }, () => ({ notes: 0, words: 0 }));
  const moodAll = {};
  const mood30 = {};
  const moodByDay = {};
  let totalNotes = 0;
  let totalWords = 0;
  let photos = 0;
  let longestNote = { words: 0, key: null };

  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cutoff30 = toDateKey(new Date(todayDate.getTime() - 29 * DAY));

  for (const key of dayKeys) {
    const date = keyToDate(key);
    const day = { notes: 0, words: 0, photos: 0 };
    for (const e of entriesByDay[key]) {
      const words = wordCount(e.text);
      day.notes += 1;
      day.words += words;
      day.photos += e.imageCount || 0;
      hours[new Date(e.timestamp).getHours()] += 1;
      weekdays[date.getDay()] += 1;
      if (date.getFullYear() === now.getFullYear()) {
        months[date.getMonth()].notes += 1;
        months[date.getMonth()].words += words;
      }
      if (words > longestNote.words) longestNote = { words, key };
      if (e.mood) {
        moodAll[e.mood] = (moodAll[e.mood] || 0) + 1;
        if (key >= cutoff30) mood30[e.mood] = (mood30[e.mood] || 0) + 1;
        (moodByDay[key] ||= []).push(e.mood);
      }
    }
    perDay[key] = day;
    totalNotes += day.notes;
    totalWords += day.words;
    photos += day.photos;
  }

  // busiest day = most words
  let busiest = { key: null, words: 0, notes: 0 };
  for (const [key, d] of Object.entries(perDay)) if (d.words > busiest.words) busiest = { key, ...d };

  // streaks
  const longestStreak = longestStreakOf(dayKeys);
  let currentStreak = 0;
  {
    const d = new Date(todayDate);
    if (!perDay[toDateKey(d)]) d.setDate(d.getDate() - 1); // today not written yet: streak is still alive
    while (perDay[toDateKey(d)]) {
      currentStreak += 1;
      d.setDate(d.getDate() - 1);
    }
  }

  // consistency since the first entry
  const firstKey = dayKeys[0] || null;
  const spanDays = firstKey ? daysBetween(keyToDate(firstKey), todayDate) + 1 : 0;
  const consistency = spanDays > 0 ? Math.round((dayKeys.length / spanDays) * 100) : 0;

  // time of day
  const buckets = [
    { id: 'night', label: 'Late night', range: '12–6 AM', icon: 'moon', count: 0 },
    { id: 'morning', label: 'Morning', range: '6 AM–12 PM', icon: 'sunny', count: 0 },
    { id: 'afternoon', label: 'Afternoon', range: '12–6 PM', icon: 'partly-sunny', count: 0 },
    { id: 'evening', label: 'Evening', range: '6 PM–12 AM', icon: 'cloudy-night', count: 0 },
  ];
  hours.forEach((n, h) => {
    buckets[h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3].count += n;
  });
  const peakHour = hours.indexOf(Math.max(...hours));

  // mood: dominant mood and tone per day, last 14 days
  const moodTimeline = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(todayDate.getTime() - i * DAY);
    const key = toDateKey(d);
    const list = moodByDay[key] || [];
    const tally = {};
    list.forEach((m) => (tally[m] = (tally[m] || 0) + 1));
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    const score = list.length
      ? list.reduce((s, m) => s + (getTone(m) === 'up' ? 1 : getTone(m) === 'down' ? -1 : 0), 0) / list.length
      : null;
    moodTimeline.push({ key, mood: top ? top[0] : null, score, label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()], isToday: i === 0 });
  }
  const toneTotals = (counts) => {
    const t = { up: 0, mid: 0, down: 0 };
    Object.entries(counts).forEach(([id, n]) => (t[getTone(id)] += n));
    return t;
  };

  return {
    totalNotes,
    totalWords,
    photos,
    daysWritten: dayKeys.length,
    avgWordsPerNote: totalNotes ? Math.round(totalWords / totalNotes) : 0,
    firstKey,
    consistency,
    currentStreak,
    longestStreak,
    busiest,
    longestNote,
    hours,
    peakHour,
    buckets,
    weekdays,
    months,
    heatmap: buildHeatmap(perDay, now),
    mood: {
      all: moodAll,
      last30: mood30,
      totalAll: Object.values(moodAll).reduce((a, b) => a + b, 0),
      total30: Object.values(mood30).reduce((a, b) => a + b, 0),
      tonesAll: toneTotals(moodAll),
      tones30: toneTotals(mood30),
      timeline: moodTimeline,
    },
  };
};
