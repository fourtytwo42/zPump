# Completion Plan: Smart Contracts & Testing

This document outlines what remains to complete the smart contracts and achieve 99% test coverage.

## Current Status Summary

### ✅ Completed
- All 5 programs compile successfully
- All instruction structures implemented
- CPI calls uncommented and working
- Test framework structure complete
- Factory tests implemented with real program calls
- Validator setup documentation
- Deployment scripts

### ⏳ Remaining Work

## Phase 1: Complete Test Implementation (Priority 1)

### 1.1 Unit Tests (3 files)

**File: `tests/unit/vault.test.ts`**
- [ ] Implement `deposit` test with actual program call
- [ ] Implement `withdraw` test with actual program call
- [ ] Test error cases (insufficient balance, invalid authority)
- [ ] Test with different token mints

**File: `tests/unit/verifier.test.ts`**
- [ ] Implement `initialize_verifying_key` test
- [ ] Implement `verify_groth16` test with mock proof
- [ ] Test proof validation (valid/invalid proofs)
- [ ] Test key revocation

### 1.2 Integration Tests - Shield Operations (2 files)

**File: `tests/integration/shield-token.test.ts`**
- [ ] Implement `prepare_shield` with token
- [ ] Implement `execute_shield_v2` with token
- [ ] Test minimum/maximum amounts
- [ ] Test commitment generation
- [ ] Test operation ID tracking

**File: `tests/integration/shield-wsol.test.ts`**
- [ ] Implement `prepare_shield` with wSOL
- [ ] Implement `execute_shield_v2` with wSOL
- [ ] Test wSOL wrapping/unwrapping
- [ ] Test edge cases

### 1.3 Integration Tests - Unshield Operations (2 files)

**File: `tests/integration/unshield-token.test.ts`**
- [ ] Implement full 4-step unshield flow:
  - [ ] `prepare_unshield`
  - [ ] `execute_unshield_verify`
  - [ ] `execute_unshield_update`
  - [ ] `execute_unshield_withdraw`
- [ ] Test each step individually
- [ ] Test state transitions
- [ ] Test error cases

**File: `tests/integration/unshield-wsol.test.ts`**
- [ ] Same as above but with wSOL
- [ ] Test wSOL-specific edge cases

### 1.4 Integration Tests - Transfer Operations (2 files)

**File: `tests/integration/transfer-token.test.ts`**
- [ ] Implement `execute_transfer` with token
- [ ] Test proof verification
- [ ] Test commitment tree updates
- [ ] Test nullifier handling

**File: `tests/integration/transfer-wsol.test.ts`**
- [ ] Same as above but with wSOL

### 1.5 Integration Tests - Allowance Operations (1 file)

**File: `tests/integration/approve-allowance.test.ts`**
- [ ] Implement `approve_allowance` test
- [ ] Implement `execute_transfer_from` test
- [ ] Test allowance limits
- [ ] Test allowance revocation
- [ ] Test with tokens and wSOL

### 1.6 Integration Tests - Batch Operations (4 files)

**Files:**
- `tests/integration/batch-transfer-token.test.ts`
- `tests/integration/batch-transfer-wsol.test.ts`
- `tests/integration/batch-transfer-from-token.test.ts`
- `tests/integration/batch-transfer-from-wsol.test.ts`

For each:
- [ ] Implement batch transfer test
- [ ] Test multiple transfers in one transaction
- [ ] Test batch size limits
- [ ] Test partial failures

### 1.7 Integration Tests - Edge Cases (5 files)

**Files:**
- `tests/integration/shield-edge-cases.test.ts`
- `tests/integration/unshield-edge-cases.test.ts`
- `tests/integration/transfer-edge-cases.test.ts`
- `tests/integration/allowance-edge-cases.test.ts`
- `tests/integration/batch-edge-cases.test.ts`

For each:
- [ ] Test invalid inputs
- [ ] Test boundary conditions
- [ ] Test error conditions
- [ ] Test reentrancy protection
- [ ] Test rate limiting

