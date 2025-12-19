#!/bin/bash
set -e

echo "Starting Solana test validator with upgrade authority..."

# Kill any existing validator
pkill -f solana-test-validator || true
sleep 2

# Start validator without programs (we'll deploy with upgrade authority)
solana-test-validator \
  --reset \
  --quiet \
  --rpc-port 8899 \
  --faucet-port 9900 \
  --limit-ledger-size 50000000 \
  &

VALIDATOR_PID=$!
echo "Validator started with PID: $VALIDATOR_PID"

# Wait for validator to be ready
echo "Waiting for validator to be ready..."
sleep 5

# Generate upgrade authority keypair if it doesn't exist
if [ ! -f "tmp/upgrade-authority.json" ]; then
    mkdir -p tmp
    solana-keygen new -o tmp/upgrade-authority.json --no-bip39-passphrase
    echo "Generated upgrade authority keypair"
fi

# Set cluster to localnet
solana config set --url http://127.0.0.1:8899

# Airdrop SOL to upgrade authority
echo "Airdropping SOL to upgrade authority..."
UPGRADE_AUTHORITY=$(solana-keygen pubkey tmp/upgrade-authority.json)
solana airdrop 10 $UPGRADE_AUTHORITY || true
sleep 2

# Deploy all programs with upgrade authority
echo "Deploying programs with upgrade authority..."

if [ -f "target/deploy/ptf_factory.so" ]; then
    echo "Deploying ptf_factory..."
    solana program deploy target/deploy/ptf_factory.so \
      --program-id target/deploy/ptf_factory-keypair.json \
      --upgrade-authority tmp/upgrade-authority.json \
      --url http://127.0.0.1:8899
fi

if [ -f "target/deploy/ptf_vault.so" ]; then
    echo "Deploying ptf_vault..."
    solana program deploy target/deploy/ptf_vault.so \
      --program-id target/deploy/ptf_vault-keypair.json \
      --upgrade-authority tmp/upgrade-authority.json \
      --url http://127.0.0.1:8899
fi

if [ -f "target/deploy/ptf_verifier_groth16.so" ]; then
    echo "Deploying ptf_verifier_groth16..."
    solana program deploy target/deploy/ptf_verifier_groth16.so \
      --program-id target/deploy/ptf_verifier_groth16-keypair.json \
      --upgrade-authority tmp/upgrade-authority.json \
      --url http://127.0.0.1:8899
fi

if [ -f "target/deploy/ptf_pool.so" ]; then
    echo "Deploying ptf_pool..."
    solana program deploy target/deploy/ptf_pool.so \
      --program-id target/deploy/ptf_pool-keypair.json \
      --upgrade-authority tmp/upgrade-authority.json \
      --url http://127.0.0.1:8899
fi

if [ -f "target/deploy/ptf_dex.so" ]; then
    echo "Deploying ptf_dex..."
    solana program deploy target/deploy/ptf_dex.so \
      --program-id target/deploy/ptf_dex-keypair.json \
      --upgrade-authority tmp/upgrade-authority.json \
      --url http://127.0.0.1:8899
fi

echo "Validator running on http://127.0.0.1:8899"
echo "Faucet running on http://127.0.0.1:9900"
echo "Upgrade authority: $UPGRADE_AUTHORITY"
echo ""
echo "To stop the validator, run: pkill -f solana-test-validator"

