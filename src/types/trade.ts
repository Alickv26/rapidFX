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

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export interface AccountSnapshot {
  id: string
  accountId: string
  balance: number
  equity: number
  margin: number
  timestamp: number
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
