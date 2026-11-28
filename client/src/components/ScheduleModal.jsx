import { useState, useEffect } from 'react'
import {
  Calendar,
  X,
  ExternalLink,
  Download,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import api from '../api/client'
import { triggerConfetti } from '../utils/confetti'

function getDefaultDateTime() {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  // Format for datetime-local: YYYY-MM-DDTHH:mm
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ScheduleModal({ isOpen, onClose, activity, onScheduled }) {
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState(getDefaultDateTime())
  const [durationMins, setDurationMins] = useState(30)
  const [reminderMinutes, setReminderMinutes] = useState(15)
  const [location, setLocation] = useState('Home / Wellnest Routine')
  const [submitting, setSubmitting] = useState(false)
  const [scheduledResult, setScheduledResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (activity) {
      setTitle(activity.name || activity.title || 'Wellness Session')
      setDurationMins(activity.durationMins || 30)
      setScheduledResult(null)
      setError('')
      setStartTime(getDefaultDateTime())
    }
  }, [activity])

  if (!isOpen) return null

  const handleSchedule = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await api.post('/calendar/events', {
        title,
        description: activity?.description || `${title} scheduled via Wellnest Wellness Tracker`,
        pillar: activity?.category || activity?.pillar || 'movement',
        activityId: activity?._id || undefined,
        startTime: new Date(startTime).toISOString(),
        durationMins: Number(durationMins),
        reminderMinutes: Number(reminderMinutes),
        location,
      })

      if (res.data.success) {
        setScheduledResult(res.data)
        triggerConfetti()
        if (onScheduled) onScheduled(res.data.event)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule calendar event.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadIcs = () => {
    if (!scheduledResult?.event?._id) return
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    window.open(`${baseURL}/calendar/events/${scheduledResult.event._id}/ics`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl border border-sand bg-paper p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand/70 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage/15 text-sage">
              <Calendar size={18} />
            </span>
            <h3 className="font-display text-xl text-ink">Schedule Wellness Event</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1 text-ink/40 hover:bg-sand hover:text-ink cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-clay/10 p-3 text-xs text-clay">
            {error}
          </div>
        )}

        {/* Success View */}
        {scheduledResult ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage/15 text-sage">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h4 className="font-display text-2xl text-ink">Session Scheduled!</h4>
              <p className="mt-1 text-sm text-ink/65">
                "{scheduledResult.event?.title}" is reserved for{' '}
                {new Date(scheduledResult.event?.startTime).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                .
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              {scheduledResult.googleHtmlLink && (
                <a
                  href={scheduledResult.googleHtmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sage px-5 py-2.5 text-sm font-semibold text-paper shadow-sm hover:bg-sage/90 transition"
                >
                  <ExternalLink size={15} /> Add to Google Calendar
                </a>
              )}

              <button
                type="button"
                onClick={handleDownloadIcs}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sand bg-cream px-4 py-2.5 text-sm font-semibold text-ink/80 hover:bg-sand transition cursor-pointer"
              >
                <Download size={15} /> Download .ics File
              </button>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-ink/50 hover:underline cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSchedule} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60 mb-1">
                Event Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-sand bg-cream/30 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-sage"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-sand bg-cream/30 px-3 py-2 text-xs text-ink outline-none focus:border-sage"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60 mb-1">
                  Duration (Minutes)
                </label>
                <select
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-full rounded-xl border border-sand bg-cream/30 px-3 py-2 text-xs text-ink outline-none focus:border-sage"
                >
                  <option value={15}>15 minutes (Quick reset)</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes (Standard)</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes (Deep session)</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60 mb-1">
                  Reminder Alert
                </label>
                <select
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className="w-full rounded-xl border border-sand bg-cream/30 px-3 py-2 text-xs text-ink outline-none focus:border-sage"
                >
                  <option value={10}>10 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60 mb-1">
                  Location / Space
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Home Living Room, Park"
                  className="w-full rounded-xl border border-sand bg-cream/30 px-3 py-2 text-xs text-ink outline-none focus:border-sage"
                />
              </div>
            </div>

            {/* Sync Information Hint */}
            <div className="rounded-2xl border border-sand/70 bg-cream/50 p-3 text-[11px] text-ink/65 flex items-start gap-2">
              <Sparkles size={14} className="text-sage shrink-0 mt-0.5" />
              <span>
                Scheduling adds this workout directly to your Wellnest routine, and provides an instant one-click link to sync with your real Google Calendar.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-sand/60">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-sand px-4 py-2 text-xs font-medium text-ink/70 hover:bg-sand transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-xl bg-sage px-5 py-2 text-xs font-semibold text-paper shadow-sm hover:bg-sage/90 transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Scheduling...' : 'Schedule Event'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
