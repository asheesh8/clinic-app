import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../lib/firebase'
import {
  collection, query, where, getDocs,
  doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { Users, UserPlus, UserCheck, UserX, Search, MessageSquare } from 'lucide-react'

function avatarBg(role) {
  if (!role) return 'bg-slate-500'
  const r = role.toLowerCase()
  if (r.includes('physician') || r.includes('provider') || r.includes('nurse practitioner') || r.includes('aprn') || r.includes('md') || r.includes('do') || r.includes('np') || r.includes('pa')) return 'bg-blue-600'
  if (r.includes('nurse') || r.includes('nursing') || r.includes('rn') || r.includes('lpn') || r.includes('ma') || r.includes('medical assistant')) return 'bg-teal-600'
  return 'bg-slate-500'
}

function initials(name) {
  return (name ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Network() {
  const uid = auth.currentUser?.uid
  const navigate = useNavigate()

  const [myOrg, setMyOrg]               = useState('')
  const [myProfile, setMyProfile]       = useState(null)
  const [following, setFollowing]       = useState([])   // {followDocId, profile}
  const [pendingIn, setPendingIn]       = useState([])   // requests TO me
  const [orgMembers, setOrgMembers]     = useState([])
  const [followStatuses, setFollowStatuses] = useState({}) // uid → 'following'|'pending'|null
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')

  async function loadAll() {
    if (!uid) { setLoading(false); return }

    // Load my profile for org
    const mySnap = await getDoc(doc(db, 'profiles', uid))
    const prof   = mySnap.data() ?? {}
    setMyProfile(prof)
    const org = prof.organization ?? ''
    setMyOrg(org)

    // Load follows where I am follower (outgoing)
    const outQ = query(collection(db, 'follows'), where('follower_id', '==', uid))
    const outSnap = await getDocs(outQ)

    // Load follows where I am following_id (incoming)
    const inQ = query(collection(db, 'follows'), where('following_id', '==', uid))
    const inSnap = await getDocs(inQ)

    // Build status map
    const statuses = {}
    outSnap.docs.forEach((d) => {
      const data = d.data()
      statuses[data.following_id] = data.approved ? 'following' : 'pending'
    })
    setFollowStatuses(statuses)

    // Approved following — fetch their profiles
    const approvedOut = outSnap.docs.filter((d) => d.data().approved)
    const followingList = await Promise.all(
      approvedOut.map(async (d) => {
        const data = d.data()
        const profSnap = await getDoc(doc(db, 'profiles', data.following_id))
        return {
          followDocId: d.id,
          followingId: data.following_id,
          profile: profSnap.exists() ? { uid: data.following_id, ...profSnap.data() } : { uid: data.following_id, preferred_name: 'Unknown' },
        }
      })
    )
    setFollowing(followingList)

    // Pending incoming requests
    const pendingInDocs = inSnap.docs.filter((d) => !d.data().approved)
    const pendingList = await Promise.all(
      pendingInDocs.map(async (d) => {
        const data = d.data()
        const profSnap = await getDoc(doc(db, 'profiles', data.follower_id))
        return {
          followDocId: d.id,
          followerId: data.follower_id,
          profile: profSnap.exists() ? { uid: data.follower_id, ...profSnap.data() } : { uid: data.follower_id, preferred_name: 'Unknown' },
        }
      })
    )
    setPendingIn(pendingList)

    // Org members (excluding self and already-followed or pending)
    if (org) {
      const orgQ = query(collection(db, 'profiles'), where('organization', '==', org))
      const orgSnap = await getDocs(orgQ)
      const members = orgSnap.docs
        .filter((d) => d.id !== uid)
        .map((d) => ({ uid: d.id, ...d.data() }))
      setOrgMembers(members)
    }

    setLoading(false)
  }

  useEffect(() => { loadAll() }, [uid])

  async function handleFollow(targetUid) {
    const docId = `${uid}_${targetUid}`
    await setDoc(doc(db, 'follows', docId), {
      follower_id:  uid,
      following_id: targetUid,
      approved:     false,
      created_at:   serverTimestamp(),
    })
    setFollowStatuses((prev) => ({ ...prev, [targetUid]: 'pending' }))
  }

  async function handleUnfollow(followDocId, targetUid) {
    await deleteDoc(doc(db, 'follows', followDocId))
    setFollowing((prev) => prev.filter((f) => f.followDocId !== followDocId))
    setFollowStatuses((prev) => ({ ...prev, [targetUid]: null }))
  }

  async function handleApprove(followDocId, followerId) {
    await updateDoc(doc(db, 'follows', followDocId), { approved: true })
    // Refresh the pending list
    setPendingIn((prev) => prev.filter((p) => p.followDocId !== followDocId))
    // Also add to following count (they now follow us)
    await loadAll()
  }

  async function handleDecline(followDocId) {
    await deleteDoc(doc(db, 'follows', followDocId))
    setPendingIn((prev) => prev.filter((p) => p.followDocId !== followDocId))
  }

  const followerCount = pendingIn.length  // incoming approved (reload would show real)
  // Approx follower/following from state
  const followingCount = following.length

  const filteredOrgMembers = orgMembers.filter((m) => {
    const name = (m.preferred_name ?? m.full_name ?? '').toLowerCase()
    return name.includes(search.toLowerCase())
  }).filter((m) => !followStatuses[m.uid] )

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-xl w-48" />
          <div className="h-4 bg-slate-100 rounded-xl w-64" />
          <div className="h-40 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">My Network</h2>
        <p className="text-slate-500 text-sm mt-1">
          Manage who you follow and approve follow requests from teammates.
        </p>
      </div>

      {/* Stats banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 mb-6 flex items-center gap-3">
        <Users size={18} className="text-blue-600" />
        <span className="text-sm text-slate-600">
          You have <span className="font-semibold text-slate-900">{pendingIn.filter(() => true).length + following.length > 0 ? '—' : '0'}</span> followers
          {' · '}
          Following <span className="font-semibold text-slate-900">{following.length}</span> people
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Following list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Following ({following.length})</p>
          </div>
          {following.length === 0 ? (
            <div className="p-6 text-center">
              <UserCheck size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">You are not following anyone yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {following.map(({ followDocId, followingId, profile: p }) => {
                const name = p.preferred_name ?? p.full_name ?? 'Unknown'
                return (
                  <div key={followDocId} className="px-5 py-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${avatarBg(p.role)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                      {initials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.role ?? ''}{p.organization ? ` · ${p.organization}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate('/messages', { state: { startConversationWith: followingId, teammateName: name, teammateRole: p.role ?? '' } })}
                        className="flex items-center gap-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
                        title="Message"
                      >
                        <MessageSquare size={13} /> Message
                      </button>
                      <button
                        onClick={() => handleUnfollow(followDocId, followingId)}
                        className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl px-3 py-1.5 text-sm transition-colors"
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pending incoming requests */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Follow Requests {pendingIn.length > 0 && <span className="ml-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingIn.length}</span>}
            </p>
          </div>
          {pendingIn.length === 0 ? (
            <div className="p-6 text-center">
              <UserPlus size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No pending follow requests.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingIn.map(({ followDocId, followerId, profile: p }) => {
                const name = p.preferred_name ?? p.full_name ?? 'Unknown'
                return (
                  <div key={followDocId} className="px-5 py-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${avatarBg(p.role)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                      {initials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.role ?? ''}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(followDocId, followerId)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDecline(followDocId)}
                        className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Find Teammates */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Find Teammates</p>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-3 py-1.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            />
          </div>
        </div>
        {orgMembers.length === 0 ? (
          <div className="p-8 text-center">
            <Users size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No other members found in your organization.</p>
          </div>
        ) : filteredOrgMembers.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-slate-400">Everyone in your org is already in your network.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOrgMembers.map((m) => {
              const name   = m.preferred_name ?? m.full_name ?? 'Unknown'
              const status = followStatuses[m.uid]
              return (
                <div key={m.uid} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${avatarBg(m.role)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                    <p className="text-xs text-slate-400 truncate">{m.role ?? ''}{m.organization ? ` · ${m.organization}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigate('/messages', { state: { startConversationWith: m.uid, teammateName: name, teammateRole: m.role ?? '' } })}
                      className="flex items-center gap-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors border border-slate-200 hover:border-blue-200"
                      title="Message"
                    >
                      <MessageSquare size={13} /> Message
                    </button>
                    {status === 'following' ? (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">Following</span>
                    ) : status === 'pending' ? (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl">Requested</span>
                    ) : (
                      <button
                        onClick={() => handleFollow(m.uid)}
                        className="text-blue-600 text-xs font-semibold hover:text-blue-700 flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors"
                      >
                        <UserPlus size={13} /> Follow
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
  )
}
