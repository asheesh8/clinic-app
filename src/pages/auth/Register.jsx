import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { HeartPulse, Building2, ChevronDown } from 'lucide-react'
import { auth, db } from '../../lib/firebase'
import { searchOrganizations } from '../../lib/vermontOrganizations'

const ROLES = [
  'Physician',
  'Nurse Practitioner',
  'APRN',
  'Registered Nurse',
  'Medical Assistant',
  'Other',
]

const TYPE_COLORS = {
  'Hospital':               'bg-blue-100 text-blue-700',
  'Community Health Center':'bg-teal-100 text-teal-700',
  'Primary Care':           'bg-violet-100 text-violet-700',
  'Urgent Care':            'bg-orange-100 text-orange-700',
  'Home Health / VNA':      'bg-cyan-100 text-cyan-700',
  'Skilled Nursing':        'bg-slate-100 text-slate-600',
}

function OrgCombobox({ value, onChange }) {
  const [query, setQuery]           = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen]             = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const wrapperRef                  = useRef(null)
  const inputRef                    = useRef(null)

  // Keep query in sync if parent resets value
  useEffect(() => { setQuery(value || '') }, [value])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleInput = (e) => {
    const q = e.target.value
    setQuery(q)
    onChange(q) // keep free-text in sync
    const results = searchOrganizations(q, 8)
    setSuggestions(results)
    setOpen(results.length > 0)
    setHighlighted(-1)
  }

  const selectSuggestion = (org) => {
    const label = `${org.name} — ${org.city}`
    setQuery(label)
    onChange(label)
    setSuggestions([])
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, -1))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Building2
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= 2) {
              const results = searchOrganizations(query, 8)
              setSuggestions(results)
              setOpen(results.length > 0)
            }
          }}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition"
          placeholder="Search Vermont clinics…"
          autoComplete="off"
        />
        {query && (
          <ChevronDown
            size={15}
            className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
          />
        )}
      </div>

      {open && (
        <ul className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((org, i) => (
            <li
              key={`${org.name}-${org.city}`}
              onMouseDown={() => selectSuggestion(org)}
              onMouseEnter={() => setHighlighted(i)}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                highlighted === i ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <Building2 size={14} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{org.name}</p>
                <p className="text-xs text-slate-500">{org.city}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[org.type] ?? 'bg-slate-100 text-slate-500'}`}>
                {org.type}
              </span>
            </li>
          ))}
          {/* Always allow free-text "not listed" option */}
          <li
            onMouseDown={() => {
              setOpen(false)
              // keep whatever the user typed
            }}
            className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500 hover:bg-slate-50 cursor-pointer"
          >
            <span className="text-slate-400">✎</span>
            Use "<span className="font-medium text-slate-700">{query}</span>" as-is
          </li>
        </ul>
      )}
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '', preferred_name: '', role: '', organization: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setOrg = (val) => setForm((f) => ({ ...f, organization: val }))

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await updateProfile(user, { displayName: form.preferred_name })
      await setDoc(doc(db, 'profiles', user.uid), {
        id:              user.uid,
        email:           form.email,
        preferred_name:  form.preferred_name,
        role:            form.role,
        organization:    form.organization,
        pronouns:        '',
        preferred_title: '',
        visibility:      'org',
        created_at:      serverTimestamp(),
        updated_at:      serverTimestamp(),
      })
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
          <h1 className="text-2xl font-bold text-slate-900">Join FlowSync</h1>
          <p className="text-slate-500 mt-1 text-sm">Set up your clinical workflow profile</p>
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
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Organization / Clinic</label>
              <OrgCombobox value={form.organization} onChange={setOrg} />
              <p className="text-xs text-slate-400 mt-1.5 ml-0.5">
                Start typing to search Vermont healthcare facilities, or enter your own.
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
