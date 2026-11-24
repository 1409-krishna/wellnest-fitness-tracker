import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sparkles, CheckCircle2 } from 'lucide-react'
import api from '../api/client'
import { addDays, formatNice, PILLAR_META, PILLARS, startOfWeek } from '../utils/dates'
import { triggerConfetti } from '../utils/confetti'

function DailyRing({ count, total = 4 }) {
  const radius = 13
  const circumference = 2 * Math.PI * radius
  const progress = (count / total) * circumference
  const isComplete = count >= total

  return (
    <div className="mt-2 flex flex-col items-center justify-center gap-1">
      <div className="relative flex items-center justify-center">
        <svg className="h-9 w-9 -rotate-90 transform" viewBox="0 0 32 32">
          <circle
            cx="16"
            cy="16"
            r={radius}
            className="stroke-sand fill-none"
            strokeWidth="3"
          />
          <circle
            cx="16"
            cy="16"
            r={radius}
            className={`fill-none transition-all duration-500 ease-out ${
              isComplete ? 'stroke-sage' : 'stroke-leaf'
            }`}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute text-[10px] font-bold ${isComplete ? 'text-sage' : 'text-ink/70'}`}>
          {count}/{total}
        </span>
      </div>
      {isComplete ? (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-moss/20 px-1.5 py-0.5 text-[9px] font-semibold text-sage">
          <CheckCircle2 size={10} /> 100%
        </span>
      ) : (
        <span className="text-[9px] text-ink/40">
          {Math.round((count / total) * 100)}%
        </span>
      )}
    </div>
  )
}

export default function Habits() {
  const [weekStart, setWeekStart] = useState(startOfWeek())
  const [logs, setLogs] = useState([])
  const [celebration, setCelebration] = useState('')
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/habits', {
        params: { from: days[0], to: days[6] },
      })
      setLogs(data)
    } catch {
      // Handled silently
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  const isDone = (date, pillar) =>
    logs.some((l) => l.date === date && l.pillar === pillar && l.completed)

  const getDayCompletedCount = (date) =>
    PILLARS.filter((p) => isDone(date, p)).length

  const toggle = async (date, pillar) => {
    const currentStatus = isDone(date, pillar)
    const nextStatus = !currentStatus

    // Check celebration condition before state change
    const oldCount = getDayCompletedCount(date)
    if (nextStatus && oldCount === 3) {
      triggerConfetti()
      setCelebration(`🎉 4/4 Pillars Complete for ${formatNice(date)}! Mind and body in harmony!`)
      setTimeout(() => setCelebration(''), 6000)
    }

    await api.put('/habits', { date, pillar, completed: nextStatus })
    await load()
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm tracking-wide text-clay uppercase">Daily habit tracker</p>
          <h1 className="font-display mt-1 text-4xl">Weekly calendar</h1>
          <p className="mt-2 max-w-2xl text-ink/65">
            Log movement, rest, hydration, and sleep. Tap a cell to mark it complete — goals stay
            flexible, never appearance-based.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="rounded-2xl border border-sand bg-paper px-4 py-2 text-sm font-medium transition hover:border-sage"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek())}
            className="rounded-2xl bg-sage px-4 py-2 text-sm font-medium text-paper shadow-sm transition hover:bg-moss"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="rounded-2xl border border-sand bg-paper px-4 py-2 text-sm font-medium transition hover:border-sage"
          >
            Next
          </button>
        </div>
      </header>

      {celebration && (
        <div className="flex items-center gap-3 rounded-2xl border border-sage/30 bg-moss/20 px-5 py-4 text-sm font-medium text-sage shadow-sm animate-fade-in">
          <Sparkles className="animate-spin text-clay" size={20} />
          <span>{celebration}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl border border-sand bg-paper p-5 shadow-sm">
        <table className="w-full min-w-[760px] border-separate border-spacing-2">
          <thead>
            <tr>
              <th className="w-36 text-left text-sm font-medium text-ink/50 align-top pt-2">
                Pillars
              </th>
              {days.map((day) => {
                const count = getDayCompletedCount(day)
                return (
                  <th key={day} className="text-center align-top p-2 rounded-2xl bg-cream/50">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">
                      {formatNice(day)}
                    </span>
                    <DailyRing count={count} total={4} />
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {PILLARS.map((pillar) => (
              <tr key={pillar}>
                <td className="rounded-2xl bg-cream px-4 py-3 shadow-sm">
                  <p className="font-semibold capitalize text-ink">{PILLAR_META[pillar].label}</p>
                  <p className="text-xs text-ink/55 mt-0.5">{PILLAR_META[pillar].hint}</p>
                </td>
                {days.map((day) => {
                  const done = isDone(day, pillar)
                  return (
                    <td key={day}>
                      <button
                        type="button"
                        onClick={() => toggle(day, pillar)}
                        className={`h-16 w-full rounded-2xl text-sm font-semibold transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                          done
                            ? 'bg-sage text-paper shadow-sm hover:bg-moss scale-[0.98]'
                            : 'bg-cream text-ink/40 hover:bg-sand hover:text-ink/80'
                        }`}
                      >
                        {done ? (
                          <>
                            <CheckCircle2 size={16} />
                            <span>Done</span>
                          </>
                        ) : (
                          <span>Tap</span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
