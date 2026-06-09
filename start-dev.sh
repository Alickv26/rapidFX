#!/usr/bin/env bash
set -e

ACCOUNT_ID="key_kdgz52zB_mq4axju4"
LAN_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v 127.0.0.1 | head -1)
FRONTEND_PORT=5173
ENGINE_PORT=3001

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $ENGINE_PID $VITE_PID 2>/dev/null
  wait $ENGINE_PID $VITE_PID 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

cd "$(dirname "$0")"

echo "╔══════════════════════════════════════════════════╗"
echo "║            RapidFX — Local Dev Server            ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Start bot engine
echo "[1/2] Starting bot engine (account: $ACCOUNT_ID)..."
ACCOUNT_ID="$ACCOUNT_ID" npm run dev --prefix bot-engine &
ENGINE_PID=$!

# Wait for engine to be ready
sleep 2

# Start Vite frontend
echo "[2/2] Starting frontend..."
npm run dev -- --host 0.0.0.0 &
VITE_PID=$!

sleep 3

echo ""
echo "════════════════════════════════════════════════════"
echo "  Ready!"
echo ""
echo "  PWA (open on phone):  http://$LAN_IP:$FRONTEND_PORT"
echo "  Bot engine:            http://127.0.0.1:$ENGINE_PORT"
echo "  Engine health:         http://127.0.0.1:$ENGINE_PORT/health"
echo ""
echo "  Your EA is already attached to MT5 → it will"
echo "  connect to the bot engine automatically."
echo ""
echo "  Create a strategy on your phone and it will"
echo "  be evaluated on the next heartbeat."
echo "════════════════════════════════════════════════════"
echo ""

wait
