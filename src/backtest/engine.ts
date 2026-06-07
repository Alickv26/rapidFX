import type { Candle } from '../types/trade'
import type { Strategy } from '../types/strategy'

export interface BacktestTrade {
  pair: string
  direction: 'buy' | 'sell'
  openTime: number
  openPrice: number
  closeTime: number
  closePrice: number
  volume: number
  sl: number
  tp: number
  pnl: number
  pips: number
  patterns: string[]
  closeReason: 'sl' | 'tp' | 'end_of_test'
}

export interface BacktestResult {
  trades: BacktestTrade[]
  finalBalance: number
  totalPnl: number
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  profitFactor: number
  maxDrawdown: number
  sharpeRatio: number
  equityCurve: { time: number; equity: number }[]
}

let nextTicket = 0
function nextId(): number {
  return --nextTicket
}

function getPipSize(price: number): number {
  if (price > 100) return 0.01
  if (price > 10) return 0.001
  return 0.0001
}

function calculateATR(rates: Candle[]): { value: number } {
  if (rates.length < 2) return { value: 0 }
  const period = 14
  const trValues: number[] = []
  for (let i = 1; i < rates.length; i++) {
    const tr = Math.max(
      rates[i].high - rates[i].low,
      Math.abs(rates[i].high - rates[i - 1].close),
      Math.abs(rates[i].low - rates[i - 1].close),
    )
    trValues.push(tr)
  }
  if (trValues.length === 0) return { value: 0 }
  let atr = trValues[0]
  for (let i = 1; i < trValues.length; i++) {
    atr = (atr * (period - 1) + trValues[i]) / period
  }
  return { value: atr }
}

function calculateSLTP(
  entryPrice: number,
  direction: 'buy' | 'sell',
  strategy: Strategy,
  rates: Candle[],
  _accountBalance: number,
): { sl: number; tp: number } {
  const { risk } = strategy
  let sl = 0
  let tp = 0
  const atr = calculateATR(rates)

  if (risk.slType === 'atr' && atr.value > 0) {
    const d = atr.value * risk.slValue
    sl = direction === 'buy' ? entryPrice - d : entryPrice + d
  } else if (risk.slType === 'fixed') {
    const d = getPipSize(entryPrice) * risk.slValue
    sl = direction === 'buy' ? entryPrice - d : entryPrice + d
  } else if (risk.slType === 'percentage') {
    const d = entryPrice * (risk.slValue / 100)
    sl = direction === 'buy' ? entryPrice - d : entryPrice + d
  }

  if (risk.tpType === 'atr' && atr.value > 0) {
    const d = atr.value * risk.tpValue
    tp = direction === 'buy' ? entryPrice + d : entryPrice - d
  } else if (risk.tpType === 'fixed') {
    const d = getPipSize(entryPrice) * risk.tpValue
    tp = direction === 'buy' ? entryPrice + d : entryPrice - d
  } else if (risk.tpType === 'percentage') {
    const d = entryPrice * (risk.tpValue / 100)
    tp = direction === 'buy' ? entryPrice + d : entryPrice - d
  }

  return { sl, tp }
}

function calculateVolume(
  accountBalance: number,
  entryPrice: number,
  slPrice: number,
  riskPercent: number,
): number {
  if (slPrice === 0 || accountBalance === 0) return 0.01
  const riskAmount = accountBalance * (riskPercent / 100)
  const pipSize = getPipSize(entryPrice)
  const slDistance = Math.abs(entryPrice - slPrice)
  const slPips = slDistance / pipSize
  if (slPips <= 0) return 0.01
  const volume = riskAmount / (slPips * 1)
  return Math.max(0.01, Math.round(volume / 0.01) * 0.01)
}

function isPinBar(c: Candle): boolean {
  const range = c.high - c.low
  if (range === 0) return false
  const body = Math.abs(c.close - c.open)
  if (body / range > 0.4) return false
  const upperWick = c.high - Math.max(c.open, c.close)
  const lowerWick = Math.min(c.open, c.close) - c.low
  const longer = Math.max(upperWick, lowerWick)
  const shorter = Math.min(upperWick, lowerWick)
  if (shorter > body) return false
  return longer >= body * 2
}

function isBullishEngulfing(prev: Candle, curr: Candle): boolean {
  return prev.close < prev.open && curr.close > curr.open &&
    curr.open <= prev.close && curr.close >= prev.open
}

function isBearishEngulfing(prev: Candle, curr: Candle): boolean {
  return prev.close > prev.open && curr.close < curr.open &&
    curr.open >= prev.close && curr.close <= prev.open
}

