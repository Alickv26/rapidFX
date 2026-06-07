import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import { subscribeStrategies, getHistoricalCandles } from '../lib/firestore'
import { runBacktest } from '../backtest/engine'
import type { BacktestResult } from '../backtest/engine'
import type { Strategy } from '../types/strategy'
import { FlaskConical, TrendingUp, Target, ArrowDown, DollarSign, Download } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

function formatPnl(v: number): string {
  return v >= 0 ? `+$${v.toFixed(2)}` : `-$${Math.abs(v).toFixed(2)}`
}

const DEFAULT_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY']

export function BacktestPage() {
  const { user } = useAuth()
  const { activeAccount, accounts } = useAccount()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [selectedStrategyId, setSelectedStrategyId] = useState('')
  const [selectedPair, setSelectedPair] = useState('')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [balanceSource, setBalanceSource] = useState<'custom' | string>('custom')
  const [initialBalance, setInitialBalance] = useState(100000)
  const [spread, setSpread] = useState(1)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<BacktestResult | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeStrategies(user.uid, setStrategies, activeAccount?.id)
  }, [user, activeAccount?.id])

  useEffect(() => {
    if (balanceSource !== 'custom') {
      const acc = accounts.find((a) => a.id === balanceSource)
      if (acc) setInitialBalance(acc.balance)
    }
  }, [balanceSource, accounts])

  const selectedStrategy = useMemo(
    () => strategies.find((s) => s.id === selectedStrategyId) ?? null,
    [strategies, selectedStrategyId],
  )

  const availablePairs = useMemo(() => {
    if (!selectedStrategy) return DEFAULT_PAIRS
    const normalized = selectedStrategy.pairs.map((p) => p.replace('/', ''))
    return normalized.length > 0 ? normalized : DEFAULT_PAIRS
  }, [selectedStrategy])

  useEffect(() => {
    if (!selectedPair && availablePairs.length > 0) {
      setSelectedPair(availablePairs[0])
    }
  }, [availablePairs, selectedPair])

  const handleRun = async () => {
    if (!selectedStrategy) {
      setError('Select a strategy')
      return
    }
    if (!selectedPair) {
      setError('Select a pair')
      return
    }
    if (!fromDate || !toDate) {
      setError('Select date range')
      return
    }
    if (fromDate >= toDate) {
      setError('End date must be after start date')
      return
    }

    setRunning(true)
    setError('')
    setResult(null)

    try {
      const fromTs = new Date(fromDate).getTime()
      const toTs = new Date(toDate).getTime() + 86400000

      const allCandles = await getHistoricalCandles(selectedPair)
      const filtered = allCandles.filter((c) => c.time >= fromTs / 1000 && c.time <= toTs / 1000)

      if (filtered.length < 3) {
        setError(`Not enough candle data for ${selectedPair} in the selected range. Found ${filtered.length} candles.`)
        setRunning(false)
        return
      }

      const res = runBacktest(selectedStrategy, selectedPair, filtered, initialBalance, spread)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }

    setRunning(false)
  }

  const equityData = useMemo(() => {
    if (!result) return []
    return result.equityCurve.map((pt) => ({
      time: new Date(pt.time * 1000).toLocaleDateString(),
      equity: pt.equity,
    }))
  }, [result])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Backtest</h1>
          <p className="text-surface-400 text-sm mt-1">Run historical simulations against your strategies</p>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Strategy</label>
            <select
              className="input text-sm"
              value={selectedStrategyId}
              onChange={(e) => { setSelectedStrategyId(e.target.value); setResult(null) }}
            >
              <option value="">Select a strategy...</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Pair</label>
            <select
              className="input text-sm"
              value={selectedPair}
              onChange={(e) => { setSelectedPair(e.target.value); setResult(null) }}
            >
              {availablePairs.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">From</label>
            <input
              type="date"
              className="input text-sm"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setResult(null) }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">To</label>
            <input
              type="date"
              className="input text-sm"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setResult(null) }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Balance Source</label>
            <select
              className="input text-sm"
              value={balanceSource}
              onChange={(e) => { setBalanceSource(e.target.value); setResult(null) }}
            >
              <option value="custom">Custom amount</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.label} (${a.balance.toFixed(0)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Initial Balance ($)</label>
            <input
              type="number"
              className="input text-sm"
              value={initialBalance}
              onChange={(e) => { setInitialBalance(Number(e.target.value)); setResult(null) }}
              min={100}
              step={1000}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Spread (pips)</label>
            <input
              type="number"
              className="input text-sm"
              value={spread}
              onChange={(e) => { setSpread(Number(e.target.value)); setResult(null) }}
              min={0}
              max={100}
              step={0.1}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleRun}
              disabled={running || !selectedStrategy}
              className="px-6 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <FlaskConical size={16} />
              {running ? 'Running...' : 'Run Backtest'}
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}
      </div>

      {result && result.totalTrades === 0 && (
        <div className="card p-12 text-center text-surface-400">
          <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No trades generated. Try a different date range, strategy, or pair.</p>
        </div>
      )}

      {result && result.totalTrades > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total P&L', value: formatPnl(result.totalPnl), color: result.totalPnl >= 0 ? 'text-green-400' : 'text-red-400', icon: DollarSign },
              { label: 'Win Rate', value: `${result.winRate.toFixed(1)}%`, color: 'text-brand-400', icon: TrendingUp },
              { label: 'Profit Factor', value: result.profitFactor === Infinity ? '∞' : result.profitFactor.toFixed(2), color: 'text-blue-400', icon: Target },
              { label: 'Max Drawdown', value: `$${result.maxDrawdown.toFixed(2)}`, color: 'text-red-400', icon: ArrowDown },
              { label: 'Total Trades', value: String(result.totalTrades), color: 'text-amber-400', icon: FlaskConical },
            ].map((s) => (
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

          <div className="card p-4">
            <h2 className="text-sm font-semibold text-surface-200 mb-3">Equity Curve</h2>
            {equityData.length > 1 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={equityData}>
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
              <p className="text-sm text-surface-400 text-center py-8">Not enough data for equity curve.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-surface-200">Trades ({result.totalTrades})</h2>
              <button
                onClick={() => {
                  const rows = result.trades.map((t) =>
                    [new Date(t.openTime).toISOString(), t.pair, t.direction, t.volume.toFixed(2), t.openPrice.toFixed(5), t.closePrice.toFixed(5), t.pnl.toFixed(2), t.pips.toFixed(1), t.closeReason].join(','),
                  )
                  const csv = 'Time,Pair,Direction,Volume,Entry,Exit,P&L,Pips,CloseReason\n' + rows.join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `backtest_${selectedPair}_${Date.now()}.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-surface-800 text-surface-300 rounded-lg hover:text-white transition-colors"
              >
                <Download size={14} />
                CSV
              </button>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700 text-surface-400 text-xs uppercase">
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Time</th>
                    <th className="text-left p-3">Direction</th>
                    <th className="text-right p-3">Volume</th>
                    <th className="text-right p-3">Entry</th>
                    <th className="text-right p-3">Exit</th>
                    <th className="text-right p-3">Pips</th>
                    <th className="text-right p-3">P&L</th>
                    <th className="text-center p-3">Close</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, i) => (
                    <tr key={i} className="border-b border-surface-700/50">
                      <td className="p-3 text-surface-400 text-xs">{i + 1}</td>
                      <td className="p-3 text-surface-400 font-mono text-xs">{new Date(t.openTime).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${t.direction === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                          {t.direction === 'buy' ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">{t.volume.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono">{t.openPrice.toFixed(5)}</td>
                      <td className="p-3 text-right font-mono">{t.closePrice.toFixed(5)}</td>
                      <td className="p-3 text-right font-mono">{t.pips.toFixed(1)}</td>
                      <td className={`p-3 text-right font-mono ${t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPnl(t.pnl)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          t.closeReason === 'tp' ? 'bg-green-900/30 text-green-400' :
                          t.closeReason === 'sl' ? 'bg-red-900/30 text-red-400' :
                          'bg-surface-700 text-surface-400'
                        }`}>
                          {t.closeReason === 'tp' ? 'TP' : t.closeReason === 'sl' ? 'SL' : 'END'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
