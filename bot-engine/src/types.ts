export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export interface TickData {
  symbol: string
  bid: number
  ask: number
  spread: number
  time: number
}

export interface AccountInfo {
  balance: number
  equity: number
  margin: number
  marginFree: number
  marginLevel: number
}

export interface Position {
  ticket: number
  symbol: string
  type: 0 | 1 // 0=buy, 1=sell
  volume: number
  openPrice: number
  sl: number
  tp: number
  profit: number
}

export interface EAHeartbeat {
  account: AccountInfo
  positions: Position[]
  symbols: Record<string, {
    bid: number
    ask: number
    spread: number
    rates?: Candle[]
  }>
  time: number
}

export interface TradeCommand {
  id: string
  action: 'open' | 'close' | 'modify'
  symbol: string
  type?: 'buy' | 'sell'
  volume?: number
  sl?: number
  tp?: number
  ticket?: number
}

export interface TradeResult {
  commandId: string
  ticket: number
  success: boolean
  error: string | null
}

export interface StrategyConfig {
  id: string
  uid: string
  accountId?: string
  name: string
  active: boolean
  direction: 'long' | 'short' | 'both'
  pairs: string[]
  timeframes: string[]
  patterns: {
    pinBar: boolean
    engulfing: boolean
    insideBar: boolean
    doji: boolean
  }
  risk: {
    slType: 'atr' | 'fixed' | 'percentage'
    slValue: number
    tpType: 'atr' | 'fixed' | 'percentage'
    tpValue: number
    trailingStop: boolean
    trailDistance: number
  }
  maxOpenTrades: number
  drawdownLimit: number
  positionSizing: {
    riskPerTrade: number
  }
  newsFilter: {
    enabled: boolean
    minImpact: 'low' | 'medium' | 'high'
    windowBefore: number
    windowAfter: number
  }
}

export interface NewsEvent {
  id: string
  date: string
  time: string
  timestamp: number
  currency: string
  impact: 'High' | 'Medium' | 'Low'
  event: string
  previous: string | null
  forecast: string | null
  actual: string | null
}

export interface Signal {
  id: string
  timestamp: number
  strategyId: string
  pair: string
  direction: 'buy' | 'sell'
  price: number
  patterns: string[]
  timeframe: string
  executed: boolean
  tradeId: string | null
}

export interface Trade {
  id: string
  uid: string
  accountId: string
  strategyId: string
  ticket: number
  pair: string
  direction: 'buy' | 'sell'
  volume: number
  openPrice: number
  closePrice: number | null
  sl: number
  tp: number
  openTime: number
  closeTime: number | null
  pnl: number | null
  pips: number | null
  status: 'open' | 'closed'
  reason: string
  currentPrice?: number
  paper?: boolean
}

export interface PaperPosition {
  ticket: number
  tradeId: string
  uid: string
  accountId: string
  strategyId: string
  symbol: string
  type: 'buy' | 'sell'
  volume: number
  openPrice: number
  sl: number
  tp: number
  openTime: number
  currentPrice: number
  pnl: number
  pips: number
}

export interface ATRResult {
  value: number
  period: number
}

export type WinRateStats = {
  total: number
  wins: number
  losses: number
  winRate: number
  totalPnl: number
}