function isInsideBar(prev: Candle, curr: Candle): boolean {
  return curr.high <= prev.high && curr.low >= prev.low
}

function isDoji(c: Candle): boolean {
  const range = c.high - c.low
  if (range === 0) return false
  return Math.abs(c.close - c.open) / range < 0.1
}

function detectPatterns(
  rates: Candle[],
  patterns: Strategy['patterns'],
): { detected: string[]; direction: 'buy' | 'sell' | null } {
  if (rates.length < 2) return { detected: [], direction: null }
  const current = rates[rates.length - 1]
  const prev = rates[rates.length - 2]
  const detected: string[] = []
  let direction: 'buy' | 'sell' | null = null

  if (patterns.pinBar && isPinBar(current)) {
    detected.push('pinBar')
    direction = current.close > current.open ? 'buy' : 'sell'
  }
  if (patterns.engulfing) {
    if (isBullishEngulfing(prev, current)) {
      detected.push('bullishEngulfing')
      direction = 'buy'
    } else if (isBearishEngulfing(prev, current)) {
      detected.push('bearishEngulfing')
      direction = 'sell'
    }
  }
  if (patterns.insideBar && isInsideBar(prev, current)) {
    detected.push('insideBar')
    if (!direction) {
      direction = current.close > current.open ? 'buy' : 'sell'
      if (prev.close > prev.open && direction === 'buy') direction = 'buy'
      else if (prev.close < prev.open && direction === 'sell') direction = 'sell'
    }
  }
  if (patterns.doji && isDoji(current)) {
    detected.push('doji')
  }

  return { detected, direction }
}

