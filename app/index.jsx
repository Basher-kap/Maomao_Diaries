//app/index.jsx
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useRef, useEffect, useState, useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, useFocusEffect } from 'expo-router';
import { useObserve } from 'expo-observe';
import Sidebar from '../components/Sidebar';
import BackupButton from '../components/BackupButton';
import AISearch from '../components/AISearch';
import { useDiarySections } from '../hooks/useDiaryStorage';
import { useDiaryCalendar } from '../hooks/useDiaryCalendar';
import { toDateKey, computeStreak, lastNDays } from '../utils/diaryDates';
import { getRandomQuote } from '../utils/maomaoQuotes';

export default function Home() {
  const sidebarRefreshRef = useRef(null);
  const { sections, refreshSections } = useDiarySections();
  // Reloads on every focus, so notes added on the calendar page show up here
  const { entriesByDay, totalEntries, migration, refresh: refreshCalendar } = useDiaryCalendar();
  const [greeting, setGreeting] = useState('');
  const [currentQuote, setCurrentQuote] = useState({ text: '', context: '' });
  const { markInteractive } = useObserve();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    useCallback(() => {
      refreshSections();
    }, [refreshSections])
  );

  const todayKey = toDateKey(new Date());
  const todayCount = (entriesByDay[todayKey] || []).length;
  const monthPrefix = todayKey.slice(0, 7);
  const monthCount = Object.keys(entriesByDay)
    .filter((k) => k.startsWith(monthPrefix))
    .reduce((n, k) => n + entriesByDay[k].length, 0);
  const streak = computeStreak(entriesByDay);
  const week = lastNDays(7).map((d) => ({ ...d, count: (entriesByDay[d.key] || []).length }));
  const weekMax = Math.max(1, ...week.map((d) => d.count));

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Ohayou Gozaimasu');
    else if (hour < 18) setGreeting('Konnichiwa');
    else setGreeting('Konbanwa');

    // Get random quote on mount
    setCurrentQuote(getRandomQuote());

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    markInteractive();
  }, [markInteractive]);

  const handleDataRefresh = async () => {
    console.log('🔄 Refreshing data after import...');
    
    if (sidebarRefreshRef.current) {
      await sidebarRefreshRef.current();
    }
    await refreshSections();
    await refreshCalendar();
  };

  const refreshQuote = () => {
    setCurrentQuote(getRandomQuote());
  };

  return (
    <View style={styles.container}>
      {/* Decorative Background Elements */}
      <View style={styles.backgroundDecor}>
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
        <View style={[styles.decorCircle, styles.decorCircle3]} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.mainContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="flask" size={48} color="#6B8E4E" />
              </View>
            </View>
            
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.title}>Maomao Diaries</Text>
            <Text style={styles.subtitle}>
              Where medicinal wisdom meets meticulous documentation
            </Text>

            {/* Decorative Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Ionicons name="leaf" size={20} color="#D4A574" />
              <View style={styles.dividerLine} />
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <View style={styles.statIconCircle}>
                <Ionicons name="folder-open" size={28} color="#7B5E7B" />
              </View>
              <Text style={styles.statNumber}>{sections.length}</Text>
              <Text style={styles.statLabel}>Sections</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="book" size={28} color="#6B8E4E" />
              </View>
              <Text style={styles.statNumber}>{totalEntries}</Text>
              <Text style={styles.statLabel}>Diaries</Text>
            </View>
          </View>

          {/* Month sections -> calendar copy status */}
          {migration && migration.monthSections > 0 && (
            <View style={[styles.syncCard, !migration.safeToDelete && styles.syncCardPending]}>
              <Ionicons
                name={migration.safeToDelete ? 'checkmark-circle' : 'sync-circle'}
                size={28}
                color={migration.safeToDelete ? '#6B8E4E' : '#D4A574'}
              />
              <View style={styles.syncTextBox}>
                <Text style={styles.syncTitle}>
                  {migration.safeToDelete
                    ? 'Month sections are safe in your calendar'
                    : 'Copying month sections to your calendar…'}
                </Text>
                <Text style={styles.syncBody}>
                  {migration.safeToDelete
                    ? `${migration.monthSections} month sections (${migration.monthEntries} notes) are copied. You can delete them from the sidebar; the notes and photos stay on the calendar.`
                    : `${migration.pending} notes still to copy. Keep the sections until this turns green.`}
                </Text>
              </View>
            </View>
          )}

          {/* Pulse: quick summary that updates as you write */}
          <View style={styles.pulseRow}>
            <View style={styles.pulseCard}>
              <Text style={styles.pulseNumber}>{todayCount}</Text>
              <Text style={styles.pulseLabel}>Today</Text>
            </View>
            <View style={styles.pulseCard}>
              <Text style={styles.pulseNumber}>{monthCount}</Text>
              <Text style={styles.pulseLabel}>This month</Text>
            </View>
            <View style={styles.pulseCard}>
              <Text style={styles.pulseNumber}>{streak}</Text>
              <Text style={styles.pulseLabel}>Day streak</Text>
            </View>
          </View>

          <View style={styles.weekCard}>
            <Text style={styles.weekTitle}>Last 7 days</Text>
            <View style={styles.weekBars}>
              {week.map((d) => (
                <View key={d.key} style={styles.weekCol}>
                  <View style={styles.weekBarTrack}>
                    <View
                      style={[
                        styles.weekBar,
                        { height: d.count ? 12 + (d.count / weekMax) * 48 : 4 },
                        d.count === 0 && styles.weekBarEmpty,
                      ]}
                    />
                  </View>
                  <Text style={[styles.weekLabel, d.isToday && styles.weekLabelToday]}>{d.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Maomao's Quote of the Moment */}
          <View style={styles.quoteCard}>
            <View style={styles.quoteHeader}>
              <View style={styles.quoteHeaderLeft}>
                <Ionicons name="chatbox-ellipses" size={28} color="#6B8E4E" />
                <View>
                  <Text style={styles.quoteHeaderTitle}>Maomao says:</Text>
                  <Text style={styles.quoteContext}>{currentQuote.context}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={refreshQuote} style={styles.refreshButton}>
                <Ionicons name="refresh" size={24} color="#7B5E7B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.quoteBubble}>
              <Text style={styles.quoteText}>"{currentQuote.text}"</Text>
            </View>
            
            <View style={styles.quoteFooter}>
              <View style={styles.quoteFooterDot} />
              <View style={styles.quoteFooterDot} />
              <View style={styles.quoteFooterDot} />
            </View>
          </View>

          {/* Quick Actions */}
          <Link href="/calendar" asChild>
            <TouchableOpacity style={styles.calendarButton} activeOpacity={0.85}>
              <Ionicons name="calendar" size={24} color="#fff" />
              <View style={styles.calendarButtonTextBox}>
                <Text style={styles.calendarButtonText}>Open Diary Calendar</Text>
                <Text style={styles.calendarButtonSub}>
                  {todayCount > 0
                    ? `${todayCount} ${todayCount === 1 ? 'note' : 'notes'} written today`
                    : 'Nothing written today yet'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </Link>

          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <View style={styles.actionGrid}>
              {sections.length > 0 ? (
                sections.slice(0, 4).map((section, index) => (
                  <Link
                    key={index}
                    href={`/diary/${encodeURIComponent(section)}`}
                    asChild
                  >
                    <TouchableOpacity style={styles.actionCard}>
                      <View style={styles.actionIconCircle}>
                        <Ionicons name="leaf" size={24} color="#6B8E4E" />
                      </View>
                      <Text style={styles.actionText} numberOfLines={2}>
                        {section}
                      </Text>
                    </TouchableOpacity>
                  </Link>
                ))
              ) : (
                <View style={styles.emptyActions}>
                  <Ionicons name="add-circle-outline" size={48} color="#B8A5B8" />
                  <Text style={styles.emptyActionsText}>
                    No sections yet. Open the menu to create your first section!
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <View style={styles.tipsSectionHeader}>
              <Ionicons name="bulb" size={24} color="#D4A574" />
              <Text style={styles.sectionTitle}>Apothecary Tips</Text>
            </View>
            
            <View style={styles.tipCard}>
              <View style={styles.tipIconContainer}>
                <Ionicons name="create" size={20} color="#7B5E7B" />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Document Thoroughly</Text>
                <Text style={styles.tipDescription}>
                  Like Maomao, record every detail no matter how small
                </Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <View style={styles.tipIconContainer}>
                <Ionicons name="flask" size={20} color="#6B8E4E" />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Organize by Category</Text>
                <Text style={styles.tipDescription}>
                  Create sections for different types of observations
                </Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <View style={styles.tipIconContainer}>
                <Ionicons name="save" size={20} color="#C85C5C" />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Backup Regularly</Text>
                <Text style={styles.tipDescription}>
                  Preserve your precious knowledge with regular exports
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="leaf-outline" size={16} color="#8B8680" />
            <Text style={styles.footerText}>
              Crafted with the precision of an imperial apothecary
            </Text>
            <Ionicons name="leaf-outline" size={16} color="#8B8680" />
          </View>
        </Animated.View>
      </ScrollView>

      <Sidebar
        refreshRef={sidebarRefreshRef}
        onSectionsChanged={() => {
          refreshSections();
          refreshCalendar();
        }}
      />
      <BackupButton onDataRefresh={handleDataRefresh} />
      <AISearch sections={sections} />
    </View>
  );
}

const styles = StyleSheet.create({
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6B8E4E',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  calendarButtonTextBox: { flex: 1, marginLeft: 12 },
  calendarButtonSub: { color: '#E8F5E9', fontSize: 12, marginTop: 2 },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F1F8E9',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DCEDC8',
  },
  syncCardPending: { backgroundColor: '#FFF8E1', borderColor: '#FFE0B2' },
  syncTextBox: { flex: 1 },
  syncTitle: { fontSize: 14, fontWeight: '700', color: '#4A403A' },
  syncBody: { fontSize: 12, color: '#6D6760', marginTop: 3, lineHeight: 17 },
  pulseRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  pulseCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EDE7F6',
  },
  pulseNumber: { fontSize: 26, fontWeight: 'bold', color: '#7B5E7B' },
  pulseLabel: { fontSize: 12, color: '#8B8680', fontWeight: '600', marginTop: 2 },
  weekCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 18,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#E8F5E9',
  },
  weekTitle: { fontSize: 14, fontWeight: '700', color: '#4A403A', marginBottom: 12 },
  weekBars: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCol: { flex: 1, alignItems: 'center' },
  weekBarTrack: { height: 64, justifyContent: 'flex-end' },
  weekBar: { width: 18, borderRadius: 9, backgroundColor: '#6B8E4E' },
  weekBarEmpty: { backgroundColor: '#E5E0D8' },
  weekLabel: { fontSize: 12, color: '#8B8680', marginTop: 6 },
  weekLabelToday: { color: '#6B8E4E', fontWeight: '700' },
  calendarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5EFE6',
  },
  backgroundDecor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.06,
  },
  decorCircle1: {
    width: 300,
    height: 300,
    backgroundColor: '#6B8E4E',
    top: -100,
    right: -80,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    backgroundColor: '#7B5E7B',
    bottom: 100,
    left: -50,
  },
  decorCircle3: {
    width: 150,
    height: 150,
    backgroundColor: '#D4A574',
    top: 300,
    left: 50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  mainContent: {
    paddingHorizontal: 24,
    paddingTop: 70,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6B8E4E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#9CAF88',
  },
  greeting: {
    fontSize: 16,
    color: '#8B8680',
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A403A',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#8B8680',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#D4A574',
    marginHorizontal: 12,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    minWidth: 140,
    shadowColor: '#6B8E4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#E8F5E9',
  },
  statIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EDE7F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A403A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8B8680',
    fontWeight: '600',
  },
  quoteCard: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#7B5E7B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#9CAF88',
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  quoteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  quoteHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A403A',
  },
  quoteContext: {
    fontSize: 12,
    color: '#7B5E7B',
    fontWeight: '600',
    marginTop: 2,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE7F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteBubble: {
    backgroundColor: '#F5EFE6',
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#6B8E4E',
  },
  quoteText: {
    fontSize: 16,
    color: '#4A403A',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  quoteFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  quoteFooterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4A574',
  },
  actionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4A403A',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#6B8E4E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#E8F5E9',
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    color: '#4A403A',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyActions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    width: '100%',
  },
  emptyActionsText: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  tipsSection: {
    marginBottom: 32,
  },
  tipsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5EFE6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A403A',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 13,
    color: '#8B8680',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#8B8680',
    fontStyle: 'italic',
  },
});