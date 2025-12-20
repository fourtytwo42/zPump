#!/bin/bash
set -e

echo "Deploying all zPump programs to local validator..."

# Check if validator is running
if ! curl -s http://127.0.0.1:8899 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' > /dev/null 2>&1; then
    echo "ERROR: Validator is not running on http://127.0.0.1:8899"
    echo "Please start the validator first:"
    echo "  solana-test-validator --reset --rpc-port 8899"
    exit 1
fi

# Set cluster to localnet
solana config set --url http://127.0.0.1:8899

# Check if we have a keypair
if ! solana address > /dev/null 2>&1; then
    echo "No default keypair found. Creating one..."
    solana-keygen new -o /tmp/test-keypair.json --no-bip39-passphrase
    solana config set --keypair /tmp/test-keypair.json
fi

# Airdrop SOL if needed
BALANCE=$(solana balance --lamports 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo "0")
if [ "$BALANCE" -lt 1000000000 ]; then
    echo "Airdropping SOL..."
    solana airdrop 10 || echo "Airdrop may have failed, continuing..."
fi

# Deploy programs
echo ""
echo "Deploying ptf_factory..."
if [ -f "target/deploy/ptf_factory.so" ]; then
    solana program deploy target/deploy/ptf_factory.so \
      --program-id target/deploy/ptf_factory-keypair.json \
      --url http://127.0.0.1:8899
else
    echo "ERROR: target/deploy/ptf_factory.so not found. Run 'anchor build' first."
    exit 1
fi

echo ""
echo "Deploying ptf_vault..."
if [ -f "target/deploy/ptf_vault.so" ]; then
    solana program deploy target/deploy/ptf_vault.so \
      --program-id target/deploy/ptf_vault-keypair.json \
      --url http://127.0.0.1:8899
else
    echo "ERROR: target/deploy/ptf_vault.so not found. Run 'anchor build' first."
    exit 1
fi

echo ""
echo "Deploying ptf_verifier_groth16..."
if [ -f "target/deploy/ptf_verifier_groth16.so" ]; then
    solana program deploy target/deploy/ptf_verifier_groth16.so \
      --program-id target/deploy/ptf_verifier_groth16-keypair.json \
      --url http://127.0.0.1:8899
else
    echo "ERROR: target/deploy/ptf_verifier_groth16.so not found. Run 'anchor build' first."
    exit 1
fi

echo ""
echo "Deploying ptf_pool..."
if [ -f "target/deploy/ptf_pool.so" ]; then
    solana program deploy target/deploy/ptf_pool.so \
      --program-id target/deploy/ptf_pool-keypair.json \
      --url http://127.0.0.1:8899
else
    echo "ERROR: target/deploy/ptf_pool.so not found. Run 'anchor build' first."
    exit 1
fi

echo ""
echo "Deploying ptf_dex (optional)..."
if [ -f "target/deploy/ptf_dex.so" ]; then
    solana program deploy target/deploy/ptf_dex.so \
      --program-id target/deploy/ptf_dex-keypair.json \
      --url http://127.0.0.1:8899 || echo "ptf_dex deployment failed (optional)"
else
    echo "WARNING: target/deploy/ptf_dex.so not found (optional program)"
fi

echo ""
echo "Verifying deployments..."
echo ""
echo "ptf_factory:"
solana program show AG2eT5fyfPdv6wjDWCxr5Y9JBK9cD5rahLzuz2UbbBvg 2>/dev/null | grep "Program Id" || echo "  Not deployed"
echo ""
echo "ptf_pool:"
solana program show 9ykdCimDZGsCBB9ihC9QfDKib4KxYzpRZZTVrGp425Ku 2>/dev/null | grep "Program Id" || echo "  Not deployed"
echo ""
echo "ptf_vault:"
solana program show iHWU2DfontkA7ZT2C6hFph3SSpkTjPm2a4t2C54CxSw 2>/dev/null | grep "Program Id" || echo "  Not deployed"
echo ""
echo "ptf_verifier_groth16:"
solana program show DMvUxHwdJGkaRAJFXEKgDxsmVXL3gYttNsVP16xEr9TE 2>/dev/null | grep "Program Id" || echo "  Not deployed"

echo ""
echo "All programs deployed successfully!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run bootstrap-wsol"
echo "  2. Run: npm run bootstrap"
echo "  3. Run: cd tests && npm install && npm test"

