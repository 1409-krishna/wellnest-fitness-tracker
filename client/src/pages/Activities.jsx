import { useEffect, useMemo, useState } from 'react'
import { Heart, Plus } from 'lucide-react'
import api from '../api/client'
import EmptyState from '../components/EmptyState'
import { CATEGORIES, toDateKey } from '../utils/dates'

const emptyForm = {
  name: '',
  category: 'movement',
  intensity: 'gentle',
  durationMins: 20,
  description: '',
  isTemplate: false,
}

export default function Activities() {
  const [items, setItems] = useState([])
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [open, setOpen] = useState(false)

  const load = async () => {
    const { data } = await api.get('/activities', { params: { category, search } })
    setItems(data)
  }

  useEffect(() => {
    load().catch(() => {})
  }, [category, search])

  const templates = useMemo(() => items.filter((a) => a.isTemplate), [items])

  const toggleFav = async (id) => {
    await api.post(`/activities/${id}/favorite`)
    await load()
  }

  const logSession = async (activity) => {
    await api.post('/progress/sessions', {
      activityId: activity._id,
      date: toDateKey(),
      durationMins: activity.durationMins,
    })
    setNotice(`${activity.name} logged for today.`)
  }

  const create = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/activities', form)
      setForm(emptyForm)
      setOpen(false)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add activity')
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm tracking-wide text-clay uppercase">Directory</p>
          <h1 className="font-display mt-1 text-4xl">Fitness activities</h1>
          <p className="mt-2 text-ink/65">Filter the library, save favorites, and reuse routine templates.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-2xl bg-sage px-4 py-2 text-paper"
        >
          <Plus size={16} /> Add activity
        </button>
      </header>

      {notice ? <p className="rounded-2xl bg-moss/20 px-4 py-3 text-sm text-sage">{notice}</p> : null}

      {open ? (
        <form onSubmit={create} className="grid gap-3 rounded-3xl bg-paper p-6 md:grid-cols-2">
          <h2 className="font-display text-xl md:col-span-2">Add walking, yoga, or another activity</h2>
          {error ? <p className="text-sm text-clay md:col-span-2">{error}</p> : null}
          <input
            required
            placeholder="Name (e.g. Evening yoga)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-2xl border border-sand bg-cream px-4 py-3"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-2xl border border-sand bg-cream px-4 py-3"
          >
            {CATEGORIES.filter((c) => c !== 'all').map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={form.intensity}
            onChange={(e) => setForm({ ...form, intensity: e.target.value })}
            className="rounded-2xl border border-sand bg-cream px-4 py-3"
          >
            <option value="gentle">gentle</option>
            <option value="moderate">moderate</option>
          </select>
          <input
            type="number"
            min={5}
            max={180}
            value={form.durationMins}
            onChange={(e) => setForm({ ...form, durationMins: Number(e.target.value) })}
            className="rounded-2xl border border-sand bg-cream px-4 py-3"
          />
          <textarea
            placeholder="Short description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-2xl border border-sand bg-cream px-4 py-3 md:col-span-2"
          />
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.isTemplate}
              onChange={(e) => setForm({ ...form, isTemplate: e.target.checked })}
            />
            Save as a routine template
          </label>
          <button type="submit" className="rounded-2xl bg-ink px-4 py-3 text-paper md:col-span-2">
            Save activity
          </button>
        </form>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities"
          className="w-full rounded-2xl border border-sand bg-paper px-4 py-3 md:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 text-sm capitalize ${
                category === c ? 'bg-sage text-paper' : 'bg-paper text-ink/70'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {templates.length > 0 ? (
        <section>
          <h2 className="font-display text-2xl">Routine templates</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((item) => (
              <article key={item._id} className="rounded-3xl border border-sage/20 bg-moss/15 p-4">
                <p className="text-xs uppercase tracking-wide text-sage">{item.category}</p>
                <p className="mt-1 font-medium">{item.name}</p>
                <p className="text-sm text-ink/55">{item.durationMins} min · {item.intensity}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {items.length === 0 ? (
        <EmptyState title="No activities yet" body="Add walking, yoga, or another gentle activity to start your library." />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item._id} className="flex flex-col rounded-3xl bg-paper p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-clay">{item.category}</p>
                  <h3 className="font-display mt-1 text-2xl">{item.name}</h3>
                </div>
                <button type="button" onClick={() => toggleFav(item._id)} className="text-clay">
                  <Heart size={20} fill={item.isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>
              <p className="mt-2 flex-1 text-sm text-ink/65">{item.description}</p>
              <p className="mt-3 text-sm text-ink/50">
                {item.durationMins} min · {item.intensity}
                {item.isTemplate ? ' · template' : ''}
                {item.isFavorite ? ' · favorite' : ''}
              </p>
              <button
                type="button"
                onClick={() => logSession(item)}
                className="mt-4 rounded-2xl bg-cream py-2 text-sm hover:bg-sand"
              >
                Log as today's session
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
