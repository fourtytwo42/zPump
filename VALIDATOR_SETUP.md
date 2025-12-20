# Validator Setup Guide

This guide explains how to manually start the Solana test validator, deploy programs, and bootstrap the environment for testing.

## Prerequisites

- Solana CLI installed and in PATH
- Anchor CLI installed and in PATH
- All programs built (`anchor build` completed successfully)
- Node.js and npm installed

## Step 1: Start the Validator

Open a terminal and run:

```bash
# Kill any existing validator
pkill -f solana-test-validator || true

# Start validator
solana-test-validator \
  --reset \
  --rpc-port 8899 \
  --faucet-port 9900 \
  --limit-ledger-size 50000000
```

**Keep this terminal open** - the validator must remain running.

Wait for output like:
```
Ledger location: test-ledger
Log: test-ledger/validator.log
Identity: <your-keypair>
Genesis Hash: <hash>
Version: <version>
Shred Version: <version>
Gossip Address: 127.0.0.1:1024
TPU Address: 127.0.0.1:1027
JSON RPC URL: http://127.0.0.1:8899
```

## Step 2: Configure Solana CLI

In a **new terminal**, configure Solana CLI to use the local validator:

```bash
# Set cluster to localnet
solana config set --url http://127.0.0.1:8899

# Generate a keypair for testing (if you don't have one)
solana-keygen new -o /tmp/test-keypair.json --no-bip39-passphrase

# Set it as default
solana config set --keypair /tmp/test-keypair.json

# Airdrop SOL
solana airdrop 10
```

Verify it worked:
```bash
solana balance
# Should show: 10 SOL
```

## Step 3: Deploy Programs

Deploy all programs with their program IDs:

```bash
# Make sure you're in the project root
cd /home/hendo420/zpump

# Deploy ptf_factory
solana program deploy target/deploy/ptf_factory.so \
  --program-id target/deploy/ptf_factory-keypair.json

# Deploy ptf_vault
solana program deploy target/deploy/ptf_vault.so \
  --program-id target/deploy/ptf_vault-keypair.json

# Deploy ptf_verifier_groth16
solana program deploy target/deploy/ptf_verifier_groth16.so \
  --program-id target/deploy/ptf_verifier_groth16-keypair.json

# Deploy ptf_pool
solana program deploy target/deploy/ptf_pool.so \
  --program-id target/deploy/ptf_pool-keypair.json

# Deploy ptf_dex (optional)
solana program deploy target/deploy/ptf_dex.so \
  --program-id target/deploy/ptf_dex-keypair.json
```

Verify deployments:
```bash
solana program show AG2eT5fyfPdv6wjDWCxr5Y9JBK9cD5rahLzuz2UbbBvg
solana program show 9ykdCimDZGsCBB9ihC9QfDKib4KxYzpRZZTVrGp425Ku
solana program show iHWU2DfontkA7ZT2C6hFph3SSpkTjPm2a4t2C54CxSw
solana program show DMvUxHwdJGkaRAJFXEKgDxsmVXL3gYttNsVP16xEr9TE
```

Each should show program data with the correct program ID.

## Step 4: Bootstrap Environment

Bootstrap wSOL and initialize the factory:

```bash
# Install dependencies if not already done
npm install

# Bootstrap wSOL
npm run bootstrap-wsol

# Bootstrap private devnet (factory, mints, verifying keys)
npm run bootstrap
```

Expected output:
- wSOL mint created
- Factory initialized
- Test token mint created
- Mint registered in factory
- Verifying key created

## Step 5: Run Tests

Install test dependencies and run tests:

```bash
cd tests
npm install
npm test
```

Or run specific test suites:

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e
```

## Troubleshooting

### Validator Won't Start

**Error:** `Address already in use`

**Solution:**
```bash
# Kill existing validator
pkill -f solana-test-validator
# Wait a few seconds
sleep 3
# Try again
solana-test-validator --reset --rpc-port 8899
```

### Can't Connect to Validator

**Error:** `ECONNREFUSED 127.0.0.1:8899`

**Solution:**
1. Check if validator is running: `ps aux | grep solana-test-validator`
2. Check validator logs: `tail -f test-ledger/validator.log`
3. Verify port is correct: `netstat -tuln | grep 8899`

### Program Deployment Fails

**Error:** `Program account data too large`

**Solution:**
- Ensure you're using the correct program ID keypair
- Check that the .so file exists: `ls -lh target/deploy/*.so`
- Try deploying with `--max-len` flag (not recommended, indicates build issue)

**Error:** `AccountNotFound`

**Solution:**
- Ensure validator is running and you've airdropped SOL
- Check your keypair: `solana address`
- Airdrop more SOL: `solana airdrop 10`

### Bootstrap Scripts Fail

**Error:** `Cannot find module '@solana/web3.js'`

**Solution:**
```bash
# Install dependencies
npm install
```

**Error:** `Factory already initialized`

**Solution:**
- This is normal if you've run bootstrap before
- The script handles this gracefully
- If you need a fresh start, reset the validator: `solana-test-validator --reset`

### Tests Fail to Connect

**Error:** `ECONNREFUSED` in tests

**Solution:**
1. Verify validator is running
2. Check `tests/setup.ts` has correct RPC URL: `http://127.0.0.1:8899`
3. Ensure programs are deployed (Step 3)

## Quick Reference

### Start Everything (Manual)

```bash
# Terminal 1: Validator
solana-test-validator --reset --rpc-port 8899

# Terminal 2: Deploy and Test
solana config set --url http://127.0.0.1:8899
solana-keygen new -o /tmp/test-keypair.json --no-bip39-passphrase
solana config set --keypair /tmp/test-keypair.json
solana airdrop 10

# Deploy programs (one by one)
solana program deploy target/deploy/ptf_factory.so --program-id target/deploy/ptf_factory-keypair.json
solana program deploy target/deploy/ptf_vault.so --program-id target/deploy/ptf_vault-keypair.json
solana program deploy target/deploy/ptf_verifier_groth16.so --program-id target/deploy/ptf_verifier_groth16-keypair.json
solana program deploy target/deploy/ptf_pool.so --program-id target/deploy/ptf_pool-keypair.json

# Bootstrap
npm run bootstrap-wsol
npm run bootstrap

# Run tests
cd tests && npm install && npm test
```

### Stop Everything

```bash
# Stop validator
pkill -f solana-test-validator

# Clean up (optional)
rm -rf test-ledger
```

## Program IDs Reference

- `ptf_factory`: `AG2eT5fyfPdv6wjDWCxr5Y9JBK9cD5rahLzuz2UbbBvg`
- `ptf_pool`: `9ykdCimDZGsCBB9ihC9QfDKib4KxYzpRZZTVrGp425Ku`
- `ptf_vault`: `iHWU2DfontkA7ZT2C6hFph3SSpkTjPm2a4t2C54CxSw`
- `ptf_verifier_groth16`: `DMvUxHwdJGkaRAJFXEKgDxsmVXL3gYttNsVP16xEr9TE`
- `ptf_dex`: `EkCLPUfEtSMJsEwJbVtDifeZ5H4dJREkMeFXAxwBde6b`

## Notes

- The validator must stay running while testing
- Each program deployment takes a few seconds
- Bootstrap scripts may take 10-30 seconds
- Tests may take several minutes depending on coverage
- Stack overflow warnings in build are expected (will be optimized later)

