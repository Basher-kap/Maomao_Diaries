// components/DashboardReports.jsx
// Visual reports about the diary, drawn with plain Views (no chart library needed).
// Tabs: Overview (totals, streaks, highlights, months) · Activity (heatmap, time of day,
// weekdays) · Moods (mood balance, top moods, last 14 days).
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { computeStats, formatCount, formatCompact, formatHour } from '../utils/diaryStats';
import { getMood, getTone } from '../utils/moods';
import { MONTH_NAMES, WEEKDAY_SHORT, formatLongDate } from '../utils/diaryDates';

const GREEN = '#6B8E4E';
const PURPLE = '#7B5E7B';
const TAN = '#D4A574';
const LILAC = '#EDE7F6';
const MUTED = '#8B8680';
const INK = '#4A403A';
const HEAT = ['#EEE9E1', '#CFE3BC', '#A3CB84', '#6B8E4E', '#3F6B2B'];
const TONE_COLOR = { up: GREEN, mid: TAN, down: '#9C7BB0' };
const TONE_LABEL = { up: 'Positive', mid: 'In-between', down: 'Low' };
const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CELL = 14;
const GAP = 3;
const STEP = CELL + GAP;

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'stats-chart' },
  { id: 'activity', label: 'Activity', icon: 'pulse' },
  { id: 'moods', label: 'Moods', icon: 'happy' },
];

const keyToDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const shortDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${d}, ${y}`;
};

// ------------------------------------------------------------ small pieces

const Card = ({ title, subtitle, right, children }) => (
  <View style={styles.card}>
    {(title || right) && (
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
          {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    )}
    {children}
  </View>
);

const Chips = ({ options, value, onChange }) => (
  <View style={styles.chips}>
    {options.map((o) => (
      <TouchableOpacity
        key={o.id}
        onPress={() => onChange(o.id)}
        style={[styles.chip, value === o.id && styles.chipActive]}
      >
        <Text style={[styles.chipText, value === o.id && styles.chipTextActive]}>{o.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const Tile = ({ icon, color, value, label }) => (
  <View style={styles.tile}>
    <View style={[styles.tileIcon, { backgroundColor: `${color}22` }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={styles.tileValue}>{value}</Text>
    <Text style={styles.tileLabel}>{label}</Text>
  </View>
);

/** Vertical bar chart. values[i] -> bar; the highlighted bar uses the accent colour. */
const VBars = ({ values, labels, highlight, height = 110, format, color = GREEN, dim = '#CDBFD3' }) => {
  const max = Math.max(1, ...values);
  return (
    <View>
      <View style={[styles.vbars, { height }]}>
        {values.map((v, i) => (
          <View key={i} style={styles.vbarCol}>
            {format && v > 0 ? <Text style={styles.vbarValue}>{format(v)}</Text> : null}
            <View
              style={[
                styles.vbar,
                {
                  height: v > 0 ? Math.max(4, (v / max) * (height - 18)) : 2,
                  backgroundColor: i === highlight ? color : v > 0 ? dim : '#EEE9E1',
                },
              ]}
            />
          </View>
        ))}
      </View>
      {labels ? (
        <View style={styles.vbarLabels}>
          {labels.map((l, i) => (
            <Text key={i} style={[styles.vbarLabel, i === highlight && styles.vbarLabelActive]}>
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const HBar = ({ left, label, value, max, color, right }) => (
  <View style={styles.hRow}>
    <View style={styles.hLeft}>{left}</View>
    <View style={styles.hMain}>
      <View style={styles.hLabelRow}>
        <Text style={styles.hLabel}>{label}</Text>
        <Text style={styles.hRight}>{right}</Text>
      </View>
      <View style={styles.hTrack}>
        <View style={[styles.hFill, { width: `${max ? Math.max(3, (value / max) * 100) : 0}%`, backgroundColor: color }]} />
      </View>
    </View>
  </View>
);

// -------------------------------------------------------------------- tabs

const OverviewTab = ({ stats, titles, onOpenDay }) => {
  const [metric, setMetric] = useState('notes');
  const now = new Date();
  const monthValues = stats.months.map((m) => m[metric]);

  const topDay = stats.weekdays.indexOf(Math.max(...stats.weekdays));
  const topMonthValue = Math.max(...stats.months.map((m) => m.notes));
  const topMonth = stats.months.findIndex((m) => m.notes === topMonthValue);
  const insights = [
    { icon: 'time-outline', text: `You write most around ${formatHour(stats.peakHour)}.` },
    { icon: 'calendar-outline', text: `${WEEKDAY_FULL[topDay]} is your most active day of the week.` },
    topMonthValue > 0 && {
      icon: 'trending-up-outline',
      text: `${MONTH_NAMES[topMonth]} is your busiest month this year, with ${formatCount(topMonthValue)} notes.`,
    },
    { icon: 'flame-outline', text: `Your longest streak is ${stats.longestStreak} days in a row.` },
  ].filter(Boolean);

  return (
    <>
      <View style={styles.tiles}>
        <Tile icon="document-text" color={GREEN} value={formatCount(stats.totalNotes)} label="Notes" />
        <Tile icon="calendar" color={PURPLE} value={formatCount(stats.daysWritten)} label="Days written" />
        <Tile icon="create" color={TAN} value={formatCount(stats.totalWords)} label="Words" />
        <Tile icon="image" color="#5B8DB8" value={formatCount(stats.photos)} label="Photos" />
      </View>

      <Card title="Streaks & consistency">
        <View style={styles.streakRow}>
          <View style={styles.streakBox}>
            <Ionicons name="flame" size={26} color="#E67E22" />
            <Text style={styles.streakValue}>{stats.currentStreak}</Text>
            <Text style={styles.streakLabel}>Current streak</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakBox}>
            <Ionicons name="trophy" size={26} color={TAN} />
            <Text style={styles.streakValue}>{stats.longestStreak}</Text>
            <Text style={styles.streakLabel}>Longest streak</Text>
          </View>
        </View>
        <View style={styles.consistencyHeader}>
          <Text style={styles.consistencyText}>
            Wrote on {stats.consistency}% of days since {stats.firstKey ? shortDate(stats.firstKey) : '—'}
          </Text>
        </View>
        <View style={styles.hTrack}>
          <View style={[styles.hFill, { width: `${stats.consistency}%`, backgroundColor: GREEN }]} />
        </View>
      </Card>

      <Card title="Highlights">
        {stats.busiest.key && (
          <TouchableOpacity style={styles.highlight} onPress={() => onOpenDay(stats.busiest.key)}>
            <View style={[styles.highlightIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="ribbon" size={18} color={GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.highlightTitle}>Busiest day</Text>
              <Text style={styles.highlightBody}>
                {formatLongDate(keyToDate(stats.busiest.key))}
                {titles[stats.busiest.key] ? `  “${titles[stats.busiest.key]}”` : ''}
              </Text>
              <Text style={styles.highlightMeta}>
                {formatCount(stats.busiest.words)} words · {stats.busiest.notes} notes
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#B8A5B8" />
          </TouchableOpacity>
        )}
        {stats.longestNote.key && (
          <TouchableOpacity style={styles.highlight} onPress={() => onOpenDay(stats.longestNote.key)}>
            <View style={[styles.highlightIcon, { backgroundColor: '#F3EAF5' }]}>
              <Ionicons name="reader" size={18} color={PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.highlightTitle}>Longest note</Text>
              <Text style={styles.highlightBody}>{formatCount(stats.longestNote.words)} words</Text>
              <Text style={styles.highlightMeta}>{shortDate(stats.longestNote.key)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#B8A5B8" />
          </TouchableOpacity>
        )}
        <View style={styles.highlight}>
          <View style={[styles.highlightIcon, { backgroundColor: '#FBF1E4' }]}>
            <Ionicons name="speedometer" size={18} color={TAN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.highlightTitle}>Average note</Text>
            <Text style={styles.highlightBody}>{formatCount(stats.avgWordsPerNote)} words</Text>
          </View>
        </View>
      </Card>

      <Card
        title={`${now.getFullYear()} by month`}
        right={
          <Chips
            options={[
              { id: 'notes', label: 'Notes' },
              { id: 'words', label: 'Words' },
            ]}
            value={metric}
            onChange={setMetric}
          />
        }
      >
        <VBars
          values={monthValues}
          labels={MONTH_NAMES.map((m) => m[0])}
          highlight={now.getMonth()}
          format={metric === 'words' ? formatCompact : String}
        />
      </Card>

      <Card title="Insights">
        {insights.map((it, i) => (
          <View key={i} style={styles.insightRow}>
            <Ionicons name={it.icon} size={18} color={GREEN} />
            <Text style={styles.insightText}>{it.text}</Text>
          </View>
        ))}
      </Card>
    </>
  );
};

const ActivityTab = ({ stats, titles, onOpenDay }) => {
  const heatRef = useRef(null);
  const [picked, setPicked] = useState(null);
  const { columns, monthLabels } = stats.heatmap;
  const labels = monthLabels.filter((m, i) => !(i === 0 && monthLabels[1] && monthLabels[1].col < 3));
  const pickedCell = picked ? columns.flat().find((c) => c.key === picked) : null;
  const maxBucket = Math.max(1, ...stats.buckets.map((b) => b.count));
  const totalBuckets = stats.buckets.reduce((s, b) => s + b.count, 0) || 1;
  const topDay = stats.weekdays.indexOf(Math.max(...stats.weekdays));

  return (
    <>
      <Card title="Writing heatmap" subtitle="Darker = more words that day. Tap a square for details.">
        <View style={styles.heatWrap}>
          <View style={styles.heatDays}>
            {WEEKDAY_SHORT.map((d, i) => (
              <Text key={d} style={[styles.heatDayLabel, { height: CELL, marginBottom: GAP }]}>
                {i % 2 === 1 ? d[0] : ''}
              </Text>
            ))}
          </View>
          <ScrollView
            horizontal
            ref={heatRef}
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={() => heatRef.current && heatRef.current.scrollToEnd({ animated: false })}
          >
            <View>
              <View style={{ height: 16, width: columns.length * STEP }}>
                {labels.map((m) => (
                  <Text key={m.col} style={[styles.heatMonth, { left: m.col * STEP }]}>
                    {MONTH_NAMES[m.month].slice(0, 3)}
                  </Text>
                ))}
              </View>
              <View style={{ flexDirection: 'row' }}>
                {columns.map((col, ci) => (
                  <View key={ci} style={{ marginRight: GAP }}>
                    {col.map((cell) => (
                      <TouchableOpacity
                        key={cell.key}
                        disabled={cell.future}
                        activeOpacity={0.6}
                        onPress={() => setPicked(cell.key)}
                        style={[
                          styles.heatCell,
                          { backgroundColor: cell.future ? 'transparent' : HEAT[cell.level] },
                          picked === cell.key && styles.heatCellPicked,
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>

        <View style={styles.heatLegend}>
          <Text style={styles.heatLegendText}>Less</Text>
          {HEAT.map((c) => (
            <View key={c} style={[styles.heatLegendCell, { backgroundColor: c }]} />
          ))}
          <Text style={styles.heatLegendText}>More</Text>
        </View>

        {pickedCell && (
          <View style={styles.pickedBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickedTitle}>{shortDate(pickedCell.key)}</Text>
              <Text style={styles.pickedMeta}>
                {pickedCell.notes > 0
                  ? `${pickedCell.notes} ${pickedCell.notes === 1 ? 'note' : 'notes'} · ${formatCount(pickedCell.words)} words`
                  : 'Nothing written'}
                {titles[pickedCell.key] ? `  ·  “${titles[pickedCell.key]}”` : ''}
              </Text>
            </View>
            {pickedCell.notes > 0 && (
              <TouchableOpacity style={styles.pickedBtn} onPress={() => onOpenDay(pickedCell.key)}>
                <Text style={styles.pickedBtnText}>Open</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>

      <Card
        title="When you write"
        subtitle={`Most active around ${formatHour(stats.peakHour)}`}
      >
        <VBars values={stats.hours} highlight={stats.peakHour} height={90} />
        <View style={styles.axis}>
          {['12 AM', '6 AM', '12 PM', '6 PM', '11 PM'].map((t) => (
            <Text key={t} style={styles.axisText}>{t}</Text>
          ))}
        </View>
        <View style={{ marginTop: 14 }}>
          {stats.buckets.map((b) => (
            <HBar
              key={b.id}
              left={<Ionicons name={b.icon} size={20} color={PURPLE} />}
              label={`${b.label}  ·  ${b.range}`}
              right={`${Math.round((b.count / totalBuckets) * 100)}%`}
              value={b.count}
              max={maxBucket}
              color={b.count === maxBucket ? GREEN : '#CDBFD3'}
            />
          ))}
        </View>
      </Card>

      <Card title="Days of the week" subtitle={`${WEEKDAY_FULL[topDay]} is your most active day`}>
        <VBars
          values={stats.weekdays}
          labels={WEEKDAY_SHORT.map((d) => d[0])}
          highlight={topDay}
          format={String}
        />
      </Card>
    </>
  );
};

const MoodsTab = ({ stats }) => {
  const [period, setPeriod] = useState('30');
  const counts = period === '30' ? stats.mood.last30 : stats.mood.all;
  const tones = period === '30' ? stats.mood.tones30 : stats.mood.tonesAll;
  const total = period === '30' ? stats.mood.total30 : stats.mood.totalAll;
  const ranked = Object.entries(counts)
    .map(([id, n]) => ({ mood: getMood(id), n }))
    .filter((r) => r.mood)
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);
  const maxN = ranked.length ? ranked[0].n : 1;
  const hasAnyMood = stats.mood.totalAll > 0;

  if (!hasAnyMood) {
    return (
      <Card title="Mood report">
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🙂</Text>
          <Text style={styles.emptyTitle}>No moods yet</Text>
          <Text style={styles.emptyText}>
            Pick a mood when you add or edit a note on the calendar. Your mood balance, favourite
            moods and a 14-day mood timeline will appear here.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Mood balance"
        subtitle={`${total} ${total === 1 ? 'mood' : 'moods'} logged`}
        right={
          <Chips
            options={[
              { id: '30', label: '30 days' },
              { id: 'all', label: 'All time' },
            ]}
            value={period}
            onChange={setPeriod}
          />
        }
      >
        {total === 0 ? (
          <Text style={styles.emptyText}>No moods in the last 30 days.</Text>
        ) : (
          <>
            <View style={styles.stack}>
              {['up', 'mid', 'down'].map((t) =>
                tones[t] > 0 ? (
                  <View key={t} style={{ flex: tones[t], backgroundColor: TONE_COLOR[t] }} />
                ) : null
              )}
            </View>
            <View style={styles.stackLegend}>
              {['up', 'mid', 'down'].map((t) => (
                <View key={t} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: TONE_COLOR[t] }]} />
                  <Text style={styles.legendText}>
                    {TONE_LABEL[t]} {Math.round((tones[t] / total) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Card>

      {ranked.length > 0 && (
        <Card title="Top moods">
          {ranked.map(({ mood, n }) => (
            <HBar
              key={mood.id}
              left={<Text style={{ fontSize: 22 }}>{mood.emoji}</Text>}
              label={mood.label}
              right={String(n)}
              value={n}
              max={maxN}
              color={TONE_COLOR[getTone(mood.id)]}
            />
          ))}
        </Card>
      )}

      <Card title="Last 14 days" subtitle="The most common mood each day">
        <View style={styles.timeline}>
          {stats.mood.timeline.map((d) => {
            const m = d.mood ? getMood(d.mood) : null;
            const tone = d.score === null ? null : d.score > 0.25 ? 'up' : d.score < -0.25 ? 'down' : 'mid';
            return (
              <View key={d.key} style={styles.timelineCol}>
                <Text style={styles.timelineEmoji}>{m ? m.emoji : '·'}</Text>
                <View style={[styles.timelineDot, { backgroundColor: tone ? TONE_COLOR[tone] : '#EEE9E1' }]} />
                <Text style={[styles.vbarLabel, d.isToday && styles.vbarLabelActive]}>{d.label}</Text>
              </View>
            );
          })}
        </View>
      </Card>
    </>
  );
};

// ------------------------------------------------------------------ export

export default function DashboardReports({ entriesByDay, titles = {}, onOpenDay }) {
  const [tab, setTab] = useState('overview');
  const stats = useMemo(() => computeStats(entriesByDay), [entriesByDay]);

  if (!stats.totalNotes) {
    return (
      <Card title="Your diary in numbers">
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📖</Text>
          <Text style={styles.emptyText}>Write your first note on the calendar to see reports here.</Text>
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionHeading}>Diary reports</Text>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
          >
            <Ionicons name={t.icon} size={16} color={tab === t.id ? '#fff' : PURPLE} />
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'overview' && <OverviewTab stats={stats} titles={titles} onOpenDay={onOpenDay} />}
      {tab === 'activity' && <ActivityTab stats={stats} titles={titles} onOpenDay={onOpenDay} />}
      {tab === 'moods' && <MoodsTab stats={stats} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  sectionHeading: { fontSize: 20, fontWeight: '800', color: INK, marginBottom: 12 },
  tabs: { flexDirection: 'row', backgroundColor: LILAC, borderRadius: 18, padding: 4, marginBottom: 14 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14 },
  tabActive: { backgroundColor: PURPLE },
  tabText: { fontSize: 13, fontWeight: '700', color: PURPLE },
  tabTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 24, padding: 18, marginBottom: 14, borderWidth: 2, borderColor: LILAC },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: INK },
  cardSub: { fontSize: 12, color: MUTED, marginTop: 2 },

  chips: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: LILAC },
  chipActive: { backgroundColor: GREEN },
  chipText: { fontSize: 11, fontWeight: '700', color: PURPLE },
  chipTextActive: { color: '#fff' },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  tile: { width: '47.5%', backgroundColor: '#fff', borderRadius: 20, padding: 14, borderWidth: 2, borderColor: LILAC },
  tileIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileValue: { fontSize: 24, fontWeight: '800', color: INK },
  tileLabel: { fontSize: 12, color: MUTED, fontWeight: '600', marginTop: 2 },

  streakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  streakBox: { flex: 1, alignItems: 'center' },
  streakDivider: { width: 1, height: 56, backgroundColor: LILAC },
  streakValue: { fontSize: 28, fontWeight: '800', color: INK, marginTop: 2 },
  streakLabel: { fontSize: 12, color: MUTED, fontWeight: '600' },
  consistencyHeader: { marginBottom: 6 },
  consistencyText: { fontSize: 12, color: MUTED },

  highlight: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  highlightIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  highlightTitle: { fontSize: 12, color: MUTED, fontWeight: '700' },
  highlightBody: { fontSize: 14, color: INK, fontWeight: '700', marginTop: 1 },
  highlightMeta: { fontSize: 12, color: MUTED, marginTop: 1 },

  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  insightText: { flex: 1, fontSize: 14, color: INK, lineHeight: 20 },

  vbars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  vbarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  vbar: { width: '100%', borderRadius: 4 },
  vbarValue: { fontSize: 9, color: MUTED, marginBottom: 2 },
  vbarLabels: { flexDirection: 'row', gap: 3, marginTop: 6 },
  vbarLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: MUTED },
  vbarLabelActive: { color: GREEN, fontWeight: '800' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisText: { fontSize: 10, color: MUTED },

  hRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  hLeft: { width: 28, alignItems: 'center' },
  hMain: { flex: 1 },
  hLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  hLabel: { fontSize: 13, color: INK, fontWeight: '600' },
  hRight: { fontSize: 12, color: MUTED, fontWeight: '700' },
  hTrack: { height: 8, borderRadius: 4, backgroundColor: '#EEE9E1', overflow: 'hidden' },
  hFill: { height: 8, borderRadius: 4 },

  heatWrap: { flexDirection: 'row' },
  heatDays: { width: 14, marginRight: 4, paddingTop: 16 },
  heatDayLabel: { fontSize: 9, color: MUTED, lineHeight: CELL },
  heatMonth: { position: 'absolute', top: 0, fontSize: 10, color: MUTED },
  heatCell: { width: CELL, height: CELL, borderRadius: 3, marginBottom: GAP },
  heatCellPicked: { borderWidth: 2, borderColor: INK },
  heatLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 10 },
  heatLegendText: { fontSize: 10, color: MUTED },
  heatLegendCell: { width: 11, height: 11, borderRadius: 3 },
  pickedBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, backgroundColor: '#F7F3EC', borderRadius: 14, padding: 12 },
  pickedTitle: { fontSize: 14, fontWeight: '800', color: INK },
  pickedMeta: { fontSize: 12, color: MUTED, marginTop: 2 },
  pickedBtn: { backgroundColor: GREEN, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12 },
  pickedBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  stack: { flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: '#EEE9E1' },
  stackLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: INK, fontWeight: '600' },

  timeline: { flexDirection: 'row', gap: 2 },
  timelineCol: { flex: 1, alignItems: 'center', gap: 4 },
  timelineEmoji: { fontSize: 18, color: MUTED },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },

  empty: { alignItems: 'center', paddingVertical: 12, gap: 6 },
  emptyEmoji: { fontSize: 38 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: INK },
  emptyText: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },
});
