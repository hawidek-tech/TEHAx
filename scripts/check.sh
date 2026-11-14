#!/usr/bin/env bash
# Local quality gate: runs every backend and frontend check. Used until a CI service is configured.
# Usage: ./scripts/check.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Backend: build + tests (requires PostgreSQL and backend/.env)"
(cd "$ROOT/backend" && ./mvnw -B -q verify)

echo "==> Frontend: lint, format, typecheck, tests, build"
(cd "$ROOT/frontend" && npm run lint && npm run format:check && npm run typecheck && npm test && npm run build)

echo "==> All checks passed"
