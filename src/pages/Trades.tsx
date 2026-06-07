import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import { subscribeTrades } from '../lib/firestore'
import type { Trade } from '../types/trade'

export function TradesPage() {
  const { user } = useAuth()
  const { activeAccount } = useAccount()
  const [trades, setTrades] = useState<Trade[]>([])

  useEffect(() => {
    if (!user) return
    return subscribeTrades(user.uid, setTrades, activeAccount?.id)
  }, [user, activeAccount?.id])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trade History</h1>
        {activeAccount && (
          <span className="text-sm text-surface-400">{activeAccount.label}</span>
        )}
      </div>

      {trades.length === 0 ? (
        <div className="card flex items-center justify-center h-48 text-surface-400 text-sm border-2 border-dashed border-surface-200 rounded-lg">
          No trades yet. Signals will appear here once the bot engine executes them.
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
              {trades.map((t) => (
                <tr key={t.id} className="border-b border-surface-700/50">
                  <td className="p-3 text-surface-400 font-mono text-xs">{new Date(t.openTime).toLocaleString()}</td>
                  <td className="p-3 font-medium">{t.pair}</td>
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
