# Circuit Setup Guide

This guide explains how to set up and generate circuit files for zPump operations.

## Overview

zPump uses Groth16 zero-knowledge proofs for three operation types:
- **Shield**: Prove commitment creation
- **Unshield**: Prove nullifier validity
- **Transfer**: Prove private transfers

Each operation requires:
- Circuit definition (`.circom` file)
- Compiled circuit (`.wasm` file)
- Proving key (`.zkey` file)
- Verifying key (for on-chain verification)

## Prerequisites

1. **Circom**: Circuit compiler
   ```bash
   # Install circom
   npm install -g circom
   ```

2. **snarkjs**: ZK proof generation tool
   ```bash
   npm install -g snarkjs
   ```

3. **Node.js**: Required for snarkjs

## Circuit Structure

Each circuit should:
1. Take private inputs (witness)
2. Take public inputs (commitment, nullifier, amount, etc.)
3. Verify the relationship between inputs
4. Output public values for verification

### Shield Circuit

**Inputs:**
- Private: secret, amount
- Public: commitment

**Logic:**
- Verify commitment = hash(secret, amount)
- Output commitment

### Unshield Circuit

**Inputs:**
- Private: nullifier_secret
- Public: nullifier_hash, amount

**Logic:**
- Verify nullifier_hash = hash(nullifier_secret)
- Output nullifier_hash, amount

### Transfer Circuit

**Inputs:**
- Private: nullifier_secret, new_secret
- Public: nullifier_in, commitment_out, amount

**Logic:**
- Verify nullifier_in = hash(nullifier_secret)
- Verify commitment_out = hash(new_secret, amount)
- Output nullifier_in, commitment_out, amount

## Generation Process

### Step 1: Write Circuit Definition

Create `.circom` file for each operation:

```circom
pragma circom 2.0.0;

template Shield() {
    // Circuit logic here
}

component main = Shield();
```

### Step 2: Compile Circuit

```bash
circom circuit.circom --wasm --r1cs
```

This generates:
- `circuit.wasm` - WebAssembly for witness generation
- `circuit.r1cs` - Rank-1 Constraint System

### Step 3: Generate Proving Key

```bash
# Phase 1: Powers of Tau
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v

# Phase 2: Setup
snarkjs groth16 setup circuit.r1cs pot12_0001.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey --name="Second contribution" -v

# Export verification key
snarkjs zkey export verificationkey circuit_0001.zkey verification_key.json
```

### Step 4: Convert Verifying Key for Solana

The verifying key needs to be converted to the binary format expected by Solana:

```
[alpha (64)][beta (128)][gamma (128)][delta (128)][gamma_abc_count (4)][gamma_abc... (64 each)]
```

A conversion script should extract these values from `verification_key.json` and serialize them in the correct format.

## Directory Structure

```
circuits/
├── shield/
│   ├── circuit.circom
│   ├── circuit.wasm
│   ├── circuit.zkey
│   └── verification_key.json
├── unshield/
│   └── ...
└── transfer/
    └── ...
```

## Integration with Proof Service

The proof service expects circuit files in:
- `circuits/shield/`
- `circuits/unshield/`
- `circuits/transfer/`

Set the paths in the proof service configuration or use the default relative paths.

## Security Considerations

1. **Trusted Setup**: The powers of tau ceremony must be performed securely
2. **Key Management**: Proving keys should be kept secure
3. **Verifying Keys**: Can be public, but must be verified on-chain
4. **Circuit Audits**: Circuits should be audited before production use

## Testing

After generating circuits:

1. Test proof generation with sample inputs
2. Verify proofs are valid
3. Test with invalid inputs (should fail)
4. Measure proof generation time
5. Verify on-chain verification works

## Troubleshooting

**Issue**: Circuit compilation fails
- Check Circom version compatibility
- Verify circuit syntax

**Issue**: Proof generation is slow
- This is normal (can take seconds)
- Consider optimization or pre-computation

**Issue**: Verification fails on-chain
- Check verifying key format
- Verify public inputs are correct
- Check proof structure matches expected format

