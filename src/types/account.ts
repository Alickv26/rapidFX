import type { Timestamp } from 'firebase/firestore'

export interface Account {
  id: string
  label: string
  type: 'paper' | 'demo' | 'live'
  balance: number
  equity: number
  apiKey: string
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type AccountInput = Omit<Account, 'id' | 'createdAt' | 'updatedAt'>
