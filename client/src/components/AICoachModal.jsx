import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, Bot, User, CheckCircle2 } from 'lucide-react'
import api from '../api/client'
import { toDateKey } from '../utils/dates'
import { triggerConfetti } from '../utils/confetti'

const QUICK_PROMPTS = [
  'What pillar should I do today?',
  'How can I sleep better tonight?',
  'Feeling low on energy, any advice?',
  'Tips for drinking enough water?',
]

export default function AICoachModal() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      sender: 'coach',
      text: 'Hello! I am your Wellnest AI Coach. How are you feeling today? Ask me for gentle movement ideas, sleep wind-down advice, hydration habits, or guidance on your daily pillars.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loggedNotice, setLoggedNotice] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const sendQuery = async (queryText) => {
    const textToSend = queryText || input.trim()
    if (!textToSend || loading) return

    const newMessages = [...messages, { sender: 'user', text: textToSend }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const { data } = await api.post('/insights/coach', { query: textToSend })
      setMessages([
        ...newMessages,
        {
          sender: 'coach',
          text: data.reply,
          tip: data.tip,
          suggestedActivity: data.suggestedActivity,
          pillar: data.pillar,
        },
      ])
    } catch (err) {
      console.error('Coach query error:', err)
      setMessages([
        ...newMessages,
        {
          sender: 'coach',
          text: 'Remember: small steps and deep breaths always count. Feel free to log a gentle walk, drink a cup of water, or wind down early tonight.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLog = async (activity, pillar) => {
    try {
      const today = toDateKey()
      if (activity?.id) {
        await api.post('/progress/sessions', {
          activityId: activity.id,
          date: today,
          durationMins: activity.durationMins || 20,
        })
      }
      if (pillar) {
        await api.put('/habits', {
          date: today,
          pillar: pillar,
          completed: true,
        })
      }
      triggerConfetti()
      setLoggedNotice(`✓ Logged ${activity?.name || pillar} for today!`)
      setTimeout(() => setLoggedNotice(''), 4000)
    } catch (err) {
      setLoggedNotice(err.response?.data?.message || 'Could not log activity.')
      setTimeout(() => setLoggedNotice(''), 4000)
    }
  }

  return (
    <>
      {/* Floating Trigger Button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-5 z-40 flex items-center gap-2.5 rounded-full bg-sage px-4 py-3 text-paper shadow-xl transition-all duration-300 hover:scale-105 hover:bg-moss md:bottom-8 md:right-8"
          aria-label="Open AI Wellness Coach"
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-paper opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-paper" />
          </span>
          <Sparkles size={18} className="text-leaf" />
          <span className="text-sm font-semibold tracking-wide">AI Wellness Coach</span>
        </button>
      )}

      {/* Floating Chat Window */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[540px] w-[370px] max-w-[calc(100vw-32px)] flex-col rounded-3xl border border-sand bg-paper shadow-2xl transition-all duration-300 sm:w-[410px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-sand bg-sage px-5 py-4 text-paper rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-paper/20">
                <Sparkles size={20} className="text-leaf" />
              </div>
              <div>
                <p className="font-display font-semibold text-base leading-tight">Wellnest AI Coach</p>
                <p className="text-[11px] text-paper/80 flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
                  Mindful · Personalized · Real-time
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl p-1.5 text-paper/70 transition hover:bg-paper/20 hover:text-paper"
            >
              <X size={20} />
            </button>
          </div>

          {/* Toast inside chat */}
          {loggedNotice && (
            <div className="bg-moss/20 px-4 py-2 text-center text-xs font-semibold text-sage border-b border-sand">
              {loggedNotice}
            </div>
          )}

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto p-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'coach' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage/15 text-sage">
                    <Bot size={15} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-sage text-paper rounded-br-none'
                      : 'border border-sand bg-cream text-ink rounded-bl-none shadow-sm'
                  }`}
                >
                  <p>{m.text}</p>
                  {m.tip && (
                    <p className="mt-2 text-xs border-t border-sand/60 pt-2 text-sage font-medium">
                      💡 Tip: {m.tip}
                    </p>
                  )}
                  {m.suggestedActivity && (
                    <button
                      type="button"
                      onClick={() => handleQuickLog(m.suggestedActivity, m.pillar)}
                      className="mt-3 flex items-center gap-1.5 rounded-xl bg-sage px-3 py-1.5 text-xs font-semibold text-paper shadow-sm transition hover:bg-moss"
                    >
                      <CheckCircle2 size={13} />
                      Log "{m.suggestedActivity.name}" Now
                    </button>
                  )}
                </div>
                {m.sender === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand text-ink">
                    <User size={15} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-ink/50 pl-9">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-sage border-t-transparent" />
                Thinking mindfully...
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="border-t border-sand/80 px-3 py-2 bg-cream/40">
            <p className="text-[10px] uppercase font-bold text-ink/40 tracking-wider mb-1.5 px-1">
              Suggestions
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendQuery(prompt)}
                  className="shrink-0 rounded-full border border-sand bg-paper px-2.5 py-1 text-[11px] font-medium text-ink/75 transition hover:border-sage hover:text-sage"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendQuery()
            }}
            className="flex items-center gap-2 border-t border-sand bg-paper p-3 rounded-b-3xl"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about habits, sleep..."
              className="flex-1 rounded-xl border border-sand bg-cream px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-sage focus:ring-2 focus:ring-sage/10"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage text-paper transition hover:bg-moss disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
