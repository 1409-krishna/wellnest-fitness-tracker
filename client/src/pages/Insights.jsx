import { useEffect, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Sparkles, PlusCircle } from 'lucide-react'
import api from '../api/client'
import InsightCard from '../components/InsightCard'
import { toDateKey } from '../utils/dates'
import { triggerConfetti } from '../utils/confetti'

export default function Insights() {
  const [data, setData] = useState(null)
  const [notice, setNotice] = useState('')
  const [loggingId, setLoggingId] = useState(null)

  const loadInsights = () => {
    api
      .get('/insights')
      .then((res) => setData(res.data))
      .catch(() => {})
  }

  useEffect(() => {
    loadInsights()
  }, [])

  const quickLog = async (suggestion, idx) => {
    setLoggingId(idx)
    try {
      const today = toDateKey()
      if (suggestion.activityId) {
        await api.post('/progress/sessions', {
          activityId: suggestion.activityId,
          date: today,
          durationMins: suggestion.durationMins || 20,
        })
      }
      if (suggestion.category) {
        await api.put('/habits', {
          date: today,
          pillar: suggestion.category,
          completed: true,
        })
      }
      triggerConfetti()
      setNotice(` Logged "${suggestion.activityHint || suggestion.text}" for today! Keep up the mindful rhythm.`)
      setTimeout(() => setNotice(''), 5000)
      loadInsights()
    } catch (err) {
      setNotice(err.response?.data?.message || 'Could not log activity.')
    } finally {
      setLoggingId(null)
    }
  }

  if (!data) {
    return (
      <div className="flex items-center gap-3 py-12 text-sage">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-sage border-t-transparent" />
        <p>Analyzing your wellness logs...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm tracking-wide text-clay uppercase">AI wellness insights</p>
        <h1 className="font-display mt-1 text-4xl">Rule-based, from your data</h1>
        <p className="mt-2 max-w-2xl text-ink/65">
          These five insights are computed on the server from your habits, sessions, and favorites.
          No paid AI API. Suggestions stay balanced — never restrictive.
        </p>
      </header>

      {notice && (
        <div className="flex items-center gap-3 rounded-2xl border border-sage/30 bg-moss/20 px-5 py-4 text-sm font-medium text-sage shadow-sm">
          <Sparkles className="text-clay" size={18} />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <InsightCard
          eyebrow="01"
          title={data.preferredTypes.title}
          detail={data.preferredTypes.detail}
        >
          <div className="flex flex-wrap gap-2">
            {data.preferredTypes.categories.length === 0 ? (
              <span className="text-sm text-ink/50">No favorites or sessions yet.</span>
            ) : (
              data.preferredTypes.categories.map((c) => (
                <span key={c.category} className="rounded-full bg-cream px-3 py-1 text-sm capitalize font-medium text-sage">
                  {c.category} · {c.count} sessions
                </span>
              ))
            )}
          </div>
        </InsightCard>

        <InsightCard
          eyebrow="02"
          title={data.weeklyPatterns.title}
          detail={data.weeklyPatterns.detail}
        >
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyPatterns.byDay}>
                <XAxis dataKey="label" stroke="#8b9e95" />
                <YAxis allowDecimals={false} stroke="#8b9e95" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fbf8f1', borderRadius: '12px', border: '1px solid #e7ddcc' }}
                />
                <Bar dataKey="count" fill="#3c6b58" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </InsightCard>

        <InsightCard eyebrow="03" title={data.habitTrends.title} detail={data.habitTrends.detail}>
          <ul className="space-y-2">
            {data.habitTrends.pillars.map((p) => (
              <li key={p.pillar} className="flex items-center justify-between rounded-2xl bg-cream px-4 py-2.5 text-sm">
                <span className="capitalize font-medium text-ink">{p.pillar}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  p.direction === 'up'
                    ? 'bg-moss/30 text-sage'
                    : p.direction === 'down'
                    ? 'bg-clay/15 text-clay'
                    : 'bg-sand/60 text-ink/70'
                }`}>
                  {p.recent}/14 days · {p.direction === 'up' ? '↗ improving' : p.direction === 'down' ? '↘ lighter' : '→ steady'}
                </span>
              </li>
            ))}
          </ul>
        </InsightCard>

        <InsightCard
          eyebrow="04"
          title={data.consistency.title}
          detail={data.consistency.detail}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-sage p-4 text-paper shadow-sm">
              <p className="text-xs uppercase tracking-wider text-paper/80 font-medium">Active Streak</p>
              <p className="font-display text-3xl mt-1">{data.consistency.streak} days</p>
              <p className="text-xs text-paper/70 mt-1">Keep showing up</p>
            </div>
            <div className="rounded-2xl bg-cream p-4 border border-sand">
              <p className="text-xs uppercase tracking-wider text-ink/55 font-medium">Balance score</p>
              <p className="font-display text-3xl text-sage mt-1">{data.consistency.score}%</p>
              <p className="text-xs text-ink/60 mt-1">4-pillar distribution</p>
            </div>
          </div>
        </InsightCard>
      </div>

      <InsightCard
        eyebrow="05"
        title="Balanced activity suggestions"
        detail="Built dynamically from gaps in your four pillars. We never suggest calorie cuts, weight targets, or appearance goals."
      >
        <ul className="grid gap-4 md:grid-cols-3">
          {data.balancedSuggestions.map((s, idx) => (
            <li key={s.text} className="flex flex-col justify-between rounded-3xl border border-sand bg-cream p-5 shadow-sm transition hover:shadow-md">
              <div>
                <p className="font-semibold text-ink text-base">{s.text}</p>
                <p className="mt-2 text-sm text-ink/65 leading-relaxed">{s.reason}</p>
                {s.activityHint ? (
                  <p className="mt-3 text-xs uppercase tracking-wider font-semibold text-sage bg-moss/20 inline-block px-2.5 py-1 rounded-full">
                    Recommended: {s.activityHint}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => quickLog(s, idx)}
                disabled={loggingId === idx}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-sage py-2.5 text-sm font-semibold text-paper shadow-sm transition hover:bg-moss disabled:opacity-50"
              >
                {loggingId === idx ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/40 border-t-paper" />
                ) : (
                  <>
                    <PlusCircle size={16} />
                    <span>Log Now for Today</span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      </InsightCard>
    </div>
  )
}
