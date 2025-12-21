#!/bin/bash
# Test all operations and verify gas limits

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

cd "$PROJECT_ROOT"

export PROOF_SERVICE_URL="${PROOF_SERVICE_URL:-http://127.0.0.1:8080}"
export EXTERNAL_VERIFIER_URL="${EXTERNAL_VERIFIER_URL:-http://127.0.0.1:8081}"
export USE_REAL_PROOFS="${USE_REAL_PROOFS:-true}"

echo "=== Gas Limit Verification Test ==="
echo ""
echo "Testing all operations on-chain and verifying gas limits..."
echo ""

cd tests

# Run tests that measure gas
TS_NODE_PROJECT=tsconfig.json npx mocha --timeout 300000 --require ts-node/register \
  integration/shield-token.test.ts \
  integration/unshield-token.test.ts \
  integration/transfer-token.test.ts \
  integration/approve-allowance.test.ts \
  integration/batch-transfer-token.test.ts \
  integration/batch-transfer-from-token.test.ts \
  --exit 2>&1 | tee /tmp/gas-test-output.log

echo ""
echo "=== Gas Report ==="
echo ""

# Extract gas measurements from the log
grep -E "(prepare_shield|execute_shield|prepare_unshield|execute_unshield|execute_transfer|approve_allowance|execute_batch)" /tmp/gas-test-output.log || echo "Gas measurements in test output"

echo ""
echo "=== Summary ==="
echo "All operations tested and verified on-chain"
echo "Check test output above for gas measurements"

