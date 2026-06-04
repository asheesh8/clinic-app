import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, User, ClipboardList, BarChart2,
  LogOut, Menu, X, HeartPulse, Users, Building2, MessageSquare
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useUnreadCount } from '../../hooks/useUnreadCount'

const navItems = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profile',       icon: User,             label: 'My Profile' },
  { to: '/workflow',      icon: ClipboardList,    label: 'Workflows' },
  { to: '/compatibility', icon: BarChart2,        label: 'Compatibility' },
  { to: '/messages',      icon: MessageSquare,    label: 'Messages' },
  { to: '/network',       icon: Users,            label: 'Network' },
  { to: '/org',           icon: Building2,        label: 'Organization' },
]

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

  const initials = profile?.preferred_name
    ?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 safe-top">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <HeartPulse size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-none">FlowSync</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Clinical Workflow Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to)
          const isMessages = to === '/messages'
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon size={18} className={active ? 'text-blue-600' : 'text-slate-400'} />
              <span className="flex-1">{label}</span>
              {isMessages && unreadCount > 0 && (
                <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 mb-2">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
            {profile?.photo_url
              ? <img src={profile.photo_url} alt="avatar" className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {profile?.preferred_name ?? 'User'}
            </p>
            <p className="text-xs text-slate-400 truncate">{profile?.role ?? ''}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-slate-200 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-50 w-72 bg-white h-full shadow-xl flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 safe-top">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <HeartPulse size={18} className="text-blue-600" />
            <span className="font-bold text-slate-900">FlowSync</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto flex flex-col min-h-0 safe-bottom">
          {children}
        </main>
      </div>
    </div>
  )
}
