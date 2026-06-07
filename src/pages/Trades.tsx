import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { subscribeTrades } from '../lib/firestore'
import type { Trade } from '../types/trade'

type FilterMode = 'all' | 'live' | 'paper'

export function TradesPage() {
  const { user } = useAuth()
  const [trades, setTrades] = useState<Trade[]>([])
  const [filter, setFilter] = useState<FilterMode>('all')

  useEffect(() => {
    if (!user) return
    return subscribeTrades(user.uid, setTrades)
  }, [user])

  const filtered = trades.filter((t) => {
    if (filter === 'all') return true
    if (filter === 'paper') return t.paper === true
    return !t.paper
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trade History</h1>
        <div className="flex items-center gap-1 bg-surface-800 rounded-lg p-0.5">
          {(['all', 'live', 'paper'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
                filter === m ? 'bg-brand-500 text-white' : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex items-center justify-center h-48 text-surface-400 text-sm border-2 border-dashed border-surface-200 rounded-lg">
          {trades.length === 0
            ? 'No trades yet. Signals will appear here once the bot engine executes them.'
            : `No ${filter === 'paper' ? 'paper' : 'live'} trades to show.`}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 text-surface-400 text-xs uppercase">
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Pair</th>
                <th className="text-left p-3">Direction</th>
                <th className="text-right p-3">Volume</th>
                <th className="text-right p-3">Entry</th>
                <th className="text-right p-3">Exit</th>
                <th className="text-right p-3">Pips</th>
                <th className="text-right p-3">P&L</th>
                <th className="text-center p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-surface-700/50">
                  <td className="p-3 text-surface-400 font-mono text-xs">{new Date(t.openTime).toLocaleString()}</td>
                  <td className="p-3 font-medium flex items-center gap-1.5">
                    {t.pair}
                    {t.paper && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 font-medium">
                        PAPER
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${t.direction === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {t.direction === 'buy' ? 'BUY' : 'SELL'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono">{t.volume.toFixed(2)}</td>
                  <td className="p-3 text-right font-mono">{t.openPrice.toFixed(5)}</td>
                  <td className="p-3 text-right font-mono">{t.closePrice != null ? t.closePrice.toFixed(5) : '—'}</td>
                  <td className="p-3 text-right font-mono">{t.pips ?? '—'}</td>
                  <td className={`p-3 text-right font-mono ${(t.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {t.pnl != null ? `$${t.pnl.toFixed(2)}` : '—'}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${t.status === 'open' ? 'bg-amber-900/30 text-amber-400' : 'bg-surface-700 text-surface-400'}`}>
                      {t.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}