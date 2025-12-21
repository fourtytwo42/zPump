# External Verifier Service Design

## Overview

Since Solana does not support alt_bn128 pairing checks natively, an external verifier service can be used to verify Groth16 proofs off-chain, then provide attestations that the on-chain program can verify.

## Architecture

```
Client → Proof Service → Generate Proof
  ↓
Client → External Verifier → Verify Proof → Attestation
  ↓
Client → Solana Program → Check Attestation → Accept/Reject
```

## External Verifier Service

### Responsibilities

1. Receive proof + public inputs + verifying key
2. Perform actual Groth16 pairing checks (using Ethereum or other system with alt_bn128)
3. Generate cryptographic attestation (signature) of verification result
4. Return attestation to client

### Attestation Format

```rust
pub struct VerificationAttestation {
    pub proof_hash: [u8; 32],        // Hash of proof
    pub public_inputs_hash: [u8; 32], // Hash of public inputs
    pub verifying_key_hash: [u8; 32], // Hash of verifying key
    pub is_valid: bool,               // Verification result
    pub timestamp: i64,               // Timestamp
    pub signature: [u8; 64],          // Ed25519 signature from verifier
}
```

### On-Chain Verification

The Solana program would:
1. Receive proof + public inputs + attestation
2. Verify attestation signature (Ed25519 - Solana supports this)
3. Verify attestation hashes match proof/inputs/key
4. Check timestamp is recent (prevent replay)
5. Accept proof if attestation.is_valid == true

## Implementation Options

### Option 1: Ethereum-Based Verifier

**Approach**: Use Ethereum's alt_bn128 precompile

**Service**:
- Deploy smart contract on Ethereum
- Contract has `verifyGroth16()` function
- Service calls contract, gets result
- Service signs attestation with Ed25519 key

**Pros**:
- Uses proven infrastructure
- Ethereum alt_bn128 is well-tested

**Cons**:
- Requires Ethereum infrastructure
- Additional gas costs on Ethereum

### Option 2: Standalone Verifier

**Approach**: Implement Groth16 verification in Rust/Go service

**Service**:
- Use arkworks or bellman library
- Perform pairing checks directly
- Sign attestations

**Pros**:
- No external blockchain dependency
- Can optimize for performance

**Cons**:
- More complex to implement
- Need to ensure correctness

### Option 3: Trusted Verifier Network

**Approach**: Multiple verifiers, require consensus

**Service**:
- Multiple independent verifiers
- Require N-of-M signatures
- On-chain checks N-of-M attestations

**Pros**:
- More decentralized
- Reduces trust in single verifier

**Cons**:
- More complex
- Higher latency

## Recommended Approach

**Short Term**: Option 1 (Ethereum-based)
- Fastest to implement
- Uses proven infrastructure
- Can migrate to Option 2 later

**Long Term**: Option 2 (Standalone) or Option 3 (Network)
- Better performance
- No external dependencies
- More control

## Integration Points

### On-Chain Changes Needed

1. Add attestation verification to `verify_groth16` instruction
2. Add verifier public key account
3. Add timestamp checking
4. Add hash verification

### Off-Chain Changes Needed

1. Implement external verifier service
2. Update proof service to optionally call verifier
3. Update client to get attestations
4. Update tests to use attestations

## Security Considerations

1. **Verifier Key Management**: Verifier's Ed25519 key must be secure
2. **Replay Prevention**: Timestamps and nonces
3. **Key Rotation**: Mechanism to update verifier keys
4. **Rate Limiting**: Prevent abuse
5. **Attestation Expiry**: Reject old attestations

## Example Flow

```
1. Client generates proof via proof service
2. Client sends proof to external verifier
3. Verifier checks proof using alt_bn128
4. Verifier creates attestation and signs it
5. Client submits proof + attestation to Solana
6. Solana program:
   - Verifies attestation signature
   - Checks hashes match
   - Checks timestamp
   - Accepts if valid
```

## Implementation Status

**Current**: Not implemented
**Priority**: High (required for production)
**Estimated Effort**: 1-2 weeks

## Related Documentation

- [PAIRING_CHECKS_LIMITATION.md](./PAIRING_CHECKS_LIMITATION.md) - Why external verifier is needed
- [GROTH16_VERIFICATION.md](./GROTH16_VERIFICATION.md) - Current verification structure

