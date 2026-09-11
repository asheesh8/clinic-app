import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { Check, ChevronRight } from 'lucide-react'
import { db } from '../../lib/firebase'
import { useAuthStore } from '../../stores/authStore'
import { COLORWAYS, DEFAULT_ACCENT, applyAccent, rememberAccent, savedAccent, isValidHex } from '../../lib/theme'
import { Toast, YesNo } from '../../components/ui/Controls'

function PreviewCard() {
  const [demo, setDemo] = useState(true)
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">👀 Preview</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          💾 Save
        </button>
        <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">✨ Badge</span>
        <span className="text-blue-600 text-sm font-medium underline">A link</span>
      </div>
      <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 px-3 py-2">
        <span className="text-sm text-slate-700">🗣️ Morning huddle?</span>
        <YesNo value={demo} onChange={(v) => setDemo(v ?? true)} />
      </div>
      <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
        <div className="h-full w-2/3 bg-blue-500 rounded-full" />
      </div>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { user, profile, setProfile, signOut } = useAuthStore()
  const [accent, setAccent] = useState(() => profile?.theme_accent ?? savedAccent() ?? DEFAULT_ACCENT)
  const [hexInput, setHexInput] = useState(accent)
  const [toast, setToast] = useState(null)
  const saveTimer = useRef(null)

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  function choose(hex, { announce = true } = {}) {
    if (!isValidHex(hex)) return
    setAccent(hex)
    setHexInput(hex)
    applyAccent(hex)
    rememberAccent(hex)
    // Debounce the account save so dragging the color picker doesn't spam writes.
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!user?.uid) return
      try {
        await setDoc(doc(db, 'profiles', user.uid), { theme_accent: hex }, { merge: true })
        setProfile({ ...useAuthStore.getState().profile, theme_accent: hex })
        if (announce) setToast('Colorway saved')
      } catch (err) {
        console.error(err)
        setToast('Could not sync your colorway — it is still saved on this device')
      }
    }, 600)
  }

  const current = COLORWAYS.find((c) => c.hex.toLowerCase() === accent.toLowerCase())

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Settings ⚙️</h2>
        <p className="text-slate-500 text-sm mt-1">Make FlowSync yours.</p>
      </div>

      {/* Colorway */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">🎨 Colorway</h3>
            <p className="text-sm text-slate-500">Pick the color used for buttons, highlights, and links.</p>
          </div>
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
            {current ? `${current.emoji} ${current.name}` : '🖌️ Custom'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {COLORWAYS.map((c) => {
            const active = c.hex.toLowerCase() === accent.toLowerCase()
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => choose(c.hex)}
                aria-pressed={active}
                className={`relative flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  active ? 'border-slate-900 shadow-sm' : 'border-slate-100 hover:border-slate-300'
                }`}
              >
                <span
                  className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-base shadow-inner"
                  style={{ background: `linear-gradient(135deg, ${c.hex}, color-mix(in oklab, ${c.hex} 45%, white))` }}
                >
                  {c.emoji}
                </span>
                <span className="text-sm font-medium text-slate-700 leading-tight">{c.name}</span>
                {active && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Custom */}
        <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm font-medium text-slate-700 sm:flex-1">🖌️ Or pick any color</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={accent}
              onChange={(e) => choose(e.target.value, { announce: false })}
              className="w-11 h-11 rounded-xl border border-slate-200 cursor-pointer bg-white p-1"
              aria-label="Custom accent color"
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => {
                const v = e.target.value.trim()
                setHexInput(v)
                const withHash = v.startsWith('#') ? v : `#${v}`
                if (isValidHex(withHash)) choose(withHash)
              }}
              maxLength={7}
              placeholder="#2563eb"
              className="w-28 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {accent.toLowerCase() !== DEFAULT_ACCENT && (
              <button
                type="button"
                onClick={() => choose(DEFAULT_ACCENT)}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-2"
              >
                ↩️ Reset
              </button>
            )}
          </div>
        </div>

        <div className="mt-5">
          <PreviewCard />
        </div>
      </section>

      {/* Account */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <h3 className="font-semibold text-slate-900 px-5 sm:px-6 pt-5 pb-2">👤 Account</h3>
        <div className="divide-y divide-slate-100">
          {[
            { to: '/profile', label: '🪪 Edit my profile' },
            { to: '/profile', label: `👀 Profile visibility: ${profile?.visibility ?? 'org'}` },
            { to: '/network', label: '🤝 Followers & requests' },
            { to: '/terms',   label: '📜 Terms & Privacy Policy' },
          ].map((row) => (
            <Link key={row.label} to={row.to} className="flex items-center justify-between px-5 sm:px-6 py-3.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              <span>{row.label}</span>
              <ChevronRight size={16} className="text-slate-300" />
            </Link>
          ))}
          <button
            onClick={async () => { await signOut(); navigate('/login') }}
            className="w-full text-left px-5 sm:px-6 py-3.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            🚪 Sign out
          </button>
        </div>
      </section>
    </div>
  )
}
