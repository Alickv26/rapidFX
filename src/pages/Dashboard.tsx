import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePaperMode } from '../contexts/PaperModeContext'
import { DollarSign, TrendingUp, BarChart3, Activity, Zap, CandlestickChart } from 'lucide-react'
import {
  subscribeOpenTrades,
  subscribeSignals,
  subscribeAccountSnapshots,
  subscribeCandles,
  subscribePaperSettings,
} from '../lib/firestore'
import type { Trade, Signal, AccountSnapshot, Candle } from '../types/trade'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts'
import type { IChartApi, ISeriesApi } from 'lightweight-charts'

const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY']

function formatTime(ts: number): string {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function AccountEquityCurve({ snapshots }: { snapshots: AccountSnapshot[] }) {
  if (snapshots.length === 0) {
    return (
      <div className="card p-8 text-center text-surface-400">
        <BarChart3 className="w-6 h-6 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No account history yet — data appears once the bot engine runs.</p>
      </div>
    )
  }

  const data = snapshots.map((s) => ({
    time: formatTime(s.timestamp),
    balance: s.balance,
    equity: s.equity,
  }))

  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold mb-3 text-surface-200">Account Equity Curve</h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Line type="monotone" dataKey="balance" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Balance" />
          <Line type="monotone" dataKey="equity" stroke="#60a5fa" strokeWidth={1.5} dot={false} name="Equity" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function PriceChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [candles, setCandles] = useState<Candle[]>([])

  useEffect(() => {
    if (!symbol) return
    const unsub = subscribeCandles(symbol, setCandles)
    return unsub
  }, [symbol])

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      width: containerRef.current.clientWidth,
      height: 280,
      crosshair: {
        vertLine: { color: '#334155', width: 1, style: 2 },
        horzLine: { color: '#334155', width: 1, style: 2 },
      },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    chartRef.current = chart
    seriesRef.current = series

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [symbol])

  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return
    seriesRef.current.setData(
      candles.map((c) => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    )
  }, [candles])

  return (
    <div className="card p-4">
      <div ref={containerRef} />
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { paperMode } = usePaperMode()
  const [trades, setTrades] = useState<Trade[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [snapshots, setSnapshots] = useState<AccountSnapshot[]>([])
  const [chartSymbol, setChartSymbol] = useState<string>(PAIRS[0])
  const [paperSettings, setPaperSettings] = useState<{ paperMode: boolean; paperBalance: number } | null>(null)

  useEffect(() => {
    if (!user) return
    const unsubTrades = subscribeOpenTrades(user.uid, setTrades)
    const unsubSignals = subscribeSignals(user.uid, setSignals, 5)
    const unsubSnapshots = subscribeAccountSnapshots(user.uid, setSnapshots)
    const unsubPaper = subscribePaperSettings(user.uid, setPaperSettings)
    return () => { unsubTrades(); unsubSignals(); unsubSnapshots(); unsubPaper() }
  }, [user])

  const openTrades = trades.filter((t) => t.status === 'open')
  const closedTrades = trades.filter((t) => t.status === 'closed')
  const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length
  const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const winRate = closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(0) : '—'

  const openPnl = openTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const lastSnapshot = snapshots[snapshots.length - 1]

  const displayBalance = paperMode && paperSettings
    ? paperSettings.paperBalance
    : lastSnapshot?.balance ?? 0
  const displayEquity = paperMode && paperSettings
    ? paperSettings.paperBalance + openPnl
    : lastSnapshot?.equity ?? 0

  const balance = `$${displayBalance.toFixed(2)}`
  const openEquity = `$${displayEquity.toFixed(2)}`

  const stats = [
    { label: 'Balance', value: balance, icon: DollarSign, color: 'text-brand-400' },
    { label: 'Equity', value: openEquity, icon: BarChart3, color: 'text-blue-400' },
    { label: 'Win Rate', value: `${winRate}%`, icon: TrendingUp, color: 'text-brand-400' },
    { label: 'Open Trades', value: String(openTrades.length), icon: Activity, color: 'text-amber-400' },
    { label: 'Total P&L', value: totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`, icon: CandlestickChart, color: totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
  ]

  const defaultSymbol = openTrades.length > 0 ? openTrades[0].pair.replace('/', '') : chartSymbol
  const activeSymbol = defaultSymbol

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
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AccountEquityCurve snapshots={snapshots} />
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-surface-200">Price Chart</h2>
            <select
              className="input text-sm py-1 w-28"
              value={activeSymbol}
              onChange={(e) => setChartSymbol(e.target.value)}
            >
              {PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <PriceChart symbol={activeSymbol} />
        </div>
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
                        <td className="p-3 text-right font-mono">{t.currentPrice ? t.currentPrice.toFixed(5) : '—'}</td>
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