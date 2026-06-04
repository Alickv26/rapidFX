export interface Trade {
  id: string
  uid: string
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
