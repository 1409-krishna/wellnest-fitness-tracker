import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Droplets, Moon, Sparkles, Wind } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import { addDays, PILLAR_META, PILLARS, startOfWeek, toDateKey } from '../utils/dates'

const icons = { movement: Sparkles, rest: Wind, hydration: Droplets, sleep: Moon }

export default function Dashboard() {
  const { user } = useAuth()
  const [habits, setHabits] = useState([])
  const [progress, setProgress] = useState(null)
  const [goals, setGoals] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const today = toDateKey()
  const weekStart = startOfWeek()

  const load = async () => {
    const from = addDays(today, -6)
    const [h, p, g] = await Promise.all([
      api.get('/habits', { params: { from, to: today } }),
      api.get('/progress/weekly', { params: { weekStart } }),
      api.get('/goals', { params: { weekStart } }),
    ])
    setHabits(h.data)
    setProgress(p.data)
    setGoals(g.data.filter((item) => item.active))
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const todayLogs = habits.filter((h) => h.date === today && h.completed)
  const pending = PILLARS.filter((p) => !todayLogs.some((l) => l.pillar === p))
  const reminders = pending.map((p) => PILLAR_META[p])

  const fillSample = async () => {
    setBusy(true)
    setMessage('')
    try {
      const { data } = await api.post('/insights/sample-week')
      setMessage(data.message)
      await load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not load sample data')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm tracking-wide text-clay uppercase">Wellness dashboard</p>
          <h1 className="font-display mt-1 text-4xl">Hello, {user?.name?.split(' ')[0]}</h1>
          <p className="mt-2 max-w-xl text-ink/65">
            Today is about showing up kindly — movement, rest, water, and sleep in a mix that feels
            livable.
          </p>
        </div>
        <button
          type="button"
          onClick={fillSample}
          disabled={busy}
          className="rounded-2xl border border-sage px-4 py-2 text-sm text-sage hover:bg-sage hover:text-paper disabled:opacity-50"
        >
          {busy ? 'Loading…' : 'Load sample week'}
        </button>
      </header>
      {message ? <p className="rounded-2xl bg-moss/20 px-4 py-3 text-sm text-sage">{message}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent
          label="Today complete"
          value={`${todayLogs.length}/4`}
          hint="Four wellness pillars"
        />
        <StatCard
          label="This week's sessions"
          value={progress?.completedSessions ?? 0}
          hint="Logged activity sessions"
        />
        <StatCard
          label="Habit rate"
          value={`${progress?.habitRate ?? 0}%`}
          hint="Completed cells this week"
        />
        <StatCard label="Active goals" value={goals.length} hint="Flexible weekly targets" />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-3xl bg-paper p-6 lg:col-span-2">
          <h2 className="font-display text-2xl">Routine reminders</h2>
          {reminders.length === 0 ? (
            <p className="mt-4 text-sm text-sage">All four pillars are checked for today. Rest in that.</p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {reminders.map((item) => (
                <li key={item.label} className="rounded-2xl bg-cream px-4 py-3">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-ink/55">{item.hint} — still open today</p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/habits" className="mt-5 inline-block text-sm text-clay hover:underline">
            Open daily habit tracker →
          </Link>
        </article>

        <article className="rounded-3xl bg-ink p-6 text-paper">
          <h2 className="font-display text-2xl">Personalized tiles</h2>
          <div className="mt-4 space-y-3">
            {PILLARS.map((pillar) => {
              const Icon = icons[pillar]
              const done = todayLogs.some((l) => l.pillar === pillar)
              return (
                <div key={pillar} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <span className="flex items-center gap-2">
                    <Icon size={16} />
                    {PILLAR_META[pillar].label}
                  </span>
                  <span className="text-sm">{done ? 'Logged' : 'Open'}</span>
                </div>
              )
            })}
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link to="/activities" className="rounded-3xl border border-sand bg-paper p-5 hover:border-sage">
          <p className="text-sm text-ink/50">Library</p>
          <p className="font-display mt-1 text-xl">Fitness activities</p>
          <p className="mt-2 text-sm text-ink/60">Add walking, yoga, or a custom activity.</p>
        </Link>
        <Link to="/progress" className="rounded-3xl border border-sand bg-paper p-5 hover:border-sage">
          <p className="text-sm text-ink/50">Charts</p>
          <p className="font-display mt-1 text-xl">Goals & progress</p>
          <p className="mt-2 text-sm text-ink/60">Weekly consistency and journal notes.</p>
        </Link>
        <Link to="/insights" className="rounded-3xl border border-sand bg-paper p-5 hover:border-sage">
          <p className="text-sm text-ink/50">Rule-based AI</p>
          <p className="font-display mt-1 text-xl">Wellness insights</p>
          <p className="mt-2 text-sm text-ink/60">Patterns from your real logs — no paid AI.</p>
        </Link>
      </section>
    </div>
  )
}
