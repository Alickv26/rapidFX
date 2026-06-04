import { Router } from 'express'
import type { Request, Response } from 'express'
import { evaluateAll, getPendingCommands, handleTradeResult, handlePositionClosed, getCachedData, syncPositionsToTrades } from './strategy-engine.js'
import type { EAHeartbeat, TradeResult } from './types.js'

export function createRouter() {
  const router = Router()

  let lastHeartbeat: EAHeartbeat | null = null

  router.post('/ea/data', async (req: Request, res: Response) => {
    try {
      const heartbeat = req.body as EAHeartbeat
      lastHeartbeat = heartbeat

      const symCount = heartbeat.symbols ? Object.keys(heartbeat.symbols).length : 0
      console.log(`[HEARTBEAT] account=${heartbeat.account?.balance ?? '?'} symbols=${symCount} positions=${heartbeat.positions?.length ?? 0}`)

      setImmediate(() => {
        evaluateAll(heartbeat).catch((err) =>
          console.error('Evaluation error:', err)
        )
      })

      setImmediate(() => {
        syncPositionsToTrades(heartbeat).catch((err) =>
          console.error('Position sync error:', err)
        )
      })

      res.json({ status: 'ok', time: Date.now() })
    } catch (err) {
      console.error('Heartbeat error:', err)
      res.status(500).json({ status: 'error', message: String(err) })
    }
  })

  router.get('/ea/commands', (_req: Request, res: Response) => {
    const commands = getPendingCommands()
    res.json(commands)
  })

  router.post('/ea/result', async (req: Request, res: Response) => {
    try {
      const result = req.body as TradeResult
      await handleTradeResult(
        result.commandId,
        result.ticket,
        result.success,
        result.error,
        Date.now(),
        lastHeartbeat?.account.balance ?? 0
      )
      res.json({ status: 'ok' })
    } catch (err) {
      console.error('Result error:', err)
      res.status(500).json({ status: 'error', message: String(err) })
    }
  })

  router.post('/ea/close', async (req: Request, res: Response) => {
    try {
      const { ticket, price, profit, pips } = req.body
      await handlePositionClosed(ticket, price, profit, pips)
      res.json({ status: 'ok' })
    } catch (err) {
      console.error('Close error:', err)
      res.status(500).json({ status: 'error', message: String(err) })
    }
  })

  router.get('/status', (_req: Request, res: Response) => {
    const cache = getCachedData()
    res.json({
      running: true,
      heartbeat: lastHeartbeat
        ? {
            time: lastHeartbeat.time,
            age: Date.now() - lastHeartbeat.time,
            symbols: Object.keys(lastHeartbeat.symbols).length,
            positions: lastHeartbeat.positions.length,
            account: lastHeartbeat.account,
          }
        : null,
      cache,
    })
  })

  return router
}
