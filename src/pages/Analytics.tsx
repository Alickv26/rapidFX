import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import { subscribeAllTrades, subscribeStrategies } from '../lib/firestore'
import type { Trade } from '../types/trade'
import type { Strategy } from '../types/strategy'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Target,
  ArrowDown,
  Trophy,
  Download,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatPnl(v: number): string {
  return v >= 0 ? `+$${v.toFixed(2)}` : `-$${Math.abs(v).toFixed(2)}`
}

function downloadCSV(trades: Trade[]): void {
  const headers = ['Time', 'Pair', 'Direction', 'Volume', 'Entry', 'Exit', 'SL', 'TP', 'Pips', 'P&L', 'Status', 'Paper', 'Reason']
  const rows = trades.map((t) => [
    new Date(t.openTime).toISOString(),
    t.pair,
    t.direction,
    t.volume.toFixed(2),
    t.openPrice.toFixed(5),
    t.closePrice?.toFixed(5) ?? '',
    t.sl.toFixed(5),
    t.tp.toFixed(5),
    t.pips?.toFixed(1) ?? '',
    t.pnl?.toFixed(2) ?? '',
    t.status,
    t.paper ? 'Yes' : 'No',
    t.reason,
  ])
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rapidfx_trades_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function computeStats(closed: Trade[]) {
  if (closed.length === 0) return null

  const total = closed.length
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0)
  const losses = closed.filter((t) => (t.pnl ?? 0) <= 0)
  const winRate = (wins.length / total) * 100
  const grossProfit = wins.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
  const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0

  const sorted = [...closed].sort((a, b) => (a.closeTime ?? 0) - (b.closeTime ?? 0))
  let peak = 0
  let maxDd = 0
  let cum = 0
  const returns: number[] = []
  for (const t of sorted) {
    const pnl = t.pnl ?? 0
    cum += pnl
    returns.push(pnl)
    if (cum > peak) peak = cum
    const dd = peak - cum
    if (dd > maxDd) maxDd = dd
  }

  const mean = returns.reduce((s, v) => s + v, 0) / returns.length
  const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length
  const stdDev = Math.sqrt(variance)
  const sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0

  let streak = 0
  let maxWinStreak = 0
  let maxLossStreak = 0
  for (const t of sorted) {
    if ((t.pnl ?? 0) > 0) {
      streak = streak > 0 ? streak + 1 : 1
      if (streak > maxWinStreak) maxWinStreak = streak
    } else {
      streak = streak < 0 ? streak - 1 : -1
      if (streak < maxLossStreak) maxLossStreak = streak
    }
  }

  return {
    total,
    wins: wins.length,
    losses: losses.length,
    winRate,
    profitFactor,
    totalPnl,
    avgWin,
    avgLoss,
    maxDrawdown: maxDd,
    bestTrade: Math.max(...closed.map((t) => t.pnl ?? 0)),
    worstTrade: Math.min(...closed.map((t) => t.pnl ?? 0)),
    maxWinStreak,
    maxLossStreak: Math.abs(maxLossStreak),
    sharpe,
  }
}

function groupByMonth(closed: Trade[]) {
  const map = new Map<string, { pnl: number; wins: number; total: number }>()
  for (const t of closed) {
    const d = new Date(t.closeTime ?? t.openTime)
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
    const g = map.get(key) ?? { pnl: 0, wins: 0, total: 0 }
    g.pnl += t.pnl ?? 0
    g.total++
    if ((t.pnl ?? 0) > 0) g.wins++
    map.set(key, g)
  }
  return [...map.entries()].map(([month, v]) => ({ month, ...v })).sort((a, b) => {
    const [ma, ya] = a.month.split(' ')
    const [mb, yb] = b.month.split(' ')
    return (parseInt(ya) - parseInt(yb)) || (monthNames.indexOf(ma) - monthNames.indexOf(mb))
  })
}

function groupByPair(closed: Trade[]) {
  const map = new Map<string, { pnl: number; wins: number; total: number }>()
  for (const t of closed) {
    const g = map.get(t.pair) ?? { pnl: 0, wins: 0, total: 0 }
    g.pnl += t.pnl ?? 0
    g.total++
    if ((t.pnl ?? 0) > 0) g.wins++
    map.set(t.pair, g)
  }
  return [...map.entries()]
    .map(([pair, v]) => ({ pair, ...v }))
    .sort((a, b) => b.pnl - a.pnl)
}

function groupByDirection(closed: Trade[]) {
  const map = new Map<string, { pnl: number; wins: number; total: number }>()
  for (const t of closed) {
    const g = map.get(t.direction) ?? { pnl: 0, wins: 0, total: 0 }
    g.pnl += t.pnl ?? 0
    g.total++
    if ((t.pnl ?? 0) > 0) g.wins++
    map.set(t.direction, g)
  }
  return [...map.entries()].map(([dir, v]) => ({ direction: dir, ...v }))
}

function groupByStrategy(closed: Trade[], strategyMap: Map<string, string>) {
  const map = new Map<string, { pnl: number; wins: number; total: number }>()
  for (const t of closed) {
    const g = map.get(t.strategyId) ?? { pnl: 0, wins: 0, total: 0 }
    g.pnl += t.pnl ?? 0
    g.total++
    if ((t.pnl ?? 0) > 0) g.wins++
    map.set(t.strategyId, g)
  }
  return [...map.entries()]
    .map(([id, v]) => ({ strategy: strategyMap.get(id) ?? id, ...v }))
    .sort((a, b) => b.pnl - a.pnl)
}

