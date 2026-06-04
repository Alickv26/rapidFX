import { XMLParser } from 'fast-xml-parser'
import { getFirestore } from '../firestore-client.js'
import type { NewsEvent } from '../types.js'

export class RateLimitError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'RateLimitError'
  }
}

const FF_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml'

interface FFEvent {
  title?: string | { '#text'?: string }
  country?: string | { '#text'?: string }
  date?: string | { '#text'?: string }
  time?: string | { '#text'?: string }
  impact?: string | { '#text'?: string }
  forecast?: string | { '#text'?: string }
  previous?: string | { '#text'?: string }
  url?: string | { '#text'?: string }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'event',
})

const IMPACT_MAP: Record<string, 'High' | 'Medium' | 'Low'> = {
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
  Holiday: 'Low',
}

function parseDateString(dateStr: string): string {
  // MM-DD-YYYY → YYYY-MM-DD
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[0]}-${parts[1]}`
  }
  return dateStr
}

function parseTimeTo24(dateStr: string, timeStr: string): number {
  if (!timeStr) {
    return new Date(`${parseDateString(dateStr)}T00:00:00Z`).getTime()
  }
  const t = timeStr.toLowerCase().replace(/\s/g, '')
  const isPM = t.includes('pm')
  const isAM = t.includes('am')
  const digits = t.replace(/[^0-9:]/g, '')
  const parts = digits.split(':')
  let hour = parseInt(parts[0] || '0', 10)
  const minute = parseInt(parts[1] || '0', 10)

  if (isPM && hour < 12) hour += 12
  if (isAM && hour === 12) hour = 0

  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return new Date(`${parseDateString(dateStr)}T${hh}:${mm}:00Z`).getTime()
}

function extractId(url: string): string {
  const m = url.match(/calendar\/(\d+)/)
  return m ? m[1] : url
}

function resolveText(v: string | { '#text'?: string } | undefined | null): string | null {
  if (v == null) return null
  if (typeof v === 'object' && v['#text']) return v['#text'] || null
  if (typeof v === 'string') return v || null
  return null
}

function cleanValue(v: string | { '#text'?: string } | undefined | null): string | null {
  const s = resolveText(v)
  return s || null
}

export async function fetchNewsEvents(): Promise<NewsEvent[]> {
  const res = await fetch(FF_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RapidFX/1.0)' },
  })

  if (res.status === 429 || res.status === 403) {
    throw new RateLimitError('Rate limited by Forex Factory CDN')
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Forex Factory returned ${res.status}: ${body.slice(0, 100)}`)
  }

  const xml = await res.text()
  if (xml.includes('Request Denied') || xml.includes('error')) {
    throw new RateLimitError('Rate limited by Forex Factory CDN')
  }

  const parsed = parser.parse(xml)
  const rawEvents: FFEvent[] = parsed?.weeklyevents?.event ?? []

  return rawEvents
    .filter((e: FFEvent) => resolveText(e.country))
    .map((e: FFEvent): NewsEvent => {
      const country = cleanValue(e.country) || ''
      const date = cleanValue(e.date) || ''
      const time = cleanValue(e.time) || ''
      const title = cleanValue(e.title) || ''
      const url = cleanValue(e.url) || ''
      const impact = cleanValue(e.impact) || 'Low'

      return {
        id: extractId(url) || `${country}_${date}_${time}_${title.replace(/\s+/g, '_')}`,
        date,
        time,
        timestamp: parseTimeTo24(date, time),
        currency: country,
        impact: IMPACT_MAP[impact] || 'Low',
        event: title,
        previous: cleanValue(e.previous),
        forecast: cleanValue(e.forecast),
        actual: null,
      }
    })
}

export async function refreshNewsCalendar(): Promise<{ count: number; cleansed: number }> {
  console.log('[news] Fetching Forex Factory calendar...')
  const events = await fetchNewsEvents()

  if (events.length === 0) {
    console.log('[news] No events returned')
    return { count: 0, cleansed: 0 }
  }

  const fdb = getFirestore()
  const batch = fdb.batch()
  let count = 0

  for (const event of events) {
    const ref = fdb.collection('newsEvents').doc(event.id)
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

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const oldSnap = await fdb
    .collection('newsEvents')
    .where('timestamp', '<', weekAgo)
    .limit(500)
    .get()

  let cleansed = 0
  if (!oldSnap.empty) {
    const delBatch = fdb.batch()
    oldSnap.docs.forEach((d) => delBatch.delete(d.ref))
    await delBatch.commit()
    cleansed = oldSnap.size
  }

  console.log(`[news] Stored ${events.length} events, cleansed ${cleansed}`)
  return { count: events.length, cleansed }
}
