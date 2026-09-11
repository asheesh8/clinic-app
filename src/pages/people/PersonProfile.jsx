import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { db } from '../../lib/firebase'
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp,
} from 'firebase/firestore'
import { useAuthStore } from '../../stores/authStore'
import { ABOUT_QUESTIONS, WORK_STYLE_SECTIONS, formatAnswer } from '../../lib/profileQuestions'
import { canViewDetails, followUser, displayName, initials, avatarBg, safe } from '../../lib/people'
import HeartRating from '../../components/HeartRating'
import { ChevronLeft, Lock, MessageSquare, UserPlus, BarChart2, Globe, Building2, EyeOff } from 'lucide-react'

const VIS_BADGE = {
  public:  { icon: Globe,     label: 'Public profile' },
  org:     { icon: Building2, label: 'Visible to organization' },
  private: { icon: EyeOff,    label: 'Private profile' },
}

function AnswerList({ questions, values }) {
  const rows = questions
    .map((q) => ({ q, text: formatAnswer(q, values?.[q.id], values?.[`${q.id}_why`]) }))
    .filter((r) => r.text)
  if (rows.length === 0) return <p className="text-sm text-slate-400">Not filled out yet.</p>
  return (
    <dl className="divide-y divide-slate-100">
      {rows.map(({ q, text }) => (
        <div key={q.id} className="py-2.5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-6">
          <dt className="text-sm text-slate-500 flex-1">{q.label}</dt>
          <dd className="text-sm font-medium text-slate-800 sm:text-right sm:max-w-[45%]">{text}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function PersonProfile() {
  const { uid: targetUid } = useParams()
  const navigate = useNavigate()
  const { user, profile: myProfile } = useAuthStore()
  const myUid = user?.uid

  const [person, setPerson]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [followStatus, setFollowStatus] = useState(null) // 'following' | 'pending' | null
  const [ratings, setRatings]       = useState({ avg: 0, count: 0 })
  const [myRating, setMyRating]     = useState(0)

  useEffect(() => {
    async function load() {
      if (!myUid || !targetUid) return
      setLoading(true)
      try {
        const [profSnap, followSnap, ratingSnap] = await Promise.all([
          getDoc(doc(db, 'profiles', targetUid)),
          safe(getDoc(doc(db, 'follows', `${myUid}_${targetUid}`)), null),
          safe(getDocs(query(collection(db, 'interaction_ratings'), where('ratee_id', '==', targetUid))), { docs: [] }),
        ])
        setPerson(profSnap.exists() ? { uid: targetUid, ...profSnap.data() } : null)
        setFollowStatus(followSnap?.exists() ? (followSnap.data().approved ? 'following' : 'pending') : null)
        const hearts = ratingSnap.docs.map((d) => d.data().hearts).filter(Boolean)
        setRatings({ avg: hearts.length ? hearts.reduce((a, b) => a + b, 0) / hearts.length : 0, count: hearts.length })
        setMyRating(ratingSnap.docs.find((d) => d.data().rater_id === myUid)?.data().hearts ?? 0)
      } catch (err) {
        console.error('Error loading person:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [myUid, targetUid])

  async function handleFollow() {
    setFollowStatus(await followUser(myUid, person))
  }

  async function rate(hearts) {
    setMyRating(hearts)
    await setDoc(doc(db, 'interaction_ratings', `${myUid}_${targetUid}`), {
      rater_id: myUid, ratee_id: targetUid, hearts, updated_at: serverTimestamp(),
    })
  }

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-pulse space-y-4">
        <div className="h-32 bg-slate-100 rounded-2xl" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    )
  }

  if (!person) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-center text-slate-500">
        <p>This person could not be found.</p>
        <Link to="/network" className="text-blue-600 text-sm font-medium hover:underline">Back to Network</Link>
      </div>
    )
  }

  const isMe    = myUid === targetUid
  const name    = displayName(person)
  const canView = canViewDetails({ viewerUid: myUid, viewerProfile: myProfile, target: person, followsTarget: followStatus === 'following' })
  const vis     = VIS_BADGE[person.visibility ?? 'org'] ?? VIS_BADGE.org
  const workStyleQs = WORK_STYLE_SECTIONS.flatMap((s) => s.items)

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors"
      >
        <ChevronLeft size={16} /> Back
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className={`w-20 h-20 rounded-full ${avatarBg(person.role)} flex items-center justify-center text-2xl font-bold text-white shrink-0 overflow-hidden`}>
            {person.photo_url ? <img src={person.photo_url} alt="" className="w-full h-full object-cover" /> : initials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900">{name}</h2>
            <p className="text-sm text-slate-500">
              {person.role ?? ''}{person.organization ? ` · ${person.organization}` : ''}
            </p>
            {canView && (person.preferred_title || person.pronouns) && (
              <p className="text-xs text-slate-400 mt-0.5">
                {[person.preferred_title && `Prefers: ${person.preferred_title}`, person.pronouns].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <vis.icon size={12} /> {vis.label}
              </span>
              {ratings.count > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <HeartRating value={ratings.avg} size={13} />
                  {ratings.avg.toFixed(1)} from {ratings.count} teammate{ratings.count !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {!isMe && (
          <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap gap-2">
              {followStatus === 'following' ? (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl">Following</span>
              ) : followStatus === 'pending' ? (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">Requested</span>
              ) : (
                <button
                  onClick={handleFollow}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  <UserPlus size={15} /> Follow
                </button>
              )}
              <button
                onClick={() => navigate('/messages', { state: { startConversationWith: targetUid, teammateName: name, teammateRole: person.role ?? '' } })}
                className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <MessageSquare size={15} /> Message
              </button>
              <Link
                to="/similarity"
                className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <BarChart2 size={15} /> Similarity
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Rate your interactions 💝</span>
              <HeartRating value={myRating} onRate={rate} size={18} />
            </div>
          </div>
        )}
      </div>

      {canView ? (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">😊 About Me — Teamwork &amp; Personality</p>
            <AnswerList questions={ABOUT_QUESTIONS} values={person.about} />
          </section>
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">🗓️ Schedule &amp; Communication</p>
            <AnswerList questions={workStyleQs} values={person.work_style} />
          </section>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
          <Lock size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">🔒 This profile is private</p>
          <p className="text-sm text-slate-400 mt-1">
            {followStatus === 'pending'
              ? `Your follow request is waiting for ${name.split(' ')[0]} to approve.`
              : `Follow ${name.split(' ')[0]} to request access to their profile.`}
          </p>
        </div>
      )}
    </div>
  )
}
