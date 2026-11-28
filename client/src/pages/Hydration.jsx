import { useEffect, useState, useCallback, useId } from 'react'
import {
  Droplet,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Bell,
  BellOff,
  Flame,
  Award,
  Clock,
  Settings,
  Sparkles,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import api from '../api/client'
import { triggerConfetti } from '../utils/confetti'

const QUICK_AMOUNTS = [
  { label: 'Small Glass', amount: 150, icon: '🍵' },
  { label: 'Standard Glass', amount: 250, icon: '🥛' },
  { label: 'Water Bottle', amount: 500, icon: '🍶' },
  { label: 'Sports Flask', amount: 750, icon: '💧' },
]

export default function Hydration() {
  const customAmountId = useId()
  const customTimeId = useId()
  const customNoteId = useId()

  const [log, setLog] = useState(null)
  const [summary, setSummary] = useState({
    totalMl: 0,
    targetMl: 2500,
    remainingMl: 2500,
    percentage: 0,
    isTargetMet: false,
  })
  const [history, setHistory] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [historySpan, setHistorySpan] = useState(7)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Custom add form
  const [customAmount, setCustomAmount] = useState('')
  const [customNote, setCustomNote] = useState('')
  const [customTime, setCustomTime] = useState('')

  // Target edit modal state
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [targetInput, setTargetInput] = useState(2500)
  const [setAsDefault, setSetAsDefault] = useState(true)

  // Edit entry state
  const [editingEntryId, setEditingEntryId] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')

  // Browser reminders
  const [remindersEnabled, setRemindersEnabled] = useState(false)
  const [reminderInterval, setReminderInterval] = useState(60)
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  )

  const fetchToday = useCallback(async () => {
    try {
      const res = await api.get('/hydration/today')
      if (res.data.success) {
        setLog(res.data.log)
        setSummary(res.data.summary)
        setTargetInput(res.data.log.targetMl || 2500)
        setRemindersEnabled(res.data.log.remindersEnabled || false)
        setReminderInterval(res.data.log.reminderIntervalMinutes || 60)
      }
    } catch (err) {
      console.error('Failed to fetch today hydration:', err)
    }
  }, [])

  const fetchHistory = useCallback(async (days) => {
    try {
      const res = await api.get(`/hydration/history?days=${days}`)
      if (res.data.success) {
        setHistory(res.data.history)
        setAnalytics(res.data.analytics)
      }
    } catch (err) {
      console.error('Failed to fetch hydration history:', err)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchToday(), fetchHistory(historySpan)]).finally(() => setLoading(false))
  }, [fetchToday, fetchHistory, historySpan])

  // Setup periodic browser reminder if enabled
  useEffect(() => {
    if (!remindersEnabled || notificationPermission !== 'granted') return

    const ms = reminderInterval * 60 * 1000
    const intervalId = setInterval(() => {
      if (Notification.permission === 'granted') {
        new Notification('Wellnest Hydration Reminder', {
          body: `Time for a mindful sip of water! You've logged ${summary.totalMl} ml of your ${summary.targetMl} ml target today.`,
          icon: '/favicon.ico',
        })
      }
    }, ms)

    return () => clearInterval(intervalId)
  }, [remindersEnabled, reminderInterval, notificationPermission, summary.totalMl, summary.targetMl])

  const showNotificationMessage = (msg) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 4000)
  }

  const handleQuickAdd = async (amount) => {
    setActionLoading(true)
    try {
      const res = await api.post('/hydration/log', { amountMl: amount })
      if (res.data.success) {
        const wasMet = summary.isTargetMet
        setLog(res.data.log)
        setSummary(res.data.summary)
        showNotificationMessage(`+${amount} ml added! Keep hydrating.`)
        fetchHistory(historySpan)

        if (!wasMet && res.data.summary.isTargetMet) {
          triggerConfetti()
        }
      }
    } catch (err) {
      showNotificationMessage(err.response?.data?.message || 'Failed to add water intake.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCustomAdd = async (e) => {
    e.preventDefault()
    const amount = Number(customAmount)
    if (!amount || amount < 10) return

    setActionLoading(true)
    try {
      const res = await api.post('/hydration/log', {
        amountMl: amount,
        note: customNote,
        time: customTime || undefined,
      })
      if (res.data.success) {
        const wasMet = summary.isTargetMet
        setLog(res.data.log)
        setSummary(res.data.summary)
        setCustomAmount('')
        setCustomNote('')
        setCustomTime('')
        showNotificationMessage(`+${amount} ml added!`)
        fetchHistory(historySpan)

        if (!wasMet && res.data.summary.isTargetMet) {
          triggerConfetti()
        }
      }
    } catch (err) {
      showNotificationMessage(err.response?.data?.message || 'Failed to add water intake.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateTarget = async (e) => {
    e.preventDefault()
    const target = Number(targetInput)
    if (!target || target < 500) return

    try {
      const res = await api.put('/hydration/target', {
        targetMl: target,
        setAsDefault,
      })
      if (res.data.success) {
        setLog(res.data.log)
        setSummary(res.data.summary)
        setShowTargetModal(false)
        showNotificationMessage(`Daily target set to ${target} ml.`)
        fetchHistory(historySpan)
      }
    } catch (err) {
      showNotificationMessage(err.response?.data?.message || 'Failed to update target.')
    }
  }

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this water entry?')) return
    try {
      const res = await api.delete(`/hydration/entry/${entryId}`)
      if (res.data.success) {
        setLog(res.data.log)
        setSummary(res.data.summary)
        showNotificationMessage('Entry removed.')
        fetchHistory(historySpan)
      }
    } catch (err) {
      showNotificationMessage(err.response?.data?.message || 'Failed to delete entry.')
    }
  }

  const handleStartEdit = (entry) => {
    setEditingEntryId(entry._id)
    setEditAmount(entry.amountMl)
    setEditNote(entry.note || '')
  }

  const handleSaveEdit = async (entryId) => {
    const amount = Number(editAmount)
    if (!amount || amount < 10) return

    try {
      const res = await api.put(`/hydration/entry/${entryId}`, {
        amountMl: amount,
        note: editNote,
      })
      if (res.data.success) {
        setLog(res.data.log)
        setSummary(res.data.summary)
        setEditingEntryId(null)
        showNotificationMessage('Entry updated.')
        fetchHistory(historySpan)
      }
    } catch (err) {
      showNotificationMessage(err.response?.data?.message || 'Failed to update entry.')
    }
  }

  const toggleReminders = async () => {
    if (!('Notification' in window)) {
      alert('Browser notifications are not supported in your browser.')
      return
    }

    if (!remindersEnabled) {
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission()
        setNotificationPermission(perm)
        if (perm !== 'granted') {
          showNotificationMessage('Notification permission was not granted.')
          return
        }
      }
      setRemindersEnabled(true)
      await api.put('/hydration/preferences', {
        remindersEnabled: true,
        reminderIntervalMinutes: reminderInterval,
      })
      showNotificationMessage('Hydration reminders activated!')
    } else {
      setRemindersEnabled(false)
      await api.put('/hydration/preferences', {
        remindersEnabled: false,
      })
      showNotificationMessage('Hydration reminders turned off.')
    }
  }

  const handleTestAlert = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      showNotificationMessage('Please allow browser notifications first.')
      return
    }
    new Notification('Wellnest Hydration Alert', {
      body: '💧 Gentle reminder to drink a glass of refreshing water!',
      icon: '/favicon.ico',
    })
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-sage border-t-transparent" />
          <p className="mt-3 font-medium text-ink/70">Loading hydration tracker...</p>
        </div>
      </div>
    )
  }

  // Circular progress calculations
  const radius = 78
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(100, summary.percentage) / 100) * circumference

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage/15 text-sage">
              <Droplet size={20} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-sage">
              Daily Wellness Pillar
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Smart Hydration Tracker</h1>
          <p className="text-sm text-ink/65">
            Maintain mindful fluid intake to restore energy, boost focus, and support physical recovery.
          </p>
        </div>

        {/* Target and Settings Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTargetModal(true)}
            className="flex items-center gap-2 rounded-2xl border border-sand bg-paper px-4 py-2.5 text-sm font-medium text-ink/80 shadow-sm transition hover:bg-sand/60"
          >
            <Settings size={16} />
            Target: {summary.targetMl} ml
          </button>

          <button
            type="button"
            onClick={toggleReminders}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
              remindersEnabled
                ? 'bg-sage text-paper shadow-sm'
                : 'border border-sand bg-paper text-ink/80 hover:bg-sand/60'
            }`}
          >
            {remindersEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            {remindersEnabled ? 'Reminders On' : 'Reminders Off'}
          </button>
        </div>
      </div>

      {/* Toast Message Notification */}
      {message && (
        <div className="animate-fade-in flex items-center justify-between rounded-2xl bg-sage/15 px-4 py-3 text-sm font-medium text-sage">
          <span className="flex items-center gap-2">
            <Sparkles size={16} /> {message}
          </span>
          <button type="button" onClick={() => setMessage('')} className="text-ink/40 hover:text-ink">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Hydration Showcase Card */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Circular Gauge & Status */}
        <div className="flex flex-col items-center justify-center rounded-3xl border border-sand bg-paper p-8 text-center shadow-sm lg:col-span-5">
          <div className="relative flex items-center justify-center">
            <svg width="200" height="200" className="-rotate-90">
              {/* Background track */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="#e7ddcc"
                strokeWidth="14"
                fill="none"
              />
              {/* Progress ring */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="#3c6b58"
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-4xl text-ink">
                {summary.totalMl}
                <span className="text-base font-normal text-ink/50"> ml</span>
              </span>
              <span className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-sage">
                {summary.percentage}% Complete
              </span>
            </div>
          </div>

          <div className="mt-6 w-full max-w-xs space-y-2">
            {summary.isTargetMet ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-sage/20 px-3.5 py-1.5 text-xs font-semibold text-sage">
                <Award size={14} /> Daily Target Achieved! 🎉
              </div>
            ) : (
              <p className="text-sm font-medium text-ink/70">
                <span className="font-bold text-clay">{summary.remainingMl} ml</span> remaining to reach your goal
              </p>
            )}

            {/* Horizontal Sub-Bar */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-sage transition-all duration-500"
                style={{ width: `${Math.min(100, summary.percentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Quick-Add Buttons & Custom Intake */}
        <div className="flex flex-col justify-between rounded-3xl border border-sand bg-paper p-6 shadow-sm lg:col-span-7">
          <div>
            <h2 className="font-display text-xl text-ink">Quick Log Water</h2>
            <p className="text-xs text-ink/60">One-click presets for common cups, glasses, and flasks.</p>

            {/* 4 Quick Add Cards */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {QUICK_AMOUNTS.map((item) => (
                <button
                  key={item.amount}
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleQuickAdd(item.amount)}
                  className="group relative flex flex-col items-center rounded-2xl border border-sand bg-cream/50 p-4 text-center transition hover:-translate-y-0.5 hover:border-sage hover:bg-sage/5 hover:shadow-md"
                >
                  <span className="text-2xl transition group-hover:scale-110">{item.icon}</span>
                  <span className="mt-2 text-base font-bold text-ink">+{item.amount} ml</span>
                  <span className="text-[11px] text-ink/55">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Custom Amount Logger */}
            <form onSubmit={handleCustomAdd} className="mt-6 rounded-2xl bg-sand/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">
                Log Custom Intake
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <label htmlFor={customAmountId} className="sr-only">Amount (ml)</label>
                  <input
                    id={customAmountId}
                    type="number"
                    min="10"
                    max="5000"
                    placeholder="Amount (ml)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    required
                    className="w-full rounded-xl border border-sand bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-sage focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor={customTimeId} className="sr-only">Time</label>
                  <input
                    id={customTimeId}
                    type="text"
                    placeholder="e.g. 11:30 AM"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full rounded-xl border border-sand bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-sage focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor={customNoteId} className="sr-only">Note (optional)</label>
                  <input
                    id={customNoteId}
                    type="text"
                    placeholder="Note (optional)"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    className="w-full rounded-xl border border-sand bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-sage focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={actionLoading || !customAmount}
                    className="flex w-full items-center justify-center gap-1 rounded-xl bg-sage py-2 text-sm font-medium text-paper transition hover:bg-sage/90 disabled:opacity-50"
                  >
                    <Plus size={16} /> Log
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Quick Reminder Settings Footer */}
          {remindersEnabled && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-sand/70 pt-4 text-xs text-ink/70">
              <div className="flex items-center gap-2">
                <span>Reminder Interval:</span>
                <select
                  value={reminderInterval}
                  onChange={async (e) => {
                    const val = Number(e.target.value)
                    setReminderInterval(val)
                    await api.put('/hydration/preferences', { reminderIntervalMinutes: val })
                  }}
                  className="rounded-lg border border-sand bg-paper px-2 py-1 text-xs text-ink"
                >
                  <option value={30}>Every 30 minutes</option>
                  <option value={45}>Every 45 minutes</option>
                  <option value={60}>Every 60 minutes</option>
                  <option value={90}>Every 90 minutes</option>
                  <option value={120}>Every 2 hours</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleTestAlert}
                className="text-sage underline hover:text-sage/80"
              >
                Send Test Alert
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recharts Analytics Section */}
      <div className="rounded-3xl border border-sand bg-paper p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl text-ink">Hydration History & Consistency</h2>
            <p className="text-xs text-ink/60">
              Tracking your fluid intake against your target over time.
            </p>
          </div>

          {/* History Duration Filters */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-sand/60 p-1 text-xs font-medium text-ink/70">
            {[
              { label: '7 Days', val: 7 },
              { label: '14 Days', val: 14 },
              { label: '30 Days', val: 30 },
            ].map((tab) => (
              <button
                key={tab.val}
                type="button"
                onClick={() => setHistorySpan(tab.val)}
                className={`rounded-xl px-3 py-1.5 transition ${
                  historySpan === tab.val
                    ? 'bg-paper text-sage shadow-xs'
                    : 'hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        {analytics && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-sand/80 bg-cream/40 p-4">
              <span className="text-xs font-semibold text-ink/50 uppercase">Daily Average</span>
              <p className="mt-1 font-display text-2xl text-sage">
                {analytics.averageDailyMl}{' '}
                <span className="text-xs font-normal text-ink/60">ml/day</span>
              </p>
            </div>

            <div className="rounded-2xl border border-sand/80 bg-cream/40 p-4">
              <span className="text-xs font-semibold text-ink/50 uppercase">Target Reached</span>
              <p className="mt-1 font-display text-2xl text-ink">
                {analytics.targetMetDays}{' '}
                <span className="text-xs font-normal text-ink/60">of {historySpan} days</span>
              </p>
            </div>

            <div className="rounded-2xl border border-sand/80 bg-cream/40 p-4">
              <span className="text-xs font-semibold text-ink/50 uppercase">Current Streak</span>
              <p className="mt-1 flex items-center gap-1.5 font-display text-2xl text-clay">
                <Flame size={20} />
                {analytics.currentStreakDays}{' '}
                <span className="text-xs font-normal text-ink/60">days</span>
              </p>
            </div>

            <div className="rounded-2xl border border-sand/80 bg-cream/40 p-4">
              <span className="text-xs font-semibold text-ink/50 uppercase">Total Intake</span>
              <p className="mt-1 font-display text-2xl text-ink">
                {(analytics.totalMlLogged / 1000).toFixed(1)}{' '}
                <span className="text-xs font-normal text-ink/60">liters</span>
              </p>
            </div>
          </div>
        )}

        {/* Recharts Bar Graph */}
        <div className="mt-6 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7ddcc" vertical={false} />
              <XAxis dataKey="shortDate" tick={{ fontSize: 11, fill: '#736b5e' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#736b5e' }}
                unit="ml"
                domain={[0, (dataMax) => Math.max(dataMax + 400, summary.targetMl + 400)]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="rounded-xl border border-sand bg-paper p-3 shadow-md text-xs">
                        <p className="font-bold text-ink">{data.date} ({data.dayName})</p>
                        <p className="mt-1 text-sage font-semibold">Intake: {data.totalMl} ml</p>
                        <p className="text-ink/60">Target: {data.targetMl} ml</p>
                        <p className="text-ink/50 mt-0.5">{data.percentage}% achieved</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <ReferenceLine
                y={summary.targetMl}
                stroke="#c45c26"
                strokeDasharray="4 4"
                label={{ value: 'Target', position: 'top', fill: '#c45c26', fontSize: 11 }}
              />
              <Bar dataKey="totalMl" fill="#3c6b58" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Today's Intake History Log */}
      <div className="rounded-3xl border border-sand bg-paper p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-ink">Today's Intake Log</h2>
            <p className="text-xs text-ink/60">Detailed record of water logged throughout the day.</p>
          </div>
          <span className="rounded-full bg-sand px-3 py-1 text-xs font-medium text-ink/70">
            {log?.entries?.length || 0} entries
          </span>
        </div>

        {log?.entries && log.entries.length > 0 ? (
          <div className="mt-4 divide-y divide-sand/60">
            {log.entries
              .slice()
              .reverse()
              .map((entry) => (
                <div
                  key={entry._id}
                  className="flex items-center justify-between py-3 text-sm transition hover:bg-cream/40"
                >
                  {editingEntryId === entry._id ? (
                    <div className="flex flex-1 items-center gap-2 pr-2">
                      <input
                        type="number"
                        min="10"
                        max="5000"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-24 rounded-lg border border-sand bg-paper px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Note"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="flex-1 rounded-lg border border-sand bg-paper px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(entry._id)}
                        className="rounded-lg bg-sage p-1 text-paper hover:bg-sage/90"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingEntryId(null)}
                        className="rounded-lg border border-sand p-1 text-ink/60 hover:text-ink"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage/10 text-sage">
                          <Droplet size={16} />
                        </span>
                        <div>
                          <p className="font-semibold text-ink">
                            +{entry.amountMl} ml
                            {entry.note && (
                              <span className="ml-2 font-normal text-xs text-ink/60">
                                — {entry.note}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-ink/45 flex items-center gap-1">
                            <Clock size={12} /> {entry.time}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(entry)}
                          className="rounded-lg p-1.5 text-ink/50 transition hover:bg-sand hover:text-ink"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry._id)}
                          className="rounded-lg p-1.5 text-ink/40 transition hover:bg-clay/15 hover:text-clay"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-sand p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sand/60 text-ink/40">
              <Droplet size={24} />
            </span>
            <p className="mt-3 text-sm font-medium text-ink">No water logged yet today</p>
            <p className="mt-1 text-xs text-ink/50">
              Click one of the quick buttons above or log a custom glass to start your day.
            </p>
          </div>
        )}
      </div>

      {/* Target Modal Dialog */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-sand bg-paper p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-ink">Set Daily Water Target</h3>
              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                className="text-ink/40 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-1 text-xs text-ink/60">
              Choose your recommended daily target based on your activity level and climate.
            </p>

            {/* Quick target chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[2000, 2500, 3000, 3500].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTargetInput(t)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    targetInput === t
                      ? 'bg-sage text-paper'
                      : 'border border-sand bg-cream/40 text-ink/80 hover:bg-sand'
                  }`}
                >
                  {t} ml
                </button>
              ))}
            </div>

            <form onSubmit={handleUpdateTarget} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60">
                  Target Amount (ml)
                </label>
                <input
                  type="number"
                  min="500"
                  max="10000"
                  step="50"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-sand bg-cream/20 px-3 py-2 text-sm text-ink focus:border-sage focus:outline-none"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-ink/75">
                <input
                  type="checkbox"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  className="rounded border-sand text-sage focus:ring-sage"
                />
                Save as my permanent default daily target
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="rounded-xl border border-sand px-4 py-2 text-xs font-medium text-ink/70 hover:bg-sand"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-sage px-4 py-2 text-xs font-medium text-paper transition hover:bg-sage/90"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