### 1.8 Integration Tests - State Machine (1 file)

**File: `tests/integration/unshield-state-machine.test.ts`**
- [ ] Test all state transitions
- [ ] Test invalid state transitions
- [ ] Test operation lifecycle

### 1.9 E2E Tests (4 files)

**Files:**
- `tests/e2e/full-flow-token.test.ts`
- `tests/e2e/full-flow-wsol.test.ts`
- `tests/e2e/multi-user.test.ts`
- `tests/e2e/complex-scenarios.test.ts`

For each:
- [ ] Implement complete user flows
- [ ] Test multiple operations in sequence
- [ ] Test cross-program interactions
- [ ] Test realistic usage patterns

## Phase 2: Replace Placeholder Implementations (Priority 2)

### 2.1 Proof Verification

**File: `programs/ptf_verifier_groth16/src/instructions/verify_groth16.rs`**
- [ ] Replace placeholder with actual Groth16 verification
- [ ] Use Solana's alt_bn128 syscalls
- [ ] Parse verifying key data properly
- [ ] Implement pairing checks

**Current:** Placeholder that accepts any 192-byte proof
**Needed:** Actual Groth16 proof verification

### 2.2 Merkle Tree Operations

**File: `programs/ptf_pool/src/instructions/shield_core.rs`**
- [ ] Implement full Merkle tree insertion
- [ ] Compute actual Merkle root
- [ ] Update commitment tree properly
- [ ] Handle tree depth and capacity

**Current:** `pool.current_root = commitment;` (placeholder)
**Needed:** Actual Merkle tree computation

### 2.3 Keccak Hash

**Files:**
- `programs/ptf_pool/src/instructions/prepare_shield.rs`
- `programs/ptf_pool/src/instructions/prepare_unshield.rs`

- [ ] Replace placeholder hash with actual keccak
- [ ] Use `solana_program::hash` or `solana_program::keccak`
- [ ] Generate proper operation IDs
- [ ] Generate proper discriminators

**Current:** Byte copying placeholder
**Needed:** Actual keccak hashing

### 2.4 Custom Entrypoint

**File: `programs/ptf_pool/src/entrypoint.rs`**
- [ ] Implement custom entrypoint routing
- [ ] Intercept `execute_shield_v2` instruction
- [ ] Route to raw handler
- [ ] Handle other instructions normally

**Current:** Placeholder
**Needed:** Full entrypoint implementation

### 2.5 Complete Instruction Logic

**Files with placeholder logic:**
- `programs/ptf_pool/src/instructions/execute_transfer.rs`
- `programs/ptf_pool/src/instructions/execute_transfer_from.rs`
- `programs/ptf_pool/src/instructions/approve_allowance.rs`
- `programs/ptf_pool/src/instructions/execute_batch_transfer.rs`
- `programs/ptf_pool/src/instructions/execute_batch_transfer_from.rs`

For each:
- [ ] Complete proof verification calls
- [ ] Complete commitment tree updates
- [ ] Complete nullifier set management
- [ ] Complete state updates

## Phase 3: Fix Stack Overflow Issues (Priority 3)

### 3.1 Optimize Account Deserialization

**Issue:** `CommitmentTree` deserialization uses too much stack

**Files:**
- `programs/ptf_pool/src/state.rs`
- `programs/ptf_pool/src/instructions/execute_unshield_update.rs`

**Solutions:**
- [ ] Use heap allocation for large structs
- [ ] Deserialize in chunks
- [ ] Use `Box` for large fields
- [ ] Minimize stack variables

### 3.2 Optimize Instruction Contexts

**Issue:** `ExecuteUnshieldUpdate` context uses too much stack

**File:** `programs/ptf_pool/src/instructions/execute_unshield_update.rs`

**Solutions:**
- [ ] Use raw instruction pattern (already planned)
- [ ] Extract accounts manually
- [ ] Minimize local variables
- [ ] Use references instead of copies

## Phase 4: Test Utilities & Fixtures (Priority 1)

