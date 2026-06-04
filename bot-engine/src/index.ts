import express from 'express'
import cors from 'cors'
import { createRouter } from './mt5-bridge.js'

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

const PORT = parseInt(process.env.PORT || '3001', 10)

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/', createRouter())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
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
  console.log('')
})
