import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, HeartPulse, X } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useUnreadCount } from '../../hooks/useUnreadCount'

const navItems = [
  { to: '/dashboard',     emoji: '🏠', label: 'Dashboard',    short: 'Home' },
  { to: '/profile',       emoji: '👤', label: 'My Profile',   short: 'Profile' },
  { to: '/workflow',      emoji: '📋', label: 'Workflows',    short: 'Workflows' },
  { to: '/similarity',    emoji: '💞', label: 'Similarity',   short: 'Similarity' },
  { to: '/messages',      emoji: '💬', label: 'Messages',     short: 'Messages' },
  { to: '/network',       emoji: '🤝', label: 'Network',      short: 'Network' },
  { to: '/org',           emoji: '🏥', label: 'Organization', short: 'Org' },
  { to: '/settings',      emoji: '⚙️', label: 'Settings',     short: 'Settings' },
]

// Phone bottom bar — the five most-used destinations; the rest live in the ☰ menu.
const TAB_BAR = ['/dashboard', '/workflow', '/similarity', '/messages', '/profile']

function UnreadBadge({ count, className = '' }) {
  if (count <= 0) return null
  return (
    <span className={`bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${className}`}>
      {count > 9 ? '9+' : count}
    </span>
  )
}

export default function AppLayout({ children }) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { signOut, profile } = useAuthStore()
  const [open, setOpen] = useState(false)
  const unreadCount = useUnreadCount()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (to) => location.pathname.startsWith(to) ||
    (to === '/network' && location.pathname.startsWith('/people'))

  const initials = profile?.preferred_name
    ?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'

  const avatar = (
    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
      {profile?.photo_url
        ? <img src={profile.photo_url} alt="avatar" className="w-full h-full object-cover" />
        : initials}
    </div>
  )

  // Full sidebar: desktop (lg+) and the phone/tablet slide-out menu.
  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 safe-top">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <HeartPulse size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold text-slate-900 leading-none">FlowSync</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Team Workflow Platform</p>
        </div>
        {open && (
          <button onClick={() => setOpen(false)} className="lg:hidden p-2 -mr-2 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Close menu">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, emoji, label }) => {
          const active = isActive(to)
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="text-lg leading-none">{emoji}</span>
              <span className="flex-1">{label}</span>
              {to === '/messages' && <UnreadBadge count={unreadCount} />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-100 safe-bottom">
        <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 mb-2 hover:bg-slate-100 transition-colors">
          {avatar}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{profile?.preferred_name ?? 'User'}</p>
            <p className="text-xs text-slate-400 truncate">{profile?.role ?? ''}</p>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut size={16} />
          Sign out 👋
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-dvh bg-slate-50 overflow-hidden">

      {/* Desktop: full sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-slate-200 flex-col">
        {sidebarContent}
      </aside>

      {/* Tablet: compact emoji rail */}
      <aside className="hidden md:flex lg:hidden w-20 shrink-0 bg-white border-r border-slate-200 flex-col items-center safe-top">
        <button
          onClick={() => setOpen(true)}
          className="mt-4 mb-2 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"
          aria-label="Open menu"
        >
          <HeartPulse size={20} className="text-white" />
        </button>
        <nav className="flex-1 w-full px-2 py-2 space-y-1 overflow-y-auto">
          {navItems.map(({ to, emoji, short, label }) => {
            const active = isActive(to)
            return (
              <Link
                key={to}
                to={to}
                title={label}
                className={`relative flex flex-col items-center gap-1 py-2.5 rounded-xl transition-colors ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className="text-xl leading-none">{emoji}</span>
                <span className="text-[10px] font-medium leading-none">{short}</span>
                {to === '/messages' && <UnreadBadge count={unreadCount} className="absolute top-1 right-2" />}
              </Link>
            )
          })}
        </nav>
        <Link to="/profile" className="mb-4 safe-bottom" title="My Profile">{avatar}</Link>
      </aside>

      {/* Phone + tablet slide-out menu */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative z-50 w-72 max-w-[85vw] bg-white h-full shadow-xl flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Phone top bar */}
        <header className="md:hidden flex items-center gap-2 px-3 py-2.5 bg-white border-b border-slate-200 safe-top">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <HeartPulse size={18} className="text-blue-600" />
            <span className="font-bold text-slate-900">FlowSync</span>
          </div>
          <Link to="/settings" className="p-2 rounded-lg text-lg leading-none hover:bg-slate-100" aria-label="Settings">⚙️</Link>
        </header>

        <main className="flex-1 overflow-y-auto flex flex-col min-h-0 md:safe-bottom">
          {children}
        </main>

        {/* Phone bottom tab bar */}
        <nav className="md:hidden shrink-0 bg-white/95 backdrop-blur border-t border-slate-200 grid grid-cols-5 safe-bottom">
          {TAB_BAR.map((to) => {
            const item = navItems.find((n) => n.to === to)
            const active = isActive(to)
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 transition-colors ${
                  active ? 'text-blue-700' : 'text-slate-500'
                }`}
              >
                <span className={`text-xl leading-none transition-transform ${active ? 'scale-110' : ''}`}>{item.emoji}</span>
                <span className="text-[10px] font-semibold">{item.short}</span>
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-600" />}
                {to === '/messages' && <UnreadBadge count={unreadCount} className="absolute top-1 left-1/2 ml-2" />}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
