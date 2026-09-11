import { useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ShieldCheck } from 'lucide-react'
import { db } from '../lib/firebase'
import { useAuthStore } from '../stores/authStore'
import { PRIVACY_PROMISES, TERMS_VERSION } from '../lib/legal'

/** Shown once to signed-in users who haven't accepted the current terms. */
export default function ConsentScreen() {
  const { user, profile, setProfile } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function accept() {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        terms_version:     TERMS_VERSION,
        terms_accepted_at: serverTimestamp(),
      }, { merge: true })
      setProfile({ ...profile, terms_version: TERMS_VERSION })
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center px-5 py-10 safe-top safe-bottom">
      <div className="w-full max-w-md">
        <div className="w-12 h-12 bg-emerald-500/15 rounded-2xl flex items-center justify-center mb-6">
          <ShieldCheck size={26} className="text-emerald-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-white leading-tight">
          Your data stays <span className="text-emerald-400">yours.</span> 🔒
        </h1>
        <p className="text-slate-400 text-sm mt-3">
          FlowSync is built for teams, not advertisers. Here's what we promise.
        </p>

        <ul className="mt-8 space-y-5">
          {PRIVACY_PROMISES.map((p) => {
            return (
              <li key={p.title} className="flex gap-4">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-lg">
                  {p.emoji}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{p.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.body}</p>
                </div>
              </li>
            )
          })}
        </ul>

        {error && <p className="text-sm text-red-300 mt-6">{error}</p>}

        <button
          onClick={accept}
          disabled={saving}
          className="w-full mt-10 bg-white text-slate-900 font-semibold py-3.5 rounded-2xl hover:bg-slate-100 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : '👍 I understand'}
        </button>
        <p className="text-xs text-slate-500 text-center mt-3">
          By tapping "I understand", you agree to the{' '}
          <Link to="/terms" className="text-slate-300 underline">Terms of Service &amp; Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
