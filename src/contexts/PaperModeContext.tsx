import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { subscribePaperMode, setPaperMode } from '../lib/firestore'

interface PaperModeContextType {
  paperMode: boolean
  togglePaperMode: () => void
  loading: boolean
}

const PaperModeContext = createContext<PaperModeContextType | null>(null)

export function PaperModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [paperMode, setLocalMode] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    const unsub = subscribePaperMode(user.uid, (mode) => {
      setLocalMode(mode)
      setLoading(false)
    })
    return unsub
  }, [user])

  const togglePaperMode = () => {
    if (!user) return
    const next = !paperMode
    setLocalMode(next)
    setPaperMode(user.uid, next)
  }

  return (
    <PaperModeContext.Provider value={{ paperMode, togglePaperMode, loading }}>
      {children}
    </PaperModeContext.Provider>
  )
}

export function usePaperMode() {
  const ctx = useContext(PaperModeContext)
  if (!ctx) throw new Error('usePaperMode must be used within PaperModeProvider')
  return ctx
}
