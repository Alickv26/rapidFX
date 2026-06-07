import type { EAHeartbeat, StrategyConfig, PaperPosition, Trade, Candle, Position } from './types.js'
import { getPipSize, checkTrailingStop } from './risk-manager.js'
import {
  writeTrade,
  updateTrade,
  writeAuditLog,
  updateSignal,
  loadUserSettings,
  updatePaperBalance,
  getFirestore,
} from './firestore-client.js'

const positions = new Map<number, PaperPosition>()
let nextTicketId = 0

function nextPaperTicket(): number {
  return --nextTicketId
}

export function getPaperPositions(): PaperPosition[] {
  return [...positions.values()]
}

export function getPaperPositionsForSymbol(symbol: string): PaperPosition[] {
  return [...positions.values()].filter((p) => p.symbol === symbol)
}

export function getPaperPositionsForStrategy(strategyId: string): PaperPosition[] {
  return [...positions.values()].filter((p) => p.strategyId === strategyId)
}

export async function loadPaperPositions(): Promise<void> {
  const firestore = getFirestore()
  const snap = await firestore
    .collection('trades')
    .where('paper', '==', true)
    .where('status', '==', 'open')
    .get()

  for (const d of snap.docs) {
    const t = { id: d.id, ...d.data() } as Trade
    if (!t.paper) continue
    const pos: PaperPosition = {
      ticket: t.ticket,
      tradeId: t.id,
      uid: t.uid,
      accountId: t.accountId,
      strategyId: t.strategyId,
      symbol: t.pair,
      type: t.direction,
      volume: t.volume,
      openPrice: t.openPrice,
      sl: t.sl,
      tp: t.tp,
      openTime: t.openTime,
      currentPrice: t.currentPrice ?? t.openPrice,
      pnl: t.pnl ?? 0,
      pips: t.pips ?? 0,
    }
    positions.set(t.ticket, pos)
    if (t.ticket < nextTicketId) nextTicketId = t.ticket
  }
  console.log(`[PAPER] Loaded ${positions.size} open paper positions`)
}

export async function executePaperTrade(
  signalId: string,
  strategy: StrategyConfig,
  pairDisplay: string,
  direction: 'buy' | 'sell',
  entryPrice: number,
  volume: number,
  sl: number,
  tp: number,
): Promise<void> {
  const ticket = nextPaperTicket()

  const tradeData: Omit<Trade, 'id'> = {
    uid: strategy.uid,
    accountId: strategy.accountId ?? '',
    strategyId: strategy.id,
    ticket,
    pair: pairDisplay,
    direction,
    volume,
    openPrice: entryPrice,
    closePrice: null,
    sl,
    tp,
    openTime: Date.now(),
    closeTime: null,
    pnl: null,
    pips: null,
    status: 'open',
    reason: 'paper_signal',
    paper: true,
  }

  const tradeId = await writeTrade(tradeData)

  positions.set(ticket, {
    ticket,
    tradeId,
    uid: strategy.uid,
    accountId: strategy.accountId ?? '',
    strategyId: strategy.id,
    symbol: pairDisplay,
    type: direction,
    volume,
    openPrice: entryPrice,
    sl,
    tp,
    openTime: Date.now(),
    currentPrice: entryPrice,
    pnl: 0,
    pips: 0,
  })

  await updateSignal(signalId, { executed: true, tradeId })

  await writeAuditLog({
    uid: strategy.uid,
    action: 'paper_trade_opened',
    details: { ticket, pair: pairDisplay, signalId, direction, volume, entryPrice, sl, tp },
    timestamp: Date.now(),
  })

  console.log(`[PAPER] Opened #${ticket} ${direction.toUpperCase()} ${pairDisplay} @ ${entryPrice}`)
}

