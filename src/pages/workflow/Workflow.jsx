import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { auth, db } from '../../lib/firebase'
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp
} from 'firebase/firestore'
import {
  VISIT_TYPES, ROLES, WORKFLOW_DATA, inferWorkflowRole, parseTiming, totalMinutes, phaseEmoji,
} from '../../lib/workflowData'
import { useAuthStore } from '../../stores/authStore'
import { Toast, YesNo, BulkYesBar } from '../../components/ui/Controls'
import ShareTemplateModal from '../../components/ShareTemplateModal'
import { safe } from '../../lib/people'
import { ChevronLeft, Lock } from 'lucide-react'

const minutesInput = 'w-20 px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500'

function fmtMin(n) {
  return `${Number.isInteger(n) ? n : n.toFixed(1)} min`
}

function numOrNull(v) {
  return v === '' ? null : Number(v)
}

// ─── Step 1 — Visit type picker ───────────────────────────────────────────────
function VisitTypePicker({ onSelect, inferredRole, customWorkflows, onSelectCustom, onShare, myUid }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Workflows 📋</h2>
        <p className="text-slate-500 text-sm mt-1">
          Choose a visit type to set your step-by-step workflow preferences.
        </p>
        {inferredRole && (
          <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            Filling as: {inferredRole === 'nursing' ? '🩹 Nursing' : '🩺 Provider'}
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

      {/* Custom templates */}
      {customWorkflows.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            📝 Custom Templates
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customWorkflows.map((cw) => {
              const mine = cw.created_by === myUid
              return (
                <div
                  key={cw.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectCustom(cw)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onSelectCustom(cw) }}
                  className="relative text-left p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all"
                >
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onShare(cw) }}
                    className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                    title="Send a copy to someone"
                  >
                    📤 Share
                  </button>
                  <span className="text-2xl mb-3 block">📝</span>
                  <span className="font-semibold text-slate-800 text-sm pr-16 block">{cw.name}</span>
                  {cw.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cw.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {mine ? 'Created by you' : `From ${cw.created_by_name || 'a teammate'}`} · Role: {cw.role}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-2">
        <Link
          to="/workflow/custom"
          className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors border border-blue-200 rounded-xl px-4 py-2.5 hover:bg-blue-50"
        >
          🛠️ Build your own template
        </Link>
        <p className="text-xs text-slate-400 text-center max-w-sm">
          Works for any team — clinics, businesses, even roommates or families. Add your own tasks, then share it to compare.
        </p>
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
        <h2 className="text-2xl font-bold text-slate-900">What is your role? 🤔</h2>
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
            <span className="block font-bold text-slate-900 text-lg mb-1">{id === 'nursing' ? '🩹' : '🩺'} {label}</span>
            <span className="text-sm text-slate-500">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step 3 — Questionnaire ───────────────────────────────────────────────────
function Questionnaire({ visitType, role, onBack, customPhases, customWorkflowId, customWorkflowName }) {
  const [answers, setAnswers]       = useState({})
  const [phaseTimes, setPhaseTimes] = useState({})
  const [phaseNotes, setPhaseNotes] = useState({})
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)

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
          if (data.phase_times) setPhaseTimes(data.phase_times)
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

  const setPhaseTime = useCallback((phaseName, field, val) => {
    setPhaseTimes((prev) => ({
      ...prev,
      [phaseName]: { ...(prev[phaseName] ?? {}), [field]: val },
    }))
  }, [])

  const setAllTasks = useCallback((tasks, val) => {
    setAnswers((prev) => {
      const next = { ...prev }
      tasks.forEach((t) => { next[t.id] = { ...(next[t.id] ?? {}), selected: val } })
      return next
    })
  }, [])

  const allTasks = phases.flatMap((p) => p.tasks)
  const total    = totalMinutes(phases, answers, phaseTimes)
  const typical  = phases.reduce((s, p) => s + (parseTiming(p.timing)?.mid ?? 0), 0)

  async function handleSave() {
    if (!uid) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'workflows', docId), {
        user_id:        uid,
        visit_type:     visitType,
        role_in_visit:  role,
        answers,
        phase_times:    phaseTimes,
        phase_notes:    phaseNotes,
        total_time_min: total,
        ...(isCustom ? { custom_workflow_id: customWorkflowId, custom_workflow_name: customWorkflowName } : {}),
        completed:      true,
        updated_at:     serverTimestamp(),
      })
      setToast('Workflow saved successfully! ✅')
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
        <h2 className="text-2xl font-bold text-slate-900">Your Workflow Preferences ✍️</h2>
        <p className="text-slate-500 text-sm mt-1">
          {isCustom
            ? 'Answer Yes or No for each task and how much time you want for it. Your total workflow time is added up at the bottom.'
            : 'Check the typical time for each section, then answer Yes or No for each task.'}
        </p>
      </div>

      <BulkYesBar
        values={Object.fromEntries(allTasks.map((t) => [t.id, answers[t.id]?.selected ?? null]))}
        onSetAll={(v) => setAllTasks(allTasks, v)}
        label="Mark every task Yes"
      />

      <div className="space-y-5 mt-4">
        {phases.map((phase) => {
          const hasTypical = !!parseTiming(phase.timing)
          const pt = phaseTimes[phase.phase] ?? {}
          return (
            <div key={phase.phase} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Phase header + time interval question */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-semibold text-slate-900">{phaseEmoji(phase.phase)} {phase.phase}</h3>
                {hasTypical && (
                  <div className="mt-2 space-y-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                      ⏱️ Typically: {phase.timing}
                    </span>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm text-slate-700">🤔 Do you agree with this time interval?</span>
                      <YesNo value={pt.agree ?? null} onChange={(v) => setPhaseTime(phase.phase, 'agree', v)} />
                    </div>
                    {pt.agree === false && (
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="text-sm text-slate-700">⏳ How much time would you prefer for this section?</label>
                        <input
                          type="number"
                          min={0}
                          max={120}
                          value={pt.preferred_min ?? ''}
                          onChange={(e) => setPhaseTime(phase.phase, 'preferred_min', numOrNull(e.target.value))}
                          placeholder="min"
                          className={minutesInput}
                        />
                        <span className="text-xs text-slate-500">min</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div className="px-6 pt-3">
                {phase.tasks.length > 2 && (
                  <BulkYesBar
                    values={Object.fromEntries(phase.tasks.map((t) => [t.id, answers[t.id]?.selected ?? null]))}
                    onSetAll={(v) => setAllTasks(phase.tasks, v)}
                  />
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {phase.tasks.map((task) => {
                  const ans = answers[task.id] ?? {}
                  return (
                    <div key={task.id} className="px-6 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                        <span className="text-sm text-slate-700 leading-snug flex-1 pt-0.5">{task.label}</span>
                        <YesNo
                          value={ans.selected ?? null}
                          onChange={(v) => setTaskAnswer(task.id, 'selected', v)}
                        />
                      </div>
                      {isCustom && ans.selected === true && (
                        <div className="mt-3 flex items-center gap-2">
                          <label className="text-xs text-slate-500 whitespace-nowrap">⏱️ Time desired (min):</label>
                          <input
                            type="number"
                            min={0}
                            max={480}
                            value={ans.preferred_time_min ?? ''}
                            onChange={(e) => setTaskAnswer(task.id, 'preferred_time_min', numOrNull(e.target.value))}
                            placeholder={task.time_min ? String(task.time_min) : 'e.g. 5'}
                            className={minutesInput}
                          />
                        </div>
                      )}
                      {task.askTimeWhenNo && ans.selected === false && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <label className="text-xs text-slate-500">⏳ How much time would you prefer?</label>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            value={ans.preferred_time_min ?? ''}
                            onChange={(e) => setTaskAnswer(task.id, 'preferred_time_min', numOrNull(e.target.value))}
                            placeholder="min"
                            className={minutesInput}
                          />
                          <span className="text-xs text-slate-500">min</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Phase notes */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">
                  🗒️ Notes for this phase (optional)
                </label>
                <textarea
                  rows={2}
                  value={phaseNotes[phase.phase] ?? ''}
                  onChange={(e) => setPhaseNotes((prev) => ({ ...prev, [phase.phase]: e.target.value }))}
                  placeholder="Any context, preferences, or comments about this phase…"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Total + save */}
      <div className="mt-8 sticky bottom-0 bg-slate-50/95 backdrop-blur py-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="text-lg leading-none">⏱️</span>
          <span>
            Total workflow time: <span className="font-semibold text-slate-900">{total ? fmtMin(total) : '—'}</span>
            {typical > 0 && total !== typical && <span className="text-slate-400"> (typical {fmtMin(typical)})</span>}
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-base"
        >
          {saving ? 'Saving… ⏳' : '💾 Save My Workflow'}
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

/**
 * Templates I can use: my organization's (unless private), ones I made,
 * and ones people shared with me.
 */
async function loadTemplates(uid, profile) {
  const col = collection(db, 'custom_workflows')
  const empty = { docs: [] }
  const queries = [
    safe(getDocs(query(col, where('created_by', '==', uid))), empty),
    safe(getDocs(query(col, where('shared_with', 'array-contains', uid))), empty),
  ]
  if (profile?.organization) queries.push(safe(getDocs(query(col, where('organization', '==', profile.organization))), empty))
  const snaps = await Promise.all(queries)
  const byId = new Map()
  snaps.forEach((snap) => snap.docs.forEach((d) => {
    const data = d.data()
    const visible = data.created_by === uid || data.visibility !== 'private' || (data.shared_with ?? []).includes(uid)
    if (visible) byId.set(d.id, { id: d.id, ...data })
  }))
  return [...byId.values()]
}

export default function Workflow() {
  const { profile }                   = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [step, setStep]               = useState(1)   // 1 | 2 | 3
  const [visitType, setVisitType]     = useState(null)
  const [role, setRole]               = useState(null)
  const [customWorkflows, setCustomWorkflows] = useState([])
  const [selectedCustom, setSelectedCustom]   = useState(null)
  const [sharing, setSharing]         = useState(null)
  const [toast, setToast]             = useState(null)

  const uid = auth.currentUser?.uid

  // Infer workflow role from profile — skip step 2 if unambiguous
  const inferredRole = inferWorkflowRole(profile?.role)

  const handleSelectCustom = useCallback((cw) => {
    setSelectedCustom(cw)
    setVisitType(null)
    const fixedRole = cw.role === 'Nursing' ? 'nursing' : cw.role === 'Provider' ? 'provider' : null
    const r = fixedRole ?? inferredRole
    if (r) {
      setRole(r)
      setStep(3)
    } else {
      setStep(2)
    }
  }, [inferredRole])

  // Deep link: /workflow?custom=<id> opens that template (e.g. right after creating it)
  const customParam = searchParams.get('custom')
  useEffect(() => {
    if (!uid) return
    loadTemplates(uid, profile)
      .then((list) => {
        setCustomWorkflows(list)
        const cw = customParam && list.find((c) => c.id === customParam)
        if (cw) {
          handleSelectCustom(cw)
          setSearchParams({}, { replace: true })
        }
      })
      .catch((err) => console.error('Error loading custom workflows:', err))
  }, [uid, profile, customParam, handleSelectCustom, setSearchParams])

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
    if (inferredRole || selectedCustom) {
      handleBackToVisit()
    } else {
      setStep(2)
      setRole(null)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {step === 1 && (
        <VisitTypePicker
          onSelect={handleSelectVisit}
          inferredRole={inferredRole}
          customWorkflows={customWorkflows}
          onSelectCustom={handleSelectCustom}
          onShare={setSharing}
          myUid={uid}
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
          key={`${selectedCustom?.id ?? visitType}_${role}`}
          visitType={visitType ?? 'custom'}
          role={role}
          onBack={handleBackToRole}
          customPhases={selectedCustom?.phases ?? null}
          customWorkflowId={selectedCustom?.id ?? null}
          customWorkflowName={selectedCustom?.name ?? null}
        />
      )}
      {sharing && (
        <ShareTemplateModal
          template={sharing}
          myUid={uid}
          myProfile={profile}
          onClose={() => setSharing(null)}
          onShared={(ids) => {
            setCustomWorkflows((prev) => prev.map((c) => (
              c.id === sharing.id ? { ...c, shared_with: [...(c.shared_with ?? []), ...ids] } : c
            )))
            setToast(`Shared with ${ids.length} ${ids.length === 1 ? 'person' : 'people'}`)
          }}
        />
      )}
    </div>
  )
}
