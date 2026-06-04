import { detectPatterns } from './pattern-detector.js'
import { calculateSLTP, calculateVolume, canOpenTrade, checkTrailingStop } from './risk-manager.js'
import { loadActiveStrategies, writeSignal, writeTrade, updateTrade, writeAuditLog, updateSignal } from './firestore-client.js'
import type {
  EAHeartbeat,
  StrategyConfig,
  Candle,
  TradeCommand,
  Position,
  Trade,
} from './types.js'

const pendingCommands: TradeCommand[] = []
const candleStore = new Map<string, Candle[]>()
const MAX_CANDLES = 100

function candleKey(symbol: string, timeframe: string): string {
  return `${symbol}:${timeframe}`
}

export function storeCandles(symbol: string, rates: Candle[]): void {
  const key = candleKey(symbol, 'current')
  const existing = candleStore.get(key) || []
  const merged = [...existing, ...rates]

  const unique = new Map<number, Candle>()
  for (const c of merged) {
    unique.set(c.time, c)
  }

  candleStore.set(key, [...unique.values()].slice(-MAX_CANDLES))
}

export function getCandles(symbol: string): Candle[] {
  return candleStore.get(candleKey(symbol, 'current')) || []
}

export function getPendingCommands(): TradeCommand[] {
  const cmds = [...pendingCommands]
  pendingCommands.length = 0
  return cmds
}

let lastStrategiesLoad = 0
let cachedStrategies: StrategyConfig[] = []

async function getStrategies(): Promise<StrategyConfig[]> {
  if (Date.now() - lastStrategiesLoad > 30000) {
    lastStrategiesLoad = Date.now()
    cachedStrategies = await loadActiveStrategies()
  }
  return cachedStrategies
}

function signalExists(signals: string[]): boolean {
  return signals.length > 0
}

function normalizeSymbol(s: string): string {
  return s.replace('/', '')
}

export async function evaluateAll(
  heartbeat: EAHeartbeat
): Promise<void> {
  const strategies = await getStrategies()
  if (strategies.length === 0) return

  await checkTrailingStops(strategies, heartbeat)

  const accountDrawdown = heartbeat.account.balance > 0
    ? ((heartbeat.account.balance - heartbeat.account.equity) / heartbeat.account.balance) * 100
    : 0

  for (const strategy of strategies) {
    if (accountDrawdown >= strategy.drawdownLimit) {
      await writeAuditLog({
        uid: strategy.uid,
        action: 'drawdown_halt',
        details: {
          strategyId: strategy.id,
          drawdown: accountDrawdown.toFixed(2),
          limit: strategy.drawdownLimit,
        },
        timestamp: Date.now(),
      })
      continue
    }

    const strategySymbols = new Set(strategy.pairs.map(normalizeSymbol))

    for (const [symbol, data] of Object.entries(heartbeat.symbols)) {
      if (!strategySymbols.has(symbol)) continue
      const pairDisplay = strategy.pairs.find((p) => normalizeSymbol(p) === symbol) ?? symbol

      const hasOpenTrade = heartbeat.positions.some(
        (p) => p.symbol === symbol
      )
      if (hasOpenTrade) continue

      if (!data.rates || data.rates.length < 2) continue

      const rates = data.rates
      storeCandles(symbol, rates)

      if (data.rates && data.rates.length >= 2) {
        console.log(`[EVAL] ${symbol} rates=${data.rates.length}`)
      }

      const { detected, direction } = detectPatterns(rates, strategy.patterns)
      if (!signalExists(detected) || !direction) continue

      const tradeDir = strategy.direction === 'both'
        ? direction
        : strategy.direction === 'long' ? 'buy' : 'sell'

      if (strategy.direction === 'long' && direction === 'sell') continue
      if (strategy.direction === 'short' && direction === 'buy') continue

      const entryPrice = tradeDir === 'buy' ? data.ask : data.bid

      const { sl, tp } = calculateSLTP(
        entryPrice,
        tradeDir,
        strategy,
        rates,
        heartbeat.account.balance
      )

      const volume = calculateVolume(
        heartbeat.account.balance,
        entryPrice,
        sl,
        strategy.positionSizing.riskPerTrade
      )

      const strategyPositions = heartbeat.positions.filter(
        (p) => strategySymbols.has(p.symbol)
      )

      const riskCheck = canOpenTrade(
        strategy,
        heartbeat.positions,
        strategyPositions,
        heartbeat.account.balance,
        heartbeat.account.equity
      )

      if (!riskCheck.allowed) {
        console.log(`[${symbol}] ${riskCheck.reason}`)
        continue
      }

      const signalId = await writeSignal({
        timestamp: heartbeat.time,
        strategyId: strategy.id,
        pair: pairDisplay,
        direction: tradeDir,
        price: entryPrice,
        patterns: detected,
        timeframe: 'current',
        executed: false,
        tradeId: null,
      })

      await writeAuditLog({
        uid: strategy.uid,
        action: 'signal_generated',
        details: {
          strategyId: strategy.id,
          symbol: pairDisplay,
          direction: tradeDir,
          patterns: detected,
          price: entryPrice,
          sl,
          tp,
          volume,
        },
        timestamp: Date.now(),
      })

      const cmdId = `cmd_${Date.now()}_${symbol}`
      pendingCommands.push({
        id: cmdId,
        action: 'open',
        symbol,
        type: tradeDir,
        volume,
        sl,
        tp,
      })

      console.log(`[${symbol}] SIGNAL ${detected.join(',')} → ${tradeDir.toUpperCase()} @ ${entryPrice}`)
    }
  }
}

