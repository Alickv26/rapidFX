import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePaperMode } from '../contexts/PaperModeContext'
import { DollarSign, TrendingUp, BarChart3, Activity, Zap } from 'lucide-react'
import { subscribeOpenTrades, subscribeSignals } from '../lib/firestore'
import type { Trade, Signal } from '../types/trade'

export function DashboardPage() {
  const { user } = useAuth()
  const { paperMode } = usePaperMode()
  const [trades, setTrades] = useState<Trade[]>([])
  const [signals, setSignals] = useState<Signal[]>([])

  useEffect(() => {
    if (!user) return
    const unsubTrades = subscribeOpenTrades(user.uid, setTrades)
    const unsubSignals = subscribeSignals(user.uid, setSignals, 5)
    return () => { unsubTrades(); unsubSignals() }
  }, [user])

  const openTrades = trades.filter((t) => t.status === 'open')
  const closedTrades = trades.filter((t) => t.status === 'closed')
  const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length
  const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const winRate = closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(0) : '—'

  const stats = [
    { label: 'Balance', value: paperMode ? '$100,000.00' : '—', icon: DollarSign, color: 'text-brand-400' },
    { label: 'Win Rate', value: `${winRate}%`, icon: BarChart3, color: 'text-brand-400' },
    { label: 'Open Trades', value: String(openTrades.length), icon: Activity, color: 'text-amber-400' },
    { label: 'Total P&L', value: totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`, icon: TrendingUp, color: totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1">
            Welcome back, {user?.email?.split('@')[0]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${paperMode ? 'bg-amber-900/30 text-amber-400' : 'bg-surface-800 text-surface-400'}`}>
            <Zap className="w-3 h-3" />
            {paperMode ? 'Paper Trading' : 'Live Mode'}
          </span>
          <button className="btn btn-primary text-sm">
            Start Bot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-surface-400">{s.label}</p>
              <p className="text-lg font-semibold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {openTrades.length === 0 && signals.length === 0 ? (
        <div className="card p-8 text-center text-surface-400">
          <Activity className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p>No active trades or signals yet.</p>
          <p className="text-sm mt-1">Create a strategy and activate it — the bot engine will detect patterns automatically.</p>
        </div>
      ) : (
        <>
          {openTrades.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Open Trades</h2>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 text-surface-400 text-xs uppercase">
                      <th className="text-left p-3">Pair</th>
                      <th className="text-left p-3">Direction</th>
                      <th className="text-right p-3">Entry</th>
                      <th className="text-right p-3">Current</th>
                      <th className="text-right p-3">SL</th>
                      <th className="text-right p-3">TP</th>
                      <th className="text-right p-3">Pips</th>
                      <th className="text-right p-3">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openTrades.map((t) => (
                      <tr key={t.id} className="border-b border-surface-700/50">
                        <td className="p-3 font-medium">{t.pair}</td>
                        <td className="p-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${t.direction === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                            {t.direction === 'buy' ? 'LONG' : 'SHORT'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">{t.openPrice.toFixed(5)}</td>
                        <td className="p-3 text-right font-mono">—</td>
                        <td className="p-3 text-right font-mono text-red-400">{t.sl.toFixed(5)}</td>
                        <td className="p-3 text-right font-mono text-green-400">{t.tp.toFixed(5)}</td>
                        <td className="p-3 text-right font-mono">{t.pips ?? '—'}</td>
                        <td className={`p-3 text-right font-mono ${(t.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {t.pnl != null ? `$${t.pnl.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {signals.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Recent Signals</h2>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 text-surface-400 text-xs uppercase">
                      <th className="text-left p-3">Time</th>
                      <th className="text-left p-3">Pair</th>
                      <th className="text-left p-3">Direction</th>
                      <th className="text-left p-3">Patterns</th>
                      <th className="text-right p-3">Price</th>
                      <th className="text-center p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.map((s) => (
                      <tr key={s.id} className="border-b border-surface-700/50">
                        <td className="p-3 text-surface-400">{new Date(s.timestamp).toLocaleTimeString()}</td>
                        <td className="p-3 font-medium">{s.pair}</td>
                        <td className="p-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${s.direction === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                            {s.direction === 'buy' ? 'BUY' : 'SELL'}
                          </span>
                        </td>
                        <td className="p-3 text-surface-400">{s.patterns.join(', ')}</td>
                        <td className="p-3 text-right font-mono">{s.price.toFixed(5)}</td>
                        <td className="p-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded ${s.executed ? 'bg-green-900/30 text-green-400' : 'bg-surface-700 text-surface-400'}`}>
                            {s.executed ? 'Executed' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}