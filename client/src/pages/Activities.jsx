import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Heart, Plus, Trash2, CheckCircle2, Sparkles, Image, Loader2, X, Calendar } from 'lucide-react'
import api from '../api/client'
import EmptyState from '../components/EmptyState'
import ScheduleModal from '../components/ScheduleModal'
import { CATEGORIES, toDateKey } from '../utils/dates'
import { triggerConfetti } from '../utils/confetti'

const emptyForm = {
  name: '',
  category: 'movement',
  intensity: 'gentle',
  durationMins: 20,
  description: '',
  isTemplate: false,
  image: '',
  imagePublicId: '',
}

export default function Activities() {
  const [items, setItems] = useState([])
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [open, setOpen] = useState(false)
  const [schedulingActivity, setSchedulingActivity] = useState(null)
  const fileInputRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/activities', { params: { category, search } })
      setItems(data)
    } catch {
      // Handled silently
    }
  }, [category, search])

  useEffect(() => {
    load()
  }, [load])

  const templates = useMemo(() => items.filter((a) => a.isTemplate), [items])

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)
    setUploadingImage(true)
    setError('')

    try {
      const res = await api.post('/upload/activity-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data.success) {
        setForm((prev) => ({
          ...prev,
          image: res.data.imageUrl,
          imagePublicId: res.data.publicId,
        }))
        setNotice('Activity photo uploaded successfully!')
        setTimeout(() => setNotice(''), 3000)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not upload activity image')
    } finally {
      setUploadingImage(false)
    }
  }

  const removeUploadedImage = () => {
    setForm((prev) => ({ ...prev, image: '', imagePublicId: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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
    triggerConfetti()
    setNotice(`🎉 "${activity.name}" logged for today! Take a moment to enjoy your progress.`)
    setTimeout(() => setNotice(''), 5000)
  }

  const deleteActivity = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return
    try {
      await api.delete(`/activities/${id}`)
      setNotice(`"${name}" deleted.`)
      setTimeout(() => setNotice(''), 4000)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete activity')
    }
  }

  const create = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/activities', form)
      triggerConfetti()
      setNotice(`Activity "${form.name}" added to your library!`)
      setTimeout(() => setNotice(''), 5000)
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
          className="inline-flex items-center gap-2 rounded-2xl bg-sage px-4 py-2.5 text-sm font-semibold text-paper shadow-sm transition hover:bg-moss"
        >
          <Plus size={18} /> Add custom activity
        </button>
      </header>

      {notice ? (
        <div className="flex items-center gap-2.5 rounded-2xl border border-sage/30 bg-moss/20 px-5 py-4 text-sm font-medium text-sage shadow-sm">
          <Sparkles size={18} className="text-clay" />
          <span>{notice}</span>
        </div>
      ) : null}

      {open ? (
        <form onSubmit={create} className="grid gap-4 rounded-3xl border border-sand bg-paper p-6 shadow-md md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="font-display text-2xl">Add custom wellness activity</h2>
            <p className="text-sm text-ink/60 mt-1">Design an activity that feels natural and enjoyable for your routine.</p>
          </div>
          {error ? <p className="text-sm text-clay md:col-span-2">{error}</p> : null}
          <input
            required
            placeholder="Name (e.g. Evening yoga, Post-work walk)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-sage"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-sage"
          >
            {CATEGORIES.filter((c) => c !== 'all').map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>
          <select
            value={form.intensity}
            onChange={(e) => setForm({ ...form, intensity: e.target.value })}
            className="rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-sage"
          >
            <option value="gentle">Intensity: gentle</option>
            <option value="moderate">Intensity: moderate</option>
          </select>
          <input
            type="number"
            min={5}
            max={180}
            value={form.durationMins}
            onChange={(e) => setForm({ ...form, durationMins: Number(e.target.value) })}
            placeholder="Duration in mins"
            className="rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-sage"
          />
          <textarea
            placeholder="Short description / intention"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-sage md:col-span-2"
          />
          <div className="md:col-span-2 rounded-2xl border border-dashed border-sand bg-cream/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/60 mb-2">
              Activity Photo (Optional)
            </p>
            {form.image ? (
              <div className="relative inline-block">
                <img
                  src={form.image}
                  alt="Activity preview"
                  className="h-28 w-44 rounded-xl object-cover border border-sand shadow-xs"
                />
                <button
                  type="button"
                  onClick={removeUploadedImage}
                  className="absolute -top-2 -right-2 rounded-full bg-clay p-1 text-paper shadow-md hover:bg-clay/90 cursor-pointer"
                  title="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div>
                <label className="inline-flex items-center gap-2 rounded-xl border border-sand bg-paper px-4 py-2 text-xs font-semibold text-ink/80 hover:bg-sand cursor-pointer transition">
                  {uploadingImage ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-sage" />
                      Uploading photo...
                    </>
                  ) : (
                    <>
                      <Image size={15} className="text-sage" />
                      Upload photo
                    </>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
                <span className="ml-3 text-xs text-ink/45">PNG, JPG, or WEBP up to 5MB</span>
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isTemplate}
              onChange={(e) => setForm({ ...form, isTemplate: e.target.checked })}
              className="accent-sage h-4 w-4 rounded"
            />
            Save as a reusable routine template
          </label>
          <div className="flex gap-3 md:col-span-2">
            <button type="submit" className="flex-1 rounded-2xl bg-sage py-3 text-sm font-semibold text-paper shadow-sm hover:bg-moss transition">
              Save activity
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-2xl border border-sand bg-cream px-6 py-3 text-sm font-semibold text-ink/70 hover:bg-sand transition"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities by name..."
          className="w-full rounded-2xl border border-sand bg-paper px-4 py-3 md:max-w-sm outline-none focus:border-sage shadow-xs"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                category === c ? 'bg-sage text-paper shadow-xs' : 'bg-paper text-ink/70 border border-sand hover:border-sage'
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
                <p className="text-xs uppercase tracking-wide text-sage font-semibold">{item.category}</p>
                <p className="mt-1 font-semibold text-ink">{item.name}</p>
                <p className="text-sm text-ink/55 mt-0.5">{item.durationMins} min · {item.intensity}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {items.length === 0 ? (
        <EmptyState title="No activities found" body="Try adjusting your category filter or search query, or add your own custom activity." />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item._id} className="flex flex-col justify-between rounded-3xl border border-sand bg-paper p-5 shadow-sm transition hover:shadow-md overflow-hidden">
              <div>
                {item.image && (
                  <div className="-mx-5 -mt-5 mb-4 overflow-hidden h-40">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-clay bg-clay/10 px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                    <h3 className="font-display mt-2 text-2xl text-ink font-medium">{item.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.createdBy && (
                      <button
                        type="button"
                        onClick={() => deleteActivity(item._id, item.name)}
                        className="text-ink/35 hover:text-clay transition p-1"
                        title="Delete custom activity"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button type="button" onClick={() => toggleFav(item._id)} className="text-clay p-1 transition hover:scale-110">
                      <Heart size={20} fill={item.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-ink/65 leading-relaxed">{item.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-sand/60">
                <p className="text-xs text-ink/50 font-medium">
                  ⏱ {item.durationMins} min · {item.intensity}
                  {item.isTemplate ? ' · 📋 template' : ''}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => logSession(item)}
                    className="rounded-2xl bg-cream py-2.5 text-xs font-semibold text-ink transition hover:bg-sand flex items-center justify-center gap-1.5 border border-sand cursor-pointer"
                  >
                    <CheckCircle2 size={14} className="text-sage" />
                    Log today
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchedulingActivity(item)}
                    className="rounded-2xl border border-sand bg-paper py-2.5 text-xs font-semibold text-ink/80 transition hover:bg-sand flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Calendar size={14} className="text-sage" />
                    Schedule
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Google Calendar Schedule Modal */}
      <ScheduleModal
        isOpen={Boolean(schedulingActivity)}
        onClose={() => setSchedulingActivity(null)}
        activity={schedulingActivity}
        onScheduled={(event) => {
          setNotice(`📅 "${event.title}" scheduled successfully!`)
          setTimeout(() => setNotice(''), 4000)
        }}
      />
    </div>
  )
}
