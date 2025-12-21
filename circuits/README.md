# zPump Circuits

This directory contains Circom circuit definitions for zPump zero-knowledge proofs.

## Circuit Types

- **shield/**: Shield operation circuit (commitment generation)
- **unshield/**: Unshield operation circuit (nullifier proof)
- **transfer/**: Transfer operation circuit (private transfer proof)

## Current Status

⚠️ **Development/Testing Circuits Only**

The current circuits use simplified hash functions for development and testing. They are **NOT cryptographically secure** and should not be used in production.

## Production Requirements

For production use, circuits must:

1. **Use Proper Cryptographic Hash**
   - Implement Poseidon hash or similar
   - Include Poseidon template: `include "poseidon.circom"`
   - Replace simplified hash with proper hash function

2. **Compile Circuits**
   ```bash
   circom circuit.circom --wasm --r1cs
   ```

3. **Generate Proving Keys**
   ```bash
   snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
   snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
   snarkjs groth16 setup circuit.r1cs pot12_0001.ptau circuit_0000.zkey
   snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey --name="Second contribution" -v
   ```

4. **Generate Verifying Keys**
   ```bash
   snarkjs zkey export verificationkey circuit_0001.zkey verification_key.json
   ```

5. **Convert Verifying Key for Solana**
   ```bash
   ts-node ../scripts/convert-verifying-key.ts verification_key.json verifying_key.bin
   ```

## Circuit Structure

Each circuit follows this pattern:

```circom
pragma circom 2.0.0;

template OperationName() {
    // Private inputs (witness)
    signal private input ...;
    
    // Public outputs
    signal output ...;
    
    // Circuit logic
    // Production: Use Poseidon hash
    // Development: Simplified hash (NOT secure)
}

component main = OperationName();
```

## Files Required

Each circuit directory should contain:
- `circuit.circom` - Circuit definition
- `circuit.wasm` - Compiled circuit (generated)
- `circuit.zkey` - Proving key (generated)
- `verification_key.json` - Verifying key (generated)
- `verifying_key.bin` - Solana format verifying key (converted)

## See Also

- [CIRCUIT_SETUP.md](../docs/CIRCUIT_SETUP.md) - Detailed setup guide
- [PROOF_SERVICE.md](../docs/PROOF_SERVICE.md) - Proof generation service
- [GROTH16_VERIFICATION.md](../docs/GROTH16_VERIFICATION.md) - Verification implementation

