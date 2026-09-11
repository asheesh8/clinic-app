import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAuthStore } from '../stores/authStore'
import { applyAccent, rememberAccent, isValidHex } from '../lib/theme'

export function useAuth() {
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const snap = await getDoc(doc(db, 'profiles', firebaseUser.uid))
        if (snap.exists()) {
          const data = snap.data()
          setProfile(data)
          // Colorway follows the account across devices.
          if (isValidHex(data.theme_accent)) {
            applyAccent(data.theme_accent)
            rememberAccent(data.theme_accent)
          }
        } else if (useAuthStore.getState().profile?.id !== firebaseUser.uid) {
          // Registration writes the profile right after sign-up; don't clobber it.
          setProfile(null)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [setUser, setProfile, setLoading])
}