export async function processPaperHeartbeat(
  heartbeat: EAHeartbeat,
): Promise<void> {
  const toClose: number[] = []

  for (const [ticket, pos] of positions) {
    const symbolData = heartbeat.symbols[pos.symbol]
    if (!symbolData) continue

    const currentPrice = pos.type === 'buy' ? symbolData.bid : symbolData.ask
    pos.currentPrice = currentPrice

    if (
      (pos.type === 'buy' && currentPrice <= pos.sl) ||
      (pos.type === 'sell' && currentPrice >= pos.sl)
    ) {
      toClose.push(ticket)
      continue
    }

    if (
      (pos.type === 'buy' && currentPrice >= pos.tp) ||
      (pos.type === 'sell' && currentPrice <= pos.tp)
    ) {
      toClose.push(ticket)
      continue
    }

    const pipSize = getPipSize(pos.openPrice)
    const priceDiff =
      pos.type === 'buy'
        ? currentPrice - pos.openPrice
        : pos.openPrice - currentPrice
    pos.pips = priceDiff / pipSize
    pos.pnl = pos.pips * pos.volume * 10

    await updateTrade(pos.tradeId, {
      currentPrice,
      pnl: pos.pnl,
      pips: pos.pips,
    })
  }

  for (const ticket of toClose) {
    const pos = positions.get(ticket)
    if (!pos) continue
    await closePaperPosition(ticket, pos.currentPrice, 'sl_tp_hit')
  }
}

async function closePaperPosition(
  ticket: number,
  closePrice: number,
  reason: string,
): Promise<void> {
  const pos = positions.get(ticket)
  if (!pos) return

  const pipSize = getPipSize(pos.openPrice)
  const priceDiff =
    pos.type === 'buy'
      ? closePrice - pos.openPrice
      : pos.openPrice - closePrice
  const pips = priceDiff / pipSize
  const pnl = pips * pos.volume * 10

  await updateTrade(pos.tradeId, {
    closePrice,
    pnl,
    pips,
    closeTime: Date.now(),
    status: 'closed',
  })

  const settings = await loadUserSettings(pos.uid)
  if (settings) {
    const newBalance = Math.max(0, settings.paperBalance + pnl)
    await updatePaperBalance(pos.uid, newBalance)
  }

  await writeAuditLog({
    uid: pos.uid,
    action: 'paper_trade_closed',
    details: { ticket, pair: pos.symbol, closePrice, pnl, pips, reason },
    timestamp: Date.now(),
  })

  positions.delete(ticket)
  console.log(`[PAPER] Closed #${ticket} ${pos.symbol} PnL: ${pnl.toFixed(2)} (${reason})`)
}

export async function checkPaperTrailingStops(
  strategies: StrategyConfig[],
  heartbeat: EAHeartbeat,
  getCandles: (symbol: string) => Candle[],
): Promise<void> {
  for (const [ticket, pos] of positions) {
    const strategy = strategies.find((s) => s.id === pos.strategyId)
    if (!strategy || !strategy.risk.trailingStop) continue

    const rates = getCandles(pos.symbol)
    if (rates.length < 14) continue

    const symbolData = heartbeat.symbols[pos.symbol]
    if (!symbolData) continue

    const currentPrice = pos.type === 'buy' ? symbolData.bid : symbolData.ask

    const mt5Pos: Position = {
      ticket,
      symbol: pos.symbol,
      type: pos.type === 'buy' ? 0 : 1,
      volume: pos.volume,
      openPrice: pos.openPrice,
      sl: pos.sl,
      tp: pos.tp,
      profit: pos.pnl,
    }

    const newSl = checkTrailingStop(currentPrice, mt5Pos, strategy.risk.trailDistance, rates)

    if (newSl !== null) {
      pos.sl = newSl
      await updateTrade(pos.tradeId, { sl: newSl })
    }
  }
}

export async function syncPaperPositions(
  heartbeat: EAHeartbeat,
): Promise<void> {
  for (const [, pos] of positions) {
    const symbolData = heartbeat.symbols[pos.symbol]
    if (!symbolData) continue

    const currentPrice = pos.type === 'buy' ? symbolData.bid : symbolData.ask
    pos.currentPrice = currentPrice

    const pipSize = getPipSize(pos.openPrice)
    const priceDiff =
      pos.type === 'buy'
        ? currentPrice - pos.openPrice
        : pos.openPrice - currentPrice
    pos.pips = priceDiff / pipSize
    pos.pnl = pos.pips * pos.volume * 10

    await updateTrade(pos.tradeId, {
      currentPrice,
      pnl: pos.pnl,
      pips: pos.pips,
    })
  }
}
