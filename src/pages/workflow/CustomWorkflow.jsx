import { useState } from 'react'
import { auth, db } from '../../lib/firebase'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '../../stores/authStore'
import { orgKeyOf } from '../../lib/people'
import { Toast } from '../../components/ui/Controls'
import ShareTemplateModal from '../../components/ShareTemplateModal'
import { CheckCircle, Trash2, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const ROLES = ['Nursing', 'Provider', 'Both']

const VISIBILITY = [
  { id: 'org',     label: 'My organization', desc: 'Everyone in your organization can use it' },
  { id: 'private', label: 'Only people I share with', desc: 'Private until you send someone a copy' },
]

function emptyTask() {
  return { label: '', time: '' }
}

function emptyPhase() {
  return { name: '', tasks: [emptyTask()] }
}

export default function CustomWorkflow() {
  const { profile } = useAuthStore()
  const uid = auth.currentUser?.uid

  const [name, setName]             = useState('')
  const [description, setDescription] = useState('')
  const [role, setRole]             = useState('Both')
  const [visibility, setVisibility] = useState('org')
  const [phases, setPhases]         = useState([emptyPhase()])
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)
  const [created, setCreated]       = useState(null)   // the saved template
  const [sharing, setSharing]       = useState(false)

  function addPhase() {
    setPhases((prev) => [...prev, emptyPhase()])
  }

  function removePhase(pIdx) {
    setPhases((prev) => prev.filter((_, i) => i !== pIdx))
  }

  function updatePhaseName(pIdx, val) {
    setPhases((prev) => {
      const next = [...prev]
      next[pIdx] = { ...next[pIdx], name: val }
      return next
    })
  }

  function addTask(pIdx) {
    setPhases((prev) => {
      const next = [...prev]
      next[pIdx] = { ...next[pIdx], tasks: [...next[pIdx].tasks, emptyTask()] }
      return next
    })
  }

  function updateTask(pIdx, tIdx, field, val) {
    setPhases((prev) => {
      const next = [...prev]
      const tasks = [...next[pIdx].tasks]
      tasks[tIdx] = { ...tasks[tIdx], [field]: val }
      next[pIdx] = { ...next[pIdx], tasks }
      return next
    })
  }

  function removeTask(pIdx, tIdx) {
    setPhases((prev) => {
      const next = [...prev]
      const tasks = next[pIdx].tasks.filter((_, i) => i !== tIdx)
      next[pIdx] = { ...next[pIdx], tasks }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setToast('Please enter a workflow name.'); return }
    if (!uid) return
    setSaving(true)
    try {
      const myOrg = profile?.organization ?? ''
      const myName = profile?.preferred_name ?? ''

      const builtPhases = phases
        .map((p, pIdx) => ({
          phase: p.name.trim() || (phases.length === 1 ? 'Tasks' : `Section ${pIdx + 1}`),
          timing: null,
          tasks: p.tasks
            .filter((t) => t.label.trim())
            .map((t, tIdx) => ({
              id:    `custom_${pIdx}_${tIdx}`,
              label: t.label.trim(),
              ...(t.time !== '' ? { time_min: Number(t.time) } : {}),
            })),
        }))
        .filter((p) => p.tasks.length > 0)

      if (builtPhases.length === 0) {
        setToast('Add at least one task.')
        setSaving(false)
        return
      }

      const template = {
        name:              name.trim(),
        description:       description.trim(),
        role,
        visibility,
        organization:      myOrg,
        org_key:           orgKeyOf(profile),
        created_by:        uid,
        created_by_name:   myName,
        shared_with:       [],
        phases:            builtPhases,
      }
      const ref = await addDoc(collection(db, 'custom_workflows'), { ...template, created_at: serverTimestamp() })

      setCreated({ id: ref.id, ...template })
      // Reset form
      setName('')
      setDescription('')
      setRole('Both')
      setVisibility('org')
      setPhases([emptyPhase()])
    } catch (err) {
      console.error(err)
      setToast('Error saving — please try again')
    } finally {
      setSaving(false)
    }
  }

  const totalTime = phases.reduce(
    (sum, p) => sum + p.tasks.reduce((t, task) => t + (task.label.trim() && task.time !== '' ? Number(task.time) : 0), 0),
    0,
  )

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Back link */}
      <Link
        to="/workflow"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors w-fit"
      >
        <ChevronLeft size={16} /> Back to Workflows
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">🛠️ Build a Workflow Template</h2>
        <p className="text-slate-500 text-sm mt-1">
          Add as many tasks as you want, with the time each one usually takes. Then fill it out yourself and send a copy
          to someone — once they fill it out too, FlowSync shows your similarity percentage. Works for any team, not just clinics.
        </p>
      </div>

      {created && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-800">🎉 "{created.name}" saved!</p>
              <p className="text-sm text-emerald-700 mt-0.5">Next: fill it out with your own answers, then share it.</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link
                  to={`/workflow?custom=${created.id}`}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  ✍️ Fill it out now
                </Link>
                <button
                  type="button"
                  onClick={() => setSharing(true)}
                  className="flex items-center gap-1.5 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  📤 Send a copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 block mb-2">
              Template Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Post-Op Follow-Up Visit, Opening Shift, House Chores"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 block mb-2">
              Description (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of when this workflow is used…"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 block mb-2">
              Role
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    role === r
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 block mb-2">
              Who can use it
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VISIBILITY.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVisibility(v.id)}
                  className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                    visibility === v.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <p className={`text-sm font-semibold ${visibility === v.id ? 'text-blue-700' : 'text-slate-700'}`}>{v.label}</p>
                  <p className="text-xs text-slate-400">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {phases.map((phase, pIdx) => (
            <div key={pIdx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 block mb-1.5">
                    Section {pIdx + 1} name {phases.length === 1 && <span className="normal-case font-normal">(optional)</span>}
                  </label>
                  <input
                    type="text"
                    value={phase.name}
                    onChange={(e) => updatePhaseName(pIdx, e.target.value)}
                    placeholder="e.g. Before the Patient Enters"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {phases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhase(pIdx)}
                    className="mt-5 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                    title="Remove section"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <label className="flex-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tasks</label>
                  <label className="w-24 text-xs font-semibold uppercase tracking-wide text-slate-400">Time (min)</label>
                  {phase.tasks.length > 1 && <span className="w-8" />}
                </div>
                {phase.tasks.map((task, tIdx) => (
                  <div key={tIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={task.label}
                      onChange={(e) => updateTask(pIdx, tIdx, 'label', e.target.value)}
                      placeholder={`Task ${tIdx + 1}…`}
                      className="flex-1 min-w-0 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                    <input
                      type="number"
                      min={0}
                      max={480}
                      value={task.time}
                      onChange={(e) => updateTask(pIdx, tIdx, 'time', e.target.value)}
                      placeholder="—"
                      className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                    {phase.tasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTask(pIdx, tIdx)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                        title="Remove task"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addTask(pIdx)}
                className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:text-blue-700 transition-colors"
              >
                ➕ Add task
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addPhase}
            className="w-full border border-blue-300 bg-white hover:bg-blue-50 text-blue-600 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
          >
            ➕ Add Section
          </button>
        </div>

        {/* Total + submit */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-sm text-slate-600">
            ⏱️ Total time for workflow: <span className="font-semibold text-slate-900">{totalTime ? `${totalTime} min` : '—'}</span>
          </p>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving… ⏳' : '💾 Save Template'}
          </button>
        </div>
      </form>

      {sharing && created && (
        <ShareTemplateModal
          template={created}
          myUid={uid}
          myProfile={profile}
          onClose={() => setSharing(false)}
          onShared={(ids) => {
            setCreated((c) => ({ ...c, shared_with: [...(c.shared_with ?? []), ...ids] }))
            setToast(`Sent to ${ids.length} ${ids.length === 1 ? 'person' : 'people'}`)
          }}
        />
      )}
    </div>
  )
}
