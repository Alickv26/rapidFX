import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth } from '../config/firebase'

interface AuthState {
  user: User | null
  loading: boolean
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<unknown>
  signUp: (email: string, password: string) => Promise<unknown>
  signInWithGoogle: () => Promise<unknown>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false })
    })
    return unsub
  }, [])

  const signIn = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password)

  const signUp = (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password)

  const signInWithGoogle = () =>
    signInWithPopup(auth, new GoogleAuthProvider())

  const signOut = () => firebaseSignOut(auth)

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
