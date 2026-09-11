import { db } from './firebase'
import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc, increment, serverTimestamp,
} from 'firebase/firestore'
import { displayName } from './people'

export function conversationId(uid1, uid2) {
  return [uid1, uid2].sort().join('_')
}

/**
 * Create the 1:1 conversation doc if it doesn't exist yet.
 * `other` needs { uid, name, role }. Returns the conversation id.
 */
export async function ensureConversation(myUid, myProfile, other) {
  const convId  = conversationId(myUid, other.uid)
  const convRef = doc(db, 'conversations', convId)
  const snap    = await getDoc(convRef)
  if (!snap.exists()) {
    await setDoc(convRef, {
      participants:      [myUid, other.uid].sort(),
      participant_names: { [myUid]: displayName(myProfile), [other.uid]: other.name ?? 'Unknown' },
      participant_roles: { [myUid]: myProfile?.role ?? '', [other.uid]: other.role ?? '' },
      last_message:      '',
      last_message_time: serverTimestamp(),
      last_sender_id:    '',
      unread_count:      { [myUid]: 0, [other.uid]: 0 },
      created_at:        serverTimestamp(),
    })
  }
  return convId
}

/** Append a message and bump the other participant's unread count. */
export async function sendMessage(convId, myUid, myProfile, otherUid, text) {
  await addDoc(collection(db, 'conversations', convId, 'messages'), {
    sender_id:   myUid,
    sender_name: displayName(myProfile),
    text,
    created_at:  serverTimestamp(),
    read:        false,
  })
  await updateDoc(doc(db, 'conversations', convId), {
    last_message:                   text,
    last_message_time:              serverTimestamp(),
    last_sender_id:                 myUid,
    [`unread_count.${myUid}`]:      0,
    [`unread_count.${otherUid}`]:   increment(1),
  })
}
