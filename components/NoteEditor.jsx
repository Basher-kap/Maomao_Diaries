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
  Image,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatLongDate, withTime } from '../utils/diaryDates';
import { persistPickedImage, deletePersistedImage } from '../utils/imageStorage';

// Photos sit inside the text as ⟦img:filename⟧ markers (same format as the section screen)
const imageIdFromUri = (uri) => uri.split('/').pop();
const makeMarker = (uri) => `⟦img:${imageIdFromUri(uri)}⟧`;

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
  const { height: screenHeight } = useWindowDimensions();
  const [text, setText] = useState('');
  const [hour12, setHour12] = useState(12);
  const [minute, setMinute] = useState(0);
  const [pm, setPm] = useState(false);
  const [images, setImages] = useState([]);
  const [sessionAdded, setSessionAdded] = useState([]);

  useEffect(() => {
    if (!visible) return;
    const base = note ? new Date(note.timestamp) : new Date();
    const h24 = base.getHours();
    setText(note ? note.text : '');
    setImages(note ? note.images || [] : []);
    setSessionAdded([]);
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
    onSave(trimmed, withTime(day, h24, minute, seconds), images);
  };

  // Cancel: throw away photos that were added in this editor but never saved
  const cancel = async () => {
    await Promise.all(
      sessionAdded.filter((uri) => images.includes(uri)).map((uri) => deletePersistedImage(uri))
    );
    onClose();
  };

  const addPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Maomao needs access to your gallery to attach photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (result.canceled) return;

    const added = [];
    for (const asset of result.assets) {
      try {
        added.push(await persistPickedImage(asset.uri));
      } catch (e) {
        console.error('Could not save photo:', e);
      }
    }
    if (!added.length) return;
    setImages((prev) => [...prev, ...added]);
    setSessionAdded((prev) => [...prev, ...added]);
    setText((prev) => {
      const gap = prev && !prev.endsWith('\n') ? '\n\n' : '';
      return `${prev}${gap}${added.map(makeMarker).join('\n')}\n`;
    });
  };

  const removePhoto = async (uri) => {
    setImages((prev) => prev.filter((u) => u !== uri));
    setText((prev) =>
      prev
        .split(makeMarker(uri))
        .join('')
        .replace(/\n{3,}/g, '\n\n')
    );
    if (sessionAdded.includes(uri)) {
      setSessionAdded((prev) => prev.filter((u) => u !== uri));
      await deletePersistedImage(uri);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete note', 'Delete this note from your diary?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={cancel} />
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
            style={[styles.input, { maxHeight: Math.round(screenHeight * 0.38) }]}
            value={text}
            onChangeText={setText}
            placeholder="What happened on this day?"
            placeholderTextColor="#B8A5B8"
            multiline
            autoFocus
            textAlignVertical="top"
          />

          {/* Photos */}
          <View style={styles.photoHeader}>
            <TouchableOpacity style={styles.photoAddBtn} onPress={addPhotos}>
              <Ionicons name="image-outline" size={18} color="#7B5E7B" />
              <Text style={styles.photoAddText}>Add photo</Text>
            </TouchableOpacity>
            {images.length > 0 && (
              <Text style={styles.photoHint}>
                {images.length} {images.length === 1 ? 'photo' : 'photos'} · keep its ⟦img⟧ tag in the text
              </Text>
            )}
          </View>
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
              {images.map((uri) => (
                <View key={uri} style={styles.thumbWrap}>
                  <Image source={{ uri }} style={styles.thumb} />
                  <TouchableOpacity style={styles.thumbRemove} onPress={() => removePhoto(uri)}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

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
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={cancel}>
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
  photoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  photoAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  photoAddText: { color: '#7B5E7B', fontWeight: '600', fontSize: 13 },
  photoHint: { fontSize: 11, color: '#B8A5B8', flexShrink: 1, marginLeft: 8, textAlign: 'right' },
  photoStrip: { marginTop: 10, flexGrow: 0 },
  thumbWrap: { marginRight: 10 },
  thumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#E5E0D8' },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C0392B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { textAlign: 'center', fontSize: 11, color: '#B8A5B8', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#EDE7F6' },
  cancelText: { color: '#7B5E7B', fontWeight: '700' },
  saveBtn: { backgroundColor: '#6B8E4E' },
  saveText: { color: '#fff', fontWeight: '700' },
});
