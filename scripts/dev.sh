#!/usr/bin/env bash
set -e

echo "Starting PostgreSQL..."
service postgresql start >/dev/null 2>&1 || true
sleep 1

cd "$(dirname "$0")/.."

echo "Starting backend, admin dashboard and field app..."
(cd server && npx tsx watch src/index.ts) &
SERVER_PID=$!
(cd admin-web && npm run dev) &
ADMIN_PID=$!
(cd sales-app && npm run dev) &
SALES_PID=$!

trap "kill $SERVER_PID $ADMIN_PID $SALES_PID 2>/dev/null" EXIT

echo "Backend:   http://localhost:4000"
echo "Admin:     http://localhost:5173"
echo "Field app: http://localhost:5174"

wait
