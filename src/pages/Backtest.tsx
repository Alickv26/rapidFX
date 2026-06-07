export function BacktestPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Backtest</h1>
      <div className="card space-y-4">
        <p className="text-sm text-surface-500">
          Paper trading is active — use it to test your strategies in real-time.
          Backtesting with historical data is coming later.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Date Range</label>
            <input type="date" disabled className="w-full px-3 py-2 border border-surface-200 rounded-lg bg-surface-50 text-surface-400 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">End Date</label>
            <input type="date" disabled className="w-full px-3 py-2 border border-surface-200 rounded-lg bg-surface-50 text-surface-400 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Strategy</label>
            <select disabled className="w-full px-3 py-2 border border-surface-200 rounded-lg bg-surface-50 text-surface-400 text-sm">
              <option>Select a strategy...</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Initial Balance</label>
            <input type="number" value="10000" disabled className="w-full px-3 py-2 border border-surface-200 rounded-lg bg-surface-50 text-surface-400 text-sm" />
          </div>
        </div>
        <button disabled className="px-4 py-2 bg-brand-200 text-white rounded-lg text-sm opacity-50 cursor-not-allowed">
          Run Backtest
        </button>
      </div>
    </div>
  )
}