### 4.1 Mock Proof Generation

**File: `tests/utils/proofs.ts`**
- [ ] Implement realistic mock proof generation
- [ ] Generate valid-sized proofs (192 bytes)
- [ ] Generate valid public inputs
- [ ] Support different operation types

### 4.2 Test Data Fixtures

**File: `tests/fixtures/test-data.ts`**
- [ ] Define test amounts
- [ ] Generate test commitments
- [ ] Generate test nullifiers
- [ ] Create test keypairs
- [ ] Define test scenarios

### 4.3 Account Helpers

**File: `tests/utils/accounts.ts`**
- [ ] Helper to create token accounts
- [ ] Helper to create PDAs
- [ ] Helper to derive addresses
- [ ] Helper to check account state

### 4.4 Transaction Helpers

**File: `tests/utils/transactions.ts`**
- [ ] Already has basic helpers
- [ ] Add retry logic
- [ ] Add transaction simulation
- [ ] Add compute unit estimation

## Phase 5: Run Tests & Achieve Coverage (Priority 1)

### 5.1 Initial Test Run

- [ ] Start validator manually
- [ ] Deploy all programs
- [ ] Bootstrap environment
- [ ] Run unit tests
- [ ] Fix any immediate failures

### 5.2 Integration Test Run

- [ ] Run integration tests
- [ ] Fix failures
- [ ] Verify gas usage
- [ ] Check compute unit limits

### 5.3 E2E Test Run

- [ ] Run E2E tests
- [ ] Fix failures
- [ ] Verify complete flows

### 5.4 Coverage Verification

- [ ] Generate coverage report
- [ ] Identify uncovered instructions
- [ ] Add tests for uncovered code
- [ ] Achieve 99% coverage

### 5.5 Gas Limit Verification

- [ ] Verify all operations within gas limits
- [ ] Optimize high gas operations
- [ ] Document gas usage
- [ ] Create gas report

## Implementation Order

### Week 1: Test Implementation
1. Complete unit tests (vault, verifier)
2. Complete shield integration tests
3. Complete unshield integration tests
4. Complete transfer integration tests

### Week 2: More Tests & Utilities
1. Complete allowance tests
2. Complete batch tests
3. Complete edge case tests
4. Implement test utilities and fixtures

### Week 3: Placeholder Replacements
1. Replace keccak hash placeholders
2. Implement custom entrypoint
3. Complete instruction logic
4. Start Merkle tree implementation

### Week 4: Core Logic & Optimization
1. Complete Merkle tree operations
2. Implement proof verification
3. Fix stack overflow issues
4. Optimize gas usage

### Week 5: Final Testing & Coverage
1. Run full test suite
2. Fix all failures
3. Achieve 99% coverage
4. Verify gas limits
5. Generate final reports

## Success Criteria

- ✅ All tests pass
- ✅ 99% code coverage achieved
- ✅ All operations within gas limits
- ✅ No stack overflow errors
- ✅ All placeholder implementations replaced
- ✅ All CPI calls working
- ✅ Custom entrypoint implemented
- ✅ Merkle tree fully functional
- ✅ Proof verification working

## Quick Start: Next Immediate Steps

1. **Start validator and deploy:**
   ```bash
   solana-test-validator --reset --rpc-port 8899
   npm run deploy-all
   npm run bootstrap
   ```

2. **Implement vault tests:**
   - Complete `tests/unit/vault.test.ts`
   - Test deposit/withdraw operations

3. **Implement verifier tests:**
   - Complete `tests/unit/verifier.test.ts`
   - Test proof verification

4. **Run initial tests:**
   ```bash
   cd tests && npm install && npm run test:unit
   ```

5. **Iterate:**
   - Fix failures
   - Add more tests
   - Replace placeholders incrementally

## Notes

- Stack overflow warnings are expected and documented
- Placeholder implementations allow incremental development
- Test framework is ready - just needs actual test logic
- All programs compile - foundation is solid
- Focus on one phase at a time for best results

