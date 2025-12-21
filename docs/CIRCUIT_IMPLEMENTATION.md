# Circuit Implementation Guide

This guide explains how to implement production-ready Circom circuits for zPump.

## Overview

zPump requires three circuits:
1. **Shield**: Prove commitment = hash(secret, amount)
2. **Unshield**: Prove nullifier_hash = hash(nullifier_secret)
3. **Transfer**: Prove nullifier_in = hash(nullifier_secret) AND commitment_out = hash(new_secret, amount)

## Current Status

⚠️ **Development/Testing Only**

Current circuits use simplified hash functions that are **NOT cryptographically secure**. They are placeholders for development and testing.

## Production Requirements

### 1. Install Dependencies

```bash
# Install circomlib for Poseidon hash
cd circuits
npm install circomlib@^2.0.5

# Install circom and snarkjs globally
npm install -g circom snarkjs
```

### 2. Update Circuits with Poseidon Hash

Each circuit needs to:
1. Include Poseidon template from circomlib
2. Convert byte arrays to field elements
3. Use Poseidon hash instead of simplified hash

#### Example: Shield Circuit with Poseidon

```circom
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template Shield() {
    signal private input secret[32];
    signal private input amount;
    signal output commitment[32];
    
    // Convert secret bytes to field element
    // (simplified - actual implementation needs proper conversion)
    var secret_field = 0;
    for (var i = 0; i < 32; i++) {
        secret_field = secret_field * 256 + secret[i];
    }
    
    // Poseidon hash with 3 inputs: secret, amount, padding
    component hash = Poseidon(3);
    hash.inputs[0] <== secret_field;
    hash.inputs[1] <== amount;
    hash.inputs[2] <== 0;
    
    // Convert hash output back to bytes
    // (simplified - actual implementation needs proper conversion)
    var hash_out = hash.out;
    for (var i = 31; i >= 0; i--) {
        commitment[i] <== hash_out % 256;
        hash_out = hash_out \ 256;
    }
}

component main = Shield();
```

### 3. Compile Circuits

```bash
# Compile each circuit
cd circuits/shield
circom circuit.circom --wasm --r1cs

cd ../unshield
circom circuit.circom --wasm --r1cs

cd ../transfer
circom circuit.circom --wasm --r1cs
```

### 4. Generate Proving Keys

```bash
# Powers of Tau ceremony (one-time setup)
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v

# Generate proving key for each circuit
cd circuits/shield
snarkjs groth16 setup circuit.r1cs ../../pot12_0001.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey --name="Second contribution" -v

# Repeat for unshield and transfer circuits
```

### 5. Generate Verifying Keys

```bash
# Export verifying key
cd circuits/shield
snarkjs zkey export verificationkey circuit_0001.zkey verification_key.json

# Convert to Solana format
ts-node ../../scripts/convert-verifying-key.ts verification_key.json verifying_key.bin
```

## Implementation Challenges

### Byte Array to Field Element Conversion

Circom works with field elements (integers modulo prime), not byte arrays. Converting between them requires:
- Packing bytes into field elements
- Handling overflow (field size vs byte array size)
- Unpacking field elements back to bytes

**Solution**: Use circomlib's `Bytes2Packed` and `PackedBytes2` templates, or implement custom conversion.

### Poseidon Hash Input/Output

Poseidon hash operates on field elements, not bytes. The circuit needs to:
- Convert input bytes to field elements
- Hash field elements
- Convert output field element back to bytes

**Solution**: Use circomlib's Poseidon template and conversion utilities.

## Testing

After implementing Poseidon hash:

1. **Test Circuit Compilation**
   ```bash
   cd circuits/shield
   circom circuit.circom --wasm --r1cs
   ```

2. **Test Proof Generation**
   ```bash
   # Generate witness
   node circuit_js/generate_witness.js circuit.wasm input.json witness.wtns
   
   # Generate proof
   snarkjs groth16 prove circuit_0001.zkey witness.wtns proof.json public.json
   ```

3. **Test Verification**
   ```bash
   snarkjs groth16 verify verification_key.json public.json proof.json
   ```

## Migration Path

1. **Phase 1 (Current)**: Simplified hash for development
2. **Phase 2**: Add Poseidon hash with proper conversion
3. **Phase 3**: Optimize circuit constraints
4. **Phase 4**: Production deployment

## Resources

- [Circom Documentation](https://docs.circom.io/)
- [Circomlib](https://github.com/iden3/circomlib)
- [Poseidon Hash](https://www.poseidon-hash.info/)
- [snarkjs Documentation](https://github.com/iden3/snarkjs)

## See Also

- [CIRCUIT_SETUP.md](./CIRCUIT_SETUP.md) - Setup and compilation guide
- [circuits/README.md](../circuits/README.md) - Circuit directory structure

