// utils/calendarNotes.js
// Calendar notes live in their OWN store (@calendar_notes), independent of the
// sidebar sections. Month sections ("October 2026") are copied into it once, so
// they can be deleted from the sidebar without losing any note or photo.
// `storage` is AsyncStorage (injected so this file can be tested outside the app).

import { getEntryDate, formatLocaleString } from './diaryDates';

export const KEYS = {
  SECTIONS: '@diary_sections',
  ITEMS: '@diary_items_',
  CALENDAR: '@calendar_notes',
  MIGRATED: '@calendar_migrated', // ["Section::id", ...] copied once, never copied again
  BACKUP_CALENDAR: '@backup_calendar_notes',
  BACKUP_ITEMS: '@backup_diary_items_',
  BACKUP_METADATA: '@backup_metadata',
};

const MONTHS =
  'January|February|March|April|May|June|July|August|September|October|November|December';
const MONTH_SECTION = new RegExp(`^(${MONTHS}) \\d{4}$`);

export const isMonthSection = (name) => MONTH_SECTION.test((name || '').trim());
export const migrationKey = (section, id) => `${section}::${id}`;

const readJson = async (storage, key, fallback) => {
  const raw = await storage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
};

const writeBackup = async (storage, backupKey, data) => {
  const now = new Date().toISOString();
  await storage.setItem(backupKey, JSON.stringify({ data, timestamp: now, version: 1 }));
  await storage.setItem(
    KEYS.BACKUP_METADATA,
    JSON.stringify({ lastBackup: now, backupKey, status: 'success' })
  );
};

const newestFirst = (items) =>
  [...items].sort(
    (a, b) => (getEntryDate(b)?.getTime() ?? 0) - (getEntryDate(a)?.getTime() ?? 0)
  );

const saveCalendar = async (storage, notes) => {
  const sorted = newestFirst(notes);
  await storage.setItem(KEYS.CALENDAR, JSON.stringify(sorted));
  await writeBackup(storage, KEYS.BACKUP_CALENDAR, sorted);
};

const saveSectionItems = async (storage, section, items) => {
  await storage.setItem(KEYS.ITEMS + section, JSON.stringify(items));
  await writeBackup(storage, KEYS.BACKUP_ITEMS + section, items);
};

// ---------------------------------------------------------------- migration

/**
 * Copies every entry of every month-named section into the calendar store.
 * Safe to run any number of times: each entry is copied once, and a note you
 * later delete from the calendar is NOT brought back.
 */
export const migrateMonthSections = async (storage) => {
  const sections = await readJson(storage, KEYS.SECTIONS, []);
  const notes = await readJson(storage, KEYS.CALENDAR, []);
  const migrated = new Set(await readJson(storage, KEYS.MIGRATED, []));
  const usedIds = new Set(notes.map((n) => n.id));

  let copied = 0;
  for (const section of sections.filter(isMonthSection)) {
    const items = await readJson(storage, KEYS.ITEMS + section, []);
    for (const it of items) {
      const key = migrationKey(section, it.id);
      if (migrated.has(key)) continue;

      let id = it.id;
      while (usedIds.has(id)) id += 1; // keep calendar ids unique
      usedIds.add(id);

      notes.push({ ...it, id, images: it.images || [], migratedFrom: section });
      migrated.add(key);
      copied += 1;
    }
  }

  if (copied > 0) {
    await saveCalendar(storage, notes);
    await storage.setItem(KEYS.MIGRATED, JSON.stringify([...migrated]));
  }
  return { copied };
};

/** How ready the month sections are to be deleted from the sidebar. */
export const getMigrationStatus = async (storage) => {
  const sections = await readJson(storage, KEYS.SECTIONS, []);
  const migrated = new Set(await readJson(storage, KEYS.MIGRATED, []));
  const monthSections = sections.filter(isMonthSection);

  let monthEntries = 0;
  let pending = 0;
  for (const section of monthSections) {
    const items = await readJson(storage, KEYS.ITEMS + section, []);
    monthEntries += items.length;
    pending += items.filter((it) => !migrated.has(migrationKey(section, it.id))).length;
  }
  return { monthSections: monthSections.length, monthEntries, pending, safeToDelete: pending === 0 };
};

