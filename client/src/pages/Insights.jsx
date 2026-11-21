import { useEffect, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../api/client'
import InsightCard from '../components/InsightCard'

export default function Insights() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api
      .get('/insights')
      .then((res) => setData(res.data))
      .catch(() => {})
  }, [])

  if (!data) {
    return <p className="text-sage">Reading your logs…</p>
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
                <span key={c.category} className="rounded-full bg-cream px-3 py-1 text-sm capitalize">
                  {c.category} · {c.count}
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
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3c6b58" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </InsightCard>

        <InsightCard eyebrow="03" title={data.habitTrends.title} detail={data.habitTrends.detail}>
          <ul className="space-y-2">
            {data.habitTrends.pillars.map((p) => (
              <li key={p.pillar} className="flex items-center justify-between rounded-2xl bg-cream px-3 py-2 text-sm">
                <span className="capitalize">{p.pillar}</span>
                <span>
                  {p.recent}/14 · {p.direction === 'up' ? 'improving' : p.direction === 'down' ? 'lighter' : 'steady'}
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
            <div className="rounded-2xl bg-sage p-4 text-paper">
              <p className="text-sm text-paper/80">Streak</p>
              <p className="font-display text-3xl">{data.consistency.streak} days</p>
            </div>
            <div className="rounded-2xl bg-cream p-4">
              <p className="text-sm text-ink/55">Balance score</p>
              <p className="font-display text-3xl">{data.consistency.score}%</p>
            </div>
          </div>
        </InsightCard>
      </div>

      <InsightCard
        eyebrow="05"
        title="Balanced activity suggestions"
        detail="Built from gaps in your four pillars. We never suggest calorie cuts, weight targets, or appearance goals."
      >
        <ul className="grid gap-3 md:grid-cols-3">
          {data.balancedSuggestions.map((s) => (
            <li key={s.text} className="rounded-2xl bg-cream p-4">
              <p className="font-medium">{s.text}</p>
              <p className="mt-2 text-sm text-ink/60">{s.reason}</p>
              {s.activityHint ? (
                <p className="mt-2 text-xs uppercase tracking-wide text-sage">Try: {s.activityHint}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </InsightCard>
    </div>
  )
}
