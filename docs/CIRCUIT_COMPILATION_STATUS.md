# Circuit Compilation Status

**Last Updated**: 2024-12-20

## Current Status

### ✅ Circuits Updated with Poseidon Hash

All three circuits have been updated to use Poseidon hash from circomlib:

1. **Shield Circuit** (`circuits/shield/circuit.circom`)
   - Uses Poseidon(3) to hash secret and amount
   - Converts bytes to field elements and back

2. **Unshield Circuit** (`circuits/unshield/circuit.circom`)
   - Uses Poseidon(2) to hash nullifier_secret
   - Converts bytes to field elements and back

3. **Transfer Circuit** (`circuits/transfer/circuit.circom`)
   - Uses Poseidon(2) for nullifier hash
   - Uses Poseidon(3) for commitment hash
   - Converts bytes to field elements and back

### ✅ Compilation Setup

- **circomlib**: ✅ Installed (v2.0.5)
- **Poseidon template**: ✅ Found at `node_modules/circomlib/circuits/poseidon.circom`
- **circom compiler**: ✅ Available (v2.2.3)
  - Installation script: `scripts/install-circom-binary.sh`
  - Binary location: `~/.local/bin/circom` or `/tmp/circom`

### ⚠️ Compilation Status

**Current**: Circuits are ready to compile but compilation requires:
1. circom compiler installed and in PATH
2. Correct include paths for circomlib

**To Compile**:
```bash
# Install circom (if not already installed)
./scripts/install-circom-binary.sh

# Add to PATH
export PATH="$HOME/.local/bin:$PATH"

# Compile all circuits
./scripts/generate-circuits.sh

# Or compile individually
cd circuits/shield
circom circuit.circom --wasm --r1cs
```

## Next Steps

### 1. Generate Powers of Tau

```bash
# Create powers of tau (one-time setup, can reuse for all circuits)
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
```

### 2. Generate Proving Keys

For each circuit (shield, unshield, transfer):

```bash
cd circuits/shield
snarkjs groth16 setup circuit.r1cs ../../pot12_0001.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey --name="Second contribution" -v
```

### 3. Generate Verifying Keys

```bash
cd circuits/shield
snarkjs zkey export verificationkey circuit_0001.zkey verification_key.json
```

### 4. Convert to Solana Format

```bash
ts-node ../scripts/convert-verifying-key.ts verification_key.json verifying_key.bin
```

## Known Issues

### Byte-to-Field Conversion

The current implementation uses simplified byte-to-field conversion:
- **Input**: Packs 32 bytes into a single field element (may overflow for large values)
- **Output**: Extracts bytes from field element (may lose precision)

**Production Note**: For production, consider using:
- circomlib's `Bytes2Packed` template for input conversion
- Proper field element unpacking for output conversion
- Or split large values across multiple field elements

### Circuit Constraints

The current circuits may have high constraint counts due to:
- Byte-to-field conversions (32 iterations each)
- Field-to-byte conversions (32 iterations each)

**Optimization**: Consider optimizing conversion logic to reduce constraints.

## Testing

After compilation, test each circuit:

```bash
# Generate witness
cd circuits/shield
node circuit_js/generate_witness.js circuit.wasm input.json witness.wtns

# Generate proof
snarkjs groth16 prove circuit_0001.zkey witness.wtns proof.json public.json

# Verify proof
snarkjs groth16 verify verification_key.json public.json proof.json
```

## See Also

- [CIRCUIT_IMPLEMENTATION.md](./CIRCUIT_IMPLEMENTATION.md) - Implementation details
- [CIRCUIT_COMPILATION.md](./CIRCUIT_COMPILATION.md) - Compilation guide
- [CIRCUIT_SETUP_INSTRUCTIONS.md](./CIRCUIT_SETUP_INSTRUCTIONS.md) - Setup instructions

