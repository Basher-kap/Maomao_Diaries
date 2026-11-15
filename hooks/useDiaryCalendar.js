// hooks/useDiaryCalendar.js
// Loads every calendar entry grouped by day, and runs the one-time copy of the
// month sections ("October 2026" ...) into the independent calendar store.

import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Observe } from 'expo-observe';
import { getEntryDate, getEntryDay, toDateKey, formatTime } from '../utils/diaryDates';
import { seedTitles, DAY_TITLES_KEY } from '../utils/dayTitles';
import {
  migrateMonthSections,
  splitMigratedNotes,
  getSplitStatus,
  undoSplit,
  getMigrationStatus,
  loadAllEntries,
  addCalendarNote,
  updateEntry,
  deleteEntry,
  findOrphans,
} from '../utils/calendarNotes';
import { deletePersistedImages } from '../utils/imageStorage';

export const useDiaryCalendar = () => {
  const [entriesByDay, setEntriesByDay] = useState({});
  const [totalEntries, setTotalEntries] = useState(0);
  const [migration, setMigration] = useState(null);
  const [titles, setTitles] = useState({});
  const [splitStatus, setSplitStatus] = useState({ entries: 0, notes: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // Idempotent: copies each month-section entry once, never twice
      await migrateMonthSections(AsyncStorage);
      // Cut each entry into one note per written time (9:56, 12:00, ...), once
      await splitMigratedNotes(AsyncStorage);
      const all = await loadAllEntries(AsyncStorage);

      const grouped = {};
      let count = 0;
      for (const item of all) {
        const date = getEntryDate(item); // when it was saved (gives the time of day)
        const day = getEntryDay(item); // which calendar day it belongs to (date in its header)
        if (!date || !day) continue;
        const key = toDateKey(day);
        (grouped[key] ||= []).push({
          id: item.id,
          section: item.section, // null = calendar note, string = special section
          text: item.text || '',
          images: item.images || [],
          imageCount: (item.images || []).length,
          timestamp: date.getTime(),
          time: formatTime(date),
        });
        count += 1;
      }
      Object.values(grouped).forEach((list) => list.sort((a, b) => a.timestamp - b.timestamp));

      // Day titles: apply the quoted title found in existing entries to days that have none yet
      const rawTitles = await AsyncStorage.getItem(DAY_TITLES_KEY);
      const { titles: seeded, added } = seedTitles(rawTitles ? JSON.parse(rawTitles) : {}, grouped);
      if (added > 0) await AsyncStorage.setItem(DAY_TITLES_KEY, JSON.stringify(seeded));
      setTitles(seeded);

      setEntriesByDay(grouped);
      setTotalEntries(count);
      setMigration(await getMigrationStatus(AsyncStorage));
      setSplitStatus(await getSplitStatus(AsyncStorage));
    } catch (error) {
      console.error('Error loading calendar entries:', error);
      setEntriesByDay({});
      setTotalEntries(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload whenever the screen regains focus (after editing, importing a backup, ...)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Save a title for a day. An empty string clears it and keeps it cleared.
  const setDayTitle = async (dayKey, title) => {
    const raw = await AsyncStorage.getItem(DAY_TITLES_KEY);
    const next = { ...(raw ? JSON.parse(raw) : {}), [dayKey]: (title || '').trim() };
    await AsyncStorage.setItem(DAY_TITLES_KEY, JSON.stringify(next));
    setTitles(next);
  };

  const undoTimeSplit = async () => {
    await undoSplit(AsyncStorage);
    await load();
  };

  const addNote = async (when, text, images = []) => {
    await addCalendarNote(AsyncStorage, when, text, images);
    Observe.logEvent('diary.entry_created', { attributes: { source: 'calendar' } });
    await load();
  };

  const updateNote = async (entry, text, when, images = []) => {
    await updateEntry(AsyncStorage, entry, text, when, images);
    // photos the user removed while editing
    const removed = (entry.images || []).filter((u) => !images.includes(u));
    await deletePersistedImages(await findOrphans(AsyncStorage, removed));
    Observe.logEvent('diary.entry_updated', { attributes: { source: 'calendar' } });
    await load();
  };

  const deleteNote = async (entry) => {
    const orphans = await deleteEntry(AsyncStorage, entry);
    await deletePersistedImages(orphans);
    Observe.logEvent('diary.entry_deleted', { attributes: { source: 'calendar' } });
    await load();
  };

  return {
    entriesByDay,
    totalEntries,
    migration,
    splitStatus,
    undoTimeSplit,
    titles,
    setDayTitle,
    isLoading,
    refresh: load,
    addNote,
    updateNote,
    deleteNote,
  };
};
