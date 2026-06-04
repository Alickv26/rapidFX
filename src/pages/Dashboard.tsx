import { useAuth } from '../contexts/AuthContext'
import { usePaperMode } from '../contexts/PaperModeContext'
import { DollarSign, TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react'

const stats = [
  { label: 'Balance', value: '$10,000.00', icon: DollarSign, color: 'text-brand-400' },
  { label: 'Open P&L', value: '+$124.50', icon: TrendingUp, color: 'text-green-400' },
  { label: 'Win Rate', value: '67%', icon: BarChart3, color: 'text-brand-400' },
  { label: 'Open Trades', value: '3', icon: Activity, color: 'text-amber-400' },
  { label: 'Drawdown', value: '-2.1%', icon: TrendingDown, color: 'text-red-400' },
]

const openTrades = [
  { pair: 'EUR/USD', direction: 'LONG', entry: 1.0542, current: 1.0568, pips: 26, pnl: '+$32.50' },
  { pair: 'GBP/JPY', direction: 'SHORT', entry: 189.45, current: 188.92, pips: 53, pnl: '+$67.20' },
  { pair: 'USD/MXN', direction: 'LONG', entry: 20.15, current: 20.08, pips: -7, pnl: '-$8.75' },
]

export function DashboardPage() {
  const { user } = useAuth()
  const { paperMode } = usePaperMode()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1">
            Welcome back, {user?.email?.split('@')[0]}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            paperMode ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'
          }`}>
            {paperMode ? 'PAPER' : 'LIVE'}
          </span>
          <button className="btn-primary text-sm">Start Bot</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="flex items-center gap-2 mb-3">
              <s.icon size={18} className={s.color} />
              <span className="text-xs text-surface-400 font-medium">{s.label}</span>
            </div>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Open Trades</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-surface-400 border-b border-surface-200">
                  <th className="text-left pb-2 font-medium">Pair</th>
                  <th className="text-left pb-2 font-medium">Dir</th>
                  <th className="text-right pb-2 font-medium">Entry</th>
                  <th className="text-right pb-2 font-medium">Current</th>
                  <th className="text-right pb-2 font-medium">Pips</th>
                  <th className="text-right pb-2 font-medium">P&L</th>
                  <th className="text-right pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {openTrades.map((t) => (
                  <tr key={t.pair} className="border-b border-surface-200/50">
                    <td className="py-3 font-medium">{t.pair}</td>
                    <td className={t.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}>
                      {t.direction}
                    </td>
                    <td className="text-right text-surface-500">{t.entry}</td>
                    <td className="text-right text-surface-500">{t.current}</td>
                    <td className={`text-right font-medium ${t.pips > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {t.pips > 0 ? '+' : ''}{t.pips}
                    </td>
                    <td className={`text-right font-medium ${t.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                      {t.pnl}
                    </td>
                    <td className="text-right">
                      <button className="text-xs text-red-400 hover:text-red-300">Close</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Equity Curve</h2>
          <div className="h-48 flex items-center justify-center text-surface-400 text-sm border-2 border-dashed border-surface-200 rounded-lg">
            Chart placeholder — TradingView Lightweight Charts coming next phase
          </div>
        </div>
      </div>
    </div>
  )
}
