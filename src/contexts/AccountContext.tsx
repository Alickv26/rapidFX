import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { subscribeAccounts, createAccount, updateAccount, deleteAccount, migrateUserToMultiAccount } from '../lib/firestore'
import type { Account, AccountInput } from '../types/account'

interface AccountContextType {
  accounts: Account[]
  activeAccount: Account | null
  switchAccount: (id: string) => void
  addAccount: (data: AccountInput) => Promise<string>
  editAccount: (id: string, data: Partial<AccountInput>) => Promise<void>
  removeAccount: (id: string) => Promise<void>
  loading: boolean
}

const AccountContext = createContext<AccountContextType | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setAccounts([])
      setActiveId(null)
      setLoading(false)
      return
    }

    migrateUserToMultiAccount(user.uid).then((migratedId) => {
      if (migratedId) setActiveId(migratedId)
    })

    const unsub = subscribeAccounts(user.uid, (list) => {
      setAccounts(list)
      if (list.length > 0 && (!activeId || !list.find((a) => a.id === activeId))) {
        setActiveId(list[0].id)
      }
      setLoading(false)
    })

    return unsub
  }, [user])

  const activeAccount = accounts.find((a) => a.id === activeId) ?? accounts[0] ?? null

  const switchAccount = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  const addAccount = useCallback(async (data: AccountInput): Promise<string> => {
    if (!user) throw new Error('Not authenticated')
    return createAccount(user.uid, data)
  }, [user])

  const editAccount = useCallback(async (id: string, data: Partial<AccountInput>) => {
    if (!user) throw new Error('Not authenticated')
    await updateAccount(user.uid, id, data)
  }, [user])

  const removeAccount = useCallback(async (id: string) => {
    if (!user) throw new Error('Not authenticated')
    await deleteAccount(user.uid, id)
    if (activeId === id) setActiveId(null)
  }, [user, activeId])

  return (
    <AccountContext.Provider value={{ accounts, activeAccount, switchAccount, addAccount, editAccount, removeAccount, loading }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within AccountProvider')
  return ctx
}
