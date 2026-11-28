import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Trophy,
  Flame,
  Heart,
  Plus,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Trash2,
  Medal,
  Target,
  Droplet,
  Zap,
  Star,
  CheckCircle,
  Clock,
  Send,
  Crown,
} from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PILLAR_COLORS = {
  movement: 'bg-sage/15 text-sage border-sage/30',
  hydration: 'bg-sky-100 text-sky-700 border-sky-200',
  sleep: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  mindfulness: 'bg-purple-100 text-purple-700 border-purple-200',
  nutrition: 'bg-amber-100 text-amber-700 border-amber-200',
  general: 'bg-sand text-ink/70 border-sand',
}

const PILLAR_ICONS = {
  movement: Flame,
  hydration: Droplet,
  sleep: Star,
  mindfulness: Zap,
  nutrition: Target,
  general: Trophy,
}

const ACHIEVEMENT_EMOJI = {
  workout: '🏋️',
  goal: '🎯',
  hydration: '💧',
  habit: '✅',
  challenge: '🏆',
  general: '🌿',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function Avatar({ user, size = 'sm' }) {
  const sz = size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-sm'
  return user?.avatar ? (
    <img src={user.avatar} alt={user.name} className={`${sz} rounded-full object-cover border border-sand`} />
  ) : (
    <div className={`${sz} rounded-full bg-sage flex items-center justify-center text-paper font-bold`}>
      {user?.name?.[0]?.toUpperCase() || 'W'}
    </div>
  )
}

// ─── Tab: Leaderboard ─────────────────────────────────────────────────────────
function LeaderboardTab() {
  const [period, setPeriod] = useState('weekly')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/community/leaderboard?period=${period}`)
      setData(res.data)
    } catch {
      setError('Could not load leaderboard.')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  const rankIcon = (rank) => {
    if (rank === 1) return <Crown size={18} className="text-yellow-500" />
    if (rank === 2) return <Medal size={18} className="text-slate-400" />
    if (rank === 3) return <Medal size={18} className="text-amber-600" />
    return <span className="text-sm font-bold text-ink/40 w-5 text-center">#{rank}</span>
  }

  return (
    <div className="space-y-5">
      {/* Period toggle */}
      <div className="flex gap-2">
        {['weekly', 'monthly'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              period === p ? 'bg-sage text-paper shadow' : 'bg-sand text-ink/70 hover:bg-sage/10'
            }`}
          >
            {p === 'weekly' ? '7-Day' : '30-Day'}
          </button>
        ))}
      </div>

      {/* Points legend */}
      <div className="flex flex-wrap gap-3 text-xs text-ink/50">
        <span className="flex items-center gap-1"><Flame size={12} className="text-sage" /> Workout = 10–70 pts</span>
        <span className="flex items-center gap-1"><CheckCircle size={12} className="text-sage" /> Habit = 5 pts</span>
        <span className="flex items-center gap-1"><Droplet size={12} className="text-sage" /> Hydration goal = 8 pts/day</span>
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-sage/30 border-t-sage" />
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl bg-paper border border-sand p-10 text-center text-ink/50">
          <Trophy size={36} className="mx-auto mb-3 text-sand" />
          <p>No leaderboard data yet. Start logging activities!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((entry) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-4 rounded-2xl border px-4 py-3 transition ${
                entry.isMe
                  ? 'border-sage/40 bg-sage/8 shadow-sm'
                  : 'border-sand bg-paper hover:border-sage/20'
              }`}
            >
              <div className="flex w-6 items-center justify-center">{rankIcon(entry.rank)}</div>
              <Avatar user={{ name: entry.name, avatar: entry.avatar }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-ink truncate">
                  {entry.name} {entry.isMe && <span className="text-xs text-sage">(you)</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-sage">{entry.points}</p>
                <p className="text-xs text-ink/40">pts</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Challenges ──────────────────────────────────────────────────────────
function ChallengesTab() {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', pillar: 'general', target: '', unit: 'sessions', durationDays: 7,
  })
  const [creating, setCreating] = useState(false)
  const [joiningId, setJoiningId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/community/challenges')
      setChallenges(res.data)
    } catch {
      setError('Could not load challenges.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.target) return
    setCreating(true)
    try {
      const res = await api.post('/community/challenges', {
        ...form,
        target: Number(form.target),
        durationDays: Number(form.durationDays),
      })
      setChallenges((prev) => [{ ...res.data, participantCount: 1, isJoined: true }, ...prev])
      setShowCreate(false)
      setForm({ title: '', description: '', pillar: 'general', target: '', unit: 'sessions', durationDays: 7 })
    } catch (err) {
      alert(err.response?.data?.message || 'Could not create challenge')
    } finally {
      setCreating(false)
    }
  }

  const joinChallenge = async (id) => {
    setJoiningId(id)
    try {
      await api.post(`/community/challenges/${id}/join`)
      setChallenges((prev) =>
        prev.map((c) => c._id === id ? { ...c, isJoined: true, participantCount: c.participantCount + 1 } : c)
      )
    } catch (err) {
      alert(err.response?.data?.message || 'Could not join challenge')
    } finally {
      setJoiningId(null)
    }
  }

  const PILLAR_OPTS = ['general', 'movement', 'hydration', 'sleep', 'mindfulness', 'nutrition']

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/60">Join wellness challenges with the community</p>
        <button
          onClick={() => setShowCreate((p) => !p)}
          className="flex items-center gap-2 rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-paper shadow hover:bg-moss transition"
        >
          <Plus size={15} /> Create
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-sage/30 bg-paper p-5 space-y-4">
          <h3 className="font-semibold text-sage">New Challenge</h3>
          <input
            required
            placeholder="Challenge title (e.g. 7-Day Hydration Sprint)"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full rounded-xl border border-sand bg-cream px-4 py-3 text-sm outline-none focus:border-sage"
          />
          <textarea
            placeholder="Brief description (optional)"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={2}
            className="w-full rounded-xl border border-sand bg-cream px-4 py-3 text-sm outline-none focus:border-sage resize-none"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <select
              value={form.pillar}
              onChange={(e) => setForm((p) => ({ ...p, pillar: e.target.value }))}
              className="rounded-xl border border-sand bg-cream px-3 py-3 text-sm outline-none focus:border-sage"
            >
              {PILLAR_OPTS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <input
              required type="number" min="1" placeholder="Target"
              value={form.target}
              onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))}
              className="rounded-xl border border-sand bg-cream px-3 py-3 text-sm outline-none focus:border-sage"
            />
            <input
              placeholder="Unit (ml, steps…)"
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              className="rounded-xl border border-sand bg-cream px-3 py-3 text-sm outline-none focus:border-sage"
            />
            <input
              type="number" min="1" max="365" placeholder="Days"
              value={form.durationDays}
              onChange={(e) => setForm((p) => ({ ...p, durationDays: e.target.value }))}
              className="rounded-xl border border-sand bg-cream px-3 py-3 text-sm outline-none focus:border-sage"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-sand py-3 text-sm font-medium hover:bg-sand transition">Cancel</button>
            <button type="submit" disabled={creating} className="flex-1 rounded-xl bg-sage py-3 text-sm font-semibold text-paper hover:bg-moss transition disabled:opacity-60">
              {creating ? 'Creating…' : 'Create Challenge'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-clay">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><span className="h-6 w-6 animate-spin rounded-full border-2 border-sage/30 border-t-sage" /></div>
      ) : challenges.length === 0 ? (
        <div className="rounded-2xl bg-paper border border-sand p-10 text-center text-ink/50">
          <Trophy size={36} className="mx-auto mb-3 text-sand" />
          <p>No challenges yet. Create the first one!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {challenges.map((ch) => {
            const PillarIcon = PILLAR_ICONS[ch.pillar] || Trophy
            const pct = ch.isJoined ? Math.min(100, Math.round((ch.myProgress / ch.target) * 100)) : 0
            const colClass = PILLAR_COLORS[ch.pillar] || PILLAR_COLORS.general
            const endDate = ch.endDate ? new Date(ch.endDate) : null
            const now = new Date()
            const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - now) / 86400000)) : null

            return (
              <div key={ch._id} className="rounded-2xl border border-sand bg-paper p-5 hover:border-sage/30 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-lg border p-1.5 ${colClass}`}><PillarIcon size={14} /></span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colClass}`}>
                      {ch.pillar}
                    </span>
                  </div>
                  {ch.isJoined && ch.myCompleted && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-sage">
                      <CheckCircle size={13} /> Done
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-semibold text-ink">{ch.title}</h3>
                {ch.description && <p className="mt-1 text-xs text-ink/60 leading-5">{ch.description}</p>}
                <div className="mt-3 flex items-center gap-4 text-xs text-ink/50">
                  <span className="flex items-center gap-1"><Users size={12} /> {ch.participantCount} joined</span>
                  <span className="flex items-center gap-1"><Target size={12} /> {ch.target} {ch.unit}</span>
                  {daysLeft !== null && (
                    <span className="flex items-center gap-1"><Clock size={12} /> {daysLeft}d left</span>
                  )}
                </div>
                {ch.isJoined && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-ink/50 mb-1">
                      <span>Progress</span><span>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-sand overflow-hidden">
                      <div className="h-full bg-sage rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                {!ch.isJoined && (
                  <button
                    onClick={() => joinChallenge(ch._id)}
                    disabled={joiningId === ch._id}
                    className="mt-4 w-full rounded-xl border border-sage/40 py-2 text-sm font-semibold text-sage hover:bg-sage hover:text-paper transition disabled:opacity-60"
                  >
                    {joiningId === ch._id ? 'Joining…' : 'Join Challenge'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Social Feed ─────────────────────────────────────────────────────────
function SocialTab() {
  const { user: me } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [content, setContent] = useState('')
  const [achievementType, setAchievementType] = useState('general')
  const [error, setError] = useState('')

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/community/posts')
      setPosts(res.data)
    } catch {
      setError('Could not load posts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPosts() }, [loadPosts])

  const submitPost = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    try {
      const res = await api.post('/community/posts', { content: content.trim(), achievementType })
      setPosts((prev) => [res.data, ...prev])
      setContent('')
      setAchievementType('general')
    } catch (err) {
      alert(err.response?.data?.message || 'Could not post')
    } finally {
      setPosting(false)
    }
  }

  const toggleLike = async (id) => {
    try {
      const res = await api.patch(`/community/posts/${id}/like`)
      setPosts((prev) =>
        prev.map((p) => p._id === id ? { ...p, likeCount: res.data.likeCount, likedByMe: res.data.likedByMe } : p)
      )
    } catch {}
  }

  const deletePost = async (id) => {
    if (!window.confirm('Delete this post?')) return
    try {
      await api.delete(`/community/posts/${id}`)
      setPosts((prev) => prev.filter((p) => p._id !== id))
    } catch {}
  }

  const ACH_OPTS = ['general', 'workout', 'goal', 'hydration', 'habit', 'challenge']

  return (
    <div className="space-y-5">
      {/* Compose */}
      <form onSubmit={submitPost} className="rounded-2xl border border-sand bg-paper p-5">
        <div className="flex gap-3">
          <Avatar user={me} />
          <textarea
            placeholder="Share a wellness win, tip, or update… 🌿"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={3}
            className="flex-1 resize-none rounded-xl border border-sand bg-cream px-4 py-3 text-sm outline-none focus:border-sage placeholder:text-ink/40"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select
              value={achievementType}
              onChange={(e) => setAchievementType(e.target.value)}
              className="rounded-lg border border-sand bg-cream px-3 py-2 text-xs outline-none focus:border-sage"
            >
              {ACH_OPTS.map((a) => (
                <option key={a} value={a}>{ACHIEVEMENT_EMOJI[a]} {a.charAt(0).toUpperCase() + a.slice(1)}</option>
              ))}
            </select>
            <span className="text-xs text-ink/40">{content.length}/500</span>
          </div>
          <button
            type="submit"
            disabled={posting || !content.trim()}
            className="flex items-center gap-2 rounded-xl bg-sage px-5 py-2 text-sm font-semibold text-paper hover:bg-moss transition disabled:opacity-60"
          >
            <Send size={14} /> {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-clay">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><span className="h-6 w-6 animate-spin rounded-full border-2 border-sage/30 border-t-sage" /></div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl bg-paper border border-sand p-10 text-center text-ink/50">
          <Users size={36} className="mx-auto mb-3 text-sand" />
          <p>No posts yet. Be the first to share a wellness win!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p._id} className="rounded-2xl border border-sand bg-paper p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Avatar user={p.userId} />
                  <div>
                    <p className="text-sm font-semibold text-ink">{p.userId?.name}</p>
                    <p className="text-xs text-ink/40">{timeAgo(p.createdAt)}</p>
                  </div>
                </div>
                <span className="text-lg">{ACHIEVEMENT_EMOJI[p.achievementType] || '🌿'}</span>
              </div>
              <p className="mt-3 text-sm text-ink/80 leading-6">{p.content}</p>
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => toggleLike(p._id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    p.likedByMe ? 'bg-clay/10 text-clay' : 'text-ink/50 hover:bg-sand hover:text-clay'
                  }`}
                >
                  <Heart size={13} className={p.likedByMe ? 'fill-clay text-clay' : ''} />
                  {p.likeCount} {p.likeCount === 1 ? 'like' : 'likes'}
                </button>
                {p.userId?._id === me?._id && (
                  <button
                    onClick={() => deletePost(p._id)}
                    className="text-ink/30 hover:text-clay transition p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Friends ─────────────────────────────────────────────────────────────
function FriendsTab() {
  const [friends, setFriends] = useState([])
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState(null)

  const loadFriends = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/community/friends')
      setFriends(res.data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadFriends() }, [loadFriends])

  const doSearch = async () => {
    if (searchQ.trim().length < 2) return
    setSearching(true)
    try {
      const res = await api.get(`/community/users/search?q=${encodeURIComponent(searchQ.trim())}`)
      setSearchResults(res.data)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const sendRequest = async (recipientId) => {
    setActionId(recipientId)
    try {
      await api.post('/community/friends/request', { recipientId })
      setSearchResults((prev) =>
        prev.map((u) => u._id === recipientId
          ? { ...u, friendship: { status: 'pending', iRequested: true } }
          : u
        )
      )
    } catch (err) {
      alert(err.response?.data?.message || 'Could not send request')
    } finally {
      setActionId(null)
    }
  }

  const acceptRequest = async (friendshipId) => {
    setActionId(friendshipId)
    try {
      await api.patch(`/community/friends/${friendshipId}/accept`)
      await loadFriends()
    } catch {}
    setActionId(null)
  }

  const rejectRequest = async (friendshipId) => {
    setActionId(friendshipId)
    try {
      await api.patch(`/community/friends/${friendshipId}/reject`)
      setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId))
    } catch {}
    setActionId(null)
  }

  const removeFriend = async (friendshipId) => {
    if (!window.confirm('Remove friend?')) return
    setActionId(friendshipId)
    try {
      await api.delete(`/community/friends/${friendshipId}`)
      setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId))
    } catch {}
    setActionId(null)
  }

  const pending = friends.filter((f) => f.status === 'pending' && !f.iRequested)
  const accepted = friends.filter((f) => f.status === 'accepted')
  const sent = friends.filter((f) => f.status === 'pending' && f.iRequested)

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              placeholder="Search users by name…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              className="w-full rounded-xl border border-sand bg-paper pl-9 pr-4 py-3 text-sm outline-none focus:border-sage"
            />
          </div>
          <button
            onClick={doSearch}
            disabled={searching || searchQ.trim().length < 2}
            className="rounded-xl bg-sage px-5 py-3 text-sm font-semibold text-paper hover:bg-moss transition disabled:opacity-60"
          >
            {searching ? '…' : 'Search'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 rounded-2xl border border-sand bg-paper divide-y divide-sand overflow-hidden">
            {searchResults.map((u) => (
              <div key={u._id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3">
                  <Avatar user={u} />
                  <p className="text-sm font-medium text-ink">{u.name}</p>
                </div>
                {!u.friendship ? (
                  <button
                    onClick={() => sendRequest(u._id)}
                    disabled={actionId === u._id}
                    className="flex items-center gap-1.5 rounded-lg bg-sage/10 border border-sage/30 px-3 py-1.5 text-xs font-semibold text-sage hover:bg-sage hover:text-paper transition disabled:opacity-60"
                  >
                    <UserPlus size={12} /> Add
                  </button>
                ) : u.friendship.status === 'pending' ? (
                  <span className="text-xs text-ink/40 flex items-center gap-1">
                    <Clock size={12} /> {u.friendship.iRequested ? 'Sent' : 'Incoming'}
                  </span>
                ) : (
                  <span className="text-xs text-sage flex items-center gap-1"><UserCheck size={12} /> Friends</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending incoming */}
      {pending.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink/40">Friend Requests ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map((f) => (
              <div key={f.friendshipId} className="flex items-center justify-between gap-3 rounded-2xl border border-sand bg-paper p-3">
                <div className="flex items-center gap-3">
                  <Avatar user={f.user} />
                  <p className="text-sm font-medium text-ink">{f.user.name}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptRequest(f.friendshipId)}
                    disabled={actionId === f.friendshipId}
                    className="flex items-center gap-1 rounded-lg bg-sage px-3 py-1.5 text-xs font-semibold text-paper hover:bg-moss transition disabled:opacity-60"
                  >
                    <UserCheck size={12} /> Accept
                  </button>
                  <button
                    onClick={() => rejectRequest(f.friendshipId)}
                    disabled={actionId === f.friendshipId}
                    className="flex items-center gap-1 rounded-lg border border-sand px-3 py-1.5 text-xs font-medium text-ink/60 hover:border-clay hover:text-clay transition disabled:opacity-60"
                  >
                    <UserX size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted */}
      {loading ? (
        <div className="flex justify-center py-8"><span className="h-5 w-5 animate-spin rounded-full border-2 border-sage/30 border-t-sage" /></div>
      ) : accepted.length === 0 && pending.length === 0 && sent.length === 0 ? (
        <div className="rounded-2xl bg-paper border border-sand p-10 text-center text-ink/50">
          <Users size={36} className="mx-auto mb-3 text-sand" />
          <p>Search for friends and connect!</p>
        </div>
      ) : accepted.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink/40">Friends ({accepted.length})</h3>
          <div className="space-y-2">
            {accepted.map((f) => (
              <div key={f.friendshipId} className="flex items-center justify-between gap-3 rounded-2xl border border-sand bg-paper p-3">
                <div className="flex items-center gap-3">
                  <Avatar user={f.user} />
                  <p className="text-sm font-medium text-ink">{f.user.name}</p>
                </div>
                <button
                  onClick={() => removeFriend(f.friendshipId)}
                  disabled={actionId === f.friendshipId}
                  className="p-2 rounded-lg text-ink/30 hover:text-clay hover:bg-clay/10 transition disabled:opacity-60"
                >
                  <UserX size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sent.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink/40">Sent Requests ({sent.length})</h3>
          <div className="space-y-2">
            {sent.map((f) => (
              <div key={f.friendshipId} className="flex items-center gap-3 rounded-2xl border border-sand bg-paper p-3">
                <Avatar user={f.user} />
                <p className="text-sm font-medium text-ink">{f.user.name}</p>
                <span className="ml-auto text-xs text-ink/40 flex items-center gap-1"><Clock size={12} /> Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Community Page ───────────────────────────────────────────────────────
const TABS = [
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'challenges', label: 'Challenges', icon: Flame },
  { id: 'feed', label: 'Social Feed', icon: Heart },
  { id: 'friends', label: 'Friends', icon: Users },
]

export default function Community() {
  const [activeTab, setActiveTab] = useState('leaderboard')

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-7">
        <h1 className="font-display text-3xl text-sage sm:text-4xl">
          Wellness Community<span className="text-clay">.</span>
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          Connect with others, join challenges, and celebrate wellness wins together.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-sand/50 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition flex-1 justify-center ${
              activeTab === id
                ? 'bg-paper text-sage shadow-sm'
                : 'text-ink/60 hover:text-ink hover:bg-paper/50'
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'leaderboard' && <LeaderboardTab />}
      {activeTab === 'challenges' && <ChallengesTab />}
      {activeTab === 'feed' && <SocialTab />}
      {activeTab === 'friends' && <FriendsTab />}
    </div>
  )
}
