import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore as getAdminFirestore, type Firestore } from 'firebase-admin/firestore'
import type { StrategyConfig, Trade, Signal } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let db: Firestore | null = null
let initialized = false

function getFirestore(): Firestore {
  if (initialized && db) return db

  const serviceAccountPath = resolve(__dirname, '..', 'service-account.json')

  if (!existsSync(serviceAccountPath)) {
    console.error('\x1b[31m%s\x1b[0m', 'FATAL: service-account.json not found at bot-engine/service-account.json')
    console.error('Generate one at: Firebase Console → Project Settings → Service Accounts → Generate new private key')
    process.exit(1)
  }

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))

  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) })
  }

  db = getAdminFirestore()
  initialized = true
  return db
}

export function setFirestoreForTesting(mockDb: Firestore): void {
  db = mockDb
  initialized = true
}

export async function loadActiveStrategies(): Promise<StrategyConfig[]> {
  const firestore = getFirestore()
  const snap = await firestore.collection('strategies').where('active', '==', true).get()

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as StrategyConfig[]
}

export async function loadStrategy(id: string): Promise<StrategyConfig | null> {
  const firestore = getFirestore()
  const snap = await firestore.collection('strategies').doc(id).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() } as StrategyConfig
}

export async function writeTrade(trade: Omit<Trade, 'id'>): Promise<string> {
  const firestore = getFirestore()
  const ref = await firestore.collection('trades').add(trade)
  return ref.id
}

export async function updateTrade(id: string, data: Partial<Trade>): Promise<void> {
  const firestore = getFirestore()
  await firestore.collection('trades').doc(id).update(data)
}

export async function writeSignal(signal: Omit<Signal, 'id'>): Promise<string> {
  const firestore = getFirestore()
  const ref = await firestore.collection('signals').add(signal)
  return ref.id
}

export async function updateSignal(id: string, data: Partial<Signal>): Promise<void> {
  const firestore = getFirestore()
  await firestore.collection('signals').doc(id).update(data)
}

export async function writeAuditLog(entry: {
  uid: string
  action: string
  details: unknown
  timestamp: number
}): Promise<void> {
  const firestore = getFirestore()
  await firestore.collection('auditLogs').add(entry)
}

export async function updateAccountSnapshot(
  uid: string,
  data: { balance: number; equity: number; margin: number }
): Promise<void> {
  const firestore = getFirestore()
  await firestore.collection('users').doc(uid).collection('accountSnapshots').add({
    ...data,
    timestamp: Date.now(),
  })
}
