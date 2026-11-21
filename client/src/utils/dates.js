export function toDateKey(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toDateKey(d)
}

export function formatNice(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function weekdayLabel(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' })
}

export const PILLARS = ['movement', 'rest', 'hydration', 'sleep']

export const PILLAR_META = {
  movement: { label: 'Movement', hint: 'Walk, yoga, stretch' },
  rest: { label: 'Rest', hint: 'Pause and recover' },
  hydration: { label: 'Hydration', hint: 'Water check-ins' },
  sleep: { label: 'Sleep', hint: 'Wind-down and rest' },
}

export const CATEGORIES = ['all', 'movement', 'rest', 'hydration', 'sleep', 'mind', 'outdoor']
