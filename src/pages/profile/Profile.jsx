import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { auth, db } from '../../lib/firebase'
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp
} from 'firebase/firestore'
import { Users, Camera, ExternalLink } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { safe } from '../../lib/people'
import { PROFILE_ROLES, inferWorkflowRole } from '../../lib/workflowData'
import {
  TITLE_OPTIONS, PRONOUN_OPTIONS, VISIBILITY_OPTIONS, WORK_PREFS, WORKSPACE_COMFORTS, VEHICLE_OPTIONS,
  DESK_ITEMS, EXAM_ROOM_ITEMS, PROCEDURE_SECTIONS, FOLLOWUP_WEEK_OPTIONS, ABOUT_QUESTIONS,
  workStyleSectionsFor, legacyProcedures,
} from '../../lib/profileQuestions'
import { Toast, YesNo, YesNoOther, RadioGroup, BulkYesBar, QuestionField } from '../../components/ui/Controls'
import OrgCombobox from '../../components/OrgCombobox'

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`
const UPLOAD_PRESET  = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const TABS = [
  'Identity', 'Work Preferences', 'Workspace Comforts', 'Desk & Equipment', 'Procedures',
  'Schedule & Communication', 'About Me',
]
const TAB_EMOJIS = ['🪪', '💼', '☕', '🖥️', '💉', '🗓️', '😊']

const emptyMap = (items) => Object.fromEntries(items.map((i) => [i.id, null]))

function pick(items, d) {
  const out = emptyMap(items)
  items.forEach(({ id }) => { if (id in d) out[id] = d[id] })
  return out
}

/** A titled yes/no list with a "Mark all Yes" shortcut on top. */
function YesNoList({ title, items, values, setValues }) {
  return (
    <section>
      {title && (
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{title}</p>
      )}
      <BulkYesBar
        values={values}
        onSetAll={(v) => setValues(Object.fromEntries(items.map((i) => [i.id, v])))}
      />
      <div className="space-y-1">
        {items.map(({ id, label }) => (
          <div key={id} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
            <span className="text-sm text-slate-700 leading-snug flex-1">{label}</span>
            <YesNo value={values[id]} onChange={(v) => setValues((prev) => ({ ...prev, [id]: v }))} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Profile() {
  const { user, profile: storeProfile, setProfile } = useAuthStore()
  const [activeTab, setActiveTab]   = useState(0)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)

  // Identity
  const [preferredTitle, setPreferredTitle] = useState('')
  const [pronouns, setPronouns]             = useState('')
  const [pronounsOther, setPronounsOther]   = useState('')
  const [organization, setOrganization]     = useState('')
  const [role, setRole]                     = useState('')
  const [visibility, setVisibility]         = useState('org')

  // Yes/no lists
  const [workPrefs, setWorkPrefs]   = useState(() => emptyMap(WORK_PREFS))
  const [adminTimeMin, setAdminTimeMin] = useState(null)
  const [comforts, setComforts]     = useState(() => emptyMap(WORKSPACE_COMFORTS))
  const [vehicleSize, setVehicleSize] = useState('')
  const [deskItems, setDeskItems]   = useState(() => emptyMap(DESK_ITEMS))
  const [examItems, setExamItems]   = useState(() => emptyMap(EXAM_ROOM_ITEMS))

  // Procedures
  const [procedures, setProcedures]       = useState({})
  const [followupWeeks, setFollowupWeeks] = useState('')

  // Schedule & communication, About Me (stored on the profile so teammates can see them)
  const [workStyle, setWorkStyle] = useState({})
  const [about, setAbout]         = useState({})

  // Photo
  const [photoURL, setPhotoURL]             = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const fileInputRef                        = useRef(null)

  // Counts
  const [followerCount, setFollowerCount]   = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [hearts, setHearts]                 = useState({ avg: 0, count: 0 })

  // ── Load existing data ─────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const uid = user?.uid
      if (!uid) { setLoading(false); return }

      try {
        const [profSnap, prefSnap, followerSnap, followingSnap, ratingSnap] = await Promise.all([
          getDoc(doc(db, 'profiles', uid)),
          getDoc(doc(db, 'workspace_preferences', uid)),
          safe(getDocs(query(collection(db, 'follows'), where('following_id', '==', uid))), { docs: [] }),
          safe(getDocs(query(collection(db, 'follows'), where('follower_id', '==', uid))), { docs: [] }),
          safe(getDocs(query(collection(db, 'interaction_ratings'), where('ratee_id', '==', uid))), { docs: [] }),
        ])

        setFollowerCount(followerSnap.docs.filter(d => d.data().approved).length)
        setFollowingCount(followingSnap.docs.filter(d => d.data().approved).length)
        const hs = ratingSnap.docs.map((d) => d.data().hearts).filter(Boolean)
        setHearts({ avg: hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length : 0, count: hs.length })

        if (profSnap.exists()) {
          const d = profSnap.data()
          if (d.photo_url) setPhotoURL(d.photo_url)
          if (d.preferred_title) setPreferredTitle(d.preferred_title)
          if (d.pronouns) {
            if (PRONOUN_OPTIONS.includes(d.pronouns) && d.pronouns !== 'Other') {
              setPronouns(d.pronouns)
            } else {
              setPronouns('Other')
              setPronounsOther(d.pronouns)
            }
          }
          setOrganization(d.organization ?? '')
          setRole(d.role ?? '')
          setVisibility(d.visibility ?? 'org')
          if (d.work_style) setWorkStyle(d.work_style)
          if (d.about) setAbout(d.about)
        }

        if (prefSnap.exists()) {
          const d = prefSnap.data()
          setWorkPrefs(pick(WORK_PREFS, d))
          setComforts(pick(WORKSPACE_COMFORTS, d))
          setDeskItems(pick(DESK_ITEMS, d))
          setExamItems(pick(EXAM_ROOM_ITEMS, d))
          if (d.vehicle_size) setVehicleSize(d.vehicle_size)
          if (Number.isFinite(d.preferred_admin_time_min)) setAdminTimeMin(d.preferred_admin_time_min)
          setProcedures(d.procedures ?? legacyProcedures(d))
          if (d.proc_followup_weeks) setFollowupWeeks(d.proc_followup_weeks)
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.uid])

  // ── Photo upload ───────────────────────────────────────────────────────────
  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file || !user?.uid) return
    setPhotoUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', UPLOAD_PRESET)
      formData.append('public_id', `profile_${user.uid}`)
      formData.append('overwrite', 'true')

      const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const url = data.secure_url

      setPhotoURL(url)
      await setDoc(doc(db, 'profiles', user.uid), { photo_url: url }, { merge: true })
      setProfile({ ...storeProfile, photo_url: url })
      setToast('Profile photo updated')
    } catch (err) {
      console.error(err)
      setToast('Failed to upload photo')
    } finally {
      setPhotoUploading(false)
    }
  }

  // ── Save handlers ──────────────────────────────────────────────────────────
  async function save(collectionName, data, message, storePatch) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    setSaving(true)
    try {
      await setDoc(doc(db, collectionName, uid), { ...data, updated_at: serverTimestamp() }, { merge: true })
      if (storePatch) setProfile({ ...storeProfile, ...storePatch })
      setToast(message)
    } catch (err) {
      console.error(err)
      setToast('Error saving — please try again')
    } finally {
      setSaving(false)
    }
  }

  function saveIdentity() {
    const patch = {
      preferred_title: preferredTitle,
      pronouns:        pronouns === 'Other' ? pronounsOther : pronouns,
      organization:    organization.trim(),
      org_key:         organization.trim().toLowerCase(),
      role,
      visibility,
    }
    return save('profiles', patch, 'Identity saved', patch)
  }

  const saveHandlers = [
    saveIdentity,
    () => save('workspace_preferences', {
      ...workPrefs,
      preferred_admin_time_min: workPrefs.satisfied_admin_time === false ? adminTimeMin : null,
    }, 'Work preferences saved'),
    () => save('workspace_preferences', { ...comforts, vehicle_size: vehicleSize }, 'Workspace comforts saved'),
    () => save('workspace_preferences', { ...deskItems, ...examItems }, 'Desk & equipment preferences saved'),
    () => save('workspace_preferences', { procedures, proc_followup_weeks: followupWeeks }, 'Procedure preferences saved'),
    () => save('profiles', { work_style: workStyle }, 'Schedule & communication saved', { work_style: workStyle }),
    () => save('profiles', { about }, 'About Me saved', { about }),
  ]

  const workflowRole = inferWorkflowRole(role)

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-xl w-48" />
          <div className="h-4 bg-slate-100 rounded-xl w-80" />
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">My Profile 👤</h2>
        <p className="text-slate-500 text-sm mt-1">
          Set how you like to be addressed, how you like to work, and what teammates should know about you.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="flex items-center gap-2">
            <Users size={15} className="text-slate-400" />
            <span>
              <span className="font-semibold text-slate-700">{followerCount}</span> followers
              {' · '}
              <span className="font-semibold text-slate-700">{followingCount}</span> following
            </span>
          </span>
          {hearts.count > 0 && (
            <span className="flex items-center gap-1.5">
              <span>❤️</span>
              <span className="font-semibold text-slate-700">{hearts.avg.toFixed(1)}</span> from {hearts.count} teammate{hearts.count !== 1 ? 's' : ''}
            </span>
          )}
          {user?.uid && (
            <Link to={`/people/${user.uid}`} className="flex items-center gap-1 text-blue-600 hover:underline">
              View as others see it <ExternalLink size={12} />
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={(e) => {
              setActiveTab(i)
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
            }}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === i
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {TAB_EMOJIS[i]} {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">

        {/* ── Tab 0: Identity ─────────────────────────────────────────────── */}
        {activeTab === 0 && (
          <div className="space-y-8">
            <section className="flex flex-col items-center gap-3 pb-2">
              <div className="relative">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-slate-200 shadow-sm" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white border-2 border-slate-200 shadow-sm">
                    {(storeProfile?.preferred_name ?? user?.email ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-md transition-colors disabled:opacity-60"
                >
                  {photoUploading
                    ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera size={14} className="text-white" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">Tap the camera to update your photo</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">🏥 Organization</p>
                <OrgCombobox value={organization} onChange={setOrganization} />
                <p className="text-xs text-slate-400 mt-1.5">Changed jobs? Pick your new organization any time.</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">🧑‍⚕️ Role</p>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select your role…</option>
                  {PROFILE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">🏷️ Preferred Title</p>
              <RadioGroup options={TITLE_OPTIONS} value={preferredTitle} onChange={setPreferredTitle} />
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">💬 Pronouns</p>
              <RadioGroup options={PRONOUN_OPTIONS} value={pronouns} onChange={setPronouns} />
              {pronouns === 'Other' && (
                <input
                  type="text"
                  value={pronounsOther}
                  onChange={(e) => setPronounsOther(e.target.value)}
                  placeholder="Enter your pronouns"
                  className="mt-3 w-full max-w-xs px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">👀 Profile Visibility</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {VISIBILITY_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVisibility(v.id)}
                    className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                      visibility === v.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${visibility === v.id ? 'text-blue-700' : 'text-slate-700'}`}>{v.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{v.desc}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Read our <Link to="/terms" className="text-blue-600 hover:underline">Terms &amp; Privacy Policy</Link>.
              </p>
            </section>
          </div>
        )}

        {/* ── Tab 1: Work Preferences ──────────────────────────────────────── */}
        {activeTab === 1 && (
          <div className="space-y-4">
            <YesNoList title="💼 Work Preferences" items={WORK_PREFS} values={workPrefs} setValues={setWorkPrefs} />
            {workPrefs.satisfied_admin_time === false && (
              <div className="flex flex-wrap items-center gap-2 px-3 py-3 bg-slate-50 rounded-xl">
                <label className="text-sm text-slate-700">Amount of admin/documentation time preferred per day?</label>
                <input
                  type="number"
                  min={0}
                  max={480}
                  value={adminTimeMin ?? ''}
                  onChange={(e) => setAdminTimeMin(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-24 px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-500">min</span>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: Workspace Comforts ────────────────────────────────────── */}
        {activeTab === 2 && (
          <div className="space-y-6">
            <YesNoList title="☕ Workspace Comforts" items={WORKSPACE_COMFORTS} values={comforts} setValues={setComforts} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">🚗 Vehicle Size</p>
              <RadioGroup options={VEHICLE_OPTIONS} value={vehicleSize} onChange={setVehicleSize} />
            </div>
          </div>
        )}

        {/* ── Tab 3: Desk & Equipment ──────────────────────────────────────── */}
        {activeTab === 3 && (
          <div className="space-y-8">
            <YesNoList title="🗄️ Desk Items" items={DESK_ITEMS} values={deskItems} setValues={setDeskItems} />
            <YesNoList title="🩺 Exam Room Items" items={EXAM_ROOM_ITEMS} values={examItems} setValues={setExamItems} />
          </div>
        )}

        {/* ── Tab 4: Procedures ────────────────────────────────────────────── */}
        {activeTab === 4 && (
          <div className="space-y-8">
            {PROCEDURE_SECTIONS.map((section) => (
              <section key={section.id}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{section.title}</p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 py-3 border-b border-slate-100 last:border-0">
                      <span className="text-sm text-slate-700 leading-snug flex-1 sm:pt-1.5">{item.label}</span>
                      <YesNoOther
                        value={procedures[item.id]}
                        otherLabel={item.otherLabel}
                        onChange={(v) => setProcedures((prev) => ({ ...prev, [item.id]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">📅 Follow-Up After Procedures</p>
              <p className="text-sm text-slate-700 mb-3">When should the patient follow up after a procedure?</p>
              <div className="flex flex-wrap gap-3">
                {FOLLOWUP_WEEK_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={followupWeeks === opt}
                      onChange={(e) => setFollowupWeeks(e.target.checked ? opt : '')}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── Tab 5: Schedule & Communication ─────────────────────────────── */}
        {activeTab === 5 && (
          <div className="space-y-8">
            {workStyleSectionsFor(workflowRole).map((section) => (
              <section key={`${section.title}-${section.roles?.join() ?? 'all'}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                  {section.title}
                  {section.roles && !workflowRole && (
                    <span className="normal-case font-normal"> ({section.roles[0] === 'provider' ? 'providers' : 'nursing'})</span>
                  )}
                </p>
                <div className="divide-y divide-slate-100">
                  {section.items.map((q) => (
                    <QuestionField
                      key={q.id}
                      q={q}
                      answers={workStyle}
                      onChange={(id, v) => setWorkStyle((prev) => ({ ...prev, [id]: v }))}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* ── Tab 6: About Me ──────────────────────────────────────────────── */}
        {activeTab === 6 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">🤝 Teamwork &amp; Personality</p>
            <p className="text-sm text-slate-500 mb-3">Honest answers help teammates understand how you work. These show on your profile.</p>
            <div className="divide-y divide-slate-100">
              {ABOUT_QUESTIONS.map((q) => (
                <QuestionField
                  key={q.id}
                  q={q}
                  answers={about}
                  onChange={(id, v) => setAbout((prev) => ({ ...prev, [id]: v }))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={saveHandlers[activeTab]}
            disabled={saving}
            className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving… ⏳' : `💾 Save ${TABS[activeTab]}`}
          </button>
        </div>
      </div>
    </div>
  )
}
