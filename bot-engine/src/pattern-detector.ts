import type { Candle } from './types.js'

function body(c: Candle) {
  return Math.abs(c.close - c.open)
}

function range(c: Candle) {
  return c.high - c.low
}

function upperWick(c: Candle) {
  return c.high - Math.max(c.open, c.close)
}

function lowerWick(c: Candle) {
  return Math.min(c.open, c.close) - c.low
}

export function isPinBar(candle: Candle): boolean {
  const r = range(candle)
  if (r === 0) return false
  const b = body(candle)
  if (b / r > 0.4) return false

  const uw = upperWick(candle)
  const lw = lowerWick(candle)
  const longWick = Math.max(uw, lw)
  const shortWick = Math.min(uw, lw)

  return longWick >= 2 * b && shortWick <= b
}

export function isBullishEngulfing(prev: Candle, curr: Candle): boolean {
  const prevBearish = prev.close < prev.open
  const currBullish = curr.close > curr.open
  if (!prevBearish || !currBullish) return false
  return curr.open < prev.close && curr.close > prev.open
}

export function isBearishEngulfing(prev: Candle, curr: Candle): boolean {
  const prevBullish = prev.close > prev.open
  const currBearish = curr.close < curr.open
  if (!prevBullish || !currBearish) return false
  return curr.open > prev.close && curr.close < prev.open
}

export function isInsideBar(prev: Candle, curr: Candle): boolean {
  return curr.high <= prev.high && curr.low >= prev.low
}

export function isDoji(candle: Candle): boolean {
  const r = range(candle)
  if (r === 0) return false
  return body(candle) / r < 0.1
}

export interface DetectionResult {
  detected: string[]
  direction: 'buy' | 'sell' | null
}

export function detectPatterns(
  rates: Candle[],
  config: {
    pinBar: boolean
    engulfing: boolean
    insideBar: boolean
    doji: boolean
  }
): DetectionResult {
  const detected: string[] = []
  let direction: 'buy' | 'sell' | null = null

  if (rates.length < 2) return { detected, direction }

  const curr = rates[rates.length - 1]
  const prev = rates[rates.length - 2]

  if (config.pinBar && isPinBar(curr)) {
    detected.push('pinBar')
    direction = curr.close > curr.open ? 'buy' : 'sell'
  }

  if (config.engulfing) {
    if (isBullishEngulfing(prev, curr)) {
      detected.push('bullishEngulfing')
      direction = 'buy'
    } else if (isBearishEngulfing(prev, curr)) {
      detected.push('bearishEngulfing')
      direction = 'sell'
    }
  }

  if (config.insideBar && isInsideBar(prev, curr)) {
    detected.push('insideBar')
    // Inside bar is a continuation pattern — direction matches previous trend
    direction = direction ?? (prev.close > prev.open ? 'buy' : 'sell')
  }

  if (config.doji && isDoji(curr)) {
    detected.push('doji')
    // Doji signals indecision — don't override direction
  }

  return { detected, direction }
}
