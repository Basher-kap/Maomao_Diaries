// app/calendar.jsx — Calendar page.
// Tap a day, write a note on it. Notes are filed in the month's section, so the
// dashboard, sidebar sections, backup and AI search all see them.
import { useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import NoteEditor from '../components/NoteEditor';
import { useDiaryCalendar } from '../hooks/useDiaryCalendar';
import {
  MONTH_NAMES,
  WEEKDAY_SHORT,
  buildMonthGrid,
  toDateKey,
  formatLongDate,
} from '../utils/diaryDates';

const cleanPreview = (text) =>
  text.replace(/⟦img:[^⟧]+⟧/g, '').replace(/\s+/g, ' ').trim();

export default function CalendarPage() {
  const router = useRouter();
  const { entriesByDay, totalEntries, titles, setDayTitle, isLoading, addNote, updateNote, deleteNote } =
    useDiaryCalendar();

  const now = new Date();
  const todayKey = toDateKey(now);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleKeyRef = useRef(null); // the day being titled, even if the selection changes mid-edit

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthCount = useMemo(
    () => cells.reduce((n, d) => n + (d ? (entriesByDay[toDateKey(d)] || []).length : 0), 0),
    [cells, entriesByDay]
  );

  const [sy, sm, sd] = selectedKey.split('-').map(Number);
  const selectedDate = new Date(sy, sm - 1, sd);
  const selectedEntries = entriesByDay[selectedKey] || [];
  const currentTitle = titles[selectedKey] || '';

  const startTitleEdit = () => {
    titleKeyRef.current = selectedKey;
    setTitleDraft(currentTitle);
    setTitleEditing(true);
  };

  const commitTitle = async () => {
    if (!titleKeyRef.current) return;
    const key = titleKeyRef.current;
    titleKeyRef.current = null;
    setTitleEditing(false);
    // titles are usually written in quotation marks; store them without
    const cleaned = titleDraft.replace(/^[\s"“”«„]+|[\s"“”«»]+$/g, '').trim();
    if (cleaned !== (titles[key] || '')) await setDayTitle(key, cleaned);
  };

  const goToMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const goToToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelectedKey(toDateKey(t));
  };

  const openNew = () => {
    setEditingNote(null);
    setEditorOpen(true);
  };

  const onEntryPress = (entry) => {
    setEditingNote(entry);
    setEditorOpen(true);
  };

  const handleSave = async (text, when, images) => {
    try {
      if (editingNote) {
        await updateNote(editingNote, text, when, images);
      } else {
        await addNote(when, text, images);
      }
      setEditorOpen(false);
    } catch (e) {
      console.error('Error saving note:', e);
    }
  };

  const handleDelete = async () => {
    if (!editingNote) return;
    try {
      await deleteNote(editingNote);
      setEditorOpen(false);
    } catch (e) {
      console.error('Error deleting note:', e);
    }
  };

  const isViewingElsewhere =
    selectedKey !== todayKey || viewYear !== now.getFullYear() || viewMonth !== now.getMonth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={26} color="#7B5E7B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="calendar" size={24} color="#6B8E4E" />
          <Text style={styles.headerTitle}>Diary Calendar</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Month switcher */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => goToMonth(-1)} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={26} color="#7B5E7B" />
          </TouchableOpacity>
          <View style={styles.monthTitleBox}>
            <Text style={styles.monthTitle}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <Text style={styles.monthSub}>
              {monthCount} {monthCount === 1 ? 'note' : 'notes'} this month · {totalEntries} total
            </Text>
          </View>
          <TouchableOpacity onPress={() => goToMonth(1)} style={styles.iconButton}>
            <Ionicons name="chevron-forward" size={26} color="#7B5E7B" />
          </TouchableOpacity>
        </View>

        {isViewingElsewhere && (
          <TouchableOpacity onPress={goToToday} style={styles.todayPill}>
            <Ionicons name="today-outline" size={14} color="#fff" />
            <Text style={styles.todayPillText}>Back to today</Text>
          </TouchableOpacity>
        )}

        {/* Calendar grid */}
        <View style={styles.card}>
          <View style={styles.weekRow}>
            {WEEKDAY_SHORT.map((d) => (
              <Text key={d} style={styles.weekday}>{d}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((date, i) => {
              if (!date) return <View key={`e${i}`} style={styles.cell} />;
              const key = toDateKey(date);
              const count = (entriesByDay[key] || []).length;
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.cell}
                  activeOpacity={0.7}
                  onPress={() => setSelectedKey(key)}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isToday && styles.dayCircleToday,
                      isSelected && styles.dayCircleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isToday && styles.dayTextToday,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                  <View style={styles.dotRow}>
                    {Array.from({ length: Math.min(count, 3) }).map((_, n) => (
                      <View key={n} style={styles.dot} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {isLoading && <ActivityIndicator style={styles.loading} color="#6B8E4E" />}
        </View>

        {/* Selected day */}
        <View style={styles.dayHeaderRow}>
          <View style={styles.titleBox}>
            {titleEditing ? (
              <TextInput
                style={styles.titleInput}
                value={titleDraft}
                onChangeText={setTitleDraft}
                onSubmitEditing={commitTitle}
                onBlur={commitTitle}
                placeholder="Title for this day"
                placeholderTextColor="#B8A5B8"
                maxLength={80}
                returnKeyType="done"
                autoFocus
                selectTextOnFocus
              />
            ) : (
              <TouchableOpacity style={styles.titleRow} onPress={startTitleEdit} activeOpacity={0.7}>
                <Text
                  style={[styles.dayHeading, !currentTitle && styles.dayHeadingEmpty]}
                  numberOfLines={2}
                >
                  {currentTitle ? `“${currentTitle}”` : 'Add a title…'}
                </Text>
                <Ionicons name="pencil" size={14} color="#B8A5B8" style={styles.titlePencil} />
              </TouchableOpacity>
            )}
            <Text style={styles.dayDateCaption}>{formatLongDate(selectedDate)}</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openNew} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add note</Text>
          </TouchableOpacity>
        </View>

        {selectedEntries.length === 0 ? (
          <TouchableOpacity style={styles.emptyDay} onPress={openNew} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={30} color="#B8A5B8" />
            <Text style={styles.emptyText}>Nothing written yet. Tap to add a note for this day.</Text>
          </TouchableOpacity>
        ) : (
          selectedEntries.map((entry) => (
            <TouchableOpacity
              key={`${entry.section}-${entry.id}`}
              style={styles.entryCard}
              activeOpacity={0.8}
              onPress={() => onEntryPress(entry)}
            >
              <View style={styles.timeColumn}>
                <Text style={styles.timeText}>{entry.time}</Text>
              </View>
              <View style={styles.entryBody}>
                <View style={styles.sectionTag}>
                  <Ionicons name={entry.section ? 'bookmark' : 'leaf'} size={12} color="#6B8E4E" />
                  <Text style={styles.sectionTagText} numberOfLines={1}>
                    {entry.section ? entry.section.trim() : 'Calendar note'}
                  </Text>
                  {entry.imageCount > 0 && (
                    <>
                      <Ionicons name="image" size={12} color="#7B5E7B" style={{ marginLeft: 8 }} />
                      <Text style={styles.imageCount}>{entry.imageCount}</Text>
                    </>
                  )}
                </View>
                <Text style={styles.entryText} numberOfLines={4}>
                  {cleanPreview(entry.text) || '(empty entry)'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <NoteEditor
        visible={editorOpen}
        day={selectedDate}
        note={editingNote}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setEditorOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#4A403A' },
  headerSpacer: { width: 42 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 60 },
  iconButton: { padding: 8 },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  monthTitleBox: { flex: 1, alignItems: 'center' },
  monthTitle: { fontSize: 22, fontWeight: '700', color: '#4A403A' },
  monthSub: { fontSize: 12, color: '#8B8680', marginTop: 2 },
  todayPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D4A574',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 10,
  },
  todayPillText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#B8A5B8',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 52, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayCircleToday: { borderWidth: 1.5, borderColor: '#D4A574' },
  dayCircleSelected: { backgroundColor: '#6B8E4E', borderColor: '#6B8E4E' },
  dayText: { fontSize: 15, color: '#4A403A' },
  dayTextToday: { fontWeight: '700' },
  dayTextSelected: { color: '#fff', fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7B5E7B' },
  loading: { position: 'absolute', top: 8, right: 12 },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  titleBox: { flex: 1, paddingRight: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titlePencil: { marginLeft: 6 },
  dayHeading: { flexShrink: 1, fontSize: 18, fontWeight: '700', color: '#4A403A' },
  dayHeadingEmpty: { color: '#B8A5B8', fontStyle: 'italic', fontWeight: '500' },
  dayDateCaption: { fontSize: 12, color: '#8B8680', marginTop: 2 },
  titleInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A403A',
    borderBottomWidth: 2,
    borderBottomColor: '#6B8E4E',
    paddingVertical: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B8E4E',
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 2,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: 24,
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D9CFE0',
    borderRadius: 16,
  },
  emptyText: { color: '#8B8680', fontSize: 14, textAlign: 'center' },
  entryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#D4A574',
  },
  timeColumn: { width: 78, paddingRight: 8 },
  timeText: { fontSize: 13, fontWeight: '700', color: '#7B5E7B' },
  entryBody: { flex: 1 },
  sectionTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  sectionTagText: { fontSize: 12, color: '#6B8E4E', fontWeight: '600', flexShrink: 1 },
  imageCount: { fontSize: 12, color: '#7B5E7B' },
  entryText: { fontSize: 14, lineHeight: 20, color: '#4A403A' },
});
