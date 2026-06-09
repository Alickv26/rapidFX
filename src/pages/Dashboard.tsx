import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import { DollarSign, TrendingUp, BarChart3, Activity, Zap, CandlestickChart } from 'lucide-react'
import {
  subscribeOpenTrades,
  subscribeSignals,
  subscribeAccountSnapshots,
  subscribeCandles,
} from '../lib/firestore'
import type { Trade, Signal, AccountSnapshot, Candle } from '../types/trade'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts'
import type { IChartApi, ISeriesApi } from 'lightweight-charts'
import { ResponsiveTable, type Column } from '../components/ResponsiveTable'
import { SkeletonStatCard, SkeletonChart } from '../components/Skeleton'

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
      <ResponsiveContainer width="100%" height={180}>
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
    setCandles([])
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      seriesRef.current = null
    }
    const unsub = subscribeCandles(symbol, (data) => {
      setCandles(data)
    })
    return () => { unsub() }
  }, [symbol])

  useEffect(() => {
    if (!containerRef.current || candles.length > 0) return
    containerRef.current.style.height = `${Math.min(280, window.innerWidth < 768 ? 200 : 280)}px`
  }, [candles])

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    el.style.height = ''

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      width: el.clientWidth,
      height: Math.min(280, window.innerWidth < 768 ? 200 : 280),
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

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect
        chart.applyOptions({ width })
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
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
    chartRef.current?.timeScale().fitContent()
  }, [candles])

  if (candles.length === 0) {
    return (
      <div className="card p-8 text-center text-surface-400">
        <CandlestickChart className="w-6 h-6 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No candle data available. The bot engine writes candle data from live market rates — data appears once the engine processes heartbeats.</p>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div ref={containerRef} />
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { activeAccount } = useAccount()
  const [trades, setTrades] = useState<Trade[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [snapshots, setSnapshots] = useState<AccountSnapshot[]>([])
  const [chartSymbol, setChartSymbol] = useState<string>(PAIRS[0])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoaded(false)
    const timer = setTimeout(() => setLoaded(true), 3000)
    const unsubTrades = subscribeOpenTrades(user.uid, (d: Trade[]) => { setTrades(d); clearTimeout(timer); setLoaded(true) }, activeAccount?.id)
    const unsubSignals = subscribeSignals(user.uid, setSignals, 5)
    const unsubSnapshots = subscribeAccountSnapshots(user.uid, setSnapshots, activeAccount?.id)
    return () => { clearTimeout(timer); unsubTrades(); unsubSignals(); unsubSnapshots() }
  }, [user, activeAccount?.id])

  const openTrades = trades.filter((t) => t.status === 'open')
  const closedTrades = trades.filter((t) => t.status === 'closed')
  const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length
  const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const winRate = closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(0) : '—'

  const lastSnapshot = snapshots[snapshots.length - 1]

  const displayBalance = activeAccount?.balance ?? lastSnapshot?.balance ?? 0
  const displayEquity = activeAccount
    ? activeAccount.equity
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

  const openTradeColumns: Column<Trade>[] = [
    { header: 'Pair', render: (t) => <span className="font-medium">{t.pair}</span> },
    {
      header: 'Direction',
      render: (t) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${t.direction === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {t.direction === 'buy' ? 'LONG' : 'SHORT'}
        </span>
      ),
    },
    { header: 'Entry', render: (t) => <span className="font-mono">{t.openPrice.toFixed(5)}</span>, textAlign: 'right' },
    { header: 'Current', render: (t) => <span className="font-mono">{t.currentPrice ? t.currentPrice.toFixed(5) : '—'}</span>, textAlign: 'right' },
    { header: 'SL', render: (t) => <span className="font-mono text-red-400">{t.sl.toFixed(5)}</span>, textAlign: 'right' },
    { header: 'TP', render: (t) => <span className="font-mono text-green-400">{t.tp.toFixed(5)}</span>, textAlign: 'right' },
    { header: 'Pips', render: (t) => <span className="font-mono">{t.pips ?? '—'}</span>, textAlign: 'right' },
    { header: 'P&L', render: (t) => <span className={`font-mono ${(t.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{t.pnl != null ? `$${t.pnl.toFixed(2)}` : '—'}</span>, textAlign: 'right' },
  ]

  const signalColumns: Column<Signal>[] = [
    { header: 'Time', render: (s) => <span className="text-surface-400">{new Date(s.timestamp).toLocaleTimeString()}</span> },
    { header: 'Pair', render: (s) => <span className="font-medium">{s.pair}</span> },
    {
      header: 'Direction',
      render: (s) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${s.direction === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {s.direction === 'buy' ? 'BUY' : 'SELL'}
        </span>
      ),
    },
    { header: 'Patterns', render: (s) => <span className="text-surface-400">{s.patterns.join(', ')}</span> },
    { header: 'Price', render: (s) => <span className="font-mono">{s.price.toFixed(5)}</span>, textAlign: 'right' },
    {
      header: 'Status',
      render: (s) => (
        <span className={`text-xs px-2 py-0.5 rounded ${s.executed ? 'bg-green-900/30 text-green-400' : 'bg-surface-700 text-surface-400'}`}>
          {s.executed ? 'Executed' : 'Pending'}
        </span>
      ),
      textAlign: 'center',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1 truncate">
            {activeAccount ? `${activeAccount.label} · ` : ''}
            Welcome back, {user?.email?.split('@')[0]}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeAccount && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              activeAccount.type === 'paper' ? 'bg-amber-900/30 text-amber-400' :
              activeAccount.type === 'demo' ? 'bg-blue-900/30 text-blue-400' :
              'bg-green-900/30 text-green-400'
            }`}>
              <Zap className="w-3 h-3" />
              {activeAccount.type === 'paper' ? 'Paper Trading' :
               activeAccount.type === 'demo' ? 'Demo Account' : 'Live Account'}
            </span>
          )}
        </div>
      </div>

      {!loaded ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
                  <ResponsiveTable<Trade>
                    columns={openTradeColumns}
                    data={openTrades}
                    keyExtractor={(t) => t.id}
                    mobileCard={(t) => (
                      <div className="card !p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-surface-200">{t.pair}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${t.direction === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                            {t.direction === 'buy' ? 'LONG' : 'SHORT'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-xs text-surface-400">Entry</span><p className="font-mono">{t.openPrice.toFixed(5)}</p></div>
                          <div><span className="text-xs text-surface-400">Current</span><p className="font-mono">{t.currentPrice ? t.currentPrice.toFixed(5) : '—'}</p></div>
                          <div><span className="text-xs text-surface-400">SL</span><p className="font-mono text-red-400">{t.sl.toFixed(5)}</p></div>
                          <div><span className="text-xs text-surface-400">TP</span><p className="font-mono text-green-400">{t.tp.toFixed(5)}</p></div>
                          <div><span className="text-xs text-surface-400">Pips</span><p className="font-mono">{t.pips ?? '—'}</p></div>
                          <div><span className="text-xs text-surface-400">P&L</span><p className={`font-mono ${(t.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{t.pnl != null ? `$${t.pnl.toFixed(2)}` : '—'}</p></div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              )}

              {signals.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">Recent Signals</h2>
                  <ResponsiveTable<Signal>
                    columns={signalColumns}
                    data={signals}
                    keyExtractor={(s) => s.id}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
