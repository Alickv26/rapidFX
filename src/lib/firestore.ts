import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Strategy, StrategyInput } from '../types/strategy'
import type { Trade, Signal } from '../types/trade'

const STRATEGIES = 'strategies'
const TRADES = 'trades'
const SIGNALS = 'signals'

// ── Strategies ──

export async function getStrategies(uid: string): Promise<Strategy[]> {
  const q = query(collection(db, STRATEGIES), where('uid', '==', uid))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Strategy))
    .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())
}

export async function getStrategy(id: string): Promise<Strategy | null> {
  const snap = await getDoc(doc(db, STRATEGIES, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Strategy
}

export async function createStrategy(uid: string, data: StrategyInput): Promise<string> {
  const now = Timestamp.now()
  const ref = await addDoc(collection(db, STRATEGIES), {
    ...data,
    uid,
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updateStrategy(id: string, data: Partial<StrategyInput & { active: boolean }>): Promise<void> {
  await updateDoc(doc(db, STRATEGIES, id), {
    ...data,
    updatedAt: Timestamp.now(),
  })
}

export async function deleteStrategy(id: string): Promise<void> {
  await deleteDoc(doc(db, STRATEGIES, id))
}

// ── Trades ──

export function subscribeTrades(uid: string, cb: (trades: Trade[]) => void): Unsubscribe {
  const q = query(
    collection(db, TRADES),
    where('uid', '==', uid),
    orderBy('openTime', 'desc'),
    limit(50)
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trade)))
  })
}

export function subscribeOpenTrades(uid: string, cb: (trades: Trade[]) => void): Unsubscribe {
  const q = query(
    collection(db, TRADES),
    where('uid', '==', uid),
    where('status', '==', 'open'),
    orderBy('openTime', 'desc')
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trade)))
  })
}

// ── Signals ──

export function subscribeSignals(uid: string, cb: (signals: Signal[]) => void, max = 20): () => void {
  let unsub: (() => void) | null = null
  const strategiesQuery = query(collection(db, STRATEGIES), where('uid', '==', uid))
  getDocs(strategiesQuery).then((strategySnap) => {
    const strategyIds = strategySnap.docs.map((d) => d.id)
    if (strategyIds.length === 0) {
      cb([])
      return
    }
    const q = query(
      collection(db, SIGNALS),
      where('strategyId', 'in', strategyIds.slice(0, 10)),
      orderBy('timestamp', 'desc'),
      limit(max)
    )
    unsub = onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Signal)))
    })
  })
  return () => { if (unsub) unsub() }
}
