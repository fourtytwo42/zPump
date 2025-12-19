# Testing Guide

This guide explains how to test the zPump project correctly, avoiding common testing pitfalls.

## Test Structure

### Test Scripts Location

All test scripts are in `web/app/scripts/`:

- `test-prepare-execute.ts` - End-to-end tests for all operations
- `wrap-unwrap-local.ts` - Simple wrap/unwrap smoke test
- `indexer-shielded-e2e.ts` - Indexer integration test
- `ztoken-transfer-e2e.ts` - Transfer and allowance tests

## Running Tests

### Prerequisites

1. **Validator running:** `solana-test-validator` must be running
2. **Programs deployed:** All programs must be deployed
3. **Environment bootstrapped:** Factory, mints, and verifying keys initialized
4. **Services running:** Proof RPC and indexer services (if needed)

### Quick Test

```bash
# Run all prepare/execute tests
cd web/app
npx tsx scripts/test-prepare-execute.ts
```

### Individual Operation Tests

```bash
# Test specific operation
npx tsx scripts/test-prepare-execute.ts shield
npx tsx scripts/test-prepare-execute.ts unshield
npx tsx scripts/test-prepare-execute.ts transfer
npx tsx scripts/test-prepare-execute.ts transferFrom
npx tsx scripts/test-prepare-execute.ts batchTransfer
npx tsx scripts/test-prepare-execute.ts batchTransferFrom
```

### Smoke Test

```bash
# Simple wrap/unwrap test
npx tsx scripts/wrap-unwrap-local.ts
```

## Test Environment Setup

### 1. Reset Environment

```bash
# Stop all services
pm2 stop all

# Reset environment (clears ledger and state)
./scripts/reset-dev-env.sh

# Restart validator with upgrade authority
./scripts/start-private-devnet-with-upgrade.sh
```

### 2. Bootstrap Environment

```bash
# Initialize factory, mints, verifying keys
cd web/app
npx tsx scripts/bootstrap-private-devnet.ts
```

### 3. Start Services

```bash
# Start proof service
cd services/proof-rpc
pm2 start ecosystem.config.js --name ptf-proof

# Start indexer (if needed)
cd ../../indexer/photon
pm2 start ecosystem.config.js --name ptf-indexer
```

## Test Patterns

### Pattern 1: Fresh Keypairs

**CRITICAL:** Always use fresh keypairs for each test to avoid state conflicts.

```typescript
// GOOD: Generate fresh keypair
const userKeypair = Keypair.generate();

// BAD: Reuse keypair from previous test
const userKeypair = existingKeypair; // Can cause state conflicts
```

### Pattern 2: Initialize Accounts

**CRITICAL:** Always initialize accounts before use.

```typescript
// Initialize pool before testing
await initializePool(connection, factoryProgram, mint);

// Verify pool is initialized
const poolState = await getPoolState(connection, mint);
if (!poolState) {
    throw new Error("Pool not initialized");
}
```

### Pattern 3: Clean State Between Tests

**CRITICAL:** Clean up test state between runs.

```typescript
// After each test, clean up
afterEach(async () => {
    // Reset validator if needed
    // Or use fresh keypairs for each test
});
```

### Pattern 4: Error Handling

**CRITICAL:** Always check for specific error codes, not just generic errors.

```typescript
// GOOD: Check specific error code
try {
    await executeShield(...);
} catch (error) {
    if (error.code === 0x19) {
        // Handle AccountDataTooShort
    } else if (error.code === 0x177d) {
        // Handle VerifierMismatch
    }
}

// BAD: Generic error handling
try {
    await executeShield(...);
} catch (error) {
    console.error("Error:", error); // Not specific enough
}
```

## Common Test Issues

### Issue 1: Stale State

**Symptom:** Tests fail with "account not found" or "account already exists"

**Fix:**
1. Reset environment: `./scripts/reset-dev-env.sh`
2. Use fresh keypairs for each test
3. Initialize accounts before use

### Issue 2: Program Not Deployed

**Symptom:** "Program account not found" or "Unknown program"

**Fix:**
1. Verify programs are deployed: `solana program show <program_id>`
2. Check program IDs match in all files
3. Redeploy programs if needed

### Issue 3: Missing Accounts

