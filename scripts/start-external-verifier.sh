#!/bin/bash
# Start the external verifier service

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERIFIER_DIR="$SCRIPT_DIR/../services/external-verifier"

# Check if verifier is built (check both locations)
if [ ! -f "$VERIFIER_DIR/target/release/external-verifier" ] && [ ! -f "$SCRIPT_DIR/../target/release/external-verifier" ]; then
    echo "Building external verifier..."
    cd "$SCRIPT_DIR/.."
    cargo build --release -p external-verifier
fi

# Use binary from workspace target if available
if [ -f "$SCRIPT_DIR/../target/release/external-verifier" ]; then
    VERIFIER_BIN="$SCRIPT_DIR/../target/release/external-verifier"
elif [ -f "$VERIFIER_DIR/target/release/external-verifier" ]; then
    VERIFIER_BIN="$VERIFIER_DIR/target/release/external-verifier"
else
    echo "❌ External verifier binary not found"
    exit 1
fi

export VERIFIER_SERVICE_HOST="${VERIFIER_SERVICE_HOST:-127.0.0.1}"
export VERIFIER_SERVICE_PORT="${VERIFIER_SERVICE_PORT:-8081}"
export RUST_LOG="${RUST_LOG:-info}"

echo "Starting external verifier service..."
echo "  Host: $VERIFIER_SERVICE_HOST"
echo "  Port: $VERIFIER_SERVICE_PORT"
echo ""

exec "$VERIFIER_BIN"

