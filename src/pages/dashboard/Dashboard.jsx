import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import {
  ClipboardList, BarChart2, User, Users, Building2,
  ChevronRight, CheckCircle, Clock, AlertCircle
} from 'lucide-react'

const cards = [
  {
    to: '/workflow',
    icon: ClipboardList,
    color: 'blue',
    title: 'My Workflows',
    desc: 'Define how you like to run each visit type — timing, order, preferences.',
    cta: 'Set up workflows',
    status: 'pending',
    statusLabel: 'Not started',
  },
  {
    to: '/compatibility',
    icon: BarChart2,
    color: 'teal',
    title: 'Team Compatibility',
    desc: 'Compare your workflows with a teammate and see your alignment score.',
    cta: 'View scores',
    status: 'locked',
    statusLabel: 'Complete a workflow first',
  },
  {
    to: '/profile',
    icon: User,
    color: 'violet',
    title: 'My Profile',
    desc: 'Set your preferred title, pronouns, workspace needs, and equipment preferences.',
    cta: 'Edit profile',
    status: 'pending',
    statusLabel: 'Incomplete',
  },
  {
    to: '/network',
    icon: Users,
    color: 'cyan',
    title: 'My Network',
    desc: 'Follow teammates and manage who can see your workflows.',
    cta: 'View network',
    status: 'pending',
    statusLabel: 'Not set up',
  },
  {
    to: '/org',
    icon: Building2,
    color: 'orange',
    title: 'Organization',
    desc: "See your clinic's members, workflow completion stats, and team activity.",
    cta: 'View org',
    status: 'pending',
    statusLabel: 'View',
  },
]

const colorMap = {
  blue:   { icon: 'text-blue-600',   bg: 'bg-blue-50',   ring: 'ring-blue-100',   btn: 'text-blue-600'   },
  teal:   { icon: 'text-teal-600',   bg: 'bg-teal-50',   ring: 'ring-teal-100',   btn: 'text-teal-600'   },
  violet: { icon: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100', btn: 'text-violet-600' },
  cyan:   { icon: 'text-cyan-600',   bg: 'bg-cyan-50',   ring: 'ring-cyan-100',   btn: 'text-cyan-600'   },
  orange: { icon: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-100', btn: 'text-orange-600' },
}

const statusIcon = {
  done:    <CheckCircle size={14} className="text-emerald-500" />,
  pending: <Clock size={14} className="text-amber-400" />,
  locked:  <AlertCircle size={14} className="text-slate-300" />,
}

export default function Dashboard() {
  const { profile } = useAuthStore()
  const firstName   = profile?.preferred_name?.split(' ')[0] ?? 'there'
  const hour        = new Date().getHours()
  const greeting    = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-600 mb-1">{greeting}</p>
        <h2 className="text-2xl font-bold text-slate-900">
          {profile?.preferred_name ?? 'Welcome'}
        </h2>
        <p className="text-slate-500 mt-1 text-sm">
          {profile?.role ? `${profile.role} · ` : ''}{profile?.organization ?? 'Your Clinic'}
        </p>
      </div>

      {/* Setup progress banner */}
      <div className="bg-blue-600 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-white font-semibold">Complete your setup</p>
          <p className="text-blue-100 text-sm mt-0.5">
            Fill out your workflow preferences so teammates can see how you work best.
          </p>
        </div>
        <Link
          to="/workflow"
          className="shrink-0 bg-white text-blue-700 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
        >
          Get started →
        </Link>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ to, icon: Icon, color, title, desc, cta, status, statusLabel }) => {
          const c       = colorMap[color]
          const locked  = status === 'locked'
          return (
            <Link
              key={to}
              to={locked ? '#' : to}
              className={`group bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4 transition-all
                ${locked
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                }`}
            >
              {/* Icon */}
              <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center ring-4 ${c.ring}`}>
                <Icon size={20} className={c.icon} />
              </div>

              {/* Text */}
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className={`flex items-center gap-1.5 text-xs font-medium text-slate-400`}>
                  {statusIcon[status]}
                  {statusLabel}
                </span>
                {!locked && (
                  <span className={`flex items-center gap-0.5 text-xs font-semibold ${c.btn} group-hover:gap-1.5 transition-all`}>
                    {cta} <ChevronRight size={13} />
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Tips */}
      <div className="mt-8 bg-slate-100 rounded-2xl p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">💡 Quick tip</p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Start by filling out your <strong className="text-slate-800">30-minute visit workflow</strong> — it's the baseline profile every team member should complete. It takes about 5 minutes and unlocks compatibility scoring.
        </p>
      </div>
    </div>
  )
}
