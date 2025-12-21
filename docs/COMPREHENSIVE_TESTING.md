# Comprehensive Testing Guide

## Overview

The comprehensive test suite (`tests/comprehensive/all-operations.test.ts`) validates all zPump operations end-to-end:

- **Shield**: Deposit tokens into the privacy pool
- **Unshield**: Withdraw tokens from the privacy pool (with attestation verification)
- **Transfer**: Private transfer within the pool
- **TransferFrom**: Transfer with allowance
- **Approve**: Set spending allowance
- **BatchTransfer**: Batch private transfers
- **BatchTransferFrom**: Batch transfers with allowance

## Prerequisites

### 1. Local Solana Validator

Start a local validator:

```bash
anchor localnet
```

Or use a custom validator:

```bash
solana-test-validator
```

### 2. Proof Service (Optional - for real proofs)

If testing with real Groth16 proofs:

```bash
./scripts/start-proof-service.sh
```

This requires:
- Compiled circuits (`.wasm` and `.zkey` files)
- `snarkjs` installed and available

### 3. External Verifier Service (Optional - for attestation verification)

If testing with attestation-based verification:

```bash
./scripts/start-external-verifier.sh
```

This requires:
- External verifier service built and running
- Verifying keys deployed on-chain

## Running Tests

### With Mock Proofs (Default)

```bash
./scripts/run-comprehensive-tests.sh
```

This uses:
- Mock proofs (no proof service needed)
- No attestation verification (uses placeholder verification)

### With Real Proofs

```bash
USE_REAL_PROOFS=true ./scripts/run-comprehensive-tests.sh
```

This requires:
- Proof service running
- External verifier service running
- Compiled circuits available

## Test Structure

### Setup Phase

1. **Connection Setup**: Connects to local validator
2. **Keypair Generation**: Creates test keypairs (user, recipient, spender)
3. **Token Mint Creation**: Creates a test SPL token mint
4. **Pool Address Derivation**: Derives all pool-related PDAs
5. **Factory Initialization**: Initializes the factory (if not already initialized)
6. **Verifying Key Setup**: Sets up verifying key for proof verification

### Test Cases

#### 1. Shield Operation

Tests the complete shield flow:
- Generate shield proof (mock or real)
- Call `prepareShield`
- Call `executeShieldV2`
- Verify tokens are deposited

#### 2. Unshield Operation

Tests the complete unshield flow with attestation:
- Generate unshield proof (mock or real)
- Get attestation from external verifier (if available)
- Call `prepareUnshield`
- Call `updateOperationData` (to add proof + attestation)
- Call `executeUnshieldVerify` (verifies attestation)
- Call `executeUnshieldUpdate` (updates nullifier set)
- Call `executeUnshieldWithdraw` (withdraws tokens)
- Verify tokens are withdrawn

#### 3. Transfer Operation

Tests private transfer:
- Generate transfer proof
- Call `executeTransfer`
- Verify commitment tree is updated

#### 4. TransferFrom Operation

Tests transfer with allowance:
- Approve allowance first
- Generate transfer proof
- Call `executeTransferFrom`
- Verify allowance is decremented

#### 5. Approve Operation

Tests allowance approval:
- Call `approveAllowance`
- Verify allowance is set correctly

#### 6. BatchTransfer Operation

Tests batch private transfers:
- Generate multiple transfer proofs
- Call `executeBatchTransfer`
- Verify all transfers are processed

#### 7. BatchTransferFrom Operation

Tests batch transfers with allowance:
- Approve allowance first
- Generate multiple transfer proofs
- Call `executeBatchTransferFrom`
- Verify allowance is decremented correctly

## Configuration

### Environment Variables

- `PROOF_SERVICE_URL`: URL of the proof service (default: `http://127.0.0.1:8080`)
- `EXTERNAL_VERIFIER_URL`: URL of the external verifier (default: `http://127.0.0.1:8081`)
- `USE_REAL_PROOFS`: Set to `true` to use real proofs (default: `false`)

### Test Amounts

Default test amount: `1000` (in token base units)

## Troubleshooting

### Stack Overflow Errors

The `execute_unshield_update` instruction may show stack overflow warnings during build. This is a known Solana limitation and doesn't prevent the program from running, but may need optimization for production.

### Missing Services

If proof service or external verifier are not available:
- Tests will fall back to mock proofs
- Attestation verification will be skipped
- Tests will still validate the operation flow structure

### IDL Not Found

If you see "IDL doesn't exist" errors:
```bash
anchor build
```

This generates the IDL files needed by the tests.

### Connection Errors

If tests fail with connection errors:
1. Ensure local validator is running: `anchor localnet`
2. Check validator is accessible: `solana cluster-version`
3. Verify RPC endpoint in test setup

## Expected Results

### With Mock Proofs

- All operations should complete successfully
- Proof verification uses placeholder logic
- Attestation verification is skipped
- Tests validate operation flow and state changes

### With Real Proofs

- All operations should complete successfully
- Real Groth16 proofs are generated
- Attestation verification is performed
- Full cryptographic verification is tested

## Next Steps

After running comprehensive tests:

1. **Review Test Output**: Check for any failures or warnings
2. **Gas Cost Analysis**: Review compute unit usage for each operation
3. **Integration Testing**: Run full integration test suite
4. **Production Readiness**: Verify all operations meet production requirements

## Related Documentation

- [Proof Service Setup](./PROOF_SERVICE_SETUP.md)
- [External Verifier Service](./EXTERNAL_VERIFIER_SERVICE.md)
- [Gas Costs](./GAS_COSTS.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)

