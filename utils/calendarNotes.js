// utils/calendarNotes.js
// Storage logic for notes written directly on calendar days.
// Uses the exact same AsyncStorage keys/format as useDiaryStorage, so backups,
// the section screen and AI search keep working with these notes.
// `storage` is AsyncStorage (injected so this file can be tested outside the app).

import { getEntryDate, formatLocaleString, monthSectionName } from './diaryDates';

const KEYS = {
  SECTIONS: '@diary_sections',
  ITEMS: '@diary_items_',
  BACKUP_SECTIONS: '@backup_diary_sections',
  BACKUP_ITEMS: '@backup_diary_items_',
  BACKUP_METADATA: '@backup_metadata',
};

const writeBackup = async (storage, backupKey, data) => {
  const now = new Date().toISOString();
  await storage.setItem(backupKey, JSON.stringify({ data, timestamp: now, version: 1 }));
  await storage.setItem(
    KEYS.BACKUP_METADATA,
    JSON.stringify({ lastBackup: now, backupKey, status: 'success' })
  );
};

const readJson = async (storage, key, fallback) => {
  const raw = await storage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
};

// newest first, like the rest of the app
const sortNewestFirst = (items) =>
  [...items].sort((a, b) => {
    const ta = getEntryDate(a)?.getTime() ?? 0;
    const tb = getEntryDate(b)?.getTime() ?? 0;
    return tb - ta;
  });

const saveItems = async (storage, section, items) => {
  await storage.setItem(KEYS.ITEMS + section, JSON.stringify(items));
  await writeBackup(storage, KEYS.BACKUP_ITEMS + section, items);
};

/** Add a note stamped with `when` (the calendar day + chosen time). */
export const addCalendarNote = async (storage, when, text) => {
  const section = monthSectionName(when);

  const sections = await readJson(storage, KEYS.SECTIONS, []);
  if (!sections.includes(section)) {
    const next = [section, ...sections];
    await storage.setItem(KEYS.SECTIONS, JSON.stringify(next));
    await writeBackup(storage, KEYS.BACKUP_SECTIONS, next);
  }

  const items = await readJson(storage, KEYS.ITEMS + section, []);
  let id = Date.now();
  while (items.some((it) => it.id === id)) id += 1;

  const note = {
    id,
    text,
    images: [],
    createdAt: formatLocaleString(when),
    lastModified: formatLocaleString(new Date()),
  };

  await saveItems(storage, section, sortNewestFirst([note, ...items]));
  return { section, note };
};

/** Change a note's text and/or time (same day, so it stays in its section). */
export const updateCalendarNote = async (storage, section, id, text, when) => {
  const items = await readJson(storage, KEYS.ITEMS + section, []);
  const next = items.map((it) =>
    it.id === id
      ? { ...it, text, createdAt: formatLocaleString(when), lastModified: formatLocaleString(new Date()) }
      : it
  );
  await saveItems(storage, section, sortNewestFirst(next));
};

export const deleteCalendarNote = async (storage, section, id) => {
  const items = await readJson(storage, KEYS.ITEMS + section, []);
  await saveItems(storage, section, items.filter((it) => it.id !== id));
};
