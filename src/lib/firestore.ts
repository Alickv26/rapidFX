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
  Timestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Strategy, StrategyInput } from '../types/strategy'

const STRATEGIES = 'strategies'

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