**Symptom:** "Account not found" or "Account data too short"

**Fix:**
1. Run bootstrap script: `npx tsx scripts/bootstrap-private-devnet.ts`
2. Verify accounts exist: `solana account <account_pubkey>`
3. Check account initialization in test

### Issue 4: Wrong Discriminator

**Symptom:** "Unknown instruction discriminator"

**Fix:**
1. Copy IDL files: `./scripts/copy-idls.sh`
2. Verify IDL matches program: Check discriminator in IDL
3. Rebuild programs if needed: `anchor build --ignore-keys`

### Issue 5: Stack Overflow

**Symptom:** "Access violation" or "Stack overflow"

**Fix:**
1. Check function has too many parameters
2. Use `AccountInfo` for unused parameters
3. Use `#[inline(never)]` on large functions
4. See [Implementation Patterns](03-implementation-patterns.md) for optimization

## Test Coverage

### Operations to Test

- [ ] Shield (wrap)
- [ ] Unshield (unwrap)
- [ ] Transfer
- [ ] TransferFrom (with allowance)
- [ ] BatchTransfer
- [ ] BatchTransferFrom
- [ ] ApproveAllowance
- [ ] RevokeAllowance

### Edge Cases to Test

- [ ] Shield with zero amount
- [ ] Unshield with invalid nullifier
- [ ] Transfer with insufficient balance
- [ ] TransferFrom with insufficient allowance
- [ ] Batch operations with empty batch
- [ ] Operations with wrong verifying key
- [ ] Operations with revoked verifying key

## Debugging Tests

### Enable Verbose Logging

```typescript
// Add verbose logging
console.log("Transaction signature:", signature);
console.log("Program logs:", logs);
console.log("Error:", error);
```

### Check Transaction Logs

```typescript
// Get full transaction details
const tx = await connection.getTransaction(signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
});

console.log("Transaction logs:", tx.meta.logMessages);
console.log("Transaction error:", tx.meta.err);
```

### Check Account State

```typescript
// Check account state
const accountInfo = await connection.getAccountInfo(accountPubkey);
console.log("Account data length:", accountInfo.data.length);
console.log("Account owner:", accountInfo.owner.toString());
```

### Check Program Logs

```typescript
// Enable program logging
// In Rust: msg!("Debug message: {:?}", value);
// In TypeScript: Check transaction logs for msg! output
```

## Continuous Integration

### CI Test Script

```bash
#!/bin/bash
set -e

# Start validator
solana-test-validator --reset --quiet &

# Wait for validator
sleep 5

# Deploy programs
./scripts/start-private-devnet-with-upgrade.sh

# Bootstrap environment
cd web/app
npx tsx scripts/bootstrap-private-devnet.ts

# Run tests
npx tsx scripts/test-prepare-execute.ts

# Cleanup
pkill solana-test-validator
```

## Test Best Practices (MANDATORY)

**These practices are REQUIRED. Do not skip any of them.**

1. **MANDATORY: Use fresh keypairs** - Generate new keypair for each test to avoid state conflicts
   ```typescript
   // REQUIRED: Generate fresh keypair
   const userKeypair = Keypair.generate();
   
   // FORBIDDEN: Reusing keypair
   const userKeypair = existingKeypair; // Will cause state conflicts
   ```

2. **MANDATORY: Initialize accounts** - Always initialize all accounts before use
   ```typescript
   // REQUIRED: Initialize pool before testing
   await initializePool(connection, factoryProgram, mint);
   
   // REQUIRED: Verify initialization succeeded
   const poolState = await getPoolState(connection, mint);
   if (!poolState) {
       throw new Error("Pool not initialized - test cannot proceed");
   }
   ```

3. **MANDATORY: Clean up state** - Reset validator between test runs
   ```bash
   # REQUIRED: Reset environment before tests
   ./scripts/reset-dev-env.sh
   
   # REQUIRED: Restart validator with upgrade authority
   ./scripts/start-private-devnet-with-upgrade.sh
   ```

