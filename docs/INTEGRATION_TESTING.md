# Integration Testing Guide

## Overview

This guide explains how to run integration tests with the proof service for real Groth16 proof generation.

## Prerequisites

1. **Proof Service Running**: The proof service must be running and accessible
2. **Circuit Files**: All circuit files (`.wasm` and `.zkey`) must be present
3. **Solana Validator**: Local validator should be running for Solana program tests

## Starting the Proof Service

### Option 1: Using the Start Script

```bash
./scripts/start-proof-service.sh
```

This script:
- Builds the proof service if needed
- Sets all required environment variables
- Starts the service on `127.0.0.1:8080` by default

### Option 2: Manual Start

```bash
cd services/proof-service

export SHIELD_CIRCUIT_PATH=/absolute/path/to/circuits/shield
export UNSHIELD_CIRCUIT_PATH=/absolute/path/to/circuits/unshield
export TRANSFER_CIRCUIT_PATH=/absolute/path/to/circuits/transfer
export SNARKJS_PATH=npx
export PROOF_SERVICE_HOST=127.0.0.1
export PROOF_SERVICE_PORT=8080
export RUST_LOG=info

./target/release/proof-service
```

## Running Tests

### With Real Proofs

Set the `PROOF_SERVICE_URL` environment variable:

```bash
export PROOF_SERVICE_URL=http://127.0.0.1:8080
npm test
```

### With Mock Proofs (Default)

If `PROOF_SERVICE_URL` is not set, tests will use mock proofs:

```bash
npm test
```

## Test Configuration

The test suite automatically detects the proof service:

- **If `PROOF_SERVICE_URL` is set**: Uses real proof generation
- **If not set**: Falls back to mock proofs

## Verifying Proof Service

Before running tests, verify the proof service is working:

```bash
# Health check
curl http://127.0.0.1:8080/health

# Test shield proof generation
curl -X POST http://127.0.0.1:8080/generate-proof/shield \
  -H "Content-Type: application/json" \
  -d '{
    "commitment": "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
    "amount": 1000
  }'
```

## Troubleshooting

### Proof Service Not Found

**Error**: `ECONNREFUSED` or connection errors

**Solution**:
1. Verify proof service is running: `curl http://127.0.0.1:8080/health`
2. Check `PROOF_SERVICE_URL` is set correctly
3. Ensure firewall allows connections to port 8080

### Circuit Files Not Found

**Error**: Proof service logs show "Using placeholder proof generation"

**Solution**:
1. Verify circuit paths are absolute (not relative)
2. Check files exist:
   - `{CIRCUIT_PATH}/circuit_js/circuit.wasm`
   - `{CIRCUIT_PATH}/circuit_0001.zkey`
3. Verify environment variables are set correctly

### Proof Generation Fails

**Error**: Proof generation returns errors

**Solution**:
1. Check proof service logs for detailed error messages
2. Verify snarkjs is available: `npx snarkjs --version`
3. Check circuit files are valid and compiled correctly
4. Verify input format matches circuit expectations

## Test Coverage

### Integration Tests

- `shield-token.test.ts` - Shield operations with real proofs
- `unshield-token.test.ts` - Unshield operations with real proofs
- `transfer-token.test.ts` - Transfer operations with real proofs
- `batch-*.test.ts` - Batch operations with real proofs

### Production Tests

- `real-proofs.test.ts` - Real proof generation and verification
- `circuit-validation.test.ts` - Circuit compilation and key generation

## Performance

- **Proof Generation Time**: ~2-5 seconds per proof
- **Test Suite Time**: Varies based on number of tests
- **Recommendation**: Run tests in parallel when possible

## Continuous Integration

For CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Start Proof Service
  run: |
    ./scripts/start-proof-service.sh &
    sleep 5
    
- name: Run Tests
  env:
    PROOF_SERVICE_URL: http://127.0.0.1:8080
  run: npm test
```

## See Also

- [PROOF_SERVICE_DEPLOYMENT.md](./PROOF_SERVICE_DEPLOYMENT.md) - Proof service deployment
- [CIRCUIT_COMPILATION.md](./CIRCUIT_COMPILATION.md) - Circuit compilation guide
- [PRODUCTION_READINESS_STATUS.md](../PRODUCTION_READINESS_STATUS.md) - Overall status

