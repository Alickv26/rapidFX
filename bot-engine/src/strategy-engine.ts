import { detectPatterns } from './pattern-detector.js'
import { calculateSLTP, calculateVolume, canOpenTrade, checkTrailingStop } from './risk-manager.js'
import { loadActiveStrategies, writeSignal, writeTrade, updateTrade, writeAuditLog, updateSignal, getTradeByTicket, getUpcomingNews, writeCandles, loadUserSettings } from './firestore-client.js'
import {
  getPaperPositions,
  getPaperPositionsForSymbol,
  getPaperPositionsForStrategy,
  executePaperTrade,
  processPaperHeartbeat,
  checkPaperTrailingStops,
} from './paper-trader.js'
import type {
  EAHeartbeat,
  StrategyConfig,
  Candle,
  TradeCommand,
  Position,
  Trade,
  NewsEvent,
} from './types.js'

interface CommandMeta {
  signalId: string
  pairDisplay: string
  strategyId: string
  uid: string
  accountId: string
  direction: 'buy' | 'sell'
  volume: number
  sl: number
  tp: number
  entryPrice: number
}

const pendingCommands: TradeCommand[] = []
const commandMeta = new Map<string, CommandMeta>()
const candleStore = new Map<string, Candle[]>()
const MAX_CANDLES = 2000

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
let strategiesAccountId: string | undefined

export function setStrategiesAccountId(accountId?: string): void {
  strategiesAccountId = accountId
}

async function getStrategies(): Promise<StrategyConfig[]> {
  if (Date.now() - lastStrategiesLoad > 30000) {
    lastStrategiesLoad = Date.now()
    cachedStrategies = await loadActiveStrategies(strategiesAccountId)
  }
  return cachedStrategies
}

function signalExists(signals: string[]): boolean {
  return signals.length > 0
}

function normalizeSymbol(s: string): string {
  return s.replace('/', '')
}

function extractCurrencies(pairs: string[]): string[] {
  return [...new Set(pairs.flatMap((p) => p.split('/')))]
}

const IMPACT_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3 }

async function checkNewsFilter(
  strategy: StrategyConfig,
  heartbeatTimestamp: number
): Promise<boolean> {
  if (!strategy.newsFilter.enabled) return true

  const windowMs = strategy.newsFilter.windowBefore * 60 * 60 * 1000
  const afterMs = strategy.newsFilter.windowAfter * 60 * 60 * 1000
  const start = heartbeatTimestamp * 1000 - afterMs
  const end = start + windowMs + afterMs

  const events = await getUpcomingNews(start, end)
  if (events.length === 0) return true

  const currencies = extractCurrencies(strategy.pairs)
  const minLevel = IMPACT_ORDER[strategy.newsFilter.minImpact]

  for (const ev of events) {
    if (!currencies.includes(ev.currency)) continue
    if ((IMPACT_ORDER[ev.impact.toLowerCase()] ?? 0) >= minLevel) {
      return false
    }
  }
  return true
}

const lastSyncedCandle = new Map<string, number>()

function syncCandlesToFirestore(symbol: string, symbolData: { rates?: Candle[] }): void {
  if (!symbolData.rates || symbolData.rates.length < 2) return
  const lastCandle = symbolData.rates[symbolData.rates.length - 1]
  if (!lastCandle) return

  const lastSync = lastSyncedCandle.get(symbol) || 0
  if (lastCandle.time > lastSync) {
    lastSyncedCandle.set(symbol, lastCandle.time)
    writeCandles(symbol, getCandles(symbol).slice(-100))
  }
}

