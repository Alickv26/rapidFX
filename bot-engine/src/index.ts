import express from 'express'
import cors from 'cors'
import { createRouter } from './mt5-bridge.js'
import { refreshNewsCalendar, RateLimitError } from './news/forexfactory.js'
import { setStrategiesAccountId } from './strategy-engine.js'

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

const PORT = parseInt(process.env.PORT || '3001', 10)
const ACCOUNT_ID = process.env.ACCOUNT_ID || ''
if (ACCOUNT_ID) {
  setStrategiesAccountId(ACCOUNT_ID)
  console.log(`[MULTI-ACCOUNT] Filtering strategies for account: ${ACCOUNT_ID}`)
}

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/', createRouter())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

app.post('/news/refresh', async (_req, res) => {
  try {
    const result = await refreshNewsCalendar()
    res.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[news] Manual refresh error:', message)
    res.status(500).json({ success: false, error: message })
  }
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`
╔══════════════════════════════════════╗
║        RapidFX Bot Engine            ║
║  Listening on http://127.0.0.1:${PORT}  ║
╚══════════════════════════════════════╝
  `)
  console.log('Waiting for MT5 EA to connect...')
  console.log('Make sure:')
  console.log('  1. MT5 is running with RapidBridgeEA.mq5 attached to a chart')
  console.log('  2. WebRequest URLs allowed in MT5: Tools → Options → Expert Advisors')
  console.log('  3. Add http://127.0.0.1:3001 to the allowed list')
  console.log('')
  console.log('Endpoints:')
  console.log('  POST /ea/data      ← MT5 EA sends market data here')
  console.log('  GET  /ea/commands   → MT5 EA polls trade commands here')
  console.log('  POST /ea/result    ← MT5 EA reports execution results')
  console.log('  POST /ea/close     ← MT5 EA reports closed positions')
  console.log('  GET  /status       → Bot engine health & stats')
  console.log('  GET  /health       → Server health check')
  console.log('  POST /news/refresh → Manual news calendar refresh')
  console.log('')
  console.log(`News calendar will refresh automatically every 60 minutes`)
  console.log('')

  const NEWS_INTERVAL = 60 * 60 * 1000 // 60 min
  const NEWS_RETRY = 5 * 60 * 1000     // 5 min

  async function scheduledNewsRefresh(): Promise<void> {
    try {
      await refreshNewsCalendar()
    } catch (err) {
      if (err instanceof RateLimitError) {
        console.log('[news] Rate limited — retrying in 5 minutes')
        setTimeout(scheduledNewsRefresh, NEWS_RETRY)
        return
      }
      console.error('[news] Refresh error:', err instanceof Error ? err.message : err)
    }
  }

  // initial fetch after 5s delay, then every 60 minutes
  setTimeout(scheduledNewsRefresh, 5000)
  setInterval(scheduledNewsRefresh, NEWS_INTERVAL)
})
