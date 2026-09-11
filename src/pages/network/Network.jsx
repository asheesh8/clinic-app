import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { db } from '../../lib/firebase'
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { Users, UserPlus, UserCheck, Search, MessageSquare } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import {
  loadOrgMembers, loadPublicProfiles, loadFollowEdges, followUser, displayName, initials, avatarBg,
} from '../../lib/people'

async function profilesFor(entries) {
  return Promise.all(entries.map(async ([otherUid, edge]) => {
    const snap = await getDoc(doc(db, 'profiles', otherUid))
    return {
      followDocId: edge.id,
      profile: snap.exists() ? { uid: otherUid, ...snap.data() } : { uid: otherUid, preferred_name: 'Unknown' },
    }
  }))
}

function Avatar({ p, size = 'w-9 h-9' }) {
  const name = displayName(p)
  return (
    <div className={`${size} rounded-full ${avatarBg(p.role)} flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden`}>
      {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : initials(name)}
    </div>
  )
}

function PersonLine({ p, showOrg }) {
  return (
    <Link to={`/people/${p.uid}`} className="flex items-center gap-3 flex-1 min-w-0 group">
      <Avatar p={p} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700">{displayName(p)}</p>
        <p className="text-xs text-slate-400 truncate">{p.role ?? ''}{showOrg && p.organization ? ` · ${p.organization}` : ''}</p>
      </div>
    </Link>
  )
}

export default function Network() {
  const { user, profile } = useAuthStore()
  const uid = user?.uid
  const navigate = useNavigate()

  const [following, setFollowing]     = useState([])   // {followDocId, profile}
  const [followers, setFollowers]     = useState([])
  const [pendingIn, setPendingIn]     = useState([])   // requests TO me
  const [orgMembers, setOrgMembers]   = useState([])
  const [publicPeople, setPublicPeople] = useState([])
  const [statuses, setStatuses]       = useState({})   // uid → 'following'|'pending'
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [findTab, setFindTab]         = useState('org') // 'org' | 'public'
  const [reloadKey, setReloadKey]     = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    async function loadAll() {
      if (!uid) return
      try {
        const [{ outgoing, incoming }, members, pub] = await Promise.all([
          loadFollowEdges(uid),
          loadOrgMembers(uid, profile),
          loadPublicProfiles(uid),
        ])
        const st = {}
        outgoing.forEach((e, id) => { st[id] = e.approved ? 'following' : 'pending' })
        setStatuses(st)

        const [fol, fols, pend] = await Promise.all([
          profilesFor([...outgoing].filter(([, e]) => e.approved)),
          profilesFor([...incoming].filter(([, e]) => e.approved)),
          profilesFor([...incoming].filter(([, e]) => !e.approved)),
        ])
        setFollowing(fol)
        setFollowers(fols)
        setPendingIn(pend)
        setOrgMembers(members)
        const orgIds = new Set(members.map((m) => m.uid))
        setPublicPeople(pub.filter((p) => !orgIds.has(p.uid)))
      } catch (err) {
        console.error('Network load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [uid, profile, reloadKey])

  async function handleFollow(target) {
    const status = await followUser(uid, target)
    setStatuses((prev) => ({ ...prev, [target.uid]: status }))
    if (status === 'following') reload()
  }

  async function handleUnfollow(followDocId, targetUid) {
    await deleteDoc(doc(db, 'follows', followDocId))
    setFollowing((prev) => prev.filter((f) => f.followDocId !== followDocId))
    setStatuses((prev) => ({ ...prev, [targetUid]: null }))
  }

  async function handleApprove(followDocId) {
    await updateDoc(doc(db, 'follows', followDocId), { approved: true })
    reload()
  }

  async function handleDecline(followDocId) {
    await deleteDoc(doc(db, 'follows', followDocId))
    setPendingIn((prev) => prev.filter((p) => p.followDocId !== followDocId))
  }

  const pool = findTab === 'org' ? orgMembers : publicPeople
  const discover = pool
    .filter((m) => displayName(m).toLowerCase().includes(search.toLowerCase()) ||
      (findTab === 'public' && (m.organization ?? '').toLowerCase().includes(search.toLowerCase())))
    .filter((m) => statuses[m.uid] !== 'following')

  const messageBtn = (p) => (
    <button
      onClick={() => navigate('/messages', { state: { startConversationWith: p.uid, teammateName: displayName(p), teammateRole: p.role ?? '' } })}
      className="flex items-center gap-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
      title="Message"
    >
      <MessageSquare size={13} /> Message
    </button>
  )

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-xl w-48" />
          <div className="h-4 bg-slate-100 rounded-xl w-64" />
          <div className="h-40 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">My Network 🤝</h2>
        <p className="text-slate-500 text-sm mt-1">
          Follow teammates in your organization — or anyone with a public profile — and approve follow requests.
        </p>
      </div>

      {/* Stats banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 mb-6 flex flex-wrap items-center gap-3 justify-between">
        <span className="flex items-center gap-3 text-sm text-slate-600">
          <Users size={18} className="text-blue-600" />
          <span>
            <span className="font-semibold text-slate-900">{followers.length}</span> followers
            {' · '}
            Following <span className="font-semibold text-slate-900">{following.length}</span>
          </span>
        </span>
        <Link to="/profile" className="text-xs text-slate-500 hover:text-blue-600">
          Profile visibility: <span className="font-semibold capitalize">{profile?.visibility ?? 'org'}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Following list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">👥 Following ({following.length})</p>
          </div>
          {following.length === 0 ? (
            <div className="p-6 text-center">
              <UserCheck size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">You are not following anyone yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {following.map(({ followDocId, profile: p }) => (
                <div key={followDocId} className="px-5 py-3 flex items-center gap-3">
                  <PersonLine p={p} showOrg />
                  <div className="flex items-center gap-1 shrink-0">
                    {messageBtn(p)}
                    <button
                      onClick={() => handleUnfollow(followDocId, p.uid)}
                      className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl px-3 py-1.5 text-xs transition-colors"
                    >
                      Unfollow
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending incoming requests */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              📬 Follow Requests {pendingIn.length > 0 && <span className="ml-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingIn.length}</span>}
            </p>
          </div>
          {pendingIn.length === 0 ? (
            <div className="p-6 text-center">
              <UserPlus size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No pending follow requests.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingIn.map(({ followDocId, profile: p }) => (
                <div key={followDocId} className="px-5 py-3 flex items-center gap-3">
                  <PersonLine p={p} showOrg />
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(followDocId)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => handleDecline(followDocId)}
                      className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Find people */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">
            {[['org', '🏥 My organization'], ['public', '🌎 Public profiles']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFindTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  findTab === id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={findTab === 'public' ? 'Name or organization…' : 'Search…'}
              className="pl-8 pr-3 py-1.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
          </div>
        </div>
        {pool.length === 0 ? (
          <div className="p-8 text-center">
            <Users size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {findTab === 'org'
                ? 'No other members found in your organization.'
                : 'No public profiles outside your organization yet.'}
            </p>
          </div>
        ) : discover.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-slate-400">{search ? 'No results for that search.' : 'You already follow everyone here.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {discover.map((m) => {
              const status = statuses[m.uid]
              return (
                <div key={m.uid} className="px-5 py-3 flex items-center gap-3">
                  <PersonLine p={m} showOrg={findTab === 'public'} />
                  <div className="flex items-center gap-2 shrink-0">
                    {messageBtn(m)}
                    {status === 'pending' ? (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl">Requested</span>
                    ) : (
                      <button
                        onClick={() => handleFollow(m)}
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
