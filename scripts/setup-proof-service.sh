#!/bin/bash
# Setup script for proof service
# Installs dependencies and sets up environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Setting up proof service..."

# Check for Node.js (required for snarkjs)
if ! command -v node &> /dev/null; then
    echo "Error: Node.js not found. Please install Node.js first."
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm not found. Please install npm first."
    exit 1
fi

# Install snarkjs globally (if not already installed)
if ! command -v snarkjs &> /dev/null; then
    echo "Installing snarkjs..."
    npm install -g snarkjs
else
    echo "snarkjs already installed"
fi

# Check for circom
if ! command -v circom &> /dev/null; then
    echo "Warning: circom not found. Install with: npm install -g circom"
    echo "Circuit compilation will not work without circom"
else
    echo "circom found"
fi

# Build proof service
echo "Building proof service..."
cd "$PROJECT_ROOT/services/proof-service"
if cargo build --release; then
    echo "Proof service built successfully"
else
    echo "Warning: Proof service build failed"
    exit 1
fi

echo ""
echo "Proof service setup complete!"
echo ""
echo "To run the service:"
echo "  cd services/proof-service"
echo "  cargo run"
echo ""
echo "Or set environment variables:"
echo "  export PROOF_SERVICE_HOST=127.0.0.1"
echo "  export PROOF_SERVICE_PORT=8080"
echo "  cargo run"

