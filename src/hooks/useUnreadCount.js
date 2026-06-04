import { useState, useEffect } from 'react'
import { auth, db } from '../lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'

export function useUnreadCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', uid)
    )

    const unsub = onSnapshot(q, (snap) => {
      const total = snap.docs.reduce(
        (sum, d) => sum + (d.data().unread_count?.[uid] ?? 0),
        0
      )
      setCount(total)
    })

    return () => unsub()
  }, [])

  return count
}
