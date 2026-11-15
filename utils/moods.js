// utils/moods.js
// Mood choices for a note. The note stores only the id (e.g. "happy"),
// so the emoji or label can change later without touching saved data.

export const MOODS = [
  { id: 'happy', emoji: '😊', label: 'Happy' },
  { id: 'excited', emoji: '🤩', label: 'Excited' },
  { id: 'loved', emoji: '🥰', label: 'Loved' },
  { id: 'calm', emoji: '😌', label: 'Calm' },
  { id: 'grateful', emoji: '🙏', label: 'Grateful' },
  { id: 'proud', emoji: '😎', label: 'Proud' },
  { id: 'neutral', emoji: '😐', label: 'Neutral' },
  { id: 'tired', emoji: '😴', label: 'Tired' },
  { id: 'anxious', emoji: '😰', label: 'Anxious' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'angry', emoji: '😠', label: 'Angry' },
  { id: 'sick', emoji: '🤒', label: 'Sick' },
];

export const getMood = (id) => MOODS.find((m) => m.id === id) || null;
