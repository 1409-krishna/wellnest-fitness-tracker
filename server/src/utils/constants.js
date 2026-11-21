const CATEGORIES = ['movement', 'rest', 'hydration', 'sleep', 'mind', 'outdoor'];
const PILLARS = ['movement', 'rest', 'hydration', 'sleep'];
const INTENSITIES = ['gentle', 'moderate'];
const MOODS = ['calm', 'energized', 'tired', 'steady'];

const BLOCKED_GOAL_WORDS = [
  'weight',
  'skinny',
  'fat',
  'calories',
  'calorie',
  'bmi',
  'slim',
  'lose kg',
  'lose kg',
  'appearance',
  'body fat',
];

function isRestrictedGoal(title = '') {
  const text = title.toLowerCase();
  return BLOCKED_GOAL_WORDS.some((word) => text.includes(word));
}

function toDateKey(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function weekdayName(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' });
}

module.exports = {
  CATEGORIES,
  PILLARS,
  INTENSITIES,
  MOODS,
  isRestrictedGoal,
  toDateKey,
  addDays,
  weekdayName,
};
