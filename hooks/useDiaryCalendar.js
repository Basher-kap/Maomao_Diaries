// hooks/useDiaryCalendar.js
// Reads every section from AsyncStorage and groups all entries by the
// calendar day (and time) they were written.

import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './useDiaryStorage';
import { getEntryDate, toDateKey, formatTime } from '../utils/diaryDates';
import { addCalendarNote, updateCalendarNote, deleteCalendarNote } from '../utils/calendarNotes';
import { Observe } from 'expo-observe';

export const useDiaryCalendar = () => {
  const [entriesByDay, setEntriesByDay] = useState({});
  const [totalEntries, setTotalEntries] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const rawSections = await AsyncStorage.getItem(STORAGE_KEYS.SECTIONS);
      const sections = rawSections ? JSON.parse(rawSections) : [];

      const grouped = {};
      let count = 0;

      for (const section of sections) {
        const rawItems = await AsyncStorage.getItem(STORAGE_KEYS.ITEMS + section);
        if (!rawItems) continue;

        for (const item of JSON.parse(rawItems)) {
          const date = getEntryDate(item);
          if (!date) continue;

          const key = toDateKey(date);
          (grouped[key] ||= []).push({
            id: item.id,
            section,
            text: item.text || '',
            imageCount: (item.images || []).length,
            timestamp: date.getTime(),
            time: formatTime(date),
          });
          count += 1;
        }
      }

      // Earliest first inside a day, so the day reads like a timeline
      Object.values(grouped).forEach((list) =>
        list.sort((a, b) => a.timestamp - b.timestamp)
      );

      setEntriesByDay(grouped);
      setTotalEntries(count);
    } catch (error) {
      console.error('Error loading calendar entries:', error);
      setEntriesByDay({});
      setTotalEntries(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload whenever the screen comes back into focus (after editing an entry,
  // importing a backup, etc.)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addNote = async (when, text) => {
    const { section } = await addCalendarNote(AsyncStorage, when, text);
    Observe.logEvent('diary.entry_created', { attributes: { section, source: 'calendar' } });
    await load();
  };

  const updateNote = async (section, id, text, when) => {
    await updateCalendarNote(AsyncStorage, section, id, text, when);
    Observe.logEvent('diary.entry_updated', { attributes: { section, source: 'calendar' } });
    await load();
  };

  const deleteNote = async (section, id) => {
    await deleteCalendarNote(AsyncStorage, section, id);
    Observe.logEvent('diary.entry_deleted', { attributes: { section, source: 'calendar' } });
    await load();
  };

  return { entriesByDay, totalEntries, isLoading, refresh: load, addNote, updateNote, deleteNote };
};
