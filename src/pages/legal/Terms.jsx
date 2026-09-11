import { Link } from 'react-router-dom'
import { HeartPulse, ShieldCheck, ChevronLeft } from 'lucide-react'
import { PRIVACY_PROMISES, TERMS_SECTIONS, TERMS_UPDATED } from '../../lib/legal'
import { useAuthStore } from '../../stores/authStore'

export default function Terms() {
  const { user } = useAuthStore()
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 safe-top safe-bottom">
      <div className="max-w-2xl mx-auto">
        <Link
          to={user ? '/dashboard' : '/register'}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors w-fit"
        >
          <ChevronLeft size={16} /> Back
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <HeartPulse size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Terms of Service &amp; Privacy Policy</h1>
        </div>
        <p className="text-sm text-slate-400 mb-8">Last updated {TERMS_UPDATED}</p>

        <div className="bg-slate-900 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={18} className="text-emerald-400" />
            <p className="text-white font-semibold">Our privacy promises</p>
          </div>
          <ul className="space-y-3">
            {PRIVACY_PROMISES.map((p) => (
              <li key={p.title}>
                <p className="text-sm font-semibold text-white">{p.emoji} {p.title}</p>
                <p className="text-xs text-slate-400">{p.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-7">
          {TERMS_SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="font-semibold text-slate-900 mb-2">{s.heading}</h2>
              <div className="space-y-2">
                {s.body.map((para, i) => (
                  <p key={i} className="text-sm text-slate-600 leading-relaxed">{para}</p>
                ))}
              </div>
            </section>
          ))}
          <p className="text-xs text-slate-400 pt-4 border-t border-slate-100">
            © {new Date().getFullYear()} FlowSync. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