export async function evaluateAll(
  heartbeat: EAHeartbeat
): Promise<void> {
  const strategies = await getStrategies()
  if (strategies.length === 0) return

  await checkTrailingStops(strategies, heartbeat)
  await checkPaperTrailingStops(strategies, heartbeat, getCandles)

  const userSettingsCache = new Map<string, { paperMode: boolean; paperBalance: number }>()

  async function getSettings(uid: string) {
    if (userSettingsCache.has(uid)) return userSettingsCache.get(uid)!
    const s = await loadUserSettings(uid)
    const result = s ?? { paperMode: true, paperBalance: 100000 }
    userSettingsCache.set(uid, result)
    return result
  }

  const accountDrawdown = heartbeat.account.balance > 0
    ? ((heartbeat.account.balance - heartbeat.account.equity) / heartbeat.account.balance) * 100
    : 0

  for (const strategy of strategies) {
      const us = await getSettings(strategy.uid)
      const paperMode = us.paperMode
      const paperPnl = paperMode ? getPaperPositions().reduce((s, p) => s + p.pnl, 0) : 0
      const paperEquity = paperMode ? us.paperBalance + paperPnl : 0
      const effectiveDrawdown = paperMode && us.paperBalance > 0
        ? Math.max(0, ((us.paperBalance - paperEquity) / us.paperBalance) * 100)
        : accountDrawdown

      if (effectiveDrawdown >= strategy.drawdownLimit) {
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

      if (!(await checkNewsFilter(strategy, heartbeat.time))) {
        console.log(`[NEWS] ${strategy.name} — paused (news filter active)`)
        continue
      }

      const strategySymbols = new Set(strategy.pairs.map(normalizeSymbol))

    for (const [symbol, data] of Object.entries(heartbeat.symbols)) {
      if (!strategySymbols.has(symbol)) continue
      const pairDisplay = strategy.pairs.find((p) => normalizeSymbol(p) === symbol) ?? symbol

      const hasOpenTrade = paperMode
        ? getPaperPositionsForSymbol(symbol).length > 0
        : heartbeat.positions.some((p) => p.symbol === symbol)
      if (hasOpenTrade) continue

      if (!data.rates || data.rates.length < 2) continue

      const rates = data.rates
      storeCandles(symbol, rates)
      syncCandlesToFirestore(symbol, data)

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
        paperMode ? us.paperBalance : heartbeat.account.balance,
        entryPrice,
        sl,
        strategy.positionSizing.riskPerTrade
      )

      const paperPos = paperMode ? getPaperPositionsForStrategy(strategy.id) : []
      const strategyPositions = paperMode
        ? paperPos
        : heartbeat.positions.filter((p) => strategySymbols.has(p.symbol))

      const riskCheck = canOpenTrade(
        strategy,
        [],
        strategyPositions as Position[],
        paperMode ? us.paperBalance : heartbeat.account.balance,
        paperMode ? us.paperBalance + paperPos.reduce((s, p) => s + p.pnl, 0) : heartbeat.account.equity
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

      if (paperMode) {
        await executePaperTrade(signalId, strategy, pairDisplay, tradeDir, entryPrice, volume, sl, tp)
      } else {
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
          commandMeta.set(cmdId, {
            signalId,
            pairDisplay,
            strategyId: strategy.id,
            uid: strategy.uid,
            accountId: strategy.accountId ?? '',
            direction: tradeDir,
            volume,
            sl,
            tp,
            entryPrice,
          })
      }

      console.log(`[${symbol}] SIGNAL ${detected.join(',')} → ${tradeDir.toUpperCase()} @ ${entryPrice}`)
    }
  }

  await processPaperHeartbeat(heartbeat)
}

export async function handleTradeResult(
  commandId: string,
  ticket: number,
  success: boolean,
  error: string | null,
  heartbeatTimestamp: number,
  accountBalance: number
): Promise<void> {
  const meta = commandMeta.get(commandId)
  commandMeta.delete(commandId)

  if (success && meta) {
      const tradeData: Omit<Trade, 'id'> = {
        uid: meta.uid,
        accountId: meta.accountId,
        strategyId: meta.strategyId,
        ticket,
        pair: meta.pairDisplay,
        direction: meta.direction,
        volume: meta.volume,
        openPrice: meta.entryPrice,
        closePrice: null,
        sl: meta.sl,
        tp: meta.tp,
        openTime: Date.now(),
        closeTime: null,
        pnl: null,
        pips: null,
        status: 'open',
        reason: 'signal',
      }

    const tradeId = await writeTrade(tradeData)
    await updateSignal(meta.signalId, { executed: true, tradeId })

    await writeAuditLog({
      uid: meta.uid,
      action: 'trade_opened',
      details: { commandId, ticket, pair: meta.pairDisplay, signalId: meta.signalId },
      timestamp: Date.now(),
    })
  } else if (success && !meta) {
    const tradeData: Omit<Trade, 'id'> = {
        uid: 'bot',
        accountId: '',
        strategyId: 'unknown',
        ticket,
      pair: 'UNKNOWN',
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
      uid: meta?.uid ?? 'bot',
      action: 'trade_error',
      details: { commandId, error, signalId: meta?.signalId },
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
  const trade = await getTradeByTicket(ticket)
  if (trade) {
    await updateTrade(trade.id, {
      closePrice: price || null,
      pnl: profit || null,
      pips: pips || null,
      closeTime: Date.now(),
      status: 'closed',
    })
    await writeAuditLog({
      uid: trade.uid,
      action: 'trade_closed',
      details: { ticket, closePrice: price, profit, pips, tradeId: trade.id },
      timestamp: Date.now(),
    })
  } else {
    await writeAuditLog({
      uid: 'bot',
      action: 'trade_closed',
      details: { ticket, closePrice: price, profit, pips },
      timestamp: Date.now(),
    })
  }
}

export async function syncPositionsToTrades(
  heartbeat: EAHeartbeat
): Promise<void> {
  for (const position of heartbeat.positions) {
    const trade = await getTradeByTicket(position.ticket)
    if (!trade) continue

    const symbolData = heartbeat.symbols[position.symbol]
    const currentPrice = position.type === 0
      ? symbolData?.bid
      : symbolData?.ask

    const updates: Partial<Trade> = {
      pnl: position.profit || null,
    }
    if (currentPrice) {
      updates.currentPrice = currentPrice
    }
    await updateTrade(trade.id, updates)
  }
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
