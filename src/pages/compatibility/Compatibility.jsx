import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../lib/firebase'
import {
  collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp
} from 'firebase/firestore'
import { VISIT_TYPES, WORKFLOW_DATA } from '../../lib/workflowData'
import { Search, ChevronDown, ChevronUp, Users, CheckCircle, XCircle, User, UserPlus, MessageSquare } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(pct) {
  if (pct >= 75) return { ring: 'ring-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', circle: 'text-emerald-600' }
  if (pct >= 50) return { ring: 'ring-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   circle: 'text-amber-600' }
  return             { ring: 'ring-red-400',        bg: 'bg-red-50',     text: 'text-red-700',     circle: 'text-red-600' }
}

/**
 * Compute % agreement between two answer maps.
 * A task counts if both users have answered (non-null selected).
 * Agreement = both selected true OR both selected false.
 */
function computeScore(myAnswers, theirAnswers) {
  const myKeys    = Object.keys(myAnswers   ?? {}).filter((k) => myAnswers[k]?.selected !== null && myAnswers[k]?.selected !== undefined)
  const theirKeys = new Set(
    Object.keys(theirAnswers ?? {}).filter((k) => theirAnswers[k]?.selected !== null && theirAnswers[k]?.selected !== undefined)
  )
  const shared = myKeys.filter((k) => theirKeys.has(k))
  if (shared.length === 0) return { score: null, total: 0, matched: 0, tasks: [] }
  let matched = 0
  const tasks = shared.map((k) => {
    const agree = myAnswers[k].selected === theirAnswers[k].selected
    if (agree) matched++
    return { id: k, myVal: myAnswers[k].selected, theirVal: theirAnswers[k].selected, agree }
  })
  return {
    score:   Math.round((matched / shared.length) * 100),
    total:   shared.length,
    matched,
    tasks,
  }
}

// For a given visit type + role, get a label for a task id
function taskLabel(visitType, role, taskId) {
  const phases = WORKFLOW_DATA[visitType]?.[role] ?? []
  for (const phase of phases) {
    const t = phase.tasks.find((t) => t.id === taskId)
    if (t) return { label: t.label, phase: phase.phase }
  }
  return { label: taskId, phase: '' }
}

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

// ─── Score card ───────────────────────────────────────────────────────────────
function ScoreCard({ visitType, myDoc, theirDoc, theirName, theirUid }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)
  const [showAgreed, setShowAgreed] = useState(false)
  const visitLabel = VISIT_TYPES.find((v) => v.id === visitType)?.label ?? visitType

  // Try all meaningful role combos — cross-role first (the main use case),
  // then same-role. Only include combos where both users have data.
  const combos = [
    { myRole: 'nursing',  theirRole: 'provider', label: 'Nursing ↔ Provider' },
    { myRole: 'provider', theirRole: 'nursing',  label: 'Provider ↔ Nursing' },
    { myRole: 'nursing',  theirRole: 'nursing',  label: 'Nursing ↔ Nursing'  },
    { myRole: 'provider', theirRole: 'provider', label: 'Provider ↔ Provider' },
  ]

  const results = combos
    .map(({ myRole, theirRole, label }) => {
      const myAnswers    = myDoc?.[`${visitType}_${myRole}`]?.answers
      const theirAnswers = theirDoc?.[`${visitType}_${theirRole}`]?.answers
      if (!myAnswers || !theirAnswers) return null
      const { score, total, matched, tasks } = computeScore(myAnswers, theirAnswers)
      if (score === null) return null
      return { myRole, theirRole, label, score, total, matched, tasks }
    })
    .filter(Boolean)

  if (results.length === 0) return null

  async function saveAgreedWorkflow(result) {
    const uid = auth.currentUser?.uid
    if (!uid || !theirUid) return
    setSaving(true)
    try {
      const agreedTasks = {}
      result.tasks
        .filter((t) => t.agree)
        .forEach((t) => {
          const { label } = taskLabel(visitType, result.myRole, t.id)
          agreedTasks[t.id] = { selected: t.myVal, label }
        })
      const docId = `${uid}_${theirUid}_${visitType}`
      await setDoc(doc(db, 'compatibility_scores', docId), {
        user_a:           uid,
        user_b:           theirUid,
        visit_type:       visitType,
        score_pct:        result.score,
        agreed_workflow:  agreedTasks,
        computed_at:      serverTimestamp(),
      }, { merge: true })
      setToast('Agreed workflow saved!')
      setShowAgreed(true)
    } catch (err) {
      console.error(err)
      setToast('Error saving — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      <div className="px-6 py-5 flex items-center gap-5">
        {/* Score circles */}
        <div className="flex gap-3">
          {results.map(({ label, score }) => {
            const c = scoreColor(score)
            return (
              <div key={label} className={`w-16 h-16 rounded-full ring-4 ${c.ring} ${c.bg} flex flex-col items-center justify-center shrink-0`}>
                <span className={`text-xl font-bold leading-none ${c.circle}`}>{score}%</span>
              </div>
            )
          })}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{visitLabel}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {results.map((r) => `${r.matched}/${r.total} tasks agree · ${r.label}`).join(' · ')}
          </p>
        </div>

        {/* Toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors shrink-0"
        >
          {open ? 'Hide' : 'View'} breakdown
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* Breakdown table */}
      {open && results.map((result) => {
        const { myRole, label, tasks, score } = result
        // Group tasks by phase for agreed workflow view
        const agreedByPhase = {}
        tasks.filter((t) => t.agree).forEach((t) => {
          const { label: tLabel, phase } = taskLabel(visitType, myRole, t.id)
          if (!agreedByPhase[phase]) agreedByPhase[phase] = []
          agreedByPhase[phase].push(tLabel)
        })

        return (
          <div key={label} className="border-t border-slate-100">
            <div className="px-6 py-3 bg-slate-50">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label} breakdown
              </p>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {tasks.map(({ id, myVal, theirVal, agree }) => {
                const { label: tLabel, phase } = taskLabel(visitType, myRole, id)
                return (
                  <div key={id} className="px-6 py-3 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {phase && (
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{phase}</p>
                      )}
                      <p className="text-sm text-slate-700 leading-snug">{tLabel}</p>
                    </div>
                    {/* You */}
                    <div className="flex flex-col items-center gap-0.5 w-12 shrink-0">
                      <span className="text-[9px] font-semibold text-slate-400 uppercase">You</span>
                      {myVal === true
                        ? <CheckCircle size={16} className="text-emerald-500" />
                        : <XCircle size={16} className="text-slate-300" />
                      }
                    </div>
                    {/* Them */}
                    <div className="flex flex-col items-center gap-0.5 w-12 shrink-0">
                      <span className="text-[9px] font-semibold text-slate-400 uppercase truncate max-w-full">{theirName?.split(' ')[0] ?? 'Them'}</span>
                      {theirVal === true
                        ? <CheckCircle size={16} className="text-emerald-500" />
                        : <XCircle size={16} className="text-slate-300" />
                      }
                    </div>
                    {/* Agreement */}
                    <div className="w-5 shrink-0 flex items-center justify-center pt-3.5">
                      {agree
                        ? <span className="text-emerald-500 text-lg leading-none">✓</span>
                        : <span className="text-red-400 text-lg leading-none">✗</span>
                      }
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Save Agreed Workflow */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center gap-3">
              <button
                onClick={() => saveAgreedWorkflow(result)}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving…' : 'Save Agreed Workflow'}
              </button>
              {Object.keys(agreedByPhase).length > 0 && (
                <button
                  onClick={() => setShowAgreed((s) => !s)}
                  className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 rounded-xl text-sm transition-colors"
                >
                  {showAgreed ? 'Hide' : 'View'} Agreed Workflow
                </button>
              )}
            </div>

            {/* Agreed workflow list */}
            {showAgreed && Object.keys(agreedByPhase).length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 space-y-4">
                {Object.entries(agreedByPhase).map(([phase, taskLabels]) => (
                  <div key={phase}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{phase}</p>
                    <ul className="space-y-1">
                      {taskLabels.map((tl, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-emerald-500 shrink-0">✅</span>
                          <span>{tl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Compatibility() {
  const navigate = useNavigate()
  const [teammates, setTeammates]       = useState([])
  const [loadingTeam, setLoadingTeam]   = useState(true)
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState(null)   // teammate profile doc
  const [myWorkflows, setMyWorkflows]   = useState({})
  const [theirWorkflows, setTheirWorkflows] = useState({})
  const [loadingScore, setLoadingScore] = useState(false)
  const [followStatuses, setFollowStatuses] = useState({}) // uid → 'following'|'pending'|null

  const uid          = auth.currentUser?.uid
  const currentUser  = auth.currentUser

  // Load teammates from the same organization
  useEffect(() => {
    async function loadTeammates() {
      if (!uid) { setLoadingTeam(false); return }
      try {
        // Get current user's organization
        const myProfileSnap = await getDoc(doc(db, 'profiles', uid))
        const myOrg = myProfileSnap.data()?.organization

        if (!myOrg) {
          setLoadingTeam(false)
          return
        }

        const [orgSnap, followSnap] = await Promise.all([
          getDocs(query(collection(db, 'profiles'), where('organization', '==', myOrg))),
          getDocs(query(collection(db, 'follows'), where('follower_id', '==', uid))),
        ])

        const list = orgSnap.docs
          .filter((d) => d.id !== uid)
          .map((d) => ({ uid: d.id, ...d.data() }))
        setTeammates(list)

        const statuses = {}
        followSnap.docs.forEach((d) => {
          const data = d.data()
          statuses[data.following_id] = data.approved ? 'following' : 'pending'
        })
        setFollowStatuses(statuses)
      } catch (err) {
        console.error('Error loading teammates:', err)
      } finally {
        setLoadingTeam(false)
      }
    }
    loadTeammates()
  }, [uid])

  async function handleFollow(teammateUid) {
    if (!uid) return
    const docId = `${uid}_${teammateUid}`
    await setDoc(doc(db, 'follows', docId), {
      follower_id:  uid,
      following_id: teammateUid,
      approved:     false,
      created_at:   serverTimestamp(),
    })
    setFollowStatuses((prev) => ({ ...prev, [teammateUid]: 'pending' }))
  }

  // Load my workflows (all of them) once
  useEffect(() => {
    async function loadMyWorkflows() {
      if (!uid) return
      try {
        const visitTypes = VISIT_TYPES.filter((v) => v.available).map((v) => v.id)
        const roles      = ['nursing', 'provider']
        const results    = {}
        await Promise.all(
          visitTypes.flatMap((vt) =>
            roles.map(async (role) => {
              const docId   = `${uid}_${vt}_${role}`
              const snap    = await getDoc(doc(db, 'workflows', docId))
              if (snap.exists() && snap.data().completed) {
                results[`${vt}_${role}`] = snap.data()
              }
            })
          )
        )
        setMyWorkflows(results)
      } catch (err) {
        console.error('Error loading my workflows:', err)
      }
    }
    loadMyWorkflows()
  }, [uid])

  // Load selected teammate's workflows
  const loadTheirWorkflows = useCallback(async (teammate) => {
    setLoadingScore(true)
    setTheirWorkflows({})
    try {
      const visitTypes = VISIT_TYPES.filter((v) => v.available).map((v) => v.id)
      const roles      = ['nursing', 'provider']
      const results    = {}
      await Promise.all(
        visitTypes.flatMap((vt) =>
          roles.map(async (role) => {
            const docId = `${teammate.uid}_${vt}_${role}`
            const snap  = await getDoc(doc(db, 'workflows', docId))
            if (snap.exists() && snap.data().completed) {
              results[`${vt}_${role}`] = snap.data()
            }
          })
        )
      )
      setTheirWorkflows(results)
    } catch (err) {
      console.error('Error loading teammate workflows:', err)
    } finally {
      setLoadingScore(false)
    }
  }, [])

  function handleSelectTeammate(teammate) {
    setSelected(teammate)
    loadTheirWorkflows(teammate)
  }

  // Determine which visit types have data on both sides — including cross-role
  const allCombos = [
    ['nursing', 'provider'],
    ['provider', 'nursing'],
    ['nursing', 'nursing'],
    ['provider', 'provider'],
  ]
  const sharedVisitTypes = VISIT_TYPES.filter(({ id, available }) => {
    if (!available) return false
    return allCombos.some(
      ([myRole, theirRole]) =>
        myWorkflows[`${id}_${myRole}`] && theirWorkflows[`${id}_${theirRole}`]
    )
  })

  const filteredTeammates = teammates.filter((t) => {
    const name = (t.preferred_name ?? t.full_name ?? '').toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Compatibility Scores</h2>
        <p className="text-slate-500 text-sm mt-1">
          Compare your workflow preferences with a teammate to see your alignment.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left — Teammate list */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search teammates…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {loadingTeam ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-xl" />
                ))}
              </div>
            ) : filteredTeammates.length === 0 ? (
              <div className="p-6 text-center">
                <Users size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  {teammates.length === 0
                    ? 'No teammates found in your organization.'
                    : 'No results for that search.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {filteredTeammates.map((teammate) => {
                  const name     = teammate.preferred_name ?? teammate.full_name ?? 'Unknown'
                  const role     = teammate.role ?? ''
                  const inits    = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
                  const active   = selected?.uid === teammate.uid
                  const fStatus  = followStatuses[teammate.uid]
                  return (
                    <div
                      key={teammate.uid}
                      className={`flex items-center gap-2 px-4 py-3 transition-colors ${
                        active ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <button
                        onClick={() => handleSelectTeammate(teammate)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {inits}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${active ? 'text-blue-700' : 'text-slate-800'}`}>
                            {name}
                          </p>
                          {role && <p className="text-xs text-slate-400 truncate">{role}</p>}
                        </div>
                      </button>
                      <div className="shrink-0">
                        {fStatus === 'following' ? (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Following</span>
                        ) : fStatus === 'pending' ? (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Requested</span>
                        ) : (
                          <button
                            onClick={() => handleFollow(teammate.uid)}
                            className="text-[10px] font-semibold text-blue-600 flex items-center gap-0.5 px-2 py-1 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
                          >
                            <UserPlus size={11} /> Follow
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right — Score area */}
        <div className="md:col-span-2">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center justify-center text-center h-full min-h-48">
              <User size={36} className="text-slate-200 mb-3" />
              <p className="text-slate-500 text-sm">
                Select a teammate on the left to view your compatibility scores.
              </p>
            </div>
          ) : loadingScore ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
              ))}
            </div>
          ) : sharedVisitTypes.length === 0 ? (
            <div className="space-y-4">
              {/* Message button */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {selected.preferred_name ?? selected.full_name ?? 'Teammate'}
                  </p>
                  {selected.role && <p className="text-xs text-slate-400">{selected.role}</p>}
                </div>
                <button
                  onClick={() => navigate('/messages', { state: { startConversationWith: selected.uid, teammateName: selected.preferred_name ?? selected.full_name ?? 'Unknown', teammateRole: selected.role ?? '' } })}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-slate-600 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  <MessageSquare size={15} />
                  Message {(selected.preferred_name ?? selected.full_name ?? '').split(' ')[0]}
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Users size={24} className="text-slate-300" />
                </div>
                <p className="font-semibold text-slate-700 mb-1">No shared workflows yet</p>
                <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                  Complete a workflow and ask{' '}
                  <span className="font-medium text-slate-600">
                    {selected.preferred_name ?? selected.full_name ?? 'your teammate'}
                  </span>{' '}
                  to do the same to see your compatibility score.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Message button */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {selected.preferred_name ?? selected.full_name ?? 'Teammate'}
                  </p>
                  {selected.role && <p className="text-xs text-slate-400">{selected.role}</p>}
                </div>
                <button
                  onClick={() => navigate('/messages', { state: { startConversationWith: selected.uid, teammateName: selected.preferred_name ?? selected.full_name ?? 'Unknown', teammateRole: selected.role ?? '' } })}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-slate-600 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  <MessageSquare size={15} />
                  Message {(selected.preferred_name ?? selected.full_name ?? '').split(' ')[0]}
                </button>
              </div>
              {sharedVisitTypes.map(({ id }) => (
                <ScoreCard
                  key={id}
                  visitType={id}
                  myDoc={myWorkflows}
                  theirDoc={theirWorkflows}
                  theirName={selected.preferred_name ?? selected.full_name ?? 'Teammate'}
                  theirUid={selected?.uid}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
