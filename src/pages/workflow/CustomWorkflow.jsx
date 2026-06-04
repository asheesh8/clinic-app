import { useState, useEffect } from 'react'
import { auth, db } from '../../lib/firebase'
import {
  doc, getDoc, addDoc, collection, serverTimestamp
} from 'firebase/firestore'
import { useAuthStore } from '../../stores/authStore'
import { CheckCircle, Plus, Trash2, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

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

const ROLES = ['Nursing', 'Provider', 'Both']

function emptyPhase() {
  return { name: '', tasks: [''] }
}

export default function CustomWorkflow() {
  const { profile } = useAuthStore()
  const uid = auth.currentUser?.uid

  const [name, setName]             = useState('')
  const [description, setDescription] = useState('')
  const [role, setRole]             = useState('Both')
  const [phases, setPhases]         = useState([emptyPhase()])
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)
  const [success, setSuccess]       = useState(false)

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
      next[pIdx] = { ...next[pIdx], tasks: [...next[pIdx].tasks, ''] }
      return next
    })
  }

  function updateTask(pIdx, tIdx, val) {
    setPhases((prev) => {
      const next = [...prev]
      const tasks = [...next[pIdx].tasks]
      tasks[tIdx] = val
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
        .filter((p) => p.name.trim())
        .map((p, pIdx) => ({
          phase: p.name.trim(),
          tasks: p.tasks
            .filter((t) => t.trim())
            .map((t, tIdx) => ({
              id:    `custom_${pIdx}_${tIdx}`,
              label: t.trim(),
            })),
        }))

      await addDoc(collection(db, 'custom_workflows'), {
        name:              name.trim(),
        description:       description.trim(),
        role,
        organization:      myOrg,
        created_by:        uid,
        created_by_name:   myName,
        phases:            builtPhases,
        created_at:        serverTimestamp(),
      })

      setSuccess(true)
      // Reset form
      setName('')
      setDescription('')
      setRole('Both')
      setPhases([emptyPhase()])
    } catch (err) {
      console.error(err)
      setToast('Error saving — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
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
        <h2 className="text-2xl font-bold text-slate-900">Create Custom Workflow</h2>
        <p className="text-slate-500 text-sm mt-1">
          Build a custom workflow template for your organization. It will appear in your team's workflow list.
        </p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4 mb-6 flex items-start gap-3">
          <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-800">Workflow submitted!</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              It will now appear in your team's workflow list.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Workflow name */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 block mb-2">
              Workflow Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Post-Op Follow-Up Visit"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 block mb-2">
              Description (optional)
            </label>
            <textarea
              rows={3}
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
        </div>

        {/* Phases */}
        <div className="space-y-4">
          {phases.map((phase, pIdx) => (
            <div key={pIdx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 block mb-1.5">
                    Phase {pIdx + 1} Name
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
                    title="Remove phase"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-2 mb-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 block">
                  Tasks
                </label>
                {phase.tasks.map((task, tIdx) => (
                  <div key={tIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={task}
                      onChange={(e) => updateTask(pIdx, tIdx, e.target.value)}
                      placeholder={`Task ${tIdx + 1}…`}
                      className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
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
                <Plus size={14} /> Add task
              </button>
            </div>
          ))}

          {/* Add phase button */}
          <button
            type="button"
            onClick={addPhase}
            className="w-full border border-blue-300 bg-white hover:bg-blue-50 text-blue-600 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <Plus size={16} /> Add Phase
          </button>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Submitting…' : 'Submit Workflow'}
          </button>
        </div>
      </form>
    </div>
  )
}
