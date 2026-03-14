#!/usr/bin/env bash
# Complete project setup: Docker Postgres, migrate, seed.
# Usage: ./scripts/setup.sh   or   bash scripts/setup.sh

set -e
cd "$(dirname "$0")/.."

echo "==> Installing dependencies..."
npm install

if [ ! -f backend/.env ]; then
  echo "==> Creating backend/.env from .env.example..."
  cp backend/.env.example backend/.env
fi

if command -v docker &>/dev/null; then
  echo "==> Starting PostgreSQL with Docker Compose..."
  docker compose up -d
  echo "==> Waiting for Postgres to be ready..."
  sleep 6
else
  echo "==> Docker not found. Ensure PostgreSQL is running and DATABASE_URL is set in backend/.env"
fi

echo "==> Running migrations..."
npm run migrate

echo "==> Running seeds..."
npm run seed

echo ""
echo "Setup complete. Start the server with: npm run dev"
echo "API will be at http://localhost:3000"
