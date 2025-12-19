# Troubleshooting Guide

This guide helps you diagnose and fix common issues in the zPump project.

## Quick Diagnosis

### Step 1: Check Error Message

Look for specific error codes:
- `0x19` (25) = `AccountDataTooShort`
- `0x177d` (6013) = `AlreadyRevoked` (from verifier) or `NullifierReuse` (from pool)
- `0x179f` (6047) = `RootMismatch` or `OperationNotFound`
- `0x1770` (6000) = `InvalidAccountOwner`
- `4100` = `DeclaredProgramIdMismatch`

### Step 2: Check Program Logs

```bash
# Get transaction logs
solana confirm <signature> --url http://127.0.0.1:8899

# Or in TypeScript
const tx = await connection.getTransaction(signature);
console.log(tx.meta.logMessages);
```

### Step 3: Check Account State

```bash
# Check account exists and owner
solana account <account_pubkey> --url http://127.0.0.1:8899

# Check program state
solana program show <program_id> --url http://127.0.0.1:8899
```

## Common Issues

### Issue: Access Violation (Stack Overflow)

**Symptoms:**
- Error: "Access violation in stack frame X at address 0x20000xxxx"
- No function logs appear
- Low compute unit usage (~7000-8000)

**Diagnosis:**
1. Check function has many parameters (20+)
2. Check function has large local variables
3. Check function uses many typed wrappers

**Fix:**
1. Convert unused parameters to `AccountInfo`
2. Use `#[inline(never)]` on large functions
3. Extract logic to helper functions
4. See [Implementation Patterns](03-implementation-patterns.md)

**Prevention:**
- Always use `AccountInfo` for unused parameters
- Keep functions small (< 200 lines)
- Use helper functions for complex logic

---

### Issue: Program ID Mismatch

**Symptoms:**
- Error: "DeclaredProgramIdMismatch" (4100)
- PDA derivations produce wrong addresses
- SDK and program derive different addresses

**Diagnosis:**
```bash
# Check program IDs in all files
grep -r "declare_id!" programs/
grep -r "PROGRAM_ID" web/app/lib/onchain/programIds.ts
grep -r "programs.localnet" Anchor.toml
```

**Fix:**
1. Update program IDs in all files to match
2. Run `anchor keys sync` to sync keys
3. Rebuild: `anchor build --ignore-keys`
4. Redeploy programs

**Prevention:**
- Always update program IDs in all files
- Use `grep` to verify IDs match
- Document program ID changes

---

### Issue: Account Not Found

**Symptoms:**
- Error: "Account not found"
- Error: "Account data too short" (0x19)
- Account exists but can't be deserialized

**Diagnosis:**
```bash
# Check account exists
solana account <account_pubkey> --url http://127.0.0.1:8899

# Check account owner
# Check account data length
```

**Fix:**
1. Initialize account: Run bootstrap script
2. Check account owner matches expected program
3. Check account has correct discriminator
4. Reinitialize account if format is wrong

**Prevention:**
- Always initialize accounts before use
- Always set account discriminator
- Always use `AnchorSerialize` for account data

---

### Issue: Immutable Program

**Symptoms:**
- Error: "Program's authority Some(11111111111111111111111111111111) does not match"
- Cannot upgrade program
- Program deployed but can't be updated

**Diagnosis:**
```bash
# Check program authority
solana program show <program_id> --url http://127.0.0.1:8899
# Authority should NOT be system program
```

**Fix:**
1. Reset environment: `./scripts/reset-dev-env.sh`
2. Deploy to new program IDs (update all references)
3. Use upgrade authority deployment script

**Prevention:**
- Always deploy with upgrade authority
- Never deploy with system program authority
- Use `start-private-devnet-with-upgrade.sh` script

---

### Issue: Verifier Error (0x177d)

**Symptoms:**
- Error: `0x177d` (6013) = "AlreadyRevoked" or "NullifierReuse"
- Error occurs during CPI call to verifier
- Verifying key is not revoked

**Diagnosis:**
1. Check verifying key revocation status
2. Check error occurs in verifier program (not pool)
3. Check error code is 6012 or 6013

**Fix:**
1. Verify key is not revoked: Check account data
2. Use workaround: Catch all verifier errors (6000-6099)
3. Convert to `VerifierMismatch` error

**Prevention:**
- Always catch all verifier errors (6000-6099)
- Always check revocation before CPI call
- Use raw `invoke` to catch raw error codes

---

### Issue: Wrong Discriminator

**Symptoms:**
- Error: "Unknown instruction discriminator"
- Instruction data has wrong discriminator
- SDK encoding wrong instruction

**Diagnosis:**
```typescript
// Check discriminator in logs
console.log("Discriminator:", instructionData.slice(0, 8));
console.log("Expected:", expectedDiscriminator);
```

**Fix:**
1. Copy IDL files: `./scripts/copy-idls.sh`
2. Verify IDL matches program
3. Rebuild programs: `anchor build --ignore-keys`
4. Check SDK uses correct instruction name

**Prevention:**
- Always copy IDL files after build
- Always verify IDL matches program
- Always use correct instruction names in SDK

---

### Issue: Root Mismatch (0x179f)

**Symptoms:**
- Error: `0x179f` (6047) = "RootMismatch"
- Error occurs in `shield_finalize_tree`
- Tree root doesn't match expected root

**Diagnosis:**
1. Check tree current root
2. Check pending old root
3. Check shield claim status

