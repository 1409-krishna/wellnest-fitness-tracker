import { useState, useEffect, useCallback, useId } from 'react'
import {
  Sparkles,
  Calendar,
  Clock,
  Bookmark,
  Trash2,
  Droplet,
  Moon,
  Wind,
  Flame,
  ArrowRight,
  Filter,
  History,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import api from '../api/client'
import ScheduleModal from '../components/ScheduleModal'
import { triggerConfetti } from '../utils/confetti'

const pillarIcons = {
  movement: Flame,
  rest: Wind,
  hydration: Droplet,
  sleep: Moon,
}

const pillarColors = {
  movement: 'bg-sage/15 text-sage border-sage/30',
  rest: 'bg-moss/20 text-moss border-moss/30',
  hydration: 'bg-blue-50 text-blue-700 border-blue-200',
  sleep: 'bg-clay/15 text-clay border-clay/30',
}

export default function AIPlanner() {
  const customIntentionId = useId()

  const [activePlan, setActivePlan] = useState(null)
  const [plans, setPlans] = useState([])
  const [viewTab, setViewTab] = useState('active') // 'active' | 'saved' | 'history'
  const [initialLoading, setInitialLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [schedulingItem, setSchedulingItem] = useState(null)
  const [message, setMessage] = useState('')

  // Generator options
  const [showOptions, setShowOptions] = useState(false)
  const [focusPillar, setFocusPillar] = useState('all')
  const [userNote, setUserNote] = useState('')

  const fetchPlans = useCallback(async () => {
    try {
      const res = await api.get('/plans?limit=15')
      if (res.data.success) {
        setPlans(res.data.plans)
        if (res.data.plans.length > 0 && !activePlan) {
          setActivePlan(res.data.plans[0])
        }
      }
    } catch (err) {
      console.error('Failed to load plans:', err)
    } finally {
      setInitialLoading(false)
    }
  }, [activePlan])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const showNotification = (msg) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 4000)
  }

  const handleGenerate = async (planType = 'daily') => {
    setGenerating(true)
    setGenerationStep(1)

    const timer1 = setTimeout(() => setGenerationStep(2), 700)
    const timer2 = setTimeout(() => setGenerationStep(3), 1400)

    try {
      const res = await api.post('/plans/generate', {
        planType,
        focusPillar: focusPillar === 'all' ? undefined : focusPillar,
        userNote: userNote || undefined,
      })

      if (res.data.success) {
        setActivePlan(res.data.plan)
        setViewTab('active')
        triggerConfetti()
        showNotification(`${planType === 'weekly' ? 'Weekly Blueprint' : 'Daily Routine'} ready! ✨`)
        fetchPlans()
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to generate wellness plan.')
    } finally {
      clearTimeout(timer1)
      clearTimeout(timer2)
      setGenerating(false)
      setGenerationStep(0)
    }
  }

  const handleToggleSave = async (planId) => {
    try {
      const res = await api.put(`/plans/${planId}/save`)
      if (res.data.success) {
        if (activePlan?._id === planId) {
          setActivePlan((prev) => ({ ...prev, isSaved: res.data.isSaved }))
        }
        showNotification(res.data.message)
        fetchPlans()
      }
    } catch {
      showNotification('Could not update saved status.')
    }
  }

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Delete this plan from your history?')) return
    try {
      const res = await api.delete(`/plans/${planId}`)
      if (res.data.success) {
        showNotification('Plan deleted.')
        if (activePlan?._id === planId) {
          const remaining = plans.filter((p) => p._id !== planId)
          setActivePlan(remaining[0] || null)
        }
        fetchPlans()
      }
    } catch {
      showNotification('Could not delete plan.')
    }
  }

  const handleApplyItem = async (planId, itemId) => {
    try {
      const res = await api.post(`/plans/${planId}/apply-item`, { itemId })
      if (res.data.success) {
        setActivePlan(res.data.plan)
        triggerConfetti()
        showNotification(res.data.message)
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Could not log activity.')
    }
  }

  if (initialLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-sage border-t-transparent" />
          <p className="mt-3 font-medium text-ink/70">Connecting to Wellnest AI Planner...</p>
        </div>
      </div>
    )
  }

  const savedPlans = plans.filter((p) => p.isSaved)

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage/15 text-sage">
              <Sparkles size={18} />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-sage">
              AI Wellness Intelligence
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">AI Daily Wellness Planner</h1>
          <p className="text-sm text-ink/65">
            Holistic, personalized schedules driven by Google Gemini and your personal habit logs.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerate('daily')}
            className="flex items-center gap-2 rounded-2xl bg-sage px-5 py-2.5 text-sm font-semibold text-paper shadow-sm transition hover:bg-sage/90 disabled:opacity-50"
          >
            <Sparkles size={16} />
            {generating ? 'Synthesizing...' : 'Generate Today’s Plan'}
          </button>

          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerate('weekly')}
            className="flex items-center gap-2 rounded-2xl border border-sand bg-paper px-4 py-2.5 text-sm font-semibold text-ink/80 shadow-xs transition hover:bg-sand/60 disabled:opacity-50"
          >
            <Calendar size={16} />
            Weekly Blueprint
          </button>

          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-1.5 rounded-2xl border border-sand bg-paper px-3 py-2.5 text-sm text-ink/70 transition hover:bg-sand/60"
            title="Custom preferences"
          >
            <Filter size={16} />
            {showOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Optional Preferences Drawer */}
      {showOptions && (
        <div className="rounded-3xl border border-sand bg-paper p-5 shadow-xs">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/60">
            Customize AI Generation Context
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <span className="block text-xs font-medium text-ink/70 mb-1">Focus Pillar</span>
              <select
                value={focusPillar}
                onChange={(e) => setFocusPillar(e.target.value)}
                className="w-full rounded-xl border border-sand bg-cream/40 px-3 py-2 text-xs text-ink focus:border-sage focus:outline-none capitalize"
              >
                <option value="all">All 4 Pillars (Balanced)</option>
                <option value="movement">Movement (Physical activity)</option>
                <option value="hydration">Hydration (Fluid pacing)</option>
                <option value="rest">Rest (Nervous system relaxation)</option>
                <option value="sleep">Sleep (Circadian alignment)</option>
              </select>
            </div>
            <div className="sm:col-span-8">
              <label htmlFor={customIntentionId} className="block text-xs font-medium text-ink/70 mb-1">
                Personal Intention / Note
              </label>
              <input
                id={customIntentionId}
                type="text"
                placeholder="e.g. 'Feeling fatigued from meetings', 'Need a morning energy lift', 'Rainy indoor day'..."
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                className="w-full rounded-xl border border-sand bg-cream/40 px-3 py-2 text-xs text-ink focus:border-sage focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {message && (
        <div className="animate-fade-in flex items-center justify-between rounded-2xl bg-sage/15 px-4 py-3 text-sm font-medium text-sage">
          <span className="flex items-center gap-2">
            <Sparkles size={16} /> {message}
          </span>
          <button type="button" onClick={() => setMessage('')} className="text-ink/40 hover:text-ink">
            ×
          </button>
        </div>
      )}

      {/* Generation Stepper / Loader */}
      {generating && (
        <div className="rounded-3xl border border-sage/40 bg-paper p-8 text-center shadow-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sage/15 text-sage animate-bounce">
            <Sparkles size={28} />
          </div>
          <h2 className="mt-4 font-display text-2xl text-ink">Crafting Your Personalized Routine</h2>
          <div className="mx-auto mt-4 max-w-md space-y-2 text-left">
            <div className="flex items-center gap-3 text-xs font-medium text-ink/80">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${generationStep >= 1 ? 'bg-sage text-paper' : 'bg-sand'}`}>
                {generationStep > 1 ? '✓' : '1'}
              </span>
              <span>Analyzing your authentic habit logs & activity history...</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-ink/80">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${generationStep >= 2 ? 'bg-sage text-paper' : 'bg-sand'}`}>
                {generationStep > 2 ? '✓' : '2'}
              </span>
              <span>Evaluating hydration metrics and rest patterns...</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-ink/80">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${generationStep >= 3 ? 'bg-sage text-paper' : 'bg-sand'}`}>
                3
              </span>
              <span>Formatting a gentle, balanced, achievable blueprint...</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-sand pb-3 text-sm font-medium">
        <button
          type="button"
          onClick={() => setViewTab('active')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
            viewTab === 'active'
              ? 'bg-sage text-paper shadow-xs'
              : 'text-ink/65 hover:bg-sand/60 hover:text-ink'
          }`}
        >
          <Sparkles size={16} />
          Current Blueprint
        </button>

        <button
          type="button"
          onClick={() => setViewTab('saved')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
            viewTab === 'saved'
              ? 'bg-sage text-paper shadow-xs'
              : 'text-ink/65 hover:bg-sand/60 hover:text-ink'
          }`}
        >
          <Bookmark size={16} />
          Saved Blueprints ({savedPlans.length})
        </button>

        <button
          type="button"
          onClick={() => setViewTab('history')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
            viewTab === 'history'
              ? 'bg-sage text-paper shadow-xs'
              : 'text-ink/65 hover:bg-sand/60 hover:text-ink'
          }`}
        >
          <History size={16} />
          Plan History ({plans.length})
        </button>
      </div>

      {/* Main Tab Content */}
      {viewTab === 'active' && activePlan && (
        <div className="space-y-6">
          {/* Active Plan Header Banner */}
          <div className="rounded-3xl border border-sand bg-paper p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-sage/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sage">
                    {activePlan.planType} Plan
                  </span>
                  <span className="text-xs text-ink/50">
                    {activePlan.dateKey}
                  </span>
                  <span className="rounded-md bg-sand px-2 py-0.5 text-[11px] text-ink/60">
                    {activePlan.generatedBy === 'gemini' ? 'Gemini AI' : 'Heuristic Engine'}
                  </span>
                </div>
                <h2 className="mt-2 font-display text-2xl text-ink">{activePlan.title}</h2>
                <p className="mt-1 text-sm text-ink/70 max-w-3xl">{activePlan.summary}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSave(activePlan._id)}
                  className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-semibold transition ${
                    activePlan.isSaved
                      ? 'bg-clay text-paper shadow-sm'
                      : 'border border-sand bg-cream/50 text-ink/80 hover:bg-sand'
                  }`}
                >
                  <Bookmark size={14} />
                  {activePlan.isSaved ? 'Saved' : 'Save Plan'}
                </button>
              </div>
            </div>

            {/* Mindful Affirmation Banner */}
            {activePlan.affirmation && (
              <div className="mt-5 rounded-2xl border border-sand/80 bg-cream/60 p-4 text-xs italic text-ink/75">
                "{activePlan.affirmation}"
              </div>
            )}
          </div>

          {/* Schedule Timeline */}
          <div className="rounded-3xl border border-sand bg-paper p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl text-ink">Suggested Routine Timeline</h3>
                <p className="text-xs text-ink/60">
                  Click "Log to Routine" on any activity to instantly record it into your daily tracker.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {activePlan.schedule?.map((item) => {
                const Icon = pillarIcons[item.pillar] || Flame
                const colorClasses = pillarColors[item.pillar] || pillarColors.movement

                return (
                  <div
                    key={item._id}
                    className="flex flex-col justify-between rounded-2xl border border-sand bg-cream/30 p-5 transition hover:border-sage hover:shadow-xs"
                  >
                    <div>
                      {/* Top Time & Pillar */}
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink/60">
                          <Clock size={13} />
                          {item.timeOfDay} {item.time && `(${item.time})`}
                        </span>
                        <span
                          className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider capitalize ${colorClasses}`}
                        >
                          <Icon size={12} />
                          {item.pillar}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <p className="mt-3 font-semibold text-base text-ink">{item.title}</p>
                      <p className="mt-1 text-xs text-ink/70 leading-relaxed">{item.description}</p>

                      {/* Actionable tip */}
                      {item.actionableTip && (
                        <div className="mt-3 rounded-xl bg-paper/80 p-2.5 text-[11px] text-ink/65 border border-sand/60">
                          <span className="font-semibold text-sage">Tip:</span> {item.actionableTip}
                        </div>
                      )}
                    </div>

                    {/* Bottom Duration & One-Click Apply / Schedule */}
                    <div className="mt-4 flex items-center justify-between border-t border-sand/50 pt-3 text-xs">
                      <span className="text-ink/50 font-medium">
                        ⏱ {item.durationMins} minutes · {item.intensity}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSchedulingItem(item)}
                          className="rounded-xl border border-sand bg-paper p-1.5 text-xs text-ink/70 hover:bg-sand transition cursor-pointer"
                          title="Schedule on Google Calendar"
                        >
                          <Calendar size={13} className="text-sage" />
                        </button>

                        {item.applied ? (
                          <span className="flex items-center gap-1 font-semibold text-sage">
                            <Check size={14} /> Logged
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApplyItem(activePlan._id, item._id)}
                            className="flex items-center gap-1 rounded-xl bg-sage/15 px-3 py-1.5 text-xs font-semibold text-sage transition hover:bg-sage hover:text-paper cursor-pointer"
                          >
                            Log to Routine <ArrowRight size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Habit Attention Matrix */}
          {activePlan.habitFocus && activePlan.habitFocus.length > 0 && (
            <div className="rounded-3xl border border-sand bg-paper p-6 shadow-sm">
              <h3 className="font-display text-xl text-ink">Pillar Attention Matrix</h3>
              <p className="text-xs text-ink/60">
                Data-driven feedback on how each wellness pillar is performing based on your recent activity.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {activePlan.habitFocus.map((h, i) => {
                  const Icon = pillarIcons[h.pillar] || Flame
                  return (
                    <div
                      key={i}
                      className="rounded-2xl border border-sand/80 bg-cream/40 p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink capitalize">
                            <Icon size={14} className="text-sage" /> {h.pillar}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              h.priority === 'high'
                                ? 'bg-clay/20 text-clay'
                                : h.priority === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-sage/20 text-sage'
                            }`}
                          >
                            {h.priority}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-ink/75 leading-relaxed">{h.statusMessage}</p>
                      </div>
                      <p className="mt-3 text-[11px] font-medium text-sage/90 border-t border-sand/60 pt-2">
                        👉 {h.suggestedAction}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Hydration & Recovery Section */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-3xl border border-sand bg-paper p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Droplet size={18} />
                </span>
                <h3 className="font-display text-lg text-ink">Hydration Guidance</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink/70">
                {activePlan.hydrationAdvice ||
                  'Sip water steadily across the morning and afternoon. Avoid large boluses right before bed to preserve restful sleep.'}
              </p>
            </div>

            <div className="rounded-3xl border border-sand bg-paper p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-clay/15 text-clay">
                  <Moon size={18} />
                </span>
                <h3 className="font-display text-lg text-ink">Rest & Sleep Recovery</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink/70">
                {activePlan.recoveryAdvice ||
                  'Prioritize an unhurried evening routine with reduced blue light exposure to support deeper stages of physical repair.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Saved Blueprints Tab */}
      {viewTab === 'saved' && (
        <div className="space-y-4">
          {savedPlans.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-sand p-12 text-center bg-paper">
              <Bookmark size={32} className="mx-auto text-ink/30" />
              <p className="mt-3 font-medium text-ink">No saved blueprints yet</p>
              <p className="mt-1 text-xs text-ink/50">
                When viewing an AI plan, click "Save Plan" to bookmark it for future reference.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {savedPlans.map((plan) => (
                <div
                  key={plan._id}
                  className="flex flex-col justify-between rounded-3xl border border-sand bg-paper p-5 shadow-xs transition hover:border-sage"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-sage/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-sage">
                        {plan.planType} Plan
                      </span>
                      <span className="text-xs text-ink/50">{plan.dateKey}</span>
                    </div>
                    <p className="mt-2 font-display text-lg text-ink">{plan.title}</p>
                    <p className="mt-1 text-xs text-ink/65 line-clamp-2">{plan.summary}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-sand/60 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePlan(plan)
                        setViewTab('active')
                      }}
                      className="text-xs font-semibold text-sage hover:underline"
                    >
                      View Blueprint →
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSave(plan._id)}
                      className="text-xs text-clay hover:underline"
                    >
                      Remove Bookmark
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {viewTab === 'history' && (
        <div className="rounded-3xl border border-sand bg-paper p-6 shadow-sm">
          <h3 className="font-display text-xl text-ink">Generation History</h3>
          <p className="text-xs text-ink/60">Archive of past wellness plans generated for your account.</p>

          <div className="mt-4 divide-y divide-sand/60">
            {plans.map((plan) => (
              <div
                key={plan._id}
                className="flex items-center justify-between py-3.5 text-sm transition hover:bg-cream/40 px-2 rounded-xl"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{plan.title}</span>
                    <span className="rounded bg-sand px-2 py-0.5 text-[10px] font-bold uppercase text-ink/60">
                      {plan.planType}
                    </span>
                    {plan.isSaved && (
                      <Bookmark size={12} className="text-clay fill-clay" />
                    )}
                  </div>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {plan.dateKey} · {plan.schedule?.length || 0} scheduled sessions · {plan.generatedBy}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePlan(plan)
                      setViewTab('active')
                    }}
                    className="rounded-xl border border-sand px-3 py-1.5 text-xs font-medium text-ink/80 hover:bg-sand"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePlan(plan._id)}
                    className="p-1.5 text-ink/40 hover:text-clay"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Google Calendar Schedule Modal */}
      <ScheduleModal
        isOpen={Boolean(schedulingItem)}
        onClose={() => setSchedulingItem(null)}
        activity={schedulingItem}
        onScheduled={(event) => {
          showNotification(`📅 "${event.title}" scheduled to calendar!`)
        }}
      />
    </div>
  )
}
