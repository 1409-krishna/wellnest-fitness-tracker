import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Trash2, Sparkles, PlusCircle } from 'lucide-react'
import api from '../api/client'
import StatCard from '../components/StatCard'
import { PILLARS, startOfWeek, toDateKey } from '../utils/dates'
import { triggerConfetti } from '../utils/confetti'

const emptyGoal = {
  title: '',
  pillar: 'movement',
  targetPerWeek: 3,
  startDate: toDateKey(),
}

export default function Progress() {
  const weekStart = startOfWeek()
  const [progress, setProgress] = useState(null)
  const [goals, setGoals] = useState([])
  const [journals, setJournals] = useState([])
  const [sessions, setSessions] = useState([])
  const [goalForm, setGoalForm] = useState(emptyGoal)
  const [note, setNote] = useState({ mood: 'steady', note: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const [p, g, j, s] = await Promise.all([
        api.get('/progress/weekly', { params: { weekStart } }),
        api.get('/goals', { params: { weekStart } }),
        api.get('/progress/journals'),
        api.get('/progress/sessions'),
      ])
      setProgress(p.data)
      setGoals(g.data)
      setJournals(j.data)
      setSessions(s.data)
    } catch {
      // Handled silently
    }
  }, [weekStart])

  useEffect(() => {
    load()
  }, [load])

  const createGoal = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/goals', goalForm)
      triggerConfetti()
      setNotice(`Weekly goal "${goalForm.title}" set successfully!`)
      setTimeout(() => setNotice(''), 4000)
      setGoalForm(emptyGoal)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create goal')
    }
  }

  const removeGoal = async (id) => {
    await api.delete(`/goals/${id}`)
    setNotice('Goal removed.')
    setTimeout(() => setNotice(''), 3000)
    await load()
  }

  const addNote = async (e) => {
    e.preventDefault()
    await api.post('/progress/journals', { ...note, date: toDateKey() })
    triggerConfetti()
    setNotice('Reflective note saved to your wellness journal!')
    setTimeout(() => setNotice(''), 4000)
    setNote({ mood: 'steady', note: '' })
    await load()
  }

  const removeSession = async (id) => {
    if (!window.confirm('Delete this logged session?')) return
    await api.delete(`/progress/sessions/${id}`)
    setNotice('Session removed.')
    setTimeout(() => setNotice(''), 3000)
    await load()
  }

  const removeJournal = async (id) => {
    await api.delete(`/progress/journals/${id}`)
    setNotice('Journal note deleted.')
    setTimeout(() => setNotice(''), 3000)
    await load()
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm tracking-wide text-clay uppercase">Goals & progress</p>
        <h1 className="font-display mt-1 text-4xl">Weekly consistency</h1>
        <p className="mt-2 max-w-2xl text-ink/65">
          Charts, completed sessions, and reflective notes. Goals are weekly frequencies — not
          weight or appearance targets.
        </p>
      </header>

      {notice && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-sage/30 bg-moss/20 px-5 py-4 text-sm font-medium text-sage shadow-sm">
          <Sparkles size={18} className="text-clay" />
          <span>{notice}</span>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Sessions" value={progress?.completedSessions ?? 0} hint="This week" />
        <StatCard label="Habit completion" value={`${progress?.habitRate ?? 0}%`} hint="Four pillars × 7 days" />
        <StatCard label="Active goals" value={goals.filter((g) => g.active).length} />
      </section>

      <article className="rounded-3xl border border-sand bg-paper p-6 shadow-sm">
        <h2 className="font-display text-2xl">Consistency chart</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progress?.series || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7ddcc" />
              <XAxis dataKey="label" stroke="#8b9e95" />
              <YAxis allowDecimals={false} stroke="#8b9e95" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fbf8f1', borderRadius: '12px', border: '1px solid #e7ddcc' }}
              />
              <Legend />
              <Bar dataKey="movement" stackId="h" fill="#3c6b58" name="Movement" />
              <Bar dataKey="rest" stackId="h" fill="#8fbc9a" name="Rest" />
              <Bar dataKey="hydration" stackId="h" fill="#5b8f74" name="Hydration" />
              <Bar dataKey="sleep" stackId="h" fill="#c45c26" name="Sleep" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-sand bg-paper p-6 shadow-sm">
          <h2 className="font-display text-2xl">Flexible activity goals</h2>
          <form onSubmit={createGoal} className="mt-4 space-y-3">
            {error ? <p className="text-sm text-clay">{error}</p> : null}
            <input
              required
              placeholder="e.g. Yoga 3 mornings this week"
              value={goalForm.title}
              onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
              className="w-full rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-sage"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={goalForm.pillar}
                onChange={(e) => setGoalForm({ ...goalForm, pillar: e.target.value })}
                className="rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-sage capitalize"
              >
                {PILLARS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={7}
                value={goalForm.targetPerWeek}
                onChange={(e) => setGoalForm({ ...goalForm, targetPerWeek: Number(e.target.value) })}
                className="rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-sage"
              />
            </div>
            <button type="submit" className="flex items-center gap-2 rounded-2xl bg-sage px-5 py-2.5 text-sm font-semibold text-paper shadow-sm hover:bg-moss transition">
              <PlusCircle size={16} />
              Create goal
            </button>
          </form>
          <ul className="mt-5 space-y-3">
            {goals.map((goal) => (
              <li key={goal._id} className="rounded-2xl border border-sand bg-cream p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{goal.title}</p>
                    <p className="text-sm text-ink/55 mt-0.5 capitalize">
                      {goal.pillar} · {goal.actualThisWeek || 0}/{goal.targetPerWeek} days this week
                    </p>
                  </div>
                  <button type="button" onClick={() => removeGoal(goal._id)} className="text-sm text-clay hover:underline">
                    Remove
                  </button>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand">
                  <div
                    className="h-full bg-sage transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ((goal.actualThisWeek || 0) / goal.targetPerWeek) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border border-sand bg-paper p-6 shadow-sm">
          <h2 className="font-display text-2xl">Reflective journal</h2>
          <form onSubmit={addNote} className="mt-4 space-y-3">
            <select
              value={note.mood}
              onChange={(e) => setNote({ ...note, mood: e.target.value })}
              className="w-full rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-sage capitalize"
            >
              <option value="calm">Mood: calm</option>
              <option value="energized">Mood: energized</option>
              <option value="tired">Mood: tired</option>
              <option value="steady">Mood: steady</option>
            </select>
            <textarea
              required
              placeholder="How did movement, hydration, and rest feel today?"
              value={note.note}
              onChange={(e) => setNote({ ...note, note: e.target.value })}
              className="w-full rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-sage"
            />
            <button type="submit" className="rounded-2xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-ink/80 transition">
              Save note
            </button>
          </form>
          <ul className="mt-5 max-h-64 space-y-3 overflow-auto">
            {journals.map((j) => (
              <li key={j._id} className="flex items-start justify-between gap-3 rounded-2xl border border-sand bg-cream p-3.5 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-sage font-semibold">
                    {j.date} · {j.mood}
                  </p>
                  <p className="mt-1 text-ink">{j.note}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeJournal(j._id)}
                  className="text-ink/35 hover:text-clay p-1"
                  title="Delete note"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <article className="rounded-3xl border border-sand bg-paper p-6 shadow-sm">
        <h2 className="font-display text-2xl">Completed sessions</h2>
        <ul className="mt-4 divide-y divide-sand">
          {sessions.length === 0 ? (
            <li className="py-4 text-sm text-ink/50">Log an activity from the library to see it here.</li>
          ) : (
            sessions.map((s) => (
              <li key={s._id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <span className="font-medium text-ink">
                    {s.activityId?.name || 'Activity'}
                  </span>
                  <span className="ml-2 text-xs uppercase tracking-wider font-semibold text-clay bg-clay/10 px-2 py-0.5 rounded-md">
                    {s.activityId?.category || 'movement'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-ink/50">
                    {s.date} · {s.durationMins} min
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSession(s._id)}
                    className="text-ink/35 hover:text-clay p-1 transition"
                    title="Delete session"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </article>
    </div>
  )
}
