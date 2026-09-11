import { db } from './firebase'
import {
  collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore'

/** Resolve to `fallback` instead of throwing (e.g. Firestore rules deny a new collection). */
export function safe(promise, fallback) {
  return promise.catch((err) => {
    console.warn('Firestore read skipped:', err?.code ?? err)
    return fallback
  })
}

export function orgKeyOf(profile) {
  return (profile?.org_key ?? profile?.organization ?? '').trim().toLowerCase()
}

export function displayName(p) {
  return p?.preferred_name ?? p?.full_name ?? 'Unknown'
}

export function initials(name) {
  return (name ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export function avatarBg(role) {
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

/**
 * Everyone in my organization. Profiles created before `org_key` existed
 * only have `organization`, so query both and merge.
 */
export async function loadOrgMembers(uid, myProfile) {
  const key = orgKeyOf(myProfile)
  if (!key) return []
  const empty = { docs: [] }
  const queries = [safe(getDocs(query(collection(db, 'profiles'), where('org_key', '==', key))), empty)]
  if (myProfile?.organization) {
    queries.push(safe(getDocs(query(collection(db, 'profiles'), where('organization', '==', myProfile.organization))), empty))
  }
  const snaps = await Promise.all(queries)
  const byId = new Map()
  snaps.forEach((snap) => snap.docs.forEach((d) => {
    if (d.id !== uid) byId.set(d.id, { uid: d.id, ...d.data() })
  }))
  return [...byId.values()]
}

/**
 * Follow docs in both directions, keyed by the other person's uid.
 * Returns { outgoing: Map(uid → {id, approved}), incoming: Map(uid → {id, approved}) }.
 */
export async function loadFollowEdges(uid) {
  const empty = { docs: [] }
  const [outSnap, inSnap] = await Promise.all([
    safe(getDocs(query(collection(db, 'follows'), where('follower_id', '==', uid))), empty),
    safe(getDocs(query(collection(db, 'follows'), where('following_id', '==', uid))), empty),
  ])
  const outgoing = new Map(outSnap.docs.map((d) => [d.data().following_id, { id: d.id, approved: !!d.data().approved }]))
  const incoming = new Map(inSnap.docs.map((d) => [d.data().follower_id, { id: d.id, approved: !!d.data().approved }]))
  return { outgoing, incoming }
}

async function loadProfiles(uids) {
  const snaps = await Promise.all(uids.map((id) => safe(getDoc(doc(db, 'profiles', id)), null)))
  return snaps.filter((s) => s?.exists()).map((s) => ({ uid: s.id, ...s.data() }))
}

/**
 * People I can work with: my org plus anyone connected by an approved follow
 * in either direction (which covers people outside my organization).
 * Each entry gets `inOrg: boolean`.
 */
export async function loadConnections(uid, myProfile) {
  const [orgMembers, { outgoing, incoming }] = await Promise.all([
    loadOrgMembers(uid, myProfile),
    loadFollowEdges(uid),
  ])
  const inOrg = new Set(orgMembers.map((m) => m.uid))
  const connectedIds = [
    ...[...outgoing].filter(([, e]) => e.approved).map(([id]) => id),
    ...[...incoming].filter(([, e]) => e.approved).map(([id]) => id),
  ].filter((id) => id !== uid && !inOrg.has(id))
  const outside = await loadProfiles([...new Set(connectedIds)])
  return [
    ...orgMembers.map((m) => ({ ...m, inOrg: true })),
    ...outside.map((m) => ({ ...m, inOrg: false })),
  ]
}

/** Public profiles anyone on FlowSync can discover. */
export async function loadPublicProfiles(uid) {
  const snap = await safe(getDocs(query(collection(db, 'profiles'), where('visibility', '==', 'public'))), { docs: [] })
  return snap.docs.filter((d) => d.id !== uid).map((d) => ({ uid: d.id, ...d.data() }))
}

/**
 * Follow someone. Public profiles are followed instantly (like Instagram);
 * everyone else gets a request they approve. Returns 'following' | 'pending'.
 */
export async function followUser(uid, target) {
  const approved = target?.visibility === 'public'
  await setDoc(doc(db, 'follows', `${uid}_${target.uid}`), {
    follower_id:  uid,
    following_id: target.uid,
    approved,
    created_at:   serverTimestamp(),
  })
  return approved ? 'following' : 'pending'
}

/**
 * Whether `viewer` may see `target`'s profile details, based on the
 * visibility the target chose.
 */
export function canViewDetails({ viewerUid, viewerProfile, target, followsTarget }) {
  if (!target) return false
  if (viewerUid === target.uid) return true
  const vis = target.visibility ?? 'org'
  if (vis === 'public') return true
  if (followsTarget) return true
  if (vis === 'org') return !!orgKeyOf(viewerProfile) && orgKeyOf(viewerProfile) === orgKeyOf(target)
  return false
}
