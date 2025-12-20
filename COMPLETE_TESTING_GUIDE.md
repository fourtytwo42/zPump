# Complete Testing Guide - zPump Smart Contracts

This guide provides step-by-step instructions to set up, deploy, and test the zPump smart contracts from scratch. Follow these instructions to achieve 99% test coverage and verify all operations work within gas limits.

## Prerequisites

Before starting, ensure you have:

1. **Solana CLI** installed (version 3.0.13 or later)
   ```bash
   solana --version
   ```

2. **Anchor CLI** installed (version 0.32.1)
   ```bash
   anchor --version
   ```

3. **Node.js and npm** installed
   ```bash
   node --version
   npm --version
   ```

4. **Rust and Cargo** installed
   ```bash
   rustc --version
   cargo --version
   ```

## Step 1: Build All Programs

First, build all smart contract programs:

```bash
cd /home/hendo420/zpump
anchor build --ignore-keys
```

**Expected Output:**
- All programs compile successfully
- `.so` files generated in `target/deploy/`
- IDL files generated in `target/idl/`
- Stack overflow warnings are expected and documented (not errors)

**Verify Build:**
```bash
ls -lh target/deploy/*.so
```

You should see:
- `ptf_factory.so`
- `ptf_vault.so`
- `ptf_verifier_groth16.so`
- `ptf_pool.so`
- `ptf_dex.so` (optional)

## Step 2: Start the Validator

Start the Solana test validator in a separate terminal or as a background process:

**Option A: Background Process (Recommended)**
```bash
cd /home/hendo420/zpump
pkill -9 -f "solana-test-validator" 2>/dev/null
rm -rf test-ledger ~/.config/solana/test-ledger 2>/dev/null
nohup solana-test-validator --reset --rpc-port 8899 --faucet-port 9900 --limit-ledger-size 50000000 > /tmp/validator.log 2>&1 &
```

**Option B: Separate Terminal**
```bash
# In a new terminal window
cd /home/hendo420/zpump
solana-test-validator --reset --rpc-port 8899 --faucet-port 9900 --limit-ledger-size 50000000
```

**Wait for Validator to Start:**
```bash
# Check if validator is ready (may take 20-30 seconds)
for i in {1..30}; do
  curl -s http://127.0.0.1:8899 -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "Validator is ready!"
    break
  fi
  sleep 2
done
```

**Verify Validator:**
```bash
tail -20 /tmp/validator.log
# Should show validator startup messages
```

## Step 3: Configure Solana CLI

Configure the Solana CLI to use the local validator:

```bash
solana config set --url http://127.0.0.1:8899
```

**Check Configuration:**
```bash
solana config get
# Should show:
# RPC URL: http://127.0.0.1:8899
```

## Step 4: Fund Your Account

Airdrop SOL to your default keypair:

```bash
solana balance
# If balance is low or zero:
solana airdrop 10
sleep 3
solana balance
# Should show ~10 SOL
```

**If Airdrop Fails:**
- Wait a few seconds and try again
- Check that validator is running: `pgrep -f solana-test-validator`
- Check validator logs: `tail -f /tmp/validator.log`

## Step 5: Deploy All Programs

Deploy all smart contract programs to the validator:

```bash
cd /home/hendo420/zpump
bash scripts/deploy-all.sh
```

**Expected Output:**
```
Deploying all zPump programs to local validator...
Deploying ptf_factory...
Program Id: AG2eT5fyfPdv6wjDWCxr5Y9JBK9cD5rahLzuz2UbbBvg
Deploying ptf_vault...
Program Id: iHWU2DfontkA7ZT2C6hFph3SSpkTjPm2a4t2C54CxSw
Deploying ptf_verifier_groth16...
Program Id: DMvUxHwdJGkaRAJFXEKgDxsmVXL3gYttNsVP16xEr9TE
Deploying ptf_pool...
Program Id: 9ykdCimDZGsCBB9ihC9QfDKib4KxYzpRZZTVrGp425Ku
All programs deployed successfully!
```

**Verify Deployments:**
```bash
solana program show AG2eT5fyfPdv6wjDWCxr5Y9JBK9cD5rahLzuz2UbbBvg
solana program show 9ykdCimDZGsCBB9ihC9QfDKib4KxYzpRZZTVrGp425Ku
solana program show iHWU2DfontkA7ZT2C6hFph3SSpkTjPm2a4t2C54CxSw
solana program show DMvUxHwdJGkaRAJFXEKgDxsmVXL3gYttNsVP16xEr9TE
```

