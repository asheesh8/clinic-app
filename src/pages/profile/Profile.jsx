import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp
} from 'firebase/firestore'
import { CheckCircle, Users } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

// ─── Data ────────────────────────────────────────────────────────────────────

const TITLE_OPTIONS = [
  'Doctor',
  'Nurse',
  'APRN',
  'Nurse Practitioner',
  'PCP',
  'First Name Only',
  'Last Name Only',
  'First + Title',
  'Last + Title',
  'Other',
]

const PRONOUN_OPTIONS = [
  'he/him/his',
  'she/her/hers',
  'they/them/theirs',
  'Other',
]

const WORK_PREFS = [
  { id: 'prefer_same_location',        label: 'Prefer same location daily' },
  { id: 'prefer_same_team_member',     label: 'Prefer same team member daily' },
  { id: 'prefer_designated_desk',      label: 'Prefer designated desk/work area' },
  { id: 'ok_working_late',             label: 'OK working late or past scheduled end time' },
  { id: 'prefer_come_in_early',        label: 'Prefer to come in early' },
  { id: 'satisfied_admin_time',        label: 'Satisfied with current admin/documentation time' },
  { id: 'have_enough_support_staff',   label: 'Have enough support staff' },
  { id: 'ok_discuss_workflow_diffs',   label: 'Do you mind discussing workflow differences with teammates' },
]

const WORKSPACE_COMFORTS = [
  { id: 'ergonomic_desk',              label: 'Ergonomic desk' },
  { id: 'ergonomic_chair',             label: 'Ergonomic chair' },
  { id: 'staff_kitchen_access',        label: 'Staff kitchen access' },
  { id: 'fridge_in_kitchen',           label: 'Fridge in staff kitchen' },
  { id: 'designated_staff_dining',     label: 'Designated staff dining area' },
  { id: 'coffee_tea_machine',          label: 'Coffee/tea machine' },
  { id: 'separate_staff_bathroom',     label: 'Separate staff bathroom' },
  { id: 'designated_staff_parking',    label: 'Designated staff parking' },
]

const VEHICLE_OPTIONS = ['Larger', 'Standard']

const DESK_ITEMS = [
  { id: 'desk_organizer',              label: 'Desk organizer' },
  { id: 'desk_drawer',                 label: 'Drawer' },
  { id: 'stapler',                     label: 'Stapler' },
  { id: 'paperclip_holder',            label: 'Paperclip holder' },
  { id: 'pen_pencil_holder',           label: 'Pen/pencil holder' },
  { id: 'single_monitor',              label: 'Single monitor' },
  { id: 'dual_monitors',               label: 'Dual monitors' },
]

const EXAM_ROOM_ITEMS = [
  { id: 'sink_in_room',                label: 'Sink in room' },
  { id: 'hand_soap',                   label: 'Hand soap' },
  { id: 'hand_sanitizer',              label: 'Hand sanitizer' },
  { id: 'surgical_n95_masks',          label: 'Surgical/N95 masks' },
  { id: 'paper_towels',                label: 'Paper towels' },
  { id: 'standard_exam_table',         label: 'Standard exam table' },
  { id: 'height_adjustable_table',     label: 'Height-adjustable electric table' },
  { id: 'chair_patient_guest',         label: 'Chair for patient/guest' },
  { id: 'desktop_computer',            label: 'Desktop computer' },
  { id: 'laptop',                      label: 'Laptop' },
  { id: 'sphygmomanometer',            label: 'Sphygmomanometer' },
  { id: 'large_bp_cuff',               label: 'Large BP cuff' },
  { id: 'ophthalmoscope',              label: 'Ophthalmoscope' },
  { id: 'otoscope',                    label: 'Otoscope' },
  { id: 'tuning_fork',                 label: 'Tuning fork' },
  { id: 'reflex_hammer',               label: 'Reflex hammer' },
  { id: 'microfilament',               label: 'Microfilament' },
  { id: 'tongue_depressors',           label: 'Tongue depressors' },
  { id: 'assorted_bandaids',           label: 'Assorted bandaids' },
  { id: 'surgical_scissors',           label: 'Surgical scissors' },
  { id: 'forceps',                     label: 'Forceps' },
  { id: 'gauze_4x4',                   label: '4x4 gauze' },
  { id: 'cloth_tape',                  label: 'Cloth tape' },
  { id: 'antibiotic_ointment',         label: 'Antibiotic ointment' },
  { id: 'coban_wrap',                  label: 'Coban wrap' },
  { id: 'isopropyl_alcohol',           label: 'Isopropyl alcohol' },
  { id: 'betadine_swabs',              label: 'Betadine swabs' },
  { id: 'patient_gowns',              label: 'Patient gowns' },
  { id: 'draping_cloths',              label: 'Draping cloths' },
  { id: 'standard_towels',            label: 'Standard towels' },
  { id: 'designated_chaperone',        label: 'Designated chaperone' },
  { id: 'nursing_assist_procedures',   label: 'Nursing assist with procedures' },
]

