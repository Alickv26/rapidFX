import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import { subscribeTrades } from '../lib/firestore'
import type { Trade } from '../types/trade'
import { ResponsiveTable, type Column } from '../components/ResponsiveTable'
import { SkeletonTable } from '../components/Skeleton'

const tradeColumns: Column<Trade>[] = [
  { header: 'Time', render: (t) => <span className="text-surface-400 font-mono text-xs">{new Date(t.openTime).toLocaleString()}</span> },
  { header: 'Pair', render: (t) => <span className="font-medium">{t.pair}</span> },
  {
    header: 'Direction',
    render: (t) => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${t.direction === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
        {t.direction === 'buy' ? 'BUY' : 'SELL'}
      </span>
    ),
  },
  { header: 'Volume', render: (t) => <span className="font-mono">{t.volume.toFixed(2)}</span>, textAlign: 'right' },
  { header: 'Entry', render: (t) => <span className="font-mono">{t.openPrice.toFixed(5)}</span>, textAlign: 'right' },
  { header: 'Exit', render: (t) => <span className="font-mono">{t.closePrice != null ? t.closePrice.toFixed(5) : '—'}</span>, textAlign: 'right' },
  { header: 'Pips', render: (t) => <span className="font-mono">{t.pips ?? '—'}</span>, textAlign: 'right' },
  { header: 'P&L', render: (t) => <span className={`font-mono ${(t.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{t.pnl != null ? `$${t.pnl.toFixed(2)}` : '—'}</span>, textAlign: 'right' },
  {
    header: 'Status',
    render: (t) => (
      <span className={`text-xs px-2 py-0.5 rounded ${t.status === 'open' ? 'bg-amber-900/30 text-amber-400' : 'bg-surface-700 text-surface-400'}`}>
        {t.status === 'open' ? 'Open' : 'Closed'}
      </span>
    ),
    textAlign: 'center',
  },
]

export function TradesPage() {
  const { user } = useAuth()
  const { activeAccount } = useAccount()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoaded(false)
    const timer = setTimeout(() => setLoaded(true), 3000)
    const unsub = subscribeTrades(user.uid, (d: Trade[]) => { setTrades(d); clearTimeout(timer); setLoaded(true) }, activeAccount?.id)
    return () => { clearTimeout(timer); unsub() }
  }, [user, activeAccount?.id])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trade History</h1>
        {activeAccount && (
          <span className="text-sm text-surface-400">{activeAccount.label}</span>
        )}
      </div>

      {!loaded ? (
        <SkeletonTable rows={6} />
      ) : trades.length === 0 ? (
        <div className="card flex items-center justify-center h-48 text-surface-400 text-sm border-2 border-dashed border-surface-200 rounded-lg">
          No trades yet. Signals will appear here once the bot engine executes them.
        </div>
      ) : (
        <ResponsiveTable<Trade>
          columns={tradeColumns}
          data={trades}
          keyExtractor={(t) => t.id}
          mobileCard={(t) => (
            <div className="card !p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-surface-200">{t.pair}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${t.status === 'open' ? 'bg-amber-900/30 text-amber-400' : 'bg-surface-700 text-surface-400'}`}>
                    {t.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${t.direction === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                  {t.direction === 'buy' ? 'BUY' : 'SELL'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-xs text-surface-400">Entry</span><p className="font-mono">{t.openPrice.toFixed(5)}</p></div>
                <div><span className="text-xs text-surface-400">Exit</span><p className="font-mono">{t.closePrice != null ? t.closePrice.toFixed(5) : '—'}</p></div>
                <div><span className="text-xs text-surface-400">Vol</span><p className="font-mono">{t.volume.toFixed(2)}</p></div>
                <div><span className="text-xs text-surface-400">Pips</span><p className="font-mono">{t.pips ?? '—'}</p></div>
                <div><span className="text-xs text-surface-400">Time</span><p className="font-mono text-xs text-surface-400">{new Date(t.openTime).toLocaleString()}</p></div>
                <div><span className="text-xs text-surface-400">P&L</span><p className={`font-mono ${(t.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{t.pnl != null ? `$${t.pnl.toFixed(2)}` : '—'}</p></div>
              </div>
            </div>
          )}
        />
      )}
    </div>
  )
}