export async function handleTradeResult(
  commandId: string,
  ticket: number,
  success: boolean,
  error: string | null,
  heartbeatTimestamp: number,
  accountBalance: number
): Promise<void> {
  if (success) {
    const match = commandId.match(/cmd_\d+_(.+)/)
    const pair = match ? match[1] : 'UNKNOWN'

    const tradeData: Omit<Trade, 'id'> = {
      uid: 'bot',
      strategyId: 'unknown',
      ticket,
      pair,
      direction: 'buy',
      volume: 0.01,
      openPrice: 0,
      closePrice: null,
      sl: 0,
      tp: 0,
      openTime: Date.now(),
      closeTime: null,
      pnl: null,
      pips: null,
      status: 'open',
      reason: 'signal',
    }

    await writeTrade(tradeData)
    await writeAuditLog({
      uid: 'bot',
      action: 'trade_opened',
      details: { commandId, ticket },
      timestamp: Date.now(),
    })
  } else {
    await writeAuditLog({
      uid: 'bot',
      action: 'trade_error',
      details: { commandId, error },
      timestamp: Date.now(),
    })
  }
}

async function checkTrailingStops(
  strategies: StrategyConfig[],
  heartbeat: EAHeartbeat
): Promise<void> {
  for (const position of heartbeat.positions) {
    const strategy = strategies.find((s) => s.pairs.some((p) => normalizeSymbol(p) === position.symbol))
    if (!strategy || !strategy.risk.trailingStop) continue

    const rates = getCandles(position.symbol)
    if (rates.length < 14) continue

    const currentPrice = heartbeat.symbols[position.symbol]
    if (!currentPrice) continue

    const price = position.type === 0 ? currentPrice.bid : currentPrice.ask

    const newSl = checkTrailingStop(
      price,
      position,
      strategy.risk.trailDistance,
      rates
    )

    if (newSl !== null) {
      pendingCommands.push({
        id: `trail_${Date.now()}_${position.ticket}`,
        action: 'modify',
        symbol: position.symbol,
        ticket: position.ticket,
        sl: newSl,
      })
    }
  }
}

export async function handlePositionClosed(
  ticket: number,
  price: number,
  profit: number,
  pips: number
): Promise<void> {
  await writeAuditLog({
    uid: 'bot',
    action: 'trade_closed',
    details: { ticket, closePrice: price, profit, pips },
    timestamp: Date.now(),
  })
}

export function getCachedData(): {
  strategies: number
  candles: number
  pendingCommands: number
} {
  return {
    strategies: cachedStrategies.length,
    candles: candleStore.size,
    pendingCommands: pendingCommands.length,
  }
}
