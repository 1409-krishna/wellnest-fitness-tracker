import { useState, useRef } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Activity, Brain, Home, Target, CalendarCheck, Droplet, Sparkles, Camera, Loader2, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AICoachModal from './AICoachModal'
import api from '../api/client'

const links = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/activities', label: 'Activities', icon: Activity },
  { to: '/habits', label: 'Habits', icon: CalendarCheck },
  { to: '/hydration', label: 'Hydration', icon: Droplet },
  { to: '/planner', label: 'AI Planner', icon: Sparkles },
  { to: '/progress', label: 'Progress', icon: Target },
  { to: '/insights', label: 'Insights', icon: Brain },
  { to: '/community', label: 'Community', icon: Users },
]

export default function Layout() {
  const { user, logout, updateUser } = useAuth()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)
    setUploading(true)

    try {
      const res = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data.success && updateUser) {
        updateUser({ ...user, avatar: res.data.avatar })
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Could not upload avatar image')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-sand bg-paper p-6 md:flex">
          <p className="font-display text-2xl text-sage">Wellnest</p>
          <p className="mt-1 text-sm text-ink/60">Move · Rest · Hydrate · Sleep</p>
          <nav className="mt-10 flex flex-1 flex-col gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-sage text-paper' : 'text-ink/70 hover:bg-sand'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="rounded-2xl bg-sand/70 p-4">
            <div className="flex items-center gap-3">
              <div className="relative group">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-10 w-10 rounded-full object-cover border border-sage/30"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage text-paper font-bold text-sm">
                    {user?.name?.[0]?.toUpperCase() || 'W'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/60 text-paper opacity-0 transition group-hover:opacity-100 cursor-pointer"
                  title="Upload profile picture"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="truncate text-xs text-ink/50">{user?.email}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-sand/80 pt-2 text-xs">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-sage hover:underline cursor-pointer"
              >
                {uploading ? 'Uploading...' : 'Change photo'}
              </button>
              <button
                type="button"
                onClick={logout}
                className="text-clay hover:underline cursor-pointer"
              >
                Log out
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-sand bg-paper/80 px-4 py-4 backdrop-blur md:hidden">
            <div className="flex items-center gap-2">
              {user?.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-7 w-7 rounded-full object-cover border border-sage/30"
                />
              )}
              <p className="font-display text-xl text-sage">Wellnest</p>
            </div>
            <button type="button" onClick={logout} className="text-sm text-clay">
              Log out
            </button>
          </header>
          <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
            <Outlet />
          </main>
          <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around overflow-x-auto border-t border-sand bg-paper px-1 md:hidden">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2 text-[11px] ${
                    isActive ? 'text-sage' : 'text-ink/45'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Floating AI Wellness Coach Widget */}
      <AICoachModal />
    </div>
  )
}
