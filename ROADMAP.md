# RapidFX Roadmap

## Phase 1 & 2 — Foundation ✅
- Vite + React + TypeScript + Tailwind project setup
- Firebase Auth (email/password, Google OAuth)
- Layout with sidebar navigation
- Strategy management (create, list, edit forms, multi-select pairs/timeframes/patterns)
- `Dashboard` — static stats cards, open trades table, signals table
- `Trades` — basic table
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

## Phase 5 — Paper Trading ⚠️ (engine done, frontend gaps)
- **Engine:** `paper-trader.ts` — in-memory paper position management, SL/TP checks on heartbeat, trailing stop, P&L calculation, balance updates
- **Types:** `paper?: boolean` on `Trade`, `PaperPosition` interface
- **Engine path:** `evaluateAll()` checks user settings per strategy; uses paper balance for risk calcs, paper positions for drawdown/trade-count checks, calls `executePaperTrade()` instead of MT5 commands
- **Heartbeat:** `processPaperHeartbeat()` checks all paper positions for SL/TP hits; updates unrealized P&L; closes expired positions and updates paper balance
- **Persistence:** Positions reloaded from Firestore on engine restart via `loadPaperPositions()`
- **Frontend gaps (not yet implemented):**
  - Dedicated `PaperModeContext` React context does not exist — paper mode lives in AccountContext + raw Firestore, but is never consumed by the UI
  - Dashboard does not display paper balance/equity separately
  - Trades page has no All/Live/Paper filter and no PAPER badge
  - No React toggle component for switching paper/live mode

## Phase 6 — Advanced Reporting ✅
- P&L analytics dashboard (monthly breakdown, by pair, long vs short, by strategy)
- Performance metrics (Sharpe ratio, max drawdown, profit factor, win rate)
- Trade export (CSV)
- Cumulative P&L curve, top trades table

## Phase 7 (planned) — Notifications
- Trade open/close alerts (email, in-app toast)
- SL/TP hit notifications
- Drawdown threshold warnings
- Daily/weekly performance summaries

## Phase 8 — Backtesting Engine ✅
- Date range picker, strategy/pair selector, initial balance, spread config
- Historical candle simulation with pattern detection, SL/TP, position sizing
- Summary cards (trades, win rate, Sharpe, drawdown, profit factor)
- Equity curve chart + trade table
- CSV export

## Phase 9 — Multi-Account ✅
- Create/manage paper/demo/live accounts with copyable API keys
- Account switching in sidebar
- Per-account dashboard, strategies, trades, settings
- Legacy single-account auto-migration

## Phase 10 — Mobile & PWA ⚠️ (partially done)
- Responsive sidebar (collapsible, mobile drawer, bottom nav)
- PWA manifest + service worker (vite-plugin-pwa)
- Install banner (`InstallPrompt` component)
- **Not yet implemented:**
  - Push notification subscription + service worker push handler
  - Touch-friendly trade tables
  - Offline support

---

## Tech Debt & Fixes (not phase-bound)

### 🔴 Security — service-account.json committed
`bot-engine/service-account.json` contains real Firebase Admin SDK credentials and is committed to git. The `.gitignore` pattern exists but was added after the fact.
- **Action:** Rotate the service account key, remove from git history, enforce `.gitignore`

### 🟡 Dead code — `@tanstack/react-query`
`QueryClientProvider` wraps the app but no query or mutation uses it. All data fetching uses raw Firestore `onSnapshot`.
- **Action:** Remove dependency and provider wrapper

### 🟡 Dead config — Vite API proxy
`vite.config.ts` proxies `/api` → `localhost:3001` but the frontend talks directly to Firestore, never to the bot engine.
- **Action:** Remove proxy unless a frontend-to-bot-engine path is planned

### 🟡 Fake win rate in Strategies list
`Strategies.tsx` computes win rate as `55 + Math.random() * 35` — a random placeholder, not actual trade data.
- **Action:** Calculate from real trade history or remove the column

### 🟡 Firestore indexes not configured
`firestore.indexes.json` is empty. All compound queries (`where` + `orderBy` + `limit`) will fail at scale.
- **Action:** Add composite indexes for all subscribed queries

### 🟡 No tests
Zero test files across frontend, functions, or bot-engine. No test runner configured.
- **Action:** Add Vitest for React components, Jest/Vitest for bot-engine logic

### 🟡 No CI/CD
No GitHub Actions or other pipeline. No automated typecheck/lint/test on push.
- **Action:** Add CI workflow for typecheck + lint, optionally deploy Cloud Functions

### 🟡 AuditLog page still a placeholder
`/audit` route shows "coming next phase". No data subscription.
- **Action:** Either implement with Firestore subscription or remove the route
