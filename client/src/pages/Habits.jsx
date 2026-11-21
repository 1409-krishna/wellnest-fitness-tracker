import { useEffect, useState } from 'react'
import api from '../api/client'
import { addDays, formatNice, PILLAR_META, PILLARS, startOfWeek } from '../utils/dates'

export default function Habits() {
  const [weekStart, setWeekStart] = useState(startOfWeek())
  const [logs, setLogs] = useState([])
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const load = async () => {
    const { data } = await api.get('/habits', {
      params: { from: days[0], to: days[6] },
    })
    setLogs(data)
  }

  useEffect(() => {
    load().catch(() => {})
  }, [weekStart])

  const isDone = (date, pillar) =>
    logs.some((l) => l.date === date && l.pillar === pillar && l.completed)

  const toggle = async (date, pillar) => {
    const completed = !isDone(date, pillar)
    await api.put('/habits', { date, pillar, completed })
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
            className="rounded-2xl bg-paper px-3 py-2 text-sm"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek())}
            className="rounded-2xl bg-paper px-3 py-2 text-sm"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="rounded-2xl bg-paper px-3 py-2 text-sm"
          >
            Next
          </button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-3xl bg-paper p-4">
        <table className="w-full min-w-[720px] border-separate border-spacing-2">
          <thead>
            <tr>
              <th className="w-32 text-left text-sm font-medium text-ink/50">Pillar</th>
              {days.map((day) => (
                <th key={day} className="text-center text-sm font-medium">
                  {formatNice(day)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PILLARS.map((pillar) => (
              <tr key={pillar}>
                <td className="rounded-2xl bg-cream px-3 py-3">
                  <p className="font-medium capitalize">{PILLAR_META[pillar].label}</p>
                  <p className="text-xs text-ink/50">{PILLAR_META[pillar].hint}</p>
                </td>
                {days.map((day) => {
                  const done = isDone(day, pillar)
                  return (
                    <td key={day}>
                      <button
                        type="button"
                        onClick={() => toggle(day, pillar)}
                        className={`h-16 w-full rounded-2xl text-sm transition ${
                          done ? 'bg-sage text-paper' : 'bg-cream text-ink/40 hover:bg-sand'
                        }`}
                      >
                        {done ? 'Done' : 'Tap'}
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
