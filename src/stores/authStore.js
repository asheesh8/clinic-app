import { create } from 'zustand'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '../lib/firebase'

export const useAuthStore = create((set) => ({
  user:    null,
  profile: null,
  loading: true,

  setUser:    (user)    => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  signOut: async () => {
    await firebaseSignOut(auth)
    set({ user: null, profile: null })
  },
}))
