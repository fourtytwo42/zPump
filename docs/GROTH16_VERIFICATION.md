# Groth16 Verification Implementation

This document describes the Groth16 proof verification implementation in the zPump verifier program.

## Overview

The verifier program (`ptf_verifier_groth16`) performs on-chain verification of Groth16 zero-knowledge proofs using Solana's alt_bn128 syscalls.

## Verification Equation

Groth16 verification checks the following equation:

```
e(a, b) * e(-c, gamma) * e(-delta, public_inputs) == 1
```

Where:
- `a`, `c` are G1 points (64 bytes each)
- `b`, `gamma`, `delta` are G2 points (128 bytes each)
- `public_inputs` are combined with `gamma_abc` (G1 points)
- `e()` is the bilinear pairing function

## Proof Structure

**Standard Groth16 Proof Format**: 256 bytes total

- Bytes 0-63: `a` (G1 point, 64 bytes)
- Bytes 64-191: `b` (G2 point, 128 bytes)
- Bytes 192-255: `c` (G1 point, 64 bytes)

**Total**: 256 bytes

This is the standard format used by snarkjs and most Groth16 implementations. The zPump implementation uses this 256-byte format consistently across:
- Proof service output
- Verifier program input
- Test utilities
- All documentation

## Verifying Key Structure

The verifying key is stored in `VerifyingKeyAccount.key_data` with the following format:

```
[alpha (64 bytes)][beta (128 bytes)][gamma (128 bytes)][delta (128 bytes)][gamma_abc_count (4 bytes)][gamma_abc... (64 bytes each)]
```

Where:
- `alpha`: G1 point
- `beta`: G2 point
- `gamma`: G2 point
- `delta`: G2 point
- `gamma_abc`: Array of G1 points (one per public input)

## Implementation

### File Structure

- `programs/ptf_verifier_groth16/src/verification.rs` - Verification logic
- `programs/ptf_verifier_groth16/src/instructions/verify_groth16.rs` - Main instruction handler

### Key Functions

1. **`VerifyingKey::parse()`** - Parses verifying key from binary format
2. **`verify_groth16_proof()`** - Performs the actual verification
3. **`negate_g1()`** - Negates a G1 point
4. **`negate_g2()`** - Negates a G2 point
5. **`compute_public_inputs_g1()`** - Combines public inputs with gamma_abc

### Solana alt_bn128 API

The implementation uses Solana's `alt_bn128` syscalls for pairing checks:

```rust
use solana_program::alt_bn128;

// Perform pairing check
let result = alt_bn128::alt_bn128_pairing_check(&[point1, point2])?;
```

**Note**: The exact API format may vary. The current implementation provides the structure, but the actual pairing check calls need to be adapted to Solana's specific API.

## Current Status

The verification structure is implemented, but the actual pairing checks using Solana's alt_bn128 syscalls need to be completed. The current implementation:

1. ✅ Parses verifying key correctly
2. ✅ Extracts proof components (a, b, c)
3. ✅ Validates proof and public input sizes
4. ⚠️ Pairing checks need to be implemented with actual Solana API
5. ⚠️ Point negation and arithmetic need verification

## Testing

Tests should verify:
1. Valid proofs are accepted
2. Invalid proofs are rejected
3. Gas costs are within limits
4. Different circuit types work correctly

## Future Improvements

1. Optimize pairing checks for gas efficiency
2. Support multiple circuit versions
3. Add batch verification if possible
4. Implement proper point arithmetic