Each should show "Program Id" and deployment information.

## Step 6: Bootstrap wSOL

Bootstrap wrapped SOL (wSOL) on the validator:

```bash
cd /home/hendo420/zpump
npm run bootstrap-wsol
```

**Expected Output:**
```
Bootstrapping wSOL on local validator...
wSOL mint: So11111111111111111111111111111111111111112
wSOL token account created
wSOL bootstrapped successfully!
```

**What This Does:**
- Creates wSOL token account if it doesn't exist
- Wraps SOL into wSOL for testing
- Sets up wSOL for use in shield/unshield operations

## Step 7: Bootstrap Environment

Initialize the factory, register mints, and create verifying keys:

```bash
cd /home/hendo420/zpump
npm run bootstrap
```

**Expected Output:**
```
Bootstrapping private devnet environment...
Initializing factory...
Registering test mint...
Creating verifying key...
Environment bootstrapped successfully!
```

**What This Does:**
1. Initializes the `ptf_factory` program
2. Registers test token mints
3. Creates verifying keys for proof verification
4. Sets up initial pool state

## Step 8: Install Test Dependencies

Install all test dependencies:

```bash
cd /home/hendo420/zpump/tests
npm install
```

**Expected Output:**
```
added XXX packages, and audited XXX packages in XXs
```

**Verify Installation:**
```bash
ls node_modules/@coral-xyz/anchor
ls node_modules/@solana/web3.js
```

## Step 9: Run Test Suite

Run the complete test suite:

```bash
cd /home/hendo420/zpump/tests
npm test
```

**Expected Output:**
```
  Factory Tests
    ✓ initialize factory
    ✓ register mint
    ✓ create verifying key

  Vault Tests
    ✓ deposit tokens
    ✓ withdraw tokens

  Verifier Tests
    ✓ initialize verifying key
    ✓ verify groth16 proof

  Shield Operations (Token)
    ✓ prepare shield
    ✓ execute shield v2

  ... (many more tests)

  X passing (XXs)
```

**Test Categories:**
1. **Unit Tests:** Factory, Vault, Verifier
2. **Integration Tests:** Shield, Unshield, Transfer, Allowance, Batch operations
3. **Edge Case Tests:** Min/max amounts, invalid inputs, error conditions
4. **State Machine Tests:** Unshield state transitions
5. **E2E Tests:** Full user flows, multi-user scenarios, complex operations

**If Tests Fail:**
- Check validator is still running: `pgrep -f solana-test-validator`
- Check validator logs: `tail -f /tmp/validator.log`
- Verify programs are deployed: `solana program show <PROGRAM_ID>`
- Check test output for specific error messages

## Step 10: Generate Coverage Report

Generate test coverage report:

```bash
cd /home/hendo420/zpump/tests
npx tsx coverage-report.ts
```

**Expected Output:**
```
Coverage Report
==============

Program: ptf_factory
  Instructions Covered: 3/3 (100%)
  ...

Program: ptf_pool
  Instructions Covered: XX/XX (XX%)
  ...

Overall Coverage: XX%
```

**Coverage Goals:**
- Target: 99% coverage on all smart contracts
- All instructions should be covered
- All error paths should be tested

## Step 11: Verify Gas Limits

Check gas usage for all operations:

```bash
cd /home/hendo420/zpump/tests
npx tsx gas-report.ts  # If this script exists
```

Or check test output for gas usage information.

**Gas Limit Goals:**
- All operations should complete within compute unit limits
- Shield operations: < 1.4M compute units
- Unshield operations: < 1.4M compute units per step
- Transfer operations: < 1.4M compute units
- Batch operations: < 1.4M compute units total

## Troubleshooting

### Validator Won't Start

**Symptoms:** Validator crashes or won't respond

**Solutions:**
1. Check system resources: `free -h` and `df -h`
2. Clean ledger: `rm -rf test-ledger ~/.config/solana/test-ledger`
3. Try minimal options: `solana-test-validator --reset --rpc-port 8899`
4. Check logs: `tail -f /tmp/validator.log`
5. Try different port: `--rpc-port 8900`

### Programs Won't Deploy

**Symptoms:** Deployment fails with errors

