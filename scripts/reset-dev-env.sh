#!/bin/bash
set -e

echo "Resetting development environment..."

# Stop validator
pkill -f solana-test-validator || true
sleep 2

# Clear ledger
if [ -d "test-ledger" ]; then
    rm -rf test-ledger
    echo "Cleared test-ledger directory"
fi

# Clear keypairs (optional - comment out if you want to keep them)
# rm -rf tmp/*.json

echo "Development environment reset complete"