**Fix:**
1. Skip root check if status is `LEDGER_COMPLETE`
2. Verify tree was updated correctly
3. Retry operation if needed

**Prevention:**
- Always check shield claim status before root validation
- Handle `LEDGER_COMPLETE` state correctly
- Verify tree updates are atomic

---

### Issue: IDL Not Updating

**Symptoms:**
- IDL doesn't reflect code changes
- SDK uses old instruction format
- Tests fail with wrong discriminator

**Diagnosis:**
```bash
# Check IDL file timestamp
ls -lh target/idl/ptf_pool.json
ls -lh web/app/idl/ptf_pool.json

# Compare IDL files
diff target/idl/ptf_pool.json web/app/idl/ptf_pool.json
```

**Fix:**
1. Remove IDL file: `rm target/idl/ptf_pool.json`
2. Rebuild: `anchor build --ignore-keys`
3. Copy IDL: `./scripts/copy-idls.sh`

**Prevention:**
- Always copy IDL files after build
- Always verify IDL matches program
- Use `copy-idls.sh` script

---

### Issue: Test Failures

**Symptoms:**
- Tests fail with account errors
- Tests fail with program errors
- Tests fail inconsistently

**Diagnosis:**
1. Check validator is running
2. Check programs are deployed
3. Check accounts are initialized
4. Check test uses fresh keypairs

**Fix:**
1. Reset environment: `./scripts/reset-dev-env.sh`
2. Redeploy programs
3. Run bootstrap script
4. Use fresh keypairs for each test

**Prevention:**
- Always use fresh keypairs for tests
- Always initialize accounts before use
- Always clean up test state

---

## Debugging Tools

### 1. Solana CLI

```bash
# Check account
solana account <pubkey> --url http://127.0.0.1:8899

# Check program
solana program show <program_id> --url http://127.0.0.1:8899

# Check transaction
solana confirm <signature> --url http://127.0.0.1:8899
```

### 2. TypeScript Debugging

```typescript
// Enable verbose logging
console.log("Account:", accountPubkey.toString());
console.log("Transaction:", signature);
console.log("Error:", error);

// Get full transaction details
const tx = await connection.getTransaction(signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
});
console.log("Logs:", tx.meta.logMessages);
console.log("Error:", tx.meta.err);
```

### 3. Rust Debugging

```rust
// Add debug logs
msg!("Debug: account={:?}", account.key());
msg!("Debug: data_len={}", account.data_len());
msg!("Debug: owner={:?}", account.owner);
```

## Getting Help

### Check Documentation

1. [Critical Issues](02-critical-issues-and-solutions.md) - Known problems
2. [Implementation Patterns](03-implementation-patterns.md) - Code patterns
3. [Build Guide](04-build-and-deployment.md) - Setup instructions
4. `KNOWN_PROBLEMS_AND_PATTERNS.md` - Quick reference

### Check Logs

1. Program logs: Check transaction logs for `msg!` output
2. Service logs: `pm2 logs <service_name>`
3. Validator logs: Check validator output

### Common Solutions (MANDATORY Order)

**CRITICAL:** Follow these steps in EXACT order. Do not skip any step.

1. **MANDATORY: Reset everything first**
   ```bash
   # MANDATORY: Stop all services
   pm2 stop all
   
   # MANDATORY: Reset environment (clears ledger and state)
   ./scripts/reset-dev-env.sh
   
   # MANDATORY: Wait for script to complete
   # Script will:
   # - Stop validator
   # - Clear ledger directory
   # - Clear state files
   # - Restart validator
   ```

2. **MANDATORY: Rebuild programs**
   ```bash
   # MANDATORY: Clean previous build
   rm -rf target/deploy/*.so
   rm -rf target/idl/*.json
   
   # MANDATORY: Build with ignore-keys
   anchor build --ignore-keys
   
   # MANDATORY: Verify build succeeded
   ls -lh target/deploy/*.so
   # All .so files must exist
   ```

3. **MANDATORY: Copy IDL files**
   ```bash
   # MANDATORY: Copy IDL files
   ./scripts/copy-idls.sh
   
   # MANDATORY: Verify IDL files copied
   ls -lh web/app/idl/*.json
   # All .json files must exist
   ```

4. **MANDATORY: Redeploy programs**
   ```bash
   # MANDATORY: Use upgrade authority script
   ./scripts/start-private-devnet-with-upgrade.sh
   
   # MANDATORY: Wait for deployment to complete
   # Script will:
   # - Start validator
   # - Deploy all programs with upgrade authority
   # - Verify deployment
   ```

5. **MANDATORY: Run bootstrap**
   ```bash
   # MANDATORY: Bootstrap environment
   cd web/app
   npx tsx scripts/bootstrap-private-devnet.ts
   
   # MANDATORY: Verify bootstrap succeeded
   # Check for "Bootstrap completed successfully" message
   # If bootstrap fails, DO NOT PROCEED
   ```

**CRITICAL:** Do not proceed to next step until current step completes successfully.

## Prevention Checklist

Before starting work, verify:

- [ ] Program IDs match in all files
- [ ] Programs deployed with upgrade authority
- [ ] IDL files copied and up-to-date
- [ ] Accounts initialized (bootstrap run)
- [ ] Services running (proof, indexer)
- [ ] Validator running
- [ ] Using correct patterns (see Implementation Patterns)

**Next:** Review [Architecture Deep Dive](07-architecture-deep-dive.md) for system understanding.

