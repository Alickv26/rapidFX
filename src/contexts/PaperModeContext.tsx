import { createContext, useContext, useState, type ReactNode } from 'react'

interface PaperModeContextType {
  paperMode: boolean
  togglePaperMode: () => void
}

const PaperModeContext = createContext<PaperModeContextType | null>(null)

export function PaperModeProvider({ children }: { children: ReactNode }) {
  const [paperMode, setPaperMode] = useState(true)

  const togglePaperMode = () => setPaperMode((p) => !p)

  return (
    <PaperModeContext.Provider value={{ paperMode, togglePaperMode }}>
      {children}
    </PaperModeContext.Provider>
  )
}

export function usePaperMode() {
  const ctx = useContext(PaperModeContext)
  if (!ctx) throw new Error('usePaperMode must be used within PaperModeProvider')
  return ctx
}