export function runBacktest(
  strategy: Strategy,
  pair: string,
  candles: Candle[],
  initialBalance: number,
  spreadPips: number,
): BacktestResult {
  if (candles.length < 3) {
    return {
      trades: [],
      finalBalance: initialBalance,
      totalPnl: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      equityCurve: [],
    }
  }

  const sorted = [...candles].sort((a, b) => a.time - b.time)
  const spread = spreadPips * getPipSize(sorted[0].close)

  let balance = initialBalance
  const trades: BacktestTrade[] = []
  const eqCurve: { time: number; equity: number }[] = []
  let peak = balance

  interface OpenPos {
    ticket: number
    direction: 'buy' | 'sell'
    openPrice: number
    volume: number
    sl: number
    tp: number
    openTime: number
    patterns: string[]
  }
  const openPositions: OpenPos[] = []

  for (let i = 1; i < sorted.length; i++) {
    const candle = sorted[i]

    // 1. Check open positions against this candle's H/L
    const toClose: number[] = []
    for (const pos of openPositions) {
      if (pos.direction === 'buy') {
        if (candle.low <= pos.sl) {
          const closePips = (pos.sl - pos.openPrice) / getPipSize(pos.openPrice)
          const closePnl = closePips * pos.volume * 10
          balance += closePnl
          trades.push({
            pair,
            direction: pos.direction,
            openTime: pos.openTime,
            openPrice: pos.openPrice,
            closeTime: candle.time,
            closePrice: pos.sl,
            volume: pos.volume,
            sl: pos.sl,
            tp: pos.tp,
            pnl: closePnl,
            pips: closePips,
            patterns: pos.patterns,
            closeReason: 'sl',
          })
          toClose.push(pos.ticket)
        } else if (candle.high >= pos.tp) {
          const closePips = (pos.tp - pos.openPrice) / getPipSize(pos.openPrice)
          const closePnl = closePips * pos.volume * 10
          balance += closePnl
          trades.push({
            pair,
            direction: pos.direction,
            openTime: pos.openTime,
            openPrice: pos.openPrice,
            closeTime: candle.time,
            closePrice: pos.tp,
            volume: pos.volume,
            sl: pos.sl,
            tp: pos.tp,
            pnl: closePnl,
            pips: closePips,
            patterns: pos.patterns,
            closeReason: 'tp',
          })
          toClose.push(pos.ticket)
        }
      } else {
        if (candle.high >= pos.sl) {
          const closePips = (pos.openPrice - pos.sl) / getPipSize(pos.openPrice)
          const closePnl = closePips * pos.volume * 10
          balance += closePnl
          trades.push({
            pair,
            direction: pos.direction,
            openTime: pos.openTime,
            openPrice: pos.openPrice,
            closeTime: candle.time,
            closePrice: pos.sl,
            volume: pos.volume,
            sl: pos.sl,
            tp: pos.tp,
            pnl: closePnl,
            pips: closePips,
            patterns: pos.patterns,
            closeReason: 'sl',
          })
          toClose.push(pos.ticket)
        } else if (candle.low <= pos.tp) {
          const closePips = (pos.openPrice - pos.tp) / getPipSize(pos.openPrice)
          const closePnl = closePips * pos.volume * 10
          balance += closePnl
          trades.push({
            pair,
            direction: pos.direction,
            openTime: pos.openTime,
            openPrice: pos.openPrice,
            closeTime: candle.time,
            closePrice: pos.tp,
            volume: pos.volume,
            sl: pos.sl,
            tp: pos.tp,
            pnl: closePnl,
            pips: closePips,
            patterns: pos.patterns,
            closeReason: 'tp',
          })
          toClose.push(pos.ticket)
        }
      }
    }
    for (const ticket of toClose) {
      const idx = openPositions.findIndex((p) => p.ticket === ticket)
      if (idx !== -1) openPositions.splice(idx, 1)
    }

    // 2. Detect patterns on completed candle
    const rates = sorted.slice(0, i + 1)
    const { detected, direction } = detectPatterns(rates, strategy.patterns)

    if (detected.length > 0 && direction && openPositions.length === 0) {
      const tradeDir = strategy.direction === 'both'
        ? direction
        : strategy.direction === 'long' ? 'buy' : 'sell'

      if (
        (strategy.direction === 'long' && direction === 'sell') ||
        (strategy.direction === 'short' && direction === 'buy')
      ) {
        eqCurve.push({ time: candle.time, equity: balance })
        continue
      }

      const entryPrice = tradeDir === 'buy'
        ? candle.close + spread
        : candle.close - spread

      const { sl, tp } = calculateSLTP(entryPrice, tradeDir, strategy, sorted.slice(0, i + 1), balance)
      const volume = calculateVolume(balance, entryPrice, sl, strategy.positionSizing.riskPerTrade)

      openPositions.push({
        ticket: nextId(),
        direction: tradeDir,
        openPrice: entryPrice,
        volume,
        sl,
        tp,
        openTime: candle.time,
        patterns: detected,
      })
    }

    // 3. Record equity snapshot
    const openPnl = openPositions.reduce((sum, pos) => {
      if (pos.direction === 'buy') {
        const pips = (candle.close - pos.openPrice) / getPipSize(pos.openPrice)
        return sum + pips * pos.volume * 10
      } else {
        const pips = (pos.openPrice - candle.close) / getPipSize(pos.openPrice)
        return sum + pips * pos.volume * 10
      }
    }, 0)
    const equity = balance + openPnl
    eqCurve.push({ time: candle.time, equity })
    if (equity > peak) peak = equity
  }

  // Close any remaining positions at last candle's close
  const lastCandle = sorted[sorted.length - 1]
  for (const pos of openPositions) {
    const closePrice = lastCandle.close
    let closePips: number
    if (pos.direction === 'buy') {
      closePips = (closePrice - pos.openPrice) / getPipSize(pos.openPrice)
    } else {
      closePips = (pos.openPrice - closePrice) / getPipSize(pos.openPrice)
    }
    const closePnl = closePips * pos.volume * 10
    balance += closePnl
    trades.push({
      pair,
      direction: pos.direction,
      openTime: pos.openTime,
      openPrice: pos.openPrice,
      closeTime: lastCandle.time,
      closePrice,
      volume: pos.volume,
      sl: pos.sl,
      tp: pos.tp,
      pnl: closePnl,
      pips: closePips,
      patterns: pos.patterns,
      closeReason: 'end_of_test',
    })
  }

  // Compute stats
  const totalTrades = trades.length
  const wins = trades.filter((t) => t.pnl > 0).length
  const losses = trades.filter((t) => t.pnl <= 0).length
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
  const grossProfit = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(trades.filter((t) => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

  // Max drawdown from equity curve
  let maxDd = 0
  let highWater = initialBalance
  for (const pt of eqCurve) {
    if (pt.equity > highWater) highWater = pt.equity
    const dd = highWater - pt.equity
    if (dd > maxDd) maxDd = dd
  }

  // Sharpe ratio on trade returns
  const returns = trades.map((t) => t.pnl)
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length
  const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length
  const sharpe = Math.sqrt(variance) > 0
    ? (mean / Math.sqrt(variance)) * Math.sqrt(252)
    : 0

  return {
    trades,
    finalBalance: balance,
    totalPnl,
    totalTrades,
    wins,
    losses,
    winRate,
    profitFactor,
    maxDrawdown: maxDd,
    sharpeRatio: sharpe,
    equityCurve: eqCurve,
  }
}