function computeEquityCurve(closed: Trade[]) {
  const sorted = [...closed].sort((a, b) => (a.closeTime ?? 0) - (b.closeTime ?? 0))
  let cum = 0
  return sorted.map((t) => {
    cum += t.pnl ?? 0
    return { time: new Date(t.closeTime ?? t.openTime).toLocaleDateString(), equity: cum }
  })
}

export function AnalyticsPage() {
  const { user } = useAuth()
  const { activeAccount } = useAccount()
  const [trades, setTrades] = useState<Trade[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])

  useEffect(() => {
    if (!user) return
    const unsubTrades = subscribeAllTrades(user.uid, setTrades, activeAccount?.id)
    const unsubStrategies = subscribeStrategies(user.uid, setStrategies, activeAccount?.id)
    return () => { unsubTrades(); unsubStrategies() }
  }, [user, activeAccount?.id])

  const strategyMap = useMemo(
    () => new Map(strategies.map((s) => [s.id, s.name])),
    [strategies],
  )

  const closedTrades = useMemo(
    () => trades.filter((t) => t.status === 'closed'),
    [trades],
  )

  const stats = useMemo(() => computeStats(closedTrades), [closedTrades])
  const monthly = useMemo(() => groupByMonth(closedTrades), [closedTrades])
  const byPair = useMemo(() => groupByPair(closedTrades), [closedTrades])
  const byDirection = useMemo(() => groupByDirection(closedTrades), [closedTrades])
  const byStrategy = useMemo(() => groupByStrategy(closedTrades, strategyMap), [closedTrades, strategyMap])
  const equityCurve = useMemo(() => computeEquityCurve(closedTrades), [closedTrades])

  const topTrades = useMemo(
    () => [...closedTrades].sort((a, b) => Math.abs(b.pnl ?? 0) - Math.abs(a.pnl ?? 0)).slice(0, 5),
    [closedTrades],
  )

  if (!stats || closedTrades.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="card p-12 text-center text-surface-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No closed trades yet. Data will appear once trades are completed.</p>
        </div>
      </div>
    )
  }

  const summaryCards = [
    { label: 'Total P&L', value: formatPnl(stats.totalPnl), icon: DollarSign, color: stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-brand-400' },
    { label: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), icon: Target, color: 'text-blue-400' },
    { label: 'Sharpe Ratio', value: stats.sharpe.toFixed(2), icon: BarChart3, color: stats.sharpe >= 1 ? 'text-green-400' : 'text-amber-400' },
    { label: 'Max Drawdown', value: `$${stats.maxDrawdown.toFixed(2)}`, icon: ArrowDown, color: 'text-red-400' },
    { label: 'Total Trades', value: String(stats.total), icon: Trophy, color: 'text-amber-400' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-surface-400 text-sm mt-1">{stats.total} closed trades</p>
        </div>
        <button
          onClick={() => downloadCSV(closedTrades)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-400 transition-colors"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-surface-400">{c.label}</p>
              <p className="text-lg font-semibold">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-surface-200 mb-3">P&L by Month</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="pnl" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-surface-200 mb-3">P&L by Pair</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byPair} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis type="category" dataKey="pair" tick={{ fontSize: 10, fill: '#6b7280' }} width={60} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="pnl" fill="#60a5fa" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-surface-200 mb-3">Long vs Short</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byDirection}>
              <XAxis dataKey="direction" tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(v) => v === 'buy' ? 'LONG' : 'SHORT'} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(_: any, name: string) => [_, name === 'pnl' ? 'P&L' : name]}
              />
              <Bar dataKey="pnl" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-surface-200 mb-3">P&L by Strategy</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byStrategy}>
              <XAxis dataKey="strategy" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="pnl" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-surface-200 mb-3">Cumulative P&L</h2>
        {equityCurve.length > 1 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={equityCurve}>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="equity" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Equity" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-surface-400 text-center py-8">Need at least 2 closed trades to show a curve.</p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-surface-200 mb-3">Top Trades</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 text-surface-400 text-xs uppercase">
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Pair</th>
                <th className="text-left p-3">Direction</th>
                <th className="text-right p-3">Volume</th>
                <th className="text-right p-3">Pips</th>
                <th className="text-right p-3">P&L</th>
              </tr>
            </thead>
            <tbody>
              {topTrades.map((t) => (
                <tr key={t.id} className="border-b border-surface-700/50">
                  <td className="p-3 text-surface-400 font-mono text-xs">{new Date(t.openTime).toLocaleDateString()}</td>
                  <td className="p-3 font-medium">{t.pair}</td>
                  <td className="p-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${t.direction === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {t.direction === 'buy' ? 'BUY' : 'SELL'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono">{t.volume.toFixed(2)}</td>
                  <td className="p-3 text-right font-mono">{t.pips?.toFixed(1) ?? '—'}</td>
                  <td className={`p-3 text-right font-mono ${(t.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {t.pnl != null ? `$${t.pnl.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
