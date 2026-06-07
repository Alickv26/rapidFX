# RapidFX Roadmap

## Phase 1 & 2 — Foundation ✅
- Vite + React + TypeScript + Tailwind project setup
- Firebase Auth (email/password, Google OAuth)
- Layout with sidebar navigation
- Strategy management (create, list, edit forms, multi-select pairs/timeframes/patterns)
- `PaperModeContext` — React-state toggle
- `Dashboard` — static stats cards, open trades table, signals table
- `Trades` — basic table
- `Backtest` — placeholder page
- `AuditLog` — placeholder page

## Phase 3 — Bot Engine ✅
- Pattern detector (pin bar, engulfing, inside bar, doji)
- Risk manager (ATR calculation, SL/TP, position sizing, trailing stop, drawdown limit)
- MT5 bridge — REST API endpoints (`/ea/data`, `/ea/commands`, `/ea/result`, `/ea/close`)
- Firestore client — admin SDK for reading/writing strategies, trades, signals, audit logs
- Strategy engine — `evaluateAll()`, `handleTradeResult()`, `syncPositionsToTrades()`, `checkTrailingStops()`
- MT5 EA (`RapidBridgeEA.mq5`) — sends heartbeats, polls commands, reports results
- Dashboard — trade/signal subscriptions, equity curve (Recharts), open table with P&L
- Trades — full trade history table

## Phase 3.5 — News Filter ✅
- News filter integration in strategy engine
- `getUpcomingNews()` in firestore-client
- Dashboard refinements

## Phase 4 — News Calendar & Charts ✅
- ForexFactory news scraper (`news/forexfactory.ts`) with rate limiting
- Functions directory — scheduled news refresh (Cloud Functions or bot-engine interval)
- `NewsCalendar` page — full month view, impact color coding, filter by currency
- News filter config in `StrategyForm` (enable/disable, min impact, before/after window)
- Candle store — `subscribeCandles()` with lightweight-charts price chart on Dashboard
- `AccountSnapshot` subscription on Dashboard equity curve
- Firestore rules and indexes

## Phase 5 — Paper Trading ✅
- **New:** `paper-trader.ts` — in-memory paper position management, SL/TP checks on heartbeat, trailing stop, P&L calculation, balance updates
- **Types:** `paper?: boolean` on `Trade`, `PaperPosition` interface
- **Engine path:** `evaluateAll()` checks user settings per strategy; uses paper balance for risk calcs, paper positions for drawdown/trade-count checks, calls `executePaperTrade()` instead of MT5 commands
- **Heartbeat:** `processPaperHeartbeat()` checks all paper positions for SL/TP hits; updates unrealized P&L; closes expired positions and updates paper balance
- **Persistence:** Positions reloaded from Firestore on engine restart via `loadPaperPositions()`
- **Frontend:** `PaperModeContext` wired to Firestore `users/{uid}/settings/default`; Dashboard shows paper balance/equity from settings + open P&L; Trades page has filter (All/Live/Paper) and PAPER badge; Backtest page enhanced placeholder

## Phase 6 (planned) — Advanced Reporting
- P&L analytics dashboard (daily/weekly/monthly breakdown)
- Performance metrics (Sharpe ratio, max drawdown, profit factor)
- Trade export (CSV/PDF)
- Win rate by pair, timeframe, pattern

## Phase 7 (planned) — Notifications
- Trade open/close alerts (email, in-app toast)
- SL/TP hit notifications
- Drawdown threshold warnings
- Daily/weekly performance summaries

## Phase 8 (planned) — Backtesting Engine
- Replace placeholder with real backtesting
- Date range picker, strategy selector, initial balance
- Historical candle replay engine
- Performance comparison (paper vs backtest)

## Phase 9 (planned) — Multi-Account
- Link multiple MT5 accounts
- Account switching in sidebar
- Per-account dashboard, trades, settings

## Phase 10 (planned) — Mobile & PWA
- Responsive sidebar (collapsible, bottom nav)
- PWA manifest + service worker
- Push notifications
- Touch-friendly trade tables
