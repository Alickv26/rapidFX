import type { Timestamp } from 'firebase/firestore'

export interface PriceActionPatterns {
  pinBar: boolean
  engulfing: boolean
  insideBar: boolean
  doji: boolean
}

export interface RiskConfig {
  slType: 'atr' | 'fixed' | 'percentage'
  slValue: number
  tpType: 'atr' | 'fixed' | 'percentage'
  tpValue: number
  trailingStop: boolean
  trailDistance: number
}

export interface PositionSizing {
  riskPerTrade: number
}

export interface NewsFilterConfig {
  enabled: boolean
  minImpact: 'low' | 'medium' | 'high'
}

export type Timeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1'
export type Direction = 'long' | 'short' | 'both'

export interface Strategy {
  id: string
  uid: string
  name: string
  active: boolean
  direction: Direction
  pairs: string[]
  timeframes: Timeframe[]
  patterns: PriceActionPatterns
  risk: RiskConfig
  maxOpenTrades: number
  drawdownLimit: number
  positionSizing: PositionSizing
  newsFilter: NewsFilterConfig
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type StrategyInput = Omit<Strategy, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
