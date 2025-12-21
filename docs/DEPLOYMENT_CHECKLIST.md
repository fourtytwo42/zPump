# Production Deployment Checklist

**Last Updated**: 2024-12-21

## Pre-Deployment Requirements

### 1. Circuit Files and Keys

- [ ] All circuits compiled (shield, unshield, transfer)
- [ ] All `.wasm` files generated in `circuit_js/` directories
- [ ] All `.zkey` files generated (proving keys)
- [ ] All verifying keys generated and converted to Solana binary format
- [ ] Verifying keys stored securely and accessible for on-chain initialization

**Verification**:
```bash
# Check circuit files exist
ls circuits/*/circuit_js/circuit.wasm
ls circuits/*/circuit_0001.zkey
ls circuits/*/verifying_key.bin
```

### 2. Proof Service Deployment

- [ ] Proof service built in release mode
- [ ] Proof service configured with correct circuit paths
- [ ] `snarkjs` available (via `npx` or installed binary)
- [ ] Proof service tested and generating real proofs
- [ ] Proof service accessible from client applications
- [ ] Proof service monitoring and logging configured

**Verification**:
```bash
# Build proof service
cd services/proof-service
cargo build --release

# Test proof service
./scripts/test-proof-service.sh

# Verify real proofs
curl -X POST http://localhost:8080/generate-proof/shield \
  -H "Content-Type: application/json" \
  -d '{"commitment":"1234...","amount":1000}'
```

### 3. Solana Programs

- [ ] All programs built successfully
- [ ] All programs deployed to target network (devnet/mainnet)
- [ ] Program IDs updated in configuration
- [ ] Verifying keys initialized on-chain
- [ ] Factory program deployed and configured
- [ ] Pool programs deployed and initialized

**Verification**:
```bash
# Build programs
anchor build

# Deploy programs (example)
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show <PROGRAM_ID>
```

### 4. Configuration

- [ ] Environment variables configured
- [ ] Proof service URL set in client applications
- [ ] Solana RPC endpoint configured
- [ ] Network (devnet/mainnet) selected
- [ ] Gas limits validated (MAX_BATCH_SIZE = 3)

**Environment Variables**:
```bash
export PROOF_SERVICE_URL=http://your-proof-service:8080
export SOLANA_RPC_URL=https://api.devnet.solana.com
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json
```

### 5. Testing

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Proof service generating real proofs
- [ ] Gas costs validated (all operations < 1.4M CU)
- [ ] End-to-end flow tested (shield → transfer → unshield)
- [ ] Error handling tested
- [ ] Edge cases tested

**Verification**:
```bash
# Run tests
export PROOF_SERVICE_URL=http://localhost:8080
npm test

# Check gas costs
# Review docs/GAS_COSTS.md
```

## Deployment Steps

### Step 1: Deploy Proof Service

1. **Build proof service**:
   ```bash
   cd services/proof-service
   cargo build --release
   ```

2. **Configure environment**:
   ```bash
   export SHIELD_CIRCUIT_PATH=/absolute/path/to/circuits/shield
   export UNSHIELD_CIRCUIT_PATH=/absolute/path/to/circuits/unshield
   export TRANSFER_CIRCUIT_PATH=/absolute/path/to/circuits/transfer
   export SNARKJS_PATH=npx
   export PROOF_SERVICE_HOST=0.0.0.0
   export PROOF_SERVICE_PORT=8080
   ```

3. **Start proof service**:
   ```bash
   ./target/release/proof-service
   ```

4. **Verify health**:
   ```bash
   curl http://localhost:8080/health
   ```

### Step 2: Deploy Solana Programs

1. **Build programs**:
   ```bash
   anchor build
   ```

2. **Deploy to target network**:
   ```bash
   # Devnet
   anchor deploy --provider.cluster devnet
   
   # Mainnet (with caution)
   anchor deploy --provider.cluster mainnet
   ```

3. **Initialize verifying keys**:
   ```bash
   # Use factory program to create verifying keys
   # Or use direct initialization
   anchor run initialize-verifying-keys
   ```

### Step 3: Configure Clients

1. **Update client configuration**:
   - Set `PROOF_SERVICE_URL`
   - Set Solana RPC endpoint
   - Set program IDs

2. **Test client connection**:
   - Verify proof service accessible
   - Verify Solana connection working
   - Test basic operations

### Step 4: Final Validation

1. **Run smoke tests**:
   - Shield operation
   - Transfer operation
   - Unshield operation

2. **Monitor logs**:
   - Check proof service logs
   - Check Solana transaction logs
   - Verify no errors

3. **Validate gas usage**:
   - Check compute units used
   - Verify within 1.4M CU limit

## Post-Deployment

### Monitoring

- [ ] Proof service health monitoring
- [ ] Solana program error monitoring
- [ ] Gas usage tracking
- [ ] Transaction success rate monitoring
- [ ] Proof generation latency tracking

### Maintenance

- [ ] Regular proof service restarts (if needed)
- [ ] Circuit file updates (if circuits change)
- [ ] Verifying key updates (if keys change)
- [ ] Program upgrades (if needed)

### Known Limitations

- [ ] **Pairing Checks**: Currently uses structure validation only (not full Groth16 verification)
  - Documented in `docs/PAIRING_CHECKS_LIMITATION.md`
  - Acceptable for development/testing
  - For production, consider external verifier service

- [ ] **Batch Size**: Limited to 3 operations per batch
  - Ensures gas limit compliance
  - Documented in `docs/GAS_COSTS.md`

## Rollback Plan

If issues are detected:

1. **Stop proof service** (if proof service issue)
2. **Pause program operations** (if program issue)
3. **Revert to previous program version** (if deployed)
4. **Restore from backup** (if data corruption)
5. **Investigate and fix** before redeployment

## Security Considerations

- [ ] Verifying keys stored securely
- [ ] Proof service access restricted (if needed)
- [ ] Solana program upgrade authority secured
- [ ] Private keys secured
- [ ] Network access restricted (if needed)

## Documentation

- [ ] Deployment guide reviewed
- [ ] API documentation updated
- [ ] Gas costs documented
- [ ] Known limitations documented
- [ ] Troubleshooting guide available

## Related Documentation

- [PRODUCTION_READINESS_STATUS.md](../PRODUCTION_READINESS_STATUS.md) - Overall status
- [GAS_COSTS.md](./GAS_COSTS.md) - Gas cost documentation
- [PAIRING_CHECKS_LIMITATION.md](./PAIRING_CHECKS_LIMITATION.md) - Verification limitations
- [PROOF_SERVICE_SETUP.md](./PROOF_SERVICE_SETUP.md) - Proof service setup
- [INTEGRATION_TESTING.md](./INTEGRATION_TESTING.md) - Testing guide

