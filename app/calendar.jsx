// app/calendar.jsx
import { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDiaryCalendar } from '../hooks/useDiaryCalendar';
import {
  MONTH_NAMES,
  WEEKDAY_SHORT,
  buildMonthGrid,
  toDateKey,
  formatLongDate,
} from '../utils/diaryDates';

export default function DiaryCalendar() {
  const router = useRouter();
  const { entriesByDay, totalEntries, isLoading } = useDiaryCalendar();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState(toDateKey(today));

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthEntryCount = useMemo(
    () =>
      cells.reduce(
        (sum, date) => sum + (date ? (entriesByDay[toDateKey(date)] || []).length : 0),
        0
      ),
    [cells, entriesByDay]
  );

  const goToMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedKey(toDateKey(now));
  };

  const todayKey = toDateKey(today);
  const selectedEntries = entriesByDay[selectedKey] || [];
  const [sy, sm, sd] = selectedKey.split('-').map(Number);
  const selectedDate = new Date(sy, sm - 1, sd);

  const openEntry = (section) => router.push(`/diary/${encodeURIComponent(section)}`);

  const preview = (text) =>
    text
      .replace(/⟦img:[^⟧]+⟧/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={26} color="#7B5E7B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="calendar" size={24} color="#6B8E4E" />
          <Text style={styles.headerTitle}>Diary Calendar</Text>
        </View>
        <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6B8E4E" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Month switcher */}
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => goToMonth(-1)} style={styles.iconButton}>
              <Ionicons name="chevron-back" size={24} color="#7B5E7B" />
            </TouchableOpacity>
            <View style={styles.monthTitleBox}>
              <Text style={styles.monthTitle}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Text style={styles.monthSub}>
                {monthEntryCount} {monthEntryCount === 1 ? 'entry' : 'entries'} this month
                {' · '}
                {totalEntries} total
              </Text>
            </View>
            <TouchableOpacity onPress={() => goToMonth(1)} style={styles.iconButton}>
              <Ionicons name="chevron-forward" size={24} color="#7B5E7B" />
            </TouchableOpacity>
          </View>

          {/* Calendar grid */}
          <View style={styles.card}>
            <View style={styles.weekRow}>
              {WEEKDAY_SHORT.map((d) => (
                <Text key={d} style={styles.weekday}>
                  {d}
                </Text>
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
          </View>

          {/* Selected day */}
          <Text style={styles.dayHeading}>{formatLongDate(selectedDate)}</Text>

          {selectedEntries.length === 0 ? (
            <View style={styles.emptyDay}>
              <Ionicons name="leaf-outline" size={32} color="#B8A5B8" />
              <Text style={styles.emptyText}>No diary entries on this day</Text>
            </View>
          ) : (
            selectedEntries.map((entry) => (
              <TouchableOpacity
                key={`${entry.section}-${entry.id}`}
                style={styles.entryCard}
                activeOpacity={0.8}
                onPress={() => openEntry(entry.section)}
              >
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{entry.time}</Text>
                </View>
                <View style={styles.entryBody}>
                  <View style={styles.sectionTag}>
                    <Ionicons name="leaf" size={12} color="#6B8E4E" />
                    <Text style={styles.sectionTagText} numberOfLines={1}>
                      {entry.section.trim()}
                    </Text>
                    {entry.imageCount > 0 && (
                      <>
                        <Ionicons name="image" size={12} color="#7B5E7B" style={{ marginLeft: 8 }} />
                        <Text style={styles.imageCount}>{entry.imageCount}</Text>
                      </>
                    )}
                  </View>
                  <Text style={styles.entryText} numberOfLines={3}>
                    {preview(entry.text) || '(empty entry)'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE6' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconButton: { padding: 8 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#4A403A' },
  todayButton: {
    backgroundColor: '#6B8E4E',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  todayButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  scrollContent: { padding: 16, paddingBottom: 48 },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  monthTitleBox: { flex: 1, alignItems: 'center' },
  monthTitle: { fontSize: 22, fontWeight: '700', color: '#4A403A' },
  monthSub: { fontSize: 12, color: '#8B8680', marginTop: 2 },
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
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: { borderWidth: 1.5, borderColor: '#D4A574' },
  dayCircleSelected: { backgroundColor: '#6B8E4E', borderColor: '#6B8E4E' },
  dayText: { fontSize: 15, color: '#4A403A' },
  dayTextToday: { fontWeight: '700' },
  dayTextSelected: { color: '#fff', fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7B5E7B' },
  dayHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A403A',
    marginTop: 22,
    marginBottom: 10,
  },
  emptyDay: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { color: '#8B8680', fontSize: 14 },
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
