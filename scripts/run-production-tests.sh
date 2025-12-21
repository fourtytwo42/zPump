#!/bin/bash
# Run production tests with real proofs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Running production tests..."

# Check if proof service is running
PROOF_SERVICE_URL="${PROOF_SERVICE_URL:-http://127.0.0.1:8080}"
if curl -s "$PROOF_SERVICE_URL/health" > /dev/null 2>&1; then
    echo "✅ Proof service is running at $PROOF_SERVICE_URL"
    export PROOF_SERVICE_URL
else
    echo "⚠️  Proof service not running at $PROOF_SERVICE_URL"
    echo "   Tests will use mock proofs"
fi

# Run production test suite
cd "$PROJECT_ROOT"
npm test -- tests/production/

echo "Production tests complete!"

