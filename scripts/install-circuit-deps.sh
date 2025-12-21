#!/bin/bash
# Install dependencies for circuit compilation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$SCRIPT_DIR/../circuits"

echo "Installing circuit dependencies..."

cd "$CIRCUITS_DIR"

# Install Node.js dependencies (circomlib for Poseidon hash)
if [ -f "package.json" ]; then
    echo "Installing npm packages..."
    npm install
else
    echo "package.json not found, creating..."
    npm init -y
    npm install circomlib@^2.0.5
fi

# Check for circom
if ! command -v circom &> /dev/null; then
    echo "Warning: circom not found globally"
    echo "Install with: npm install -g circom"
fi

# Check for snarkjs
if ! command -v snarkjs &> /dev/null; then
    echo "Warning: snarkjs not found globally"
    echo "Install with: npm install -g snarkjs"
fi

echo "Circuit dependencies installed!"

