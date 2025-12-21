#!/bin/bash
# Generate proving keys and verifying keys for all circuits
# This script automates the key generation process

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$SCRIPT_DIR/../circuits"
TAU_DIR="$CIRCUITS_DIR/.tau"

echo "Generating keys for zPump circuits..."

# Check if snarkjs is available
if ! npx snarkjs --version &> /dev/null; then
    echo "❌ snarkjs not found. Installing..."
    cd "$CIRCUITS_DIR"
    npm install snarkjs --save-dev
fi

# Create tau directory if it doesn't exist
mkdir -p "$TAU_DIR"

# Step 1: Generate Powers of Tau (if not already done)
if [ ! -f "$TAU_DIR/pot14_final.ptau" ]; then
    echo ""
    echo "Step 1: Generating Powers of Tau..."
    cd "$TAU_DIR"
    
    if [ ! -f "pot14_0000.ptau" ]; then
        echo "Creating initial powers of tau..."
        npx snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
    fi
    
    if [ ! -f "pot14_0001.ptau" ]; then
        echo "Contributing to powers of tau..."
        npx snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau \
            --name="First contribution" -v -e="$(openssl rand -hex 32)"
    fi
    
    if [ ! -f "pot14_final.ptau" ]; then
        echo "Preparing phase 2..."
        npx snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v
    fi
    
    echo "✅ Powers of Tau generated"
else
    echo "✅ Powers of Tau already exists, skipping..."
fi

# Function to generate keys for a circuit
generate_keys() {
    local circuit_name=$1
    local circuit_dir="$CIRCUITS_DIR/$circuit_name"
    
    echo ""
    echo "Generating keys for $circuit_name circuit..."
    
    if [ ! -f "$circuit_dir/circuit.r1cs" ]; then
        echo "❌ circuit.r1cs not found in $circuit_dir"
        echo "   Please compile the circuit first: cd $circuit_dir && circom circuit.circom --wasm --r1cs"
        return 1
    fi
    
    cd "$circuit_dir"
    
    # Generate proving key
    if [ ! -f "circuit_0000.zkey" ]; then
        echo "  Creating initial proving key..."
        npx snarkjs groth16 setup circuit.r1cs "$TAU_DIR/pot14_final.ptau" circuit_0000.zkey
    fi
    
    # Contribute to proving key
    if [ ! -f "circuit_0001.zkey" ]; then
        echo "  Contributing to proving key..."
        npx snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey \
            --name="Second contribution" -v -e="$(openssl rand -hex 32)"
    fi
    
    # Export verifying key
    if [ ! -f "verification_key.json" ]; then
        echo "  Exporting verifying key..."
        npx snarkjs zkey export verificationkey circuit_0001.zkey verification_key.json
    fi
    
    # Convert to Solana format (if script exists)
    if [ -f "$SCRIPT_DIR/convert-verifying-key.ts" ] && [ ! -f "verifying_key.bin" ]; then
        echo "  Converting verifying key to Solana format..."
        cd "$SCRIPT_DIR/.."
        npx ts-node "$SCRIPT_DIR/convert-verifying-key.ts" \
            "$circuit_dir/verification_key.json" \
            "$circuit_dir/verifying_key.bin" || echo "  ⚠️  Conversion failed (may need to run manually)"
    fi
    
    echo "  ✅ $circuit_name keys generated"
}

# Generate keys for each circuit
for op in shield unshield transfer; do
    generate_keys "$op" || echo "⚠️  Skipping $op due to error"
done

echo ""
echo "Key generation complete!"
echo ""
echo "Generated files:"
echo "  - Powers of Tau: $TAU_DIR/pot14_final.ptau"
for op in shield unshield transfer; do
    echo "  - $op:"
    echo "    - circuit_0001.zkey (proving key)"
    echo "    - verification_key.json (verifying key JSON)"
    echo "    - verifying_key.bin (Solana format, if converted)"
done

