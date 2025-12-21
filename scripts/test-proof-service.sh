#!/bin/bash
# Test proof service with real circuit execution

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROOF_SERVICE_DIR="$SCRIPT_DIR/../services/proof-service"
CIRCUITS_DIR="$SCRIPT_DIR/../circuits"

echo "Testing proof service with real circuits..."

# Check if proof service is built
if [ ! -f "$PROOF_SERVICE_DIR/target/release/proof-service" ]; then
    echo "Building proof service..."
    cd "$PROOF_SERVICE_DIR"
    cargo build --release
fi

# Start proof service in background
echo "Starting proof service..."
cd "$PROOF_SERVICE_DIR"
export RUST_LOG=info
# Use absolute paths for circuit directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export SHIELD_CIRCUIT_PATH="$SCRIPT_DIR/../circuits/shield"
export UNSHIELD_CIRCUIT_PATH="$SCRIPT_DIR/../circuits/unshield"
export TRANSFER_CIRCUIT_PATH="$SCRIPT_DIR/../circuits/transfer"
export SNARKJS_PATH=npx
export PROOF_SERVICE_HOST=127.0.0.1
export PROOF_SERVICE_PORT=8080

./target/release/proof-service &
PROOF_SERVICE_PID=$!

# Wait for service to start
echo "Waiting for proof service to start..."
sleep 3

# Test health endpoint
echo ""
echo "Testing health endpoint..."
if curl -s http://127.0.0.1:8080/health | grep -q "ok"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    kill $PROOF_SERVICE_PID 2>/dev/null || true
    exit 1
fi

# Test shield proof generation
echo ""
echo "Testing shield proof generation..."
SHIELD_RESPONSE=$(curl -s -X POST http://127.0.0.1:8080/generate-proof/shield \
    -H "Content-Type: application/json" \
    -d '{
        "commitment": "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
        "amount": 1000
    }')

if echo "$SHIELD_RESPONSE" | grep -q "proof"; then
    echo "✅ Shield proof generation successful"
    echo "$SHIELD_RESPONSE" | jq '.' 2>/dev/null || echo "$SHIELD_RESPONSE"
else
    echo "❌ Shield proof generation failed"
    echo "$SHIELD_RESPONSE"
fi

# Test unshield proof generation
echo ""
echo "Testing unshield proof generation..."
UNSHIELD_RESPONSE=$(curl -s -X POST http://127.0.0.1:8080/generate-proof/unshield \
    -H "Content-Type: application/json" \
    -d '{
        "nullifier": "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
        "amount": 1000
    }')

if echo "$UNSHIELD_RESPONSE" | grep -q "proof"; then
    echo "✅ Unshield proof generation successful"
    echo "$UNSHIELD_RESPONSE" | jq '.' 2>/dev/null || echo "$UNSHIELD_RESPONSE"
else
    echo "❌ Unshield proof generation failed"
    echo "$UNSHIELD_RESPONSE"
fi

# Test transfer proof generation
echo ""
echo "Testing transfer proof generation..."
TRANSFER_RESPONSE=$(curl -s -X POST http://127.0.0.1:8080/generate-proof/transfer \
    -H "Content-Type: application/json" \
    -d '{
        "nullifier": "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
        "commitment": "2122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f40",
        "amount": 1000
    }')

if echo "$TRANSFER_RESPONSE" | grep -q "proof"; then
    echo "✅ Transfer proof generation successful"
    echo "$TRANSFER_RESPONSE" | jq '.' 2>/dev/null || echo "$TRANSFER_RESPONSE"
else
    echo "❌ Transfer proof generation failed"
    echo "$TRANSFER_RESPONSE"
fi

# Cleanup
echo ""
echo "Stopping proof service..."
kill $PROOF_SERVICE_PID 2>/dev/null || true
wait $PROOF_SERVICE_PID 2>/dev/null || true

echo ""
echo "Proof service testing complete!"
