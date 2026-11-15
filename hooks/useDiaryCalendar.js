// hooks/useDiaryCalendar.js
// Loads every calendar entry grouped by day, and runs the one-time copy of the
// month sections ("October 2026" ...) into the independent calendar store.

import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Observe } from 'expo-observe';
import { getEntryDate, toDateKey, formatTime } from '../utils/diaryDates';
import {
  migrateMonthSections,
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
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // Idempotent: copies each month-section entry once, never twice
      await migrateMonthSections(AsyncStorage);
      const all = await loadAllEntries(AsyncStorage);

      const grouped = {};
      let count = 0;
      for (const item of all) {
        const date = getEntryDate(item);
        if (!date) continue;
        const key = toDateKey(date);
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

      setEntriesByDay(grouped);
      setTotalEntries(count);
      setMigration(await getMigrationStatus(AsyncStorage));
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
    isLoading,
    refresh: load,
    addNote,
    updateNote,
    deleteNote,
  };
};
