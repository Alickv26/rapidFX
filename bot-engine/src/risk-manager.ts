import type { StrategyConfig, Candle, ATRResult, Position } from './types.js'

const ATR_PERIOD = 14

export function calculateATR(rates: Candle[]): ATRResult {
  if (rates.length < 2) return { value: 0, period: ATR_PERIOD }

  const trValues: number[] = []
  for (let i = 1; i < rates.length; i++) {
    const high = rates[i].high
    const low = rates[i].low
    const prevClose = rates[i - 1].close
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
    trValues.push(tr)
  }

  if (trValues.length === 0) return { value: 0, period: ATR_PERIOD }

  let atr = trValues[0]
  for (let i = 1; i < trValues.length; i++) {
    atr = (atr * (ATR_PERIOD - 1) + trValues[i]) / ATR_PERIOD
  }

  return { value: atr, period: ATR_PERIOD }
}

export function calculateSLTP(
  entryPrice: number,
  direction: 'buy' | 'sell',
  strategy: StrategyConfig,
  rates: Candle[],
  accountBalance: number
): { sl: number; tp: number } {
  const { risk } = strategy
  let sl = 0
  let tp = 0

  const atr = calculateATR(rates)

  if (risk.slType === 'atr' && atr.value > 0) {
    const slDist = atr.value * risk.slValue
    sl = direction === 'buy' ? entryPrice - slDist : entryPrice + slDist
  } else if (risk.slType === 'fixed') {
    const pipSize = getPipSize(entryPrice)
    const slDist = pipSize * risk.slValue
    sl = direction === 'buy' ? entryPrice - slDist : entryPrice + slDist
  } else if (risk.slType === 'percentage') {
    const slDist = entryPrice * (risk.slValue / 100)
    sl = direction === 'buy' ? entryPrice - slDist : entryPrice + slDist
  }

  if (risk.tpType === 'atr' && atr.value > 0) {
    const tpDist = atr.value * risk.tpValue
    tp = direction === 'buy' ? entryPrice + tpDist : entryPrice - tpDist
  } else if (risk.tpType === 'fixed') {
    const pipSize = getPipSize(entryPrice)
    const tpDist = pipSize * risk.tpValue
    tp = direction === 'buy' ? entryPrice + tpDist : entryPrice - tpDist
  } else if (risk.tpType === 'percentage') {
    const tpDist = entryPrice * (risk.tpValue / 100)
    tp = direction === 'buy' ? entryPrice + tpDist : entryPrice - tpDist
  }

  return { sl, tp }
}

export function getPipSize(price: number): number {
  if (price > 100) return 0.01 // JPY pairs
  if (price > 10) return 0.001 // MXN, TRY, etc.
  return 0.0001 // standard pairs
}

export function calculateVolume(
  accountBalance: number,
  entryPrice: number,
  slPrice: number,
  riskPercent: number
): number {
  if (slPrice === 0 || accountBalance === 0) return 0.01

  const riskAmount = accountBalance * (riskPercent / 100)
  const pipSize = getPipSize(entryPrice)
  const slDistance = Math.abs(entryPrice - slPrice)
  const slPips = slDistance / pipSize

  if (slPips <= 0) return 0.01

  const pipValue = 1 // simplified — real pip value depends on lot size and pair
  const volume = riskAmount / (slPips * pipValue)

  return Math.max(0.01, Math.round(volume / 0.01) * 0.01)
}

export function canOpenTrade(
  strategy: StrategyConfig,
  openPositions: Position[],
  strategyPositions: Position[],
  accountBalance: number,
  accountEquity: number
): { allowed: boolean; reason?: string } {
  if (strategyPositions.length >= strategy.maxOpenTrades) {
    return { allowed: false, reason: `Max open trades reached (${strategy.maxOpenTrades})` }
  }

  const drawdownPct = accountBalance > 0
    ? ((accountBalance - accountEquity) / accountBalance) * 100
    : 0

  if (drawdownPct >= strategy.drawdownLimit) {
    return { allowed: false, reason: `Drawdown limit hit (${drawdownPct.toFixed(1)}% >= ${strategy.drawdownLimit}%)` }
  }

  return { allowed: true }
}

export function checkTrailingStop(
  currentPrice: number,
  position: { type: 0 | 1; openPrice: number; sl: number; volume: number },
  trailDistance: number,
  rates: Candle[]
): number | null {
  if (trailDistance <= 0) return null

  const atr = calculateATR(rates)
  const trailPips = atr.value * trailDistance

  if (trailPips <= 0) return null

  if (position.type === 0) {
    const newSl = currentPrice - trailPips
    if (newSl > position.sl && newSl > position.openPrice) {
      return newSl
    }
  } else {
    const newSl = currentPrice + trailPips
    if (newSl < position.sl && newSl < position.openPrice) {
      return newSl
    }
  }

  return null
}
