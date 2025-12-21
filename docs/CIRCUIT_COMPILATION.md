# Circuit Compilation Guide

Step-by-step guide for compiling Circom circuits and generating proving/verifying keys.

## Prerequisites

1. **Node.js** (18+)
   ```bash
   node --version
   ```

2. **Circom** compiler
   ```bash
   npm install -g circom
   circom --version
   ```

3. **snarkjs**
   ```bash
   npm install -g snarkjs
   snarkjs --version
   ```

4. **circomlib** (for Poseidon hash)
   ```bash
   cd circuits
   npm install
   ```

## Quick Start

```bash
# Install dependencies
./scripts/install-circuit-deps.sh

# Compile all circuits
./scripts/generate-circuits.sh

# Validate circuits
./scripts/validate-circuits.sh
```

## Detailed Steps

### Step 1: Install Dependencies

```bash
cd circuits
npm install
```

This installs `circomlib` which provides the Poseidon hash template.

### Step 2: Update Circuits with Poseidon

Before compiling, update each circuit to use Poseidon hash:

**Example: `circuits/shield/circuit.circom`**

```circom
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template Shield() {
    signal private input secret[32];
    signal private input amount;
    signal output commitment[32];
    
    // Convert secret bytes to field element
    // (simplified - see CIRCUIT_IMPLEMENTATION.md for proper conversion)
    var secret_field = 0;
    for (var i = 0; i < 32; i++) {
        secret_field = secret_field * 256 + secret[i];
    }
    
    // Poseidon hash
    component hash = Poseidon(3);
    hash.inputs[0] <== secret_field;
    hash.inputs[1] <== amount;
    hash.inputs[2] <== 0;
    
    // Convert output to bytes
    // (simplified - see CIRCUIT_IMPLEMENTATION.md for proper conversion)
    var hash_out = hash.out;
    for (var i = 31; i >= 0; i--) {
        commitment[i] <== hash_out % 256;
        hash_out = hash_out \ 256;
    }
}

component main = Shield();
```

### Step 3: Compile Circuit

```bash
cd circuits/shield
circom circuit.circom --wasm --r1cs
```

This generates:
- `circuit.wasm` - WebAssembly for witness generation
- `circuit.r1cs` - Rank-1 Constraint System

### Step 4: Powers of Tau Ceremony

**One-time setup** (can reuse for all circuits):

```bash
# Create new powers of tau
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v

# Contribute (add randomness)
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau \
    --name="First contribution" -v

# Optional: Add more contributions for security
snarkjs powersoftau contribute pot12_0001.ptau pot12_0002.ptau \
    --name="Second contribution" -v
```

**Note**: For production, use a trusted setup ceremony with multiple participants.

### Step 5: Generate Proving Key

```bash
cd circuits/shield

# Setup Groth16
snarkjs groth16 setup circuit.r1cs ../pot12_0001.ptau circuit_0000.zkey

# Contribute to proving key (add randomness)
snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey \
    --name="Second contribution" -v

# Optional: Add more contributions
snarkjs zkey contribute circuit_0001.zkey circuit_0002.zkey \
    --name="Third contribution" -v
```

**Final proving key**: `circuit_0001.zkey` (or `circuit_0002.zkey` if more contributions)

### Step 6: Generate Verifying Key

```bash
# Export verifying key
snarkjs zkey export verificationkey circuit_0001.zkey verification_key.json
```

### Step 7: Convert to Solana Format

```bash
# Convert verifying key to binary format for Solana
ts-node ../scripts/convert-verifying-key.ts \
    verification_key.json \
    verifying_key.bin
```

### Step 8: Test Circuit

```bash
# Create input file
cat > input.json <<EOF
{
  "secret": [1, 2, 3, ...],
  "amount": 1000
}
EOF

# Generate witness
node circuit_js/generate_witness.js circuit.wasm input.json witness.wtns

# Generate proof
snarkjs groth16 prove circuit_0001.zkey witness.wtns proof.json public.json

# Verify proof
snarkjs groth16 verify verification_key.json public.json proof.json
```

## Automation

Use the provided scripts:

```bash
# Install dependencies
./scripts/install-circuit-deps.sh

# Generate all circuits
./scripts/generate-circuits.sh

# Validate circuit files
./scripts/validate-circuits.sh
```

## File Structure

After compilation, each circuit directory should contain:

```
circuits/shield/
├── circuit.circom          # Source circuit
├── circuit.wasm            # Compiled circuit (generated)
├── circuit.r1cs            # R1CS (generated)
├── circuit_0000.zkey       # Initial proving key (generated)
├── circuit_0001.zkey       # Final proving key (generated)
├── verification_key.json    # Verifying key JSON (generated)
└── verifying_key.bin        # Solana format (converted)
```

## Production Considerations

1. **Trusted Setup**: Use a multi-party ceremony for production
2. **Security**: Protect `.zkey` files (they contain secrets)
3. **Verification**: Verify all contributions to powers of tau
4. **Testing**: Test circuits with various inputs before deployment
5. **Optimization**: Optimize circuit constraints for gas efficiency

## Troubleshooting

### Circuit Compilation Fails

- Check that `circomlib` is installed: `cd circuits && npm list circomlib`
- Verify Poseidon template path: `include "node_modules/circomlib/circuits/poseidon.circom"`
- Check Circom version: `circom --version` (should be 2.1+)

### Proof Generation Fails

- Verify `.wasm` and `.zkey` files exist
- Check input format matches circuit expectations
- Verify witness generation succeeds before proof generation

### Verification Fails

- Check verifying key matches proving key
- Verify public inputs format
- Ensure proof format is correct (256 bytes)

## See Also

- [CIRCUIT_IMPLEMENTATION.md](./CIRCUIT_IMPLEMENTATION.md) - How to implement circuits
- [CIRCUIT_SETUP.md](./CIRCUIT_SETUP.md) - Setup and usage
- [circuits/README.md](../circuits/README.md) - Circuit directory structure