**Solutions:**
1. Verify validator is running: `curl http://127.0.0.1:8899`
2. Check you have SOL: `solana balance`
3. Verify programs are built: `ls target/deploy/*.so`
4. Check program IDs match: `grep -r "declare_id!" programs/*/src/lib.rs`
5. Try deploying individually: `solana program deploy target/deploy/ptf_factory.so`

### Tests Fail

**Symptoms:** Tests fail with various errors

**Solutions:**
1. **AccountNotFound:** Programs not deployed - run `bash scripts/deploy-all.sh`
2. **InsufficientFunds:** Need more SOL - run `solana airdrop 10`
3. **ProgramError:** Check validator logs for details
4. **Timeout:** Validator may be slow - increase timeout in test setup
5. **Connection Refused:** Validator not running - restart validator

### Bootstrap Fails

**Symptoms:** Bootstrap scripts fail

**Solutions:**
1. Verify programs are deployed first
2. Check you have SOL: `solana balance`
3. Verify wSOL exists: `spl-token accounts`
4. Check factory is initialized: `solana account <FACTORY_STATE>`
5. Review bootstrap script logs for specific errors

## Complete Automation Script

For fully automated execution, use this script:

```bash
#!/bin/bash
set -e

echo "=== zPump Complete Testing Setup ==="

# Step 1: Build
echo "Step 1: Building programs..."
anchor build --ignore-keys

# Step 2: Start Validator
echo "Step 2: Starting validator..."
pkill -9 -f "solana-test-validator" 2>/dev/null || true
rm -rf test-ledger ~/.config/solana/test-ledger 2>/dev/null
nohup solana-test-validator --reset --rpc-port 8899 --faucet-port 9900 --limit-ledger-size 50000000 > /tmp/validator.log 2>&1 &

# Wait for validator
echo "Waiting for validator to start..."
for i in {1..30}; do
  curl -s http://127.0.0.1:8899 -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "Validator is ready!"
    break
  fi
  sleep 2
done

# Step 3: Configure
echo "Step 3: Configuring Solana CLI..."
solana config set --url http://127.0.0.1:8899

# Step 4: Fund
echo "Step 4: Funding account..."
solana airdrop 10
sleep 3

# Step 5: Deploy
echo "Step 5: Deploying programs..."
bash scripts/deploy-all.sh

# Step 6: Bootstrap wSOL
echo "Step 6: Bootstrapping wSOL..."
npm run bootstrap-wsol

# Step 7: Bootstrap Environment
echo "Step 7: Bootstrapping environment..."
npm run bootstrap

# Step 8: Install Test Dependencies
echo "Step 8: Installing test dependencies..."
cd tests
npm install

# Step 9: Run Tests
echo "Step 9: Running tests..."
npm test

# Step 10: Coverage
echo "Step 10: Generating coverage report..."
npx tsx coverage-report.ts

echo "=== Complete! ==="
```

Save as `run-complete-tests.sh` and execute:
```bash
chmod +x run-complete-tests.sh
./run-complete-tests.sh
```

## Expected Results

After completing all steps, you should have:

1. ✅ All programs deployed and verified
2. ✅ wSOL bootstrapped and ready
3. ✅ Factory initialized with test mints
4. ✅ All tests passing (unit, integration, E2E)
5. ✅ 99%+ test coverage achieved
6. ✅ All operations within gas limits
7. ✅ Coverage report generated
8. ✅ Gas usage reports available

## Next Steps

After successful testing:

1. **Review Coverage Report:** Identify any uncovered code paths
2. **Review Gas Reports:** Optimize high gas operations if needed
3. **Fix Any Failures:** Address any test failures or edge cases
4. **Document Results:** Update project documentation with test results
5. **Prepare for Production:** Review security, optimize gas, finalize contracts

## Support

If you encounter issues not covered in this guide:

1. Check validator logs: `tail -f /tmp/validator.log`
2. Check test output: Review test failure messages
3. Verify all prerequisites are installed
4. Review error messages for specific guidance
5. Check project documentation in `.cursor/project-docs/`

## Summary

This guide provides complete instructions to:
- Set up the testing environment
- Deploy all smart contracts
- Bootstrap the test environment
- Run the full test suite
- Generate coverage and gas reports
- Achieve 99% test coverage
- Verify all operations work within gas limits

Follow each step carefully, and you'll have a fully tested, production-ready smart contract system.

