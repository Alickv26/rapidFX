import { useState, useEffect, useMemo } from 'react'
import { Newspaper, RefreshCw, Filter } from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { subscribeNewsEvents } from '../lib/firestore'
import type { NewsEvent } from '../types/news'
import { ResponsiveTable, type Column } from '../components/ResponsiveTable'

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
  const [filterOpen, setFilterOpen] = useState(true)
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

  const newsColumns: Column<NewsEvent>[] = [
    {
      header: 'Time',
      render: (e) => {
        const dt = new Date(e.timestamp)
        return <span className="text-surface-400 font-mono text-xs">{dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      },
    },
    { header: 'Currency', render: (e) => <span className="font-medium">{e.currency}</span> },
    {
      header: 'Impact',
      render: (e) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${IMPACT_STYLES[e.impact]}`}>{e.impact}</span>
      ),
    },
    { header: 'Event', render: (e) => <span className="text-surface-200 max-w-xs truncate">{e.event}</span> },
    { header: 'Actual', render: (e) => <span className="font-mono">{e.actual ?? '—'}</span>, textAlign: 'right' },
    { header: 'Forecast', render: (e) => <span className="font-mono text-surface-400">{e.forecast ?? '—'}</span>, textAlign: 'right' },
    { header: 'Previous', render: (e) => <span className="font-mono text-surface-500">{e.previous ?? '—'}</span>, textAlign: 'right' },
  ]

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

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterOpen(o => !o)}
              className="flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-200 md:hidden"
            >
              <Filter className="w-4 h-4" />
              {filterOpen ? 'Hide Filters' : 'Filters'}
            </button>
            <span className="text-xs text-surface-500">
              {displayed.length}/{totalCount} events
            </span>
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
        </div>

        <div className={`${filterOpen ? 'flex' : 'hidden'} md:flex flex-wrap items-center gap-3`}>
            <div className="flex items-center gap-2">
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
        </div>
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
        <ResponsiveTable<NewsEvent>
          columns={newsColumns}
          data={displayed}
          keyExtractor={(e) => e.id}
          mobileCard={(e) => {
            const isPast = e.timestamp < Date.now()
            return (
              <div className={`card !p-4 ${isPast ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{e.currency}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${IMPACT_STYLES[e.impact]}`}>{e.impact}</span>
                </div>
                <p className="text-sm text-surface-200 mb-1">{e.event}</p>
                <p className="text-xs text-surface-400 font-mono mb-2">
                  {new Date(e.timestamp).toLocaleDateString()} {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-surface-400">Actual</span><p className="font-mono text-surface-200">{e.actual ?? '—'}</p></div>
                  <div><span className="text-surface-400">Forecast</span><p className="font-mono text-surface-200">{e.forecast ?? '—'}</p></div>
                  <div><span className="text-surface-400">Prev</span><p className="font-mono text-surface-200">{e.previous ?? '—'}</p></div>
                </div>
              </div>
            )
          }}
        />
      )}
    </div>
  )
}
