# Next Steps: Complete Smart Contracts & Testing

## Immediate Next Steps (Do These First)

### 1. Start Validator & Deploy Programs

```bash
# Terminal 1: Start validator
solana-test-validator --reset --rpc-port 8899

# Terminal 2: Deploy and bootstrap
npm run deploy-all
npm run bootstrap-wsol
npm run bootstrap
```

### 2. Implement Remaining Unit Tests

**Priority Order:**
1. `tests/unit/vault.test.ts` - Deposit/withdraw operations
2. `tests/unit/verifier.test.ts` - Proof verification

**Why First:** These are simpler and will validate the test framework works.

### 3. Implement Shield Integration Tests

**Files:**
- `tests/integration/shield-token.test.ts`
- `tests/integration/shield-wsol.test.ts`

**Why Next:** Shield is the entry point for all operations - test it first.

### 4. Implement Unshield Integration Tests

**Files:**
- `tests/integration/unshield-token.test.ts`
- `tests/integration/unshield-wsol.test.ts`

**Why Next:** Unshield is the most complex (4-step process) - needs thorough testing.

## What's Already Done ✅

- ✅ All programs compile
- ✅ All instruction structures in place
- ✅ CPI calls working
- ✅ Factory tests implemented
- ✅ Test framework ready
- ✅ Validator setup documented

## What Needs Implementation

### Test Files (26 files - mostly placeholders)

**Unit Tests (2 remaining):**
- [ ] `vault.test.ts` - Needs deposit/withdraw tests
- [ ] `verifier.test.ts` - Needs proof verification tests

**Integration Tests (20 files - all need implementation):**
- [ ] Shield tests (2 files)
- [ ] Unshield tests (2 files)
- [ ] Transfer tests (2 files)
- [ ] TransferFrom tests (2 files)
- [ ] Allowance tests (1 file)
- [ ] Batch tests (4 files)
- [ ] Edge case tests (5 files)
- [ ] State machine tests (1 file)
- [ ] Unshield state machine (1 file)

**E2E Tests (4 files - all need implementation):**
- [ ] Full flow tests (2 files)
- [ ] Multi-user tests (1 file)
- [ ] Complex scenarios (1 file)

### Code Placeholders (Need Replacement)

1. **Keccak Hash** - 2 files
   - `prepare_shield.rs`
   - `prepare_unshield.rs`

2. **Merkle Tree** - 1 file
   - `shield_core.rs`

3. **Proof Verification** - 1 file
   - `verify_groth16.rs`

4. **Custom Entrypoint** - 1 file
   - `entrypoint.rs`

5. **Instruction Logic** - 5 files
   - `execute_transfer.rs`
   - `execute_transfer_from.rs`
   - `approve_allowance.rs`
   - `execute_batch_transfer.rs`
   - `execute_batch_transfer_from.rs`

### Stack Optimization (2 areas)

1. `CommitmentTree` deserialization
2. `ExecuteUnshieldUpdate` context

## Recommended Workflow

### Day 1: Test Foundation
1. Start validator
2. Deploy programs
3. Implement vault tests
4. Implement verifier tests
5. Run unit tests
6. Fix any issues

### Day 2-3: Shield & Unshield Tests
1. Implement shield tests (token + wSOL)
2. Implement unshield tests (token + wSOL)
3. Run integration tests
4. Fix failures

### Day 4-5: Transfer & Allowance Tests
1. Implement transfer tests
2. Implement transferFrom tests
3. Implement allowance tests
4. Run tests and fix issues

### Day 6-7: Batch & Edge Cases
1. Implement batch tests
2. Implement edge case tests
3. Implement state machine tests
4. Run full test suite

### Day 8-9: E2E & Coverage
1. Implement E2E tests
2. Run full test suite
3. Generate coverage report
4. Add tests for uncovered code
5. Achieve 99% coverage

### Day 10: Placeholder Replacements
1. Replace keccak hash
2. Implement custom entrypoint
3. Complete instruction logic
4. Re-run tests

### Day 11-12: Core Logic
1. Implement Merkle tree
2. Implement proof verification
3. Fix stack issues
4. Final test run

### Day 13: Final Verification
1. Run all tests
2. Verify 99% coverage
3. Verify gas limits
4. Generate final reports

## Quick Commands Reference

```bash
# Build
anchor build

# Deploy
npm run deploy-all

# Bootstrap
npm run bootstrap-wsol
npm run bootstrap

# Run tests
cd tests && npm install
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # E2E tests only
npm test                  # All tests

# Coverage
npm run coverage
```

## Key Files to Work On

### Test Files (Start Here)
1. `tests/unit/vault.test.ts`
2. `tests/unit/verifier.test.ts`
3. `tests/integration/shield-token.test.ts`
4. `tests/integration/shield-wsol.test.ts`

### Code Files (After Tests Work)
1. `programs/ptf_pool/src/instructions/prepare_shield.rs` (keccak)
2. `programs/ptf_pool/src/instructions/shield_core.rs` (Merkle tree)
3. `programs/ptf_verifier_groth16/src/instructions/verify_groth16.rs` (proof)

### Utilities (As Needed)
1. `tests/utils/proofs.ts` (mock proofs)
2. `tests/fixtures/test-data.ts` (test data)
3. `tests/utils/accounts.ts` (account helpers)

## Success Metrics

- [ ] All 26 test files have real implementations
- [ ] All tests pass
- [ ] 99% code coverage achieved
- [ ] All operations within gas limits
- [ ] No stack overflow errors
- [ ] All placeholders replaced
- [ ] Coverage report shows 99%+

## Getting Help

- See `VALIDATOR_SETUP.md` for validator setup
- See `COMPLETION_PLAN.md` for detailed breakdown
- See `BUILD_STATUS.md` for build issues
- Check test framework in `tests/utils/` for examples

