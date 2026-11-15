// utils/moods.js
// Mood choices for a note. The note stores only the id (e.g. "happy"),
// so the emoji or label can change later without touching saved data.
// Never rename or remove an id that was already used; add new ones instead.
// Order = the order shown in the picker (positive -> focus -> in-between -> low).

export const MOODS = [
  // positive
  { id: 'happy', emoji: '😊', label: 'Happy' },
  { id: 'excited', emoji: '🤩', label: 'Excited' },
  { id: 'loved', emoji: '🥰', label: 'Loved' },
  { id: 'grateful', emoji: '🙏', label: 'Grateful' },
  { id: 'proud', emoji: '😎', label: 'Proud' },
  { id: 'celebrating', emoji: '🥳', label: 'Celebrating' },
  { id: 'fun', emoji: '😆', label: 'Fun' },
  { id: 'cozy', emoji: '🤗', label: 'Cozy' },
  { id: 'motivated', emoji: '💪', label: 'Motivated' },
  { id: 'hopeful', emoji: '🌈', label: 'Hopeful' },
  { id: 'calm', emoji: '😌', label: 'Calm' },
  // focus and energy
  { id: 'determined', emoji: '🔥', label: 'Determined' },
  { id: 'focused', emoji: '🤓', label: 'Focused' },
  // in-between
  { id: 'neutral', emoji: '😐', label: 'Neutral' },
  { id: 'thinking', emoji: '🤔', label: 'Thinking' },
  { id: 'nervous', emoji: '😬', label: 'Nervous' },
  { id: 'bored', emoji: '🥱', label: 'Bored' },
  { id: 'tired', emoji: '😴', label: 'Tired' },
  // low
  { id: 'overwhelmed', emoji: '🤯', label: 'Overwhelmed' },
  { id: 'disappointed', emoji: '😔', label: 'Disappointed' },
  { id: 'emotional', emoji: '🥺', label: 'Emotional' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'crying', emoji: '😭', label: 'Crying' },
  { id: 'numb', emoji: '😶', label: 'Numb' },
  { id: 'burnout', emoji: '😵‍💫', label: 'Burnt out' },
  { id: 'anxious', emoji: '😰', label: 'Anxious' },
  { id: 'scared', emoji: '😨', label: 'Scared' },
  { id: 'frustrated', emoji: '😤', label: 'Frustrated' },
  { id: 'angry', emoji: '😠', label: 'Angry' },
  { id: 'sick', emoji: '🤒', label: 'Sick' },
];

export const getMood = (id) => MOODS.find((m) => m.id === id) || null;

// Overall tone of each mood, used for the mood balance report.
const TONE_BY_ID = {
  happy: 'up', excited: 'up', loved: 'up', grateful: 'up', proud: 'up', celebrating: 'up',
  fun: 'up', cozy: 'up', motivated: 'up', hopeful: 'up', calm: 'up', determined: 'up', focused: 'up',
  neutral: 'mid', thinking: 'mid', nervous: 'mid', bored: 'mid', tired: 'mid',
  overwhelmed: 'down', disappointed: 'down', emotional: 'down', sad: 'down', crying: 'down',
  numb: 'down', burnout: 'down', anxious: 'down', scared: 'down', frustrated: 'down', angry: 'down', sick: 'down',
};

/** 'up' | 'mid' | 'down' (unknown ids count as 'mid') */
export const getTone = (id) => TONE_BY_ID[id] || 'mid';
