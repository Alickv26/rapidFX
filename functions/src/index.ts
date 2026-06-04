import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { fetchNewsEvents } from './forexfactory'

setGlobalOptions({ region: 'europe-west1' })

if (!getApps().length) {
  initializeApp()
}

const db = getFirestore()

async function refreshNews(): Promise<void> {
  console.log('[news] Fetching Forex Factory calendar...')
  const events = await fetchNewsEvents()
  console.log(`[news] Fetched ${events.length} events`)

  const batch = db.batch()
  let count = 0

  for (const event of events) {
    const ref = db.collection('newsEvents').doc(event.id)
    batch.set(ref, event, { merge: true })
    count++
    if (count >= 500) {
      await batch.commit()
      count = 0
    }
  }

  if (count > 0) {
    await batch.commit()
  }

  // cleanse events older than 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const oldSnap = await db
    .collection('newsEvents')
    .where('timestamp', '<', weekAgo)
    .limit(500)
    .get()

  if (!oldSnap.empty) {
    const delBatch = db.batch()
    oldSnap.docs.forEach((d) => delBatch.delete(d.ref))
    await delBatch.commit()
    console.log(`[news] Cleansed ${oldSnap.size} old events`)
  }

  console.log('[news] Refresh complete')
}

export const refreshNewsCalendar = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'UTC' },
  async () => {
    await refreshNews()
  }
)

export const refreshNewsCalendarCallable = onCall(async () => {
  await refreshNews()
  return { success: true }
})
