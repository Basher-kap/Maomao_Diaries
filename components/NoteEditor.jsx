// components/NoteEditor.jsx
// Bottom-sheet style editor for a calendar note: text + time of day.
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatLongDate, withTime } from '../utils/diaryDates';

const Stepper = ({ value, onDec, onInc, onDecLong, onIncLong, width = 44 }) => (
  <View style={styles.stepper}>
    <TouchableOpacity onPress={onInc} onLongPress={onIncLong} style={styles.stepBtn}>
      <Ionicons name="chevron-up" size={20} color="#7B5E7B" />
    </TouchableOpacity>
    <Text style={[styles.stepValue, { width }]}>{value}</Text>
    <TouchableOpacity onPress={onDec} onLongPress={onDecLong} style={styles.stepBtn}>
      <Ionicons name="chevron-down" size={20} color="#7B5E7B" />
    </TouchableOpacity>
  </View>
);

export default function NoteEditor({ visible, day, note, onSave, onDelete, onClose }) {
  const isEdit = !!note;
  const [text, setText] = useState('');
  const [hour12, setHour12] = useState(12);
  const [minute, setMinute] = useState(0);
  const [pm, setPm] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const base = note ? new Date(note.timestamp) : new Date();
    const h24 = base.getHours();
    setText(note ? note.text : '');
    setPm(h24 >= 12);
    setHour12(h24 % 12 || 12);
    setMinute(base.getMinutes());
  }, [visible, note]);

  if (!day) return null;

  const bumpHour = (d) => setHour12((h) => ((h - 1 + d + 12) % 12) + 1);
  const bumpMinute = (d) => setMinute((m) => (m + d + 60) % 60);

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('Empty note', 'Write something first.');
      return;
    }
    const h24 = (hour12 % 12) + (pm ? 12 : 0);
    const seconds = isEdit ? new Date(note.timestamp).getSeconds() : new Date().getSeconds();
    onSave(trimmed, withTime(day, h24, minute, seconds));
  };

  const confirmDelete = () =>
    Alert.alert('Delete note', 'Delete this note from your diary?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>{isEdit ? 'Edit note' : 'New note'}</Text>
              <Text style={styles.sheetSub}>{formatLongDate(day)}</Text>
            </View>
            {isEdit && (
              <TouchableOpacity onPress={confirmDelete} style={styles.trashBtn}>
                <Ionicons name="trash-outline" size={22} color="#C0392B" />
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="What happened on this day?"
            placeholderTextColor="#B8A5B8"
            multiline
            autoFocus
            textAlignVertical="top"
          />

          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={22} color="#6B8E4E" />
            <Stepper
              value={hour12}
              onInc={() => bumpHour(1)}
              onDec={() => bumpHour(-1)}
            />
            <Text style={styles.colon}>:</Text>
            <Stepper
              value={String(minute).padStart(2, '0')}
              onInc={() => bumpMinute(1)}
              onDec={() => bumpMinute(-1)}
              onIncLong={() => bumpMinute(10)}
              onDecLong={() => bumpMinute(-10)}
            />
            <View style={styles.ampm}>
              {['AM', 'PM'].map((label) => {
                const active = (label === 'PM') === pm;
                return (
                  <TouchableOpacity
                    key={label}
                    onPress={() => setPm(label === 'PM')}
                    style={[styles.ampmBtn, active && styles.ampmBtnActive]}
                  >
                    <Text style={[styles.ampmText, active && styles.ampmTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <Text style={styles.hint}>Hold the minute arrows to jump by 10.</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={save}>
              <Text style={styles.saveText}>{isEdit ? 'Save changes' : 'Add note'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: '#FBF8F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#4A403A' },
  sheetSub: { fontSize: 13, color: '#8B8680', marginTop: 2 },
  trashBtn: { padding: 8 },
  input: {
    marginTop: 14,
    minHeight: 130,
    maxHeight: 240,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    lineHeight: 22,
    color: '#4A403A',
    borderWidth: 1,
    borderColor: '#EDE7F6',
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  stepper: { alignItems: 'center' },
  stepBtn: { padding: 4 },
  stepValue: { fontSize: 26, fontWeight: '700', color: '#4A403A', textAlign: 'center' },
  colon: { fontSize: 26, fontWeight: '700', color: '#4A403A' },
  ampm: { marginLeft: 10, gap: 6 },
  ampmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#EDE7F6',
  },
  ampmBtnActive: { backgroundColor: '#6B8E4E' },
  ampmText: { fontWeight: '700', color: '#7B5E7B' },
  ampmTextActive: { color: '#fff' },
  hint: { textAlign: 'center', fontSize: 11, color: '#B8A5B8', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#EDE7F6' },
  cancelText: { color: '#7B5E7B', fontWeight: '700' },
  saveBtn: { backgroundColor: '#6B8E4E' },
  saveText: { color: '#fff', fontWeight: '700' },
});
