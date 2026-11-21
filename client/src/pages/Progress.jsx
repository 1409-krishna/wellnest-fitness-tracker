import { useEffect, useState } from 'react'
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
import api from '../api/client'
import StatCard from '../components/StatCard'
import { PILLARS, startOfWeek, toDateKey } from '../utils/dates'

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

  const load = async () => {
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
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const createGoal = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/goals', goalForm)
      setGoalForm(emptyGoal)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create goal')
    }
  }

  const removeGoal = async (id) => {
    await api.delete(`/goals/${id}`)
    await load()
  }

  const addNote = async (e) => {
    e.preventDefault()
    await api.post('/progress/journals', { ...note, date: toDateKey() })
    setNote({ mood: 'steady', note: '' })
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

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Sessions" value={progress?.completedSessions ?? 0} hint="This week" />
        <StatCard label="Habit completion" value={`${progress?.habitRate ?? 0}%`} hint="Four pillars × 7 days" />
        <StatCard label="Active goals" value={goals.filter((g) => g.active).length} />
      </section>

      <article className="rounded-3xl bg-paper p-6">
        <h2 className="font-display text-2xl">Consistency chart</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progress?.series || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7ddcc" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="movement" stackId="h" fill="#3c6b58" />
              <Bar dataKey="rest" stackId="h" fill="#8fbc9a" />
              <Bar dataKey="hydration" stackId="h" fill="#5b8f74" />
              <Bar dataKey="sleep" stackId="h" fill="#c45c26" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl bg-paper p-6">
          <h2 className="font-display text-2xl">Flexible activity goals</h2>
          <form onSubmit={createGoal} className="mt-4 space-y-3">
            {error ? <p className="text-sm text-clay">{error}</p> : null}
            <input
              required
              placeholder="e.g. Yoga 3 mornings this week"
              value={goalForm.title}
              onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
              className="w-full rounded-2xl border border-sand bg-cream px-4 py-3"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={goalForm.pillar}
                onChange={(e) => setGoalForm({ ...goalForm, pillar: e.target.value })}
                className="rounded-2xl border border-sand bg-cream px-4 py-3"
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
                className="rounded-2xl border border-sand bg-cream px-4 py-3"
              />
            </div>
            <button type="submit" className="rounded-2xl bg-sage px-4 py-2 text-paper">
              Create goal
            </button>
          </form>
          <ul className="mt-5 space-y-3">
            {goals.map((goal) => (
              <li key={goal._id} className="rounded-2xl bg-cream p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{goal.title}</p>
                    <p className="text-sm text-ink/55">
                      {goal.pillar} · {goal.actualThisWeek || 0}/{goal.targetPerWeek} days this week
                    </p>
                  </div>
                  <button type="button" onClick={() => removeGoal(goal._id)} className="text-sm text-clay">
                    Remove
                  </button>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand">
                  <div
                    className="h-full bg-sage"
                    style={{
                      width: `${Math.min(100, ((goal.actualThisWeek || 0) / goal.targetPerWeek) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl bg-paper p-6">
          <h2 className="font-display text-2xl">Reflective journal</h2>
          <form onSubmit={addNote} className="mt-4 space-y-3">
            <select
              value={note.mood}
              onChange={(e) => setNote({ ...note, mood: e.target.value })}
              className="w-full rounded-2xl border border-sand bg-cream px-4 py-3"
            >
              <option value="calm">calm</option>
              <option value="energized">energized</option>
              <option value="tired">tired</option>
              <option value="steady">steady</option>
            </select>
            <textarea
              required
              placeholder="How did movement and rest feel today?"
              value={note.note}
              onChange={(e) => setNote({ ...note, note: e.target.value })}
              className="w-full rounded-2xl border border-sand bg-cream px-4 py-3"
            />
            <button type="submit" className="rounded-2xl bg-ink px-4 py-2 text-paper">
              Save note
            </button>
          </form>
          <ul className="mt-5 max-h-64 space-y-3 overflow-auto">
            {journals.map((j) => (
              <li key={j._id} className="rounded-2xl bg-cream p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-sage">
                  {j.date} · {j.mood}
                </p>
                <p className="mt-1">{j.note}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <article className="rounded-3xl bg-paper p-6">
        <h2 className="font-display text-2xl">Completed sessions</h2>
        <ul className="mt-4 divide-y divide-sand">
          {sessions.length === 0 ? (
            <li className="py-4 text-sm text-ink/50">Log an activity from the library to see it here.</li>
          ) : (
            sessions.map((s) => (
              <li key={s._id} className="flex items-center justify-between py-3 text-sm">
                <span>
                  {s.activityId?.name || 'Activity'} · {s.activityId?.category}
                </span>
                <span className="text-ink/50">
                  {s.date} · {s.durationMins} min
                </span>
              </li>
            ))
          )}
        </ul>
      </article>
    </div>
  )
}
