import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { HeartPulse } from 'lucide-react'
import { auth, db } from '../../lib/firebase'
import { PROFILE_ROLES } from '../../lib/workflowData'
import { TERMS_VERSION } from '../../lib/legal'
import OrgCombobox from '../../components/OrgCombobox'
import { useAuthStore } from '../../stores/authStore'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '', preferred_name: '', role: '', organization: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed]   = useState(false)
  const setProfile            = useAuthStore((s) => s.setProfile)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setOrg = (val) => setForm((f) => ({ ...f, organization: val }))

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (!agreed) { setError('Please agree to the Terms of Service and Privacy Policy.'); return }
    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await updateProfile(user, { displayName: form.preferred_name })
      const profile = {
        id:              user.uid,
        email:           form.email,
        preferred_name:  form.preferred_name,
        role:            form.role,
        organization:    form.organization,
        org_key:         form.organization.trim().toLowerCase(),
        pronouns:        '',
        preferred_title: '',
        visibility:      'org',
        terms_version:   TERMS_VERSION,
      }
      await setDoc(doc(db, 'profiles', user.uid), {
        ...profile,
        terms_accepted_at: serverTimestamp(),
        created_at:        serverTimestamp(),
        updated_at:        serverTimestamp(),
      })
      // The auth listener may have read the profile before it was written.
      setProfile(profile)
      navigate('/dashboard')
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5"

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <HeartPulse size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Join FlowSync 👋</h1>
          <p className="text-slate-500 mt-1 text-sm">Set up your workflow profile</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleRegister} className="space-y-4">

            <div>
              <label className={labelClass}>Your name / preferred title</label>
              <input
                type="text"
                value={form.preferred_name}
                onChange={set('preferred_name')}
                className={inputClass}
                placeholder="e.g. Dr. Smith or Nurse Patel"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Your role</label>
              <select
                value={form.role}
                onChange={set('role')}
                className={inputClass}
                required
              >
                <option value="">Select your role…</option>
                {PROFILE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Organization / Clinic / Team</label>
              <OrgCombobox value={form.organization} onChange={setOrg} />
              <p className="text-xs text-slate-400 mt-1.5 ml-0.5">
                Start typing to search clinics, or enter any business, team, or household name.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <label className={labelClass}>Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                className={inputClass}
                placeholder="you@clinic.com"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                className={inputClass}
                placeholder="Min. 6 characters"
                required
                minLength={6}
              />
            </div>

            <label className="flex items-start gap-2.5 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                I agree to the{' '}
                <Link to="/terms" target="_blank" className="text-blue-600 font-medium hover:underline">
                  Terms of Service &amp; Privacy Policy
                </Link>
                . 🔒 We don't sell your data or share it with ad networks.
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <span className="text-red-500 mt-0.5 text-lg leading-none">⚠</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors shadow-sm shadow-blue-200 mt-2"
            >
              {loading ? 'Creating your account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function friendlyError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists.'
    case 'auth/invalid-email':        return 'Please enter a valid email address.'
    case 'auth/weak-password':        return 'Password must be at least 6 characters.'
    case 'auth/too-many-requests':    return 'Too many attempts. Please wait and try again.'
    default:                          return 'Something went wrong. Please try again.'
  }
}
