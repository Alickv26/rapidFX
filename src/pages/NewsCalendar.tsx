import { useState, useEffect, useMemo } from 'react'
import { Newspaper, RefreshCw, Filter } from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { subscribeNewsEvents } from '../lib/firestore'
import type { NewsEvent } from '../types/news'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD']
const IMPACTS = ['High', 'Medium', 'Low'] as const

const IMPACT_STYLES: Record<string, string> = {
  High: 'bg-red-900/30 text-red-400',
  Medium: 'bg-orange-900/30 text-orange-400',
  Low: 'bg-yellow-900/30 text-yellow-400',
}

export function NewsCalendarPage() {
  const [events, setEvents] = useState<NewsEvent[]>([])
  const [curFilter, setCurFilter] = useState<string>('all')
  const [impFilter, setImpFilter] = useState<Set<string>>(new Set(IMPACTS))
  const [dayFilter, setDayFilter] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeNewsEvents(setEvents)
    return unsub
  }, [])

  const filtered = useMemo(() => {
    const now = Date.now()
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)

    if (dayFilter === 'today') {
      const tomorrow = dayStart.getTime() + 24 * 60 * 60 * 1000
      return events.filter((e) => e.timestamp >= dayStart.getTime() && e.timestamp < tomorrow)
    }
    if (dayFilter === 'week') {
      const week = dayStart.getTime() + 7 * 24 * 60 * 60 * 1000
      return events.filter((e) => e.timestamp >= dayStart.getTime() && e.timestamp < week)
    }
    return events.filter((e) => e.timestamp >= now)
  }, [events, dayFilter])

  const displayed = useMemo(() => {
    return filtered.filter((e) => {
      if (curFilter !== 'all' && e.currency !== curFilter) return false
      if (!impFilter.has(e.impact)) return false
      return true
    })
  }, [filtered, curFilter, impFilter])

  const toggleImpact = (imp: string) => {
    const next = new Set(impFilter)
    if (next.has(imp)) next.delete(imp)
    else next.add(imp)
    setImpFilter(next)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      const functions = getFunctions(undefined, 'europe-west1')
      const refreshNews = httpsCallable(functions, 'refreshNewsCalendarCallable')
      await refreshNews()
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh news')
    } finally {
      setRefreshing(false)
    }
  }

  const totalCount = events.length

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="w-6 h-6 text-brand-400" />
          <div>
            <h1 className="text-2xl font-bold">News Calendar</h1>
            <p className="text-surface-400 text-sm">Forex Factory economic calendar</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-surface-400" />
          <select className="input text-sm py-1.5" value={curFilter} onChange={(e) => setCurFilter(e.target.value)}>
            <option value="all">All Currencies</option>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {IMPACTS.map((imp) => (
            <button
              key={imp}
              onClick={() => toggleImpact(imp)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                impFilter.has(imp)
                  ? `${IMPACT_STYLES[imp]} border-current`
                  : 'border-surface-600 text-surface-500'
              }`}
            >
              {imp}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 border border-surface-700 rounded-lg overflow-hidden">
          {['today', 'week', 'all'].map((d) => (
            <button
              key={d}
              onClick={() => setDayFilter(d)}
              className={`text-xs px-3 py-1.5 transition-colors ${
                dayFilter === d ? 'bg-brand-500/20 text-brand-400' : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              {d === 'today' ? 'Today' : d === 'week' ? 'This Week' : 'Upcoming'}
            </button>
          ))}
        </div>

        <span className="text-xs text-surface-500 ml-auto">{displayed.length} / {totalCount} events</span>
      </div>

      {totalCount === 0 ? (
        <div className="card p-8 text-center text-surface-400">
          <Newspaper className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p>No news events loaded yet.</p>
          <p className="text-sm mt-1">Click <strong>Refresh</strong> to fetch the latest economic calendar from Forex Factory.</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="card p-8 text-center text-surface-400">
          <Filter className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p>No events match the selected filters.</p>
          <p className="text-sm mt-1">Try adjusting the filters above — {totalCount} events available.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 text-surface-400 text-xs uppercase">
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Currency</th>
                <th className="text-left p-3">Impact</th>
                <th className="text-left p-3">Event</th>
                <th className="text-right p-3">Actual</th>
                <th className="text-right p-3">Forecast</th>
                <th className="text-right p-3">Previous</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((e) => {
                const dt = new Date(e.timestamp)
                const isPast = e.timestamp < Date.now()
                return (
                  <tr key={e.id} className={`border-b border-surface-700/50 ${isPast ? 'opacity-60' : ''}`}>
                    <td className="p-3 whitespace-nowrap text-surface-400 font-mono text-xs">
                      {dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 font-medium">{e.currency}</td>
                    <td className="p-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${IMPACT_STYLES[e.impact]}`}>
                        {e.impact}
                      </span>
                    </td>
                    <td className="p-3 text-surface-200 max-w-xs truncate">{e.event}</td>
                    <td className="p-3 text-right font-mono">{e.actual ?? '—'}</td>
                    <td className="p-3 text-right font-mono text-surface-400">{e.forecast ?? '—'}</td>
                    <td className="p-3 text-right font-mono text-surface-500">{e.previous ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