const TABS = ['Identity', 'Work Preferences', 'Workspace Comforts', 'Desk & Equipment', 'Procedures']

// ─── Procedure defaults ───────────────────────────────────────────────────────
const JOINT_NEEDLE_OPTIONS = ['25g × 1 inch', '25g × 1½ inch', 'Other']
const JOINT_SYRINGE_OPTIONS = ['5cc', '3cc', 'Other']
const TP_SYRINGE_OPTIONS = ['10cc', '5cc', 'Other']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function YesNoToggle({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            value === v
              ? v
                ? 'bg-blue-600 text-white'
                : 'bg-slate-600 text-white'
              : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300'
          }`}
        >
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  )
}

function RadioGroup({ options, value, onChange, name }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            value === opt
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-lg animate-fade-in">
      <CheckCircle size={18} />
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Profile() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab]   = useState(0)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)

  // Identity
  const [preferredTitle, setPreferredTitle]       = useState('')
  const [pronouns, setPronouns]                   = useState('')
  const [pronounsOther, setPronounsOther]         = useState('')

  // Work Preferences
  const [workPrefs, setWorkPrefs] = useState(() =>
    Object.fromEntries(WORK_PREFS.map((p) => [p.id, null]))
  )

  // Workspace Comforts
  const [comforts, setComforts]   = useState(() =>
    Object.fromEntries(WORKSPACE_COMFORTS.map((c) => [c.id, null]))
  )
  const [vehicleSize, setVehicleSize] = useState('')

  // Desk & Equipment
  const [deskItems, setDeskItems]     = useState(() =>
    Object.fromEntries(DESK_ITEMS.map((d) => [d.id, null]))
  )
  const [examItems, setExamItems]     = useState(() =>
    Object.fromEntries(EXAM_ROOM_ITEMS.map((e) => [e.id, null]))
  )

  // Procedures
  const [procJointSyringe, setProcJointSyringe]       = useState('')
  const [procJointSyringeOther, setProcJointSyringeOther] = useState('')
  const [procNeedleOptions, setProcNeedleOptions]     = useState([])
  const [procNeedleOther, setProcNeedleOther]         = useState('')
  const [hipKenalog, setHipKenalog]                   = useState('1ml')
  const [hipBupivacaine, setHipBupivacaine]           = useState('1ml')
  const [shoulderKenalog, setShoulderKenalog]         = useState('1ml')
  const [shoulderBupivacaine, setShoulderBupivacaine] = useState('1ml')
  const [kneeKenalog, setKneeKenalog]                 = useState('1ml')
  const [kneeBupivacaine, setKneeBupivacaine]         = useState('1ml')
  const [tpSyringe, setTpSyringe]                     = useState('')
  const [tpSyringeOther, setTpSyringeOther]           = useState('')
  const [tpKenalog, setTpKenalog]                     = useState('2ml')
  const [tpDexamethasone, setTpDexamethasone]         = useState('2ml')
  const [tpBupivacaine, setTpBupivacaine]             = useState('3ml')

  // Follower / Following counts
  const [followerCount, setFollowerCount]   = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  // ── Load existing data ─────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const uid = user?.uid
      if (!uid) { setLoading(false); return }

      try {
        const [profSnap, prefSnap, followerSnap, followingSnap] = await Promise.all([
          getDoc(doc(db, 'profiles', uid)),
          getDoc(doc(db, 'workspace_preferences', uid)),
          getDocs(query(collection(db, 'follows'), where('following_id', '==', uid))),
          getDocs(query(collection(db, 'follows'), where('follower_id', '==', uid))),
        ])

        setFollowerCount(followerSnap.docs.filter(d => d.data().approved).length)
        setFollowingCount(followingSnap.docs.filter(d => d.data().approved).length)

        if (profSnap.exists()) {
          const d = profSnap.data()
          if (d.preferred_title) setPreferredTitle(d.preferred_title)
          if (d.pronouns) {
            const knownPronoun = PRONOUN_OPTIONS.find((p) => p !== 'Other' && p === d.pronouns)
            if (knownPronoun) {
              setPronouns(knownPronoun)
            } else if (d.pronouns) {
              setPronouns('Other')
              setPronounsOther(d.pronouns)
            }
          }
        }

        if (prefSnap.exists()) {
          const d = prefSnap.data()

          setWorkPrefs((prev) => {
            const next = { ...prev }
            WORK_PREFS.forEach(({ id }) => { if (id in d) next[id] = d[id] })
            return next
          })

          setComforts((prev) => {
            const next = { ...prev }
            WORKSPACE_COMFORTS.forEach(({ id }) => { if (id in d) next[id] = d[id] })
            return next
          })
          if (d.vehicle_size) setVehicleSize(d.vehicle_size)

          setDeskItems((prev) => {
            const next = { ...prev }
            DESK_ITEMS.forEach(({ id }) => { if (id in d) next[id] = d[id] })
            return next
          })
          setExamItems((prev) => {
            const next = { ...prev }
            EXAM_ROOM_ITEMS.forEach(({ id }) => { if (id in d) next[id] = d[id] })
            return next
          })

          // Procedures
          if (d.proc_joint_syringe) setProcJointSyringe(d.proc_joint_syringe)
          if (d.proc_joint_syringe_other) setProcJointSyringeOther(d.proc_joint_syringe_other)
          if (d.proc_needle_options) setProcNeedleOptions(d.proc_needle_options)
          if (d.proc_needle_other) setProcNeedleOther(d.proc_needle_other)
          if (d.hip_kenalog) setHipKenalog(d.hip_kenalog)
          if (d.hip_bupivacaine) setHipBupivacaine(d.hip_bupivacaine)
          if (d.shoulder_kenalog) setShoulderKenalog(d.shoulder_kenalog)
          if (d.shoulder_bupivacaine) setShoulderBupivacaine(d.shoulder_bupivacaine)
          if (d.knee_kenalog) setKneeKenalog(d.knee_kenalog)
          if (d.knee_bupivacaine) setKneeBupivacaine(d.knee_bupivacaine)
          if (d.tp_syringe) setTpSyringe(d.tp_syringe)
          if (d.tp_syringe_other) setTpSyringeOther(d.tp_syringe_other)
          if (d.tp_kenalog) setTpKenalog(d.tp_kenalog)
          if (d.tp_dexamethasone) setTpDexamethasone(d.tp_dexamethasone)
          if (d.tp_bupivacaine) setTpBupivacaine(d.tp_bupivacaine)
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.uid])

  // ── Save handlers ──────────────────────────────────────────────────────────
  async function saveIdentity() {
    const uid = auth.currentUser?.uid
    if (!uid) return
    setSaving(true)
    try {
      const resolvedPronouns = pronouns === 'Other' ? pronounsOther : pronouns
      await setDoc(doc(db, 'profiles', uid), {
        preferred_title: preferredTitle,
        pronouns: resolvedPronouns,
      }, { merge: true })
      setToast('Identity saved')
    } catch (err) {
      console.error(err)
      setToast('Error saving — please try again')
    } finally {
      setSaving(false)
    }
  }

  async function saveWorkPrefs() {
    const uid = auth.currentUser?.uid
    if (!uid) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'workspace_preferences', uid), {
        ...workPrefs,
        updated_at: serverTimestamp(),
      }, { merge: true })
      setToast('Work preferences saved')
    } catch (err) {
      console.error(err)
      setToast('Error saving — please try again')
    } finally {
      setSaving(false)
    }
  }

  async function saveComforts() {
    const uid = auth.currentUser?.uid
    if (!uid) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'workspace_preferences', uid), {
        ...comforts,
        vehicle_size: vehicleSize,
        updated_at: serverTimestamp(),
      }, { merge: true })
      setToast('Workspace comforts saved')
    } catch (err) {
      console.error(err)
      setToast('Error saving — please try again')
    } finally {
      setSaving(false)
    }
  }

  async function saveDeskEquipment() {
    const uid = auth.currentUser?.uid
    if (!uid) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'workspace_preferences', uid), {
        ...deskItems,
        ...examItems,
        updated_at: serverTimestamp(),
      }, { merge: true })
      setToast('Desk & equipment preferences saved')
    } catch (err) {
      console.error(err)
      setToast('Error saving — please try again')
    } finally {
      setSaving(false)
    }
  }

  async function saveProcedures() {
    const uid = auth.currentUser?.uid
    if (!uid) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'workspace_preferences', uid), {
        proc_joint_syringe:       procJointSyringe,
        proc_joint_syringe_other: procJointSyringeOther,
        proc_needle_options:      procNeedleOptions,
        proc_needle_other:        procNeedleOther,
        hip_kenalog:              hipKenalog,
        hip_bupivacaine:          hipBupivacaine,
        shoulder_kenalog:         shoulderKenalog,
        shoulder_bupivacaine:     shoulderBupivacaine,
        knee_kenalog:             kneeKenalog,
        knee_bupivacaine:         kneeBupivacaine,
        tp_syringe:               tpSyringe,
        tp_syringe_other:         tpSyringeOther,
        tp_kenalog:               tpKenalog,
        tp_dexamethasone:         tpDexamethasone,
        tp_bupivacaine:           tpBupivacaine,
        updated_at:               serverTimestamp(),
      }, { merge: true })
      setToast('Procedure preferences saved')
    } catch (err) {
      console.error(err)
      setToast('Error saving — please try again')
    } finally {
      setSaving(false)
    }
  }

  const saveHandlers = [saveIdentity, saveWorkPrefs, saveComforts, saveDeskEquipment, saveProcedures]

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-xl w-48" />
          <div className="h-4 bg-slate-100 rounded-xl w-80" />
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
        <p className="text-slate-500 text-sm mt-1">
          Set how you like to be addressed and your workspace preferences.
        </p>
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <Users size={15} className="text-slate-400" />
          <span>
            <span className="font-semibold text-slate-700">{followerCount}</span> followers
            {' · '}
            <span className="font-semibold text-slate-700">{followingCount}</span> following
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === i
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

        {/* ── Tab 0: Identity ─────────────────────────────────────────────── */}
        {activeTab === 0 && (
          <div className="space-y-8">
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Preferred Title
              </p>
              <RadioGroup
                options={TITLE_OPTIONS}
                value={preferredTitle}
                onChange={setPreferredTitle}
              />
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Pronouns
              </p>
              <RadioGroup
                options={PRONOUN_OPTIONS}
                value={pronouns}
                onChange={setPronouns}
              />
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
          </div>
        )}

        {/* ── Tab 1: Work Preferences ──────────────────────────────────────── */}
        {activeTab === 1 && (
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Work Preferences
            </p>
            {WORK_PREFS.map(({ id, label }) => (
              <div key={id} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-700 leading-snug flex-1">{label}</span>
                <YesNoToggle
                  value={workPrefs[id]}
                  onChange={(v) => setWorkPrefs((prev) => ({ ...prev, [id]: v }))}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Tab 2: Workspace Comforts ────────────────────────────────────── */}
        {activeTab === 2 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
              Workspace Comforts
            </p>
            {WORKSPACE_COMFORTS.map(({ id, label }) => (
              <div key={id} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-700 leading-snug flex-1">{label}</span>
                <YesNoToggle
                  value={comforts[id]}
                  onChange={(v) => setComforts((prev) => ({ ...prev, [id]: v }))}
                />
              </div>
            ))}

            {/* Vehicle size radio */}
            <div className="pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Vehicle Size
              </p>
              <RadioGroup
                options={VEHICLE_OPTIONS}
                value={vehicleSize}
                onChange={setVehicleSize}
              />
            </div>
          </div>
        )}

        {/* ── Tab 3: Desk & Equipment ──────────────────────────────────────── */}
        {activeTab === 3 && (
          <div className="space-y-8">
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
                Desk Items
              </p>
              <div className="space-y-1">
                {DESK_ITEMS.map(({ id, label }) => (
                  <div key={id} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-700 leading-snug flex-1">{label}</span>
                    <YesNoToggle
                      value={deskItems[id]}
                      onChange={(v) => setDeskItems((prev) => ({ ...prev, [id]: v }))}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
                Exam Room Items
              </p>
              <div className="space-y-1">
                {EXAM_ROOM_ITEMS.map(({ id, label }) => (
                  <div key={id} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-700 leading-snug flex-1">{label}</span>
                    <YesNoToggle
                      value={examItems[id]}
                      onChange={(v) => setExamItems((prev) => ({ ...prev, [id]: v }))}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── Tab 4: Procedures ──────────────────────────────────────────── */}
        {activeTab === 4 && (
          <div className="space-y-8">

            {/* Joint Injections — General Setup */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Joint Injections — General Setup
              </p>
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Preferred syringe size for joint injections</p>
                  <RadioGroup
                    options={JOINT_SYRINGE_OPTIONS}
                    value={procJointSyringe}
                    onChange={setProcJointSyringe}
                  />
                  {procJointSyringe === 'Other' && (
                    <input
                      type="text"
                      value={procJointSyringeOther}
                      onChange={(e) => setProcJointSyringeOther(e.target.value)}
                      placeholder="Specify syringe size"
                      className="mt-2 px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Needle gauge/length (select all that apply)</p>
                  <div className="flex flex-wrap gap-2">
                    {JOINT_NEEDLE_OPTIONS.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={procNeedleOptions.includes(opt)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setProcNeedleOptions((prev) => [...prev, opt])
                            } else {
                              setProcNeedleOptions((prev) => prev.filter((o) => o !== opt))
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                          procNeedleOptions.includes(opt)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}>{opt}</span>
                      </label>
                    ))}
                  </div>
                  {procNeedleOptions.includes('Other') && (
                    <input
                      type="text"
                      value={procNeedleOther}
                      onChange={(e) => setProcNeedleOther(e.target.value)}
                      placeholder="Specify needle gauge/length"
                      className="mt-2 px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>
            </section>

            {/* Hip Injection Mixture */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Hip Injection Mixture
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-700 w-48">Kenalog (40mg/ml)</span>
                  <input
                    type="text"
                    value={hipKenalog}
                    onChange={(e) => setHipKenalog(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-700 w-48">Bupivacaine (0.5%)</span>
                  <input
                    type="text"
                    value={hipBupivacaine}
                    onChange={(e) => setHipBupivacaine(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>

            {/* Glenohumeral (Shoulder) Injection Mixture */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Glenohumeral (Shoulder) Injection Mixture
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-700 w-48">Kenalog (40mg/ml)</span>
                  <input
                    type="text"
                    value={shoulderKenalog}
                    onChange={(e) => setShoulderKenalog(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-700 w-48">Bupivacaine (0.5%)</span>
                  <input
                    type="text"
                    value={shoulderBupivacaine}
                    onChange={(e) => setShoulderBupivacaine(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>

            {/* Knee Injection Mixture */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Knee Injection Mixture
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-700 w-48">Kenalog (40mg/ml)</span>
                  <input
                    type="text"
                    value={kneeKenalog}
                    onChange={(e) => setKneeKenalog(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-700 w-48">Bupivacaine (0.5%)</span>
                  <input
                    type="text"
                    value={kneeBupivacaine}
                    onChange={(e) => setKneeBupivacaine(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>

            {/* Trigger Point Injections */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Trigger Point Injections
              </p>
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Preferred syringe size</p>
                  <RadioGroup
                    options={TP_SYRINGE_OPTIONS}
                    value={tpSyringe}
                    onChange={setTpSyringe}
                  />
                  {tpSyringe === 'Other' && (
                    <input
                      type="text"
                      value={tpSyringeOther}
                      onChange={(e) => setTpSyringeOther(e.target.value)}
                      placeholder="Specify syringe size"
                      className="mt-2 px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-700 w-48">Kenalog (40mg/ml)</span>
                    <input
                      type="text"
                      value={tpKenalog}
                      onChange={(e) => setTpKenalog(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-700 w-48">Dexamethasone (10mg/ml)</span>
                    <input
                      type="text"
                      value={tpDexamethasone}
                      onChange={(e) => setTpDexamethasone(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-700 w-48">Bupivacaine (0.5%)</span>
                    <input
                      type="text"
                      value={tpBupivacaine}
                      onChange={(e) => setTpBupivacaine(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </section>

          </div>
        )}

        {/* Save button */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={saveHandlers[activeTab]}
            disabled={saving}
            className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : `Save ${TABS[activeTab]}`}
          </button>
        </div>
      </div>
    </div>
  )
}
