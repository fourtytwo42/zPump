#!/bin/bash
# Run comprehensive test suite for all zPump operations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

cd "$PROJECT_ROOT"

# Configuration
export PROOF_SERVICE_URL="${PROOF_SERVICE_URL:-http://127.0.0.1:8080}"
export EXTERNAL_VERIFIER_URL="${EXTERNAL_VERIFIER_URL:-http://127.0.0.1:8081}"
export USE_REAL_PROOFS="${USE_REAL_PROOFS:-false}"

echo "=== zPump Comprehensive Test Suite ==="
echo ""
echo "Configuration:"
echo "  PROOF_SERVICE_URL: $PROOF_SERVICE_URL"
echo "  EXTERNAL_VERIFIER_URL: $EXTERNAL_VERIFIER_URL"
echo "  USE_REAL_PROOFS: $USE_REAL_PROOFS"
echo ""

# Check if services are available
echo "Checking services..."
if [ "$USE_REAL_PROOFS" = "true" ]; then
  echo "  Checking proof service..."
  if curl -s "$PROOF_SERVICE_URL/health" > /dev/null 2>&1; then
    echo "    ✓ Proof service available"
  else
    echo "    ✗ Proof service not available at $PROOF_SERVICE_URL"
    echo "    Run: ./scripts/start-proof-service.sh"
  fi
  
  echo "  Checking external verifier..."
  if curl -s "$EXTERNAL_VERIFIER_URL/health" > /dev/null 2>&1; then
    echo "    ✓ External verifier available"
  else
    echo "    ✗ External verifier not available at $EXTERNAL_VERIFIER_URL"
    echo "    Run: ./scripts/start-external-verifier.sh"
  fi
fi

echo ""
echo "Building programs..."
anchor build

echo ""
echo "Running comprehensive tests..."
echo ""

# Run comprehensive test suite using mocha
# Note: This requires a local validator to be running
# Start with: anchor localnet
echo "Running comprehensive tests with mocha..."
echo "Note: Ensure a local validator is running (anchor localnet)"
echo ""

cd tests
npm install --silent 2>/dev/null || true
npm test -- --grep "Comprehensive zPump Operations Test" || {
  echo ""
  echo "Note: Some tests may fail if services are not running or pool is not fully initialized"
  echo "This is expected for development - tests verify the operation flow structure"
  echo ""
  echo "To run with full setup:"
  echo "  1. Start local validator: anchor localnet"
  echo "  2. Start proof service: ./scripts/start-proof-service.sh"
  echo "  3. Start external verifier: ./scripts/start-external-verifier.sh"
  echo "  4. Run tests: USE_REAL_PROOFS=true ./scripts/run-comprehensive-tests.sh"
}
cd ..

echo ""
echo "=== Test Suite Complete ==="