4. **MANDATORY: Check specific errors** - Always check for specific error codes, never use generic error handling
   ```typescript
   // REQUIRED: Check specific error code
   try {
       await executeShield(...);
   } catch (error) {
       if (error.code === 0x19) {
           // Handle AccountDataTooShort
           console.error("Account data too short:", error);
       } else if (error.code === 0x177d) {
           // Handle VerifierMismatch
           console.error("Verifier mismatch:", error);
       } else {
           // Unexpected error
           throw new Error(`Unexpected error: ${error.code}`);
       }
   }
   
   // FORBIDDEN: Generic error handling
   try {
       await executeShield(...);
   } catch (error) {
       console.error("Error:", error); // Not specific enough - FORBIDDEN
   }
   ```

5. **MANDATORY: Verify account state** - Check accounts after operations to verify correctness
   ```typescript
   // REQUIRED: Verify account state after operation
   const accountInfo = await connection.getAccountInfo(accountPubkey);
   if (!accountInfo) {
       throw new Error("Account not found after operation");
   }
   if (accountInfo.data.length === 0) {
       throw new Error("Account data is empty after operation");
   }
   if (accountInfo.owner.toString() !== expectedOwner) {
       throw new Error(`Account owner mismatch: expected ${expectedOwner}, got ${accountInfo.owner}`);
   }
   ```

6. **MANDATORY: Test edge cases** - Test boundary conditions and error cases
   ```typescript
   // REQUIRED: Test edge cases
   // - Zero amount
   // - Maximum amount
   // - Invalid nullifier
   // - Insufficient balance
   // - Insufficient allowance
   // - Empty batch
   // - Wrong verifying key
   // - Revoked verifying key
   ```

7. **MANDATORY: Use verbose logging** - Enable logging for debugging
   ```typescript
   // REQUIRED: Add verbose logging
   console.log("Transaction signature:", signature);
   console.log("Program logs:", logs);
   console.log("Error:", error);
   console.log("Account state:", accountInfo);
   ```

8. **MANDATORY: Check transaction logs** - Review logs for errors and warnings
   ```typescript
   // REQUIRED: Get full transaction details
   const tx = await connection.getTransaction(signature, {
       commitment: 'confirmed',
       maxSupportedTransactionVersion: 0,
   });
   
   // REQUIRED: Check logs for errors
   if (tx.meta.err) {
       console.error("Transaction error:", tx.meta.err);
       console.error("Transaction logs:", tx.meta.logMessages);
       throw new Error(`Transaction failed: ${tx.meta.err}`);
   }
   
   // REQUIRED: Check logs for warnings
   const warnings = tx.meta.logMessages.filter(log => log.includes("Warning"));
   if (warnings.length > 0) {
       console.warn("Transaction warnings:", warnings);
   }
   ```

## Test Coverage Requirements (MANDATORY)

**You MUST test all of these operations. No exceptions.**

### Operations to Test (ALL REQUIRED)

- [ ] Shield (wrap) - MUST test
- [ ] Unshield (unwrap) - MUST test
- [ ] Transfer - MUST test
- [ ] TransferFrom (with allowance) - MUST test
- [ ] BatchTransfer - MUST test
- [ ] BatchTransferFrom - MUST test
- [ ] ApproveAllowance - MUST test
- [ ] RevokeAllowance - MUST test

### Edge Cases to Test (ALL REQUIRED)

- [ ] Shield with zero amount - MUST test
- [ ] Shield with maximum amount - MUST test
- [ ] Unshield with invalid nullifier - MUST test
- [ ] Unshield with already-used nullifier - MUST test
- [ ] Transfer with insufficient balance - MUST test
- [ ] TransferFrom with insufficient allowance - MUST test
- [ ] TransferFrom with zero allowance - MUST test
- [ ] Batch operations with empty batch - MUST test
- [ ] Batch operations with single item - MUST test
- [ ] Batch operations with maximum items - MUST test
- [ ] Operations with wrong verifying key - MUST test
- [ ] Operations with revoked verifying key - MUST test
- [ ] Operations with expired operation - MUST test
- [ ] Operations with invalid proof - MUST test
- [ ] Operations with invalid public inputs - MUST test

**CRITICAL:** All edge cases MUST pass before considering tests complete.

## Next Steps

1. Review [Troubleshooting Guide](06-troubleshooting-guide.md) for common issues
2. Check [Implementation Patterns](03-implementation-patterns.md) for code patterns
3. Read [Critical Issues](02-critical-issues-and-solutions.md) to avoid problems

