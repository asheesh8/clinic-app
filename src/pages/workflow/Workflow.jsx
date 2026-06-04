import { useState, useEffect, useCallback } from 'react'
import { auth, db } from '../../lib/firebase'
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp
} from 'firebase/firestore'
import { VISIT_TYPES, ROLES, WORKFLOW_DATA, inferWorkflowRole } from '../../lib/workflowData'
import { useAuthStore } from '../../stores/authStore'
import { CheckCircle, ChevronLeft, Clock, Lock, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-lg">
      <CheckCircle size={18} />
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

// ─── Yes / No toggle ──────────────────────────────────────────────────────────
function YesNo({ value, onChange }) {
  return (
    <div className="flex gap-2 shrink-0">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(value === v ? null : v)}
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

// ─── Step 1 — Visit type picker ───────────────────────────────────────────────
function VisitTypePicker({ onSelect, inferredRole, customWorkflows, onSelectCustom }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Workflows</h2>
        <p className="text-slate-500 text-sm mt-1">
          Choose a visit type to set your step-by-step workflow preferences.
        </p>
        {inferredRole && (
          <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            Filling as: {inferredRole === 'nursing' ? 'Nursing' : 'Provider'}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {VISIT_TYPES.map(({ id, label, emoji, available }) => (
          <button
            key={id}
            type="button"
            disabled={!available}
            onClick={() => available && onSelect(id)}
            className={`relative text-left p-5 rounded-2xl border transition-all ${
              available
                ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                : 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60'
            }`}
          >
            {!available && (
              <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                <Lock size={10} /> Coming Soon
              </span>
            )}
            <span className="text-2xl mb-3 block">{emoji}</span>
            <span className="font-semibold text-slate-800 text-sm">{label}</span>
          </button>
        ))}
      </div>

      {/* Custom workflows */}
      {customWorkflows && customWorkflows.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Custom Workflows (Your Organization)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customWorkflows.map((cw) => (
              <button
                key={cw.id}
                type="button"
                onClick={() => onSelectCustom(cw)}
                className="relative text-left p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all"
              >
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  Custom
                </span>
                <span className="text-2xl mb-3 block">📝</span>
                <span className="font-semibold text-slate-800 text-sm">{cw.name}</span>
                {cw.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cw.description}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">Role: {cw.role}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload custom workflow link */}
      <div className="mt-8 flex justify-center">
        <Link
          to="/workflow/custom"
          className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors border border-blue-200 rounded-xl px-4 py-2.5 hover:bg-blue-50"
        >
          <Plus size={15} /> Upload custom workflow
        </Link>
      </div>
    </div>
  )
}

// ─── Step 2 — Role picker ─────────────────────────────────────────────────────
function RolePicker({ visitType, onSelect, onBack }) {
  const visitLabel = VISIT_TYPES.find((v) => v.id === visitType)?.label ?? visitType
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors"
      >
        <ChevronLeft size={16} /> Back
      </button>
      <div className="mb-6">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">{visitLabel}</p>
        <h2 className="text-2xl font-bold text-slate-900">What is your role?</h2>
        <p className="text-slate-500 text-sm mt-1">
          Select your role in this visit — you will answer the questionnaire for that perspective.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ROLES.map(({ id, label, desc }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="text-left p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <span className="block font-bold text-slate-900 text-lg mb-1">{label}</span>
            <span className="text-sm text-slate-500">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step 3 — Questionnaire ───────────────────────────────────────────────────
function Questionnaire({ visitType, role, onBack, customPhases, customWorkflowId, customWorkflowName }) {
  const [answers, setAnswers]     = useState({})
  const [phaseNotes, setPhaseNotes] = useState({})
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState(null)

  const isCustom   = !!customPhases
  const visitLabel = customWorkflowName ?? VISIT_TYPES.find((v) => v.id === visitType)?.label ?? visitType
  const roleLabel  = ROLES.find((r) => r.id === role)?.label ?? role
  const phases     = isCustom ? customPhases : (WORKFLOW_DATA[visitType]?.[role] ?? [])
  const uid        = auth.currentUser?.uid
  const docId      = isCustom
    ? `${uid}_custom_${customWorkflowId}_${role}`
    : `${uid}_${visitType}_${role}`

  // Load saved workflow
  useEffect(() => {
    async function load() {
      if (!uid) { setLoading(false); return }
      try {
        const snap = await getDoc(doc(db, 'workflows', docId))
        if (snap.exists()) {
          const data = snap.data()
          if (data.answers)     setAnswers(data.answers)
          if (data.phase_notes) setPhaseNotes(data.phase_notes)
        }
      } catch (err) {
        console.error('Error loading workflow:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [docId, uid])

  const setTaskAnswer = useCallback((taskId, field, val) => {
    setAnswers((prev) => ({
      ...prev,
      [taskId]: { ...(prev[taskId] ?? {}), [field]: val },
    }))
  }, [])

  async function handleSave() {
    if (!uid) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'workflows', docId), {
        user_id:       uid,
        visit_type:    visitType,
        role_in_visit: role,
        answers,
        phase_notes:   phaseNotes,
        completed:     true,
        updated_at:    serverTimestamp(),
      })
      setToast('Workflow saved successfully!')
    } catch (err) {
      console.error(err)
      setToast('Error saving — please try again')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded-xl w-56" />
        <div className="h-48 bg-slate-100 rounded-2xl" />
      </div>
    )
  }

  return (
    <div>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors"
      >
        <ChevronLeft size={16} /> Back
      </button>

      <div className="mb-6">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
          {visitLabel} · {roleLabel}
        </p>
        <h2 className="text-2xl font-bold text-slate-900">Your Workflow Preferences</h2>
        <p className="text-slate-500 text-sm mt-1">
          For each task, indicate whether you currently do it. "Yes" answers unlock optional timing preferences.
        </p>
      </div>

      <div className="space-y-5">
        {phases.map((phase) => (
          <div
            key={phase.phase}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            {/* Phase header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50">
              <div>
                <h3 className="font-semibold text-slate-900">{phase.phase}</h3>
                {phase.timing && (
                  <span className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                    <Clock size={11} /> Typical: {phase.timing}
                  </span>
                )}
              </div>
            </div>

            {/* Tasks */}
            <div className="divide-y divide-slate-100">
              {phase.tasks.map((task) => {
                const ans = answers[task.id] ?? {}
                return (
                  <div key={task.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-slate-700 leading-snug flex-1 pt-0.5">
                        {task.label}
                      </span>
                      <YesNo
                        value={ans.selected ?? null}
                        onChange={(v) => setTaskAnswer(task.id, 'selected', v)}
                      />
                    </div>
                    {/* Preferred time shown when Yes selected and phase has timing */}
                    {ans.selected === true && phase.hasTime && (
                      <div className="mt-3 flex items-center gap-2">
                        <label className="text-xs text-slate-500 whitespace-nowrap">
                          Preferred time (min):
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={ans.preferred_time_min ?? ''}
                          onChange={(e) =>
                            setTaskAnswer(task.id, 'preferred_time_min', e.target.value === '' ? null : Number(e.target.value))
                          }
                          placeholder="e.g. 3"
                          className="w-20 px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Phase notes */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">
                Notes for this phase (optional)
              </label>
              <textarea
                rows={2}
                value={phaseNotes[phase.phase] ?? ''}
                onChange={(e) =>
                  setPhaseNotes((prev) => ({ ...prev, [phase.phase]: e.target.value }))
                }
                placeholder="Any context, preferences, or comments about this phase…"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-base"
        >
          {saving ? 'Saving…' : 'Save My Workflow'}
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Workflow() {
  const { profile }                   = useAuthStore()
  const [step, setStep]               = useState(1)   // 1 | 2 | 3
  const [visitType, setVisitType]     = useState(null)
  const [role, setRole]               = useState(null)
  const [customWorkflows, setCustomWorkflows] = useState([])
  const [selectedCustom, setSelectedCustom]  = useState(null) // custom workflow doc

  const uid = auth.currentUser?.uid

  // Infer workflow role from profile — skip step 2 if unambiguous
  const inferredRole = inferWorkflowRole(profile?.role)

  // Load custom workflows for this org
  useEffect(() => {
    async function loadCustom() {
      if (!uid || !profile?.organization) return
      try {
        const q = query(
          collection(db, 'custom_workflows'),
          where('organization', '==', profile.organization)
        )
        const snap = await getDocs(q)
        setCustomWorkflows(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error('Error loading custom workflows:', err)
      }
    }
    loadCustom()
  }, [uid, profile?.organization])

  function handleSelectVisit(id) {
    setSelectedCustom(null)
    setVisitType(id)
    if (inferredRole) {
      setRole(inferredRole)
      setStep(3)
    } else {
      setStep(2)
    }
  }

  function handleSelectCustom(cw) {
    setSelectedCustom(cw)
    setVisitType(null)
    // Determine role from custom workflow
    if (cw.role === 'Nursing') {
      setRole('nursing')
      setStep(3)
    } else if (cw.role === 'Provider') {
      setRole('provider')
      setStep(3)
    } else if (inferredRole) {
      setRole(inferredRole)
      setStep(3)
    } else {
      setStep(2)
    }
  }

  function handleSelectRole(id) {
    setRole(id)
    setStep(3)
  }

  function handleBackToVisit() {
    setStep(1)
    setVisitType(null)
    setRole(null)
    setSelectedCustom(null)
  }

  function handleBackToRole() {
    if (inferredRole) {
      handleBackToVisit()
    } else {
      setStep(2)
      setRole(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {step === 1 && (
        <VisitTypePicker
          onSelect={handleSelectVisit}
          inferredRole={inferredRole}
          customWorkflows={customWorkflows}
          onSelectCustom={handleSelectCustom}
        />
      )}
      {step === 2 && (
        <RolePicker
          visitType={selectedCustom?.name ?? visitType}
          onSelect={handleSelectRole}
          onBack={handleBackToVisit}
        />
      )}
      {step === 3 && role && (
        <Questionnaire
          visitType={visitType ?? 'custom'}
          role={role}
          inferredRole={inferredRole}
          onBack={handleBackToRole}
          customPhases={selectedCustom?.phases ?? null}
          customWorkflowId={selectedCustom?.id ?? null}
          customWorkflowName={selectedCustom?.name ?? null}
        />
      )}
    </div>
  )
}
