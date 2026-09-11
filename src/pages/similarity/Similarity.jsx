import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { auth, db } from '../../lib/firebase'
import {
  collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp
} from 'firebase/firestore'
import { VISIT_TYPES, WORKFLOW_DATA, ROLES, phaseEmoji } from '../../lib/workflowData'
import { computeSimilarity, buildHybrid, compareWorkStyle } from '../../lib/similarity'
import { loadConnections, loadFollowEdges, followUser, displayName, initials, avatarBg, safe } from '../../lib/people'
import { useAuthStore } from '../../stores/authStore'
import { Toast } from '../../components/ui/Controls'
import SimilarityMood from '../../components/SimilarityMood'
import HeartRating from '../../components/HeartRating'
import {
  Search, ChevronDown, ChevronUp, Users, CheckCircle, XCircle, User, UserPlus,
  MessageSquare, Globe,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(pct) {
  if (pct >= 80) return { ring: 'ring-emerald-400', bg: 'bg-emerald-50', circle: 'text-emerald-600' }
  if (pct >= 50) return { ring: 'ring-amber-400',   bg: 'bg-amber-50',   circle: 'text-amber-600' }
  return             { ring: 'ring-red-400',        bg: 'bg-red-50',     circle: 'text-red-600' }
}

const roleLabel = (id) => ROLES.find((r) => r.id === id)?.label ?? id

function fmtMin(n) {
  if (n === null || n === undefined) return '—'
  return `${Number.isInteger(n) ? n : n.toFixed(1)} min`
}

/** Key a workflow doc by what was filled out: a visit type or a custom template. */
function workflowKey(d, docId, ownerUid) {
  if (d.visit_type !== 'custom') return d.visit_type
  if (d.custom_workflow_id) return `custom:${d.custom_workflow_id}`
  // Older custom answers only encode the template id in the doc id.
  const rest = docId.slice(ownerUid.length + 1).replace(/^custom_/, '').replace(/_(nursing|provider)$/, '')
  return `custom:${rest}`
}

async function loadWorkflowsFor(uid) {
  const snap = await getDocs(query(collection(db, 'workflows'), where('user_id', '==', uid)))
  const byKey = {}
  snap.docs.forEach((d) => {
    const data = d.data()
    if (!data.completed) return
    const key = workflowKey(data, d.id, uid)
    byKey[key] = { ...(byKey[key] ?? {}), [data.role_in_visit]: data }
  })
  return byKey
}

const STATUS_STYLES = {
  both:    { label: '✅ Both',    cls: 'bg-emerald-50 text-emerald-700' },
  discuss: { label: '💬 Discuss', cls: 'bg-amber-50 text-amber-700' },
  mine:    { label: '🙋 You',     cls: 'bg-blue-50 text-blue-700' },
  theirs:  { label: null,         cls: 'bg-violet-50 text-violet-700' },
}

// ─── Score card ───────────────────────────────────────────────────────────────

function ScoreCard({ title, emoji, results, theirName, theirUid, saveKey }) {
  const [open, setOpen]     = useState(false)
  const [view, setView]     = useState('hybrid')   // 'hybrid' | 'breakdown'
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)
  const firstName = theirName?.split(' ')[0] ?? 'Them'
  const best = results.reduce((a, b) => (b.sim.score > a.sim.score ? b : a), results[0])

  async function saveHybrid(result) {
    const uid = auth.currentUser?.uid
    if (!uid || !theirUid) return
    setSaving(true)
    try {
      const agreed = {}
      result.sim.items.filter((i) => i.kind === 'task' && i.agree).forEach((i) => {
        agreed[i.key] = { selected: i.mine, label: i.label }
      })
      await setDoc(doc(db, 'compatibility_scores', `${uid}_${theirUid}_${saveKey}`), {
        user_a:          uid,
        user_b:          theirUid,
        visit_type:      saveKey,
        roles:           result.label,
        score_pct:       result.sim.score,
        agreed_workflow: agreed,
        hybrid_workflow: result.hybrid,
        computed_at:     serverTimestamp(),
      }, { merge: true })
      setToast('Hybrid workflow saved! 🧩')
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
      <div className="px-5 py-5 flex items-center gap-4 flex-wrap sm:flex-nowrap">
        <div className="w-16 flex justify-center shrink-0">
          <SimilarityMood score={best.sim.score} size="sm" />
        </div>
        <div className="flex gap-2">
          {results.map(({ label, sim }) => {
            const c = scoreColor(sim.score)
            return (
              <div key={label} title={label} className={`w-14 h-14 rounded-full ring-4 ${c.ring} ${c.bg} flex items-center justify-center shrink-0`}>
                <span className={`text-lg font-bold leading-none ${c.circle}`}>{sim.score}%</span>
              </div>
            )
          })}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{emoji} {title}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {results.map((r) => `${r.sim.matched}/${r.sim.total} match · ${r.label}`).join(' · ')}
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors shrink-0"
        >
          {open ? 'Hide' : 'View'} details
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100">
          <div className="flex gap-1 px-5 pt-3">
            {[['hybrid', '🧩 Hybrid workflow'], ['breakdown', '📊 Answer breakdown']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  view === id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {results.map((result) => (
            <div key={result.label} className="pb-2">
              {results.length > 1 && (
                <p className="px-5 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{result.label}</p>
              )}

              {view === 'breakdown' && (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto mt-2">
                  {result.sim.items.map((it) => (
                    <div key={it.key} className="px-5 py-3 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{it.phase}</p>
                        <p className="text-sm text-slate-700 leading-snug">{it.label}</p>
                      </div>
                      {[['You', it.mine], [firstName, it.theirs]].map(([who, val]) => (
                        <div key={who} className="flex flex-col items-center gap-0.5 w-14 shrink-0">
                          <span className="text-[9px] font-semibold text-slate-400 uppercase truncate max-w-full">{who}</span>
                          {it.kind === 'time'
                            ? <span className="text-xs font-medium text-slate-600">{fmtMin(val)}</span>
                            : val === true
                              ? <CheckCircle size={16} className="text-emerald-500" />
                              : <XCircle size={16} className="text-slate-300" />}
                        </div>
                      ))}
                      <div className="w-5 shrink-0 flex items-center justify-center pt-3.5">
                        {it.agree
                          ? <span className="text-emerald-500 text-lg leading-none">✓</span>
                          : <span className="text-red-400 text-lg leading-none">✗</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {view === 'hybrid' && (
                <div className="px-5 py-4 space-y-5">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    A combined workflow built from both of your answers. Section times are the average of what you each prefer.
                    Items marked <span className="font-semibold text-amber-700">Discuss</span> are where you disagree.
                  </p>
                  {result.hybrid.phases.map((ph) => (
                    <div key={ph.name}>
                      <div className="flex items-baseline justify-between gap-3 mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{phaseEmoji(ph.name)} {ph.name}</p>
                        {ph.minutes != null && (
                          <span className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                            ⏱️ {fmtMin(ph.minutes)}
                            {ph.myMinutes != null && ph.theirMinutes != null && ph.myMinutes !== ph.theirMinutes && (
                              <span className="text-slate-400">(you {fmtMin(ph.myMinutes)} · {firstName} {fmtMin(ph.theirMinutes)})</span>
                            )}
                          </span>
                        )}
                      </div>
                      <ul className="space-y-1.5">
                        {ph.tasks.map((t) => {
                          const st = STATUS_STYLES[t.status]
                          return (
                            <li key={t.key} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${st.cls}`}>
                                {st.label ?? `👤 ${firstName}`}
                              </span>
                              <span className="leading-snug">{t.label}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <p className="text-sm text-slate-600">
                      ⏱️ Total hybrid time: <span className="font-semibold text-slate-900">{fmtMin(result.hybrid.totalMinutes)}</span>
                    </p>
                    <button
                      onClick={() => saveHybrid(result)}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? 'Saving… ⏳' : '💾 Save Hybrid Workflow'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Working style card ───────────────────────────────────────────────────────

function WorkStyleCard({ mine, theirs, theirName }) {
  const [open, setOpen] = useState(false)
  const cmp = compareWorkStyle(mine, theirs)
  if (cmp.score === null) return null
  const c = scoreColor(cmp.score)
  const firstName = theirName?.split(' ')[0] ?? 'Them'
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-5 flex items-center gap-4">
        <div className="w-16 flex justify-center shrink-0"><SimilarityMood score={cmp.score} size="sm" /></div>
        <div className={`w-14 h-14 rounded-full ring-4 ${c.ring} ${c.bg} flex items-center justify-center shrink-0`}>
          <span className={`text-lg font-bold leading-none ${c.circle}`}>{cmp.score}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">🗓️ Working Style</p>
          <p className="text-xs text-slate-500 mt-0.5">{cmp.matched}/{cmp.total} match · schedule, communication &amp; skills</p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors shrink-0"
        >
          {open ? 'Hide' : 'View'} {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {cmp.items.map((it) => (
            <div key={it.key} className="px-5 py-3 flex items-start gap-4">
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm text-slate-700 leading-snug">{it.myLabel}</p>
                {it.theirLabel !== it.myLabel && (
                  <p className="text-xs text-slate-400 leading-snug">{firstName}: {it.theirLabel}</p>
                )}
              </div>
              <span className="text-xs text-slate-500 w-10 text-center shrink-0">{it.mine ? 'Yes' : 'No'}</span>
              <span className="text-xs text-slate-500 w-10 text-center shrink-0">{it.theirs ? 'Yes' : 'No'}</span>
              <span className={`w-5 text-lg leading-none shrink-0 ${it.agree ? 'text-emerald-500' : 'text-red-400'}`}>{it.agree ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Similarity() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const uid = auth.currentUser?.uid

  const [people, setPeople]               = useState([])
  const [loadingPeople, setLoadingPeople] = useState(true)
  const [search, setSearch]               = useState('')
  const [selected, setSelected]           = useState(null)
  const [myWf, setMyWf]                   = useState({})
  const [theirWf, setTheirWf]             = useState({})
  const [templates, setTemplates]         = useState({})   // custom id → template doc
  const [loadingScore, setLoadingScore]   = useState(false)
  const [followStatuses, setFollowStatuses] = useState({})
  const [myRating, setMyRating]           = useState(0)

  // Load the people I can compare with (org + approved follows)
  useEffect(() => {
    async function load() {
      if (!uid || !profile) return
      try {
        const [list, { outgoing }] = await Promise.all([loadConnections(uid, profile), loadFollowEdges(uid)])
        setPeople(list)
        const statuses = {}
        outgoing.forEach((e, id) => { statuses[id] = e.approved ? 'following' : 'pending' })
        setFollowStatuses(statuses)
      } catch (err) {
        console.error('Error loading people:', err)
      } finally {
        setLoadingPeople(false)
      }
    }
    load()
  }, [uid, profile])

  useEffect(() => {
    if (!uid) return
    loadWorkflowsFor(uid).then(setMyWf).catch((err) => console.error('Error loading my workflows:', err))
  }, [uid])

  const selectPerson = useCallback(async (person) => {
    setSelected(person)
    setLoadingScore(true)
    setTheirWf({})
    setMyRating(0)
    try {
      const [theirs, ratingSnap] = await Promise.all([
        loadWorkflowsFor(person.uid),
        safe(getDoc(doc(db, 'interaction_ratings', `${uid}_${person.uid}`)), null),
      ])
      setTheirWf(theirs)
      if (ratingSnap?.exists()) setMyRating(ratingSnap.data().hearts ?? 0)

      // Fetch any custom templates we've both filled out
      const customIds = Object.keys(theirs)
        .filter((k) => k.startsWith('custom:') && myWf[k])
        .map((k) => k.slice(7))
      const snaps = await Promise.all(customIds.map((id) => safe(getDoc(doc(db, 'custom_workflows', id)), null)))
      setTemplates((prev) => {
        const next = { ...prev }
        snaps.forEach((s) => { if (s?.exists()) next[s.id] = s.data() })
        return next
      })
    } catch (err) {
      console.error('Error loading teammate workflows:', err)
    } finally {
      setLoadingScore(false)
    }
  }, [uid, myWf])

  async function handleFollow(person) {
    const status = await followUser(uid, person)
    setFollowStatuses((prev) => ({ ...prev, [person.uid]: status }))
  }

  async function rate(hearts) {
    if (!uid || !selected) return
    setMyRating(hearts)
    try {
      await setDoc(doc(db, 'interaction_ratings', `${uid}_${selected.uid}`), {
        rater_id:   uid,
        ratee_id:   selected.uid,
        hearts,
        updated_at: serverTimestamp(),
      })
    } catch (err) {
      console.error('Error saving rating:', err)
    }
  }

  // Build score cards for every visit type / template we've both filled out
  const cards = []
  if (selected) {
    VISIT_TYPES.forEach(({ id, label, emoji }) => {
      const mine = myWf[id] ?? {}
      const theirs = theirWf[id] ?? {}
      const results = []
      Object.entries(mine).forEach(([myRole, myDoc]) => {
        Object.entries(theirs).forEach(([theirRole, theirDoc]) => {
          const myPhases    = WORKFLOW_DATA[id]?.[myRole] ?? []
          const theirPhases = WORKFLOW_DATA[id]?.[theirRole] ?? []
          const sim = computeSimilarity(myPhases, myDoc, theirPhases, theirDoc)
          if (sim.score === null) return
          results.push({
            label: `${roleLabel(myRole)} ↔ ${roleLabel(theirRole)}`,
            sim,
            hybrid: buildHybrid(myPhases, myDoc, theirPhases, theirDoc),
          })
        })
      })
      if (results.length) cards.push({ key: id, title: label, emoji, results })
    })
    Object.keys(theirWf).filter((k) => k.startsWith('custom:') && myWf[k]).forEach((k) => {
      const tpl = templates[k.slice(7)]
      if (!tpl) return
      const results = []
      Object.values(myWf[k]).forEach((myDoc) => {
        Object.values(theirWf[k]).forEach((theirDoc) => {
          const sim = computeSimilarity(tpl.phases, myDoc, tpl.phases, theirDoc)
          if (sim.score === null) return
          results.push({
            label: 'Custom template',
            sim,
            hybrid: buildHybrid(tpl.phases, myDoc, tpl.phases, theirDoc),
          })
        })
      })
      if (results.length) cards.push({ key: k.replace(':', '_'), title: tpl.name, emoji: '📝', results: results.slice(0, 1) })
    })
  }

  const filteredPeople = people.filter((p) => displayName(p).toLowerCase().includes(search.toLowerCase()))
  const selName = selected ? displayName(selected) : ''
  const hasWorkStyle = selected && compareWorkStyle(profile?.work_style, selected.work_style).score !== null

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Similarity Scores 💞</h2>
        <p className="text-slate-500 text-sm mt-1">
          See how similar your workflow preferences are to a teammate's — and get a hybrid workflow you can both work from.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — People list */}
        <div className={`lg:col-span-1 ${selected ? 'hidden lg:block' : ''}`}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search people…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {loadingPeople ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
              </div>
            ) : filteredPeople.length === 0 ? (
              <div className="p-6 text-center">
                <Users size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  {people.length === 0 ? 'No teammates yet.' : 'No results for that search.'}
                </p>
                <Link to="/network" className="text-xs text-blue-600 font-medium hover:underline mt-2 inline-block">
                  Find people to follow →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[28rem] overflow-y-auto">
                {filteredPeople.map((p) => {
                  const name    = displayName(p)
                  const active  = selected?.uid === p.uid
                  const fStatus = followStatuses[p.uid]
                  return (
                    <div key={p.uid} className={`flex items-center gap-2 px-4 py-3 transition-colors ${active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <button onClick={() => selectPerson(p)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        <div className={`w-9 h-9 rounded-full ${avatarBg(p.role)} flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden`}>
                          {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : initials(name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${active ? 'text-blue-700' : 'text-slate-800'}`}>{name}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {p.role ?? ''}{!p.inOrg && p.organization ? ` · ${p.organization}` : ''}
                          </p>
                        </div>
                      </button>
                      <div className="shrink-0">
                        {!p.inOrg ? (
                          <span title="Outside your organization" className="text-slate-400"><Globe size={13} /></span>
                        ) : fStatus === 'following' ? (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Following</span>
                        ) : fStatus === 'pending' ? (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Requested</span>
                        ) : (
                          <button
                            onClick={() => handleFollow(p)}
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
        <div className={`lg:col-span-2 ${selected ? '' : 'hidden lg:block'}`}>
          {!selected ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center justify-center text-center h-full min-h-48">
              <User size={36} className="text-slate-200 mb-3" />
              <p className="text-slate-500 text-sm">👈 Select someone on the left to see how similar you are.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setSelected(null)}
                className="lg:hidden flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                ← All people
              </button>
              {/* Person header */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
                <div className="min-w-0">
                  <Link to={`/people/${selected.uid}`} className="text-sm font-semibold text-slate-800 hover:text-blue-700 hover:underline">
                    {selName}
                  </Link>
                  <p className="text-xs text-slate-400">
                    {selected.role ?? ''}{selected.organization ? ` · ${selected.organization}` : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-500">Rate your interactions 💝</span>
                    <HeartRating value={myRating} onRate={rate} size={16} />
                  </div>
                </div>
                <button
                  onClick={() => navigate('/messages', { state: { startConversationWith: selected.uid, teammateName: selName, teammateRole: selected.role ?? '' } })}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-slate-600 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  <MessageSquare size={15} />
                  Message {selName.split(' ')[0]}
                </button>
              </div>

              {loadingScore ? (
                <div className="space-y-4 animate-pulse">
                  {[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
                </div>
              ) : cards.length === 0 && !hasWorkStyle ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Users size={24} className="text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-700 mb-1">Nothing to compare yet 🤷</p>
                  <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                    Complete a workflow (or share a custom template) and ask{' '}
                    <span className="font-medium text-slate-600">{selName}</span>{' '}
                    to do the same to see your similarity score.
                  </p>
                </div>
              ) : (
                <>
                  {cards.map((c) => (
                    <ScoreCard
                      key={c.key}
                      title={c.title}
                      emoji={c.emoji}
                      results={c.results}
                      theirName={selName}
                      theirUid={selected.uid}
                      saveKey={c.key}
                    />
                  ))}
                  <WorkStyleCard mine={profile?.work_style} theirs={selected.work_style} theirName={selName} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