// ------------------------------------------------------------------- reading

/** All entries for the calendar: the calendar store + special (non-month) sections. */
export const loadAllEntries = async (storage) => {
  const sections = await readJson(storage, KEYS.SECTIONS, []);
  const notes = await readJson(storage, KEYS.CALENDAR, []);
  const migrated = new Set(await readJson(storage, KEYS.MIGRATED, []));

  const entries = notes.map((n) => ({ ...n, section: null }));
  for (const section of sections) {
    const items = await readJson(storage, KEYS.ITEMS + section, []);
    for (const it of items) {
      // already represented in the calendar store -> don't show twice
      if (migrated.has(migrationKey(section, it.id))) continue;
      entries.push({ ...it, section });
    }
  }
  return entries;
};

// ------------------------------------------------------------------- photos

const collectImages = (items) => items.flatMap((it) => it.images || []);

/** Every photo URI still used by a calendar note or any section entry. */
export const getReferencedImages = async (storage, { excludeCalendarId = null } = {}) => {
  const sections = await readJson(storage, KEYS.SECTIONS, []);
  const notes = await readJson(storage, KEYS.CALENDAR, []);
  const used = new Set(collectImages(notes.filter((n) => n.id !== excludeCalendarId)));
  for (const section of sections) {
    collectImages(await readJson(storage, KEYS.ITEMS + section, [])).forEach((u) => used.add(u));
  }
  return used;
};

/** Photos of the calendar store only — used so deleting a section never wipes them. */
export const getCalendarImages = async (storage) =>
  new Set(collectImages(await readJson(storage, KEYS.CALENDAR, [])));

// ---------------------------------------------------------------------- CRUD

/** Add a note stamped with `when` (the calendar day + chosen time). */
export const addCalendarNote = async (storage, when, text, images = []) => {
  const notes = await readJson(storage, KEYS.CALENDAR, []);
  let id = Date.now();
  while (notes.some((n) => n.id === id)) id += 1;

  const note = {
    id,
    text,
    images,
    createdAt: formatLocaleString(when),
    lastModified: formatLocaleString(new Date()),
  };
  await saveCalendar(storage, [note, ...notes]);
  return note;
};

/**
 * Update text / time / photos of an entry. `entry.section` is null for calendar
 * notes, or the section name for special-section entries.
 */
export const updateEntry = async (storage, entry, text, when, images) => {
  const patch = (it) => ({
    ...it,
    text,
    images,
    createdAt: formatLocaleString(when),
    lastModified: formatLocaleString(new Date()),
  });

  if (entry.section) {
    const items = await readJson(storage, KEYS.ITEMS + entry.section, []);
    await saveSectionItems(
      storage,
      entry.section,
      newestFirst(items.map((it) => (it.id === entry.id ? patch(it) : it)))
    );
  } else {
    const notes = await readJson(storage, KEYS.CALENDAR, []);
    await saveCalendar(storage, notes.map((it) => (it.id === entry.id ? patch(it) : it)));
  }
};

/** Delete an entry. Returns the photo URIs that nothing references anymore. */
export const deleteEntry = async (storage, entry) => {
  if (entry.section) {
    const items = await readJson(storage, KEYS.ITEMS + entry.section, []);
    await saveSectionItems(storage, entry.section, items.filter((it) => it.id !== entry.id));
  } else {
    const notes = await readJson(storage, KEYS.CALENDAR, []);
    await saveCalendar(storage, notes.filter((it) => it.id !== entry.id));
  }
  return findOrphans(storage, entry.images || []);
};

/** From `uris`, those no calendar note / section entry uses anymore. */
export const findOrphans = async (storage, uris) => {
  if (!uris.length) return [];
  const used = await getReferencedImages(storage);
  return uris.filter((u) => !used.has(u));
};
