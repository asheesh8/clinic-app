import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import {
  collection, query, where, getDocs, doc, getDoc
} from 'firebase/firestore'
import { useAuthStore } from '../../stores/authStore'
import { Building2, Users, Star, Mail } from 'lucide-react'

function avatarBg(role) {
  if (!role) return 'bg-slate-500'
  const r = role.toLowerCase()
  if (
    r.includes('physician') || r.includes('provider') ||
    r.includes('nurse practitioner') || r.includes('aprn') ||
    r.includes('md') || r.includes('do') || r.includes('np') || r.includes('pa')
  ) return 'bg-blue-600'
  if (
    r.includes('nurse') || r.includes('nursing') ||
    r.includes('rn') || r.includes('lpn') || r.includes('ma') ||
    r.includes('medical assistant')
  ) return 'bg-teal-600'
  return 'bg-slate-500'
}

function initials(name) {
  return (name ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function OrgProfile() {
  const { profile, user } = useAuthStore()
  const uid = user?.uid

  const [members, setMembers]               = useState([])
  const [workflowCounts, setWorkflowCounts] = useState({}) // uid → count
  const [loading, setLoading]               = useState(true)

  const myOrg = profile?.organization ?? ''

  useEffect(() => {
    async function load() {
      if (!uid || !myOrg) { setLoading(false); return }
      try {
        // Load all org members
        const orgKey  = myOrg.trim().toLowerCase()
        const orgQ    = query(collection(db, 'profiles'), where('org_key', '==', orgKey))
        const orgSnap = await getDocs(orgQ)
        const memberList = orgSnap.docs.map((d) => ({ uid: d.id, ...d.data() }))
        setMembers(memberList)

        // Load workflow counts per member
        const counts = {}
        await Promise.all(
          memberList.map(async (m) => {
            const wfQ    = query(
              collection(db, 'workflows'),
              where('user_id', '==', m.uid),
              where('completed', '==', true)
            )
            const wfSnap = await getDocs(wfQ)
            counts[m.uid] = wfSnap.size
          })
        )
        setWorkflowCounts(counts)
      } catch (err) {
        console.error('Error loading org profile:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [uid, myOrg])

  const totalWorkflows = Object.values(workflowCounts).reduce((s, c) => s + c, 0)
  const mostActive     = members.reduce(
    (best, m) => (workflowCounts[m.uid] ?? 0) > (workflowCounts[best?.uid] ?? 0) ? m : best,
    members[0] ?? null
  )

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-xl w-64" />
          <div className="h-4 bg-slate-100 rounded-xl w-40" />
          <div className="h-32 bg-slate-100 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{myOrg || 'Your Organization'}</h2>
            <p className="text-slate-500 text-sm">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm mt-1">
          Overview of your clinic's members and workflow activity.
        </p>
      </div>

      {/* Stats tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Members</p>
          <p className="text-3xl font-bold text-slate-900">{members.length}</p>
          <div className="flex items-center gap-1 mt-1">
            <Users size={14} className="text-blue-500" />
            <span className="text-xs text-slate-400">in {myOrg || 'your org'}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Workflows Completed</p>
          <p className="text-3xl font-bold text-slate-900">{totalWorkflows}</p>
          <div className="flex items-center gap-1 mt-1">
            <Star size={14} className="text-amber-500" />
            <span className="text-xs text-slate-400">across all members</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Most Active</p>
          {mostActive ? (
            <>
              <p className="text-lg font-bold text-slate-900 truncate">
                {mostActive.preferred_name ?? mostActive.full_name ?? 'Unknown'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Star size={14} className="text-amber-500" />
                <span className="text-xs text-slate-400">{workflowCounts[mostActive.uid] ?? 0} workflows</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
        </div>
      </div>

      {/* Members section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Members</p>
        </div>
        {members.length === 0 ? (
          <div className="p-8 text-center">
            <Users size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No members found in your organization.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
            {members.map((m) => {
              const name    = m.preferred_name ?? m.full_name ?? 'Unknown'
              const count   = workflowCounts[m.uid] ?? 0
              const isMe    = m.uid === uid
              return (
                <div
                  key={m.uid}
                  className={`rounded-xl border p-4 flex flex-col items-center text-center gap-2 ${
                    isMe ? 'border-blue-200 bg-blue-50' : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full ${avatarBg(m.role)} flex items-center justify-center text-sm font-bold text-white`}>
                    {initials(name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 flex items-center gap-1 justify-center">
                      {name}
                      {isMe && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-semibold">You</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{m.role ?? 'Member'}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Star size={12} className="text-amber-400" />
                    <span>{count} workflow{count !== 1 ? 's' : ''} completed</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Invite section (placeholder) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invite Teammates</p>
          <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Coming Soon</span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="email"
              disabled
              placeholder="Invite by email…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
            />
          </div>
          <button
            disabled
            className="bg-slate-100 text-slate-400 font-semibold py-2.5 px-4 rounded-xl cursor-not-allowed text-sm"
          >
            Invite
          </button>
        </div>
      </div>
    </div>
  )
}
