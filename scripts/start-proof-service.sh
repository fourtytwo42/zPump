#!/bin/bash
# Start the proof service with proper configuration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROOF_SERVICE_DIR="$SCRIPT_DIR/../services/proof-service"
CIRCUITS_DIR="$SCRIPT_DIR/../circuits"

# Check if proof service is built
if [ ! -f "$PROOF_SERVICE_DIR/target/release/proof-service" ]; then
    echo "Building proof service..."
    cd "$PROOF_SERVICE_DIR"
    cargo build --release
fi

# Set absolute paths - ensure they're absolute
SHIELD_ABS="$(cd "$CIRCUITS_DIR/shield" && pwd)"
UNSHIELD_ABS="$(cd "$CIRCUITS_DIR/unshield" && pwd)"
TRANSFER_ABS="$(cd "$CIRCUITS_DIR/transfer" && pwd)"

export SHIELD_CIRCUIT_PATH="$SHIELD_ABS"
export UNSHIELD_CIRCUIT_PATH="$UNSHIELD_ABS"
export TRANSFER_CIRCUIT_PATH="$TRANSFER_ABS"
export SNARKJS_PATH=npx
export PROOF_SERVICE_HOST="${PROOF_SERVICE_HOST:-127.0.0.1}"
export PROOF_SERVICE_PORT="${PROOF_SERVICE_PORT:-8080}"
export RUST_LOG="${RUST_LOG:-info}"

echo "Starting proof service..."
echo "  Host: $PROOF_SERVICE_HOST"
echo "  Port: $PROOF_SERVICE_PORT"
echo "  Shield circuit: $SHIELD_CIRCUIT_PATH"
echo "  Unshield circuit: $UNSHIELD_CIRCUIT_PATH"
echo "  Transfer circuit: $TRANSFER_CIRCUIT_PATH"
echo "  snarkjs: $SNARKJS_PATH"
echo ""

cd "$PROOF_SERVICE_DIR"
exec ./target/release/proof-service

