import { NavLink, Outlet } from 'react-router-dom'
import { Activity, Brain, Home, Target, CalendarCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/activities', label: 'Activities', icon: Activity },
  { to: '/habits', label: 'Habits', icon: CalendarCheck },
  { to: '/progress', label: 'Progress', icon: Target },
  { to: '/insights', label: 'Insights', icon: Brain },
]

export default function Layout() {
  const { user, logout } = useAuth()

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
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-ink/50">{user?.email}</p>
            <button
              type="button"
              onClick={logout}
              className="mt-3 text-sm text-clay hover:underline"
            >
              Log out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-sand bg-paper/80 px-4 py-4 backdrop-blur md:hidden">
            <p className="font-display text-xl text-sage">Wellnest</p>
            <button type="button" onClick={logout} className="text-sm text-clay">
              Log out
            </button>
          </header>
          <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
            <Outlet />
          </main>
          <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-sand bg-paper md:hidden">
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
    </div>
  )
}
