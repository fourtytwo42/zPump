#!/bin/bash
# Compile circuits using npx or local circom installation
# This script attempts compilation even if circom is not globally installed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$SCRIPT_DIR/../circuits"

echo "Compiling zPump circuits..."

# Function to find circom
find_circom() {
    # Try global circom
    if command -v circom &> /dev/null; then
        echo "circom"
        return 0
    fi
    
    # Try npx circom
    if npx circom --version &> /dev/null; then
        echo "npx circom"
        return 0
    fi
    
    # Try local node_modules
    if [ -f "$CIRCUITS_DIR/node_modules/.bin/circom" ]; then
        echo "$CIRCUITS_DIR/node_modules/.bin/circom"
        return 0
    fi
    
    return 1
}

CIRCOM_CMD=$(find_circom)

if [ -z "$CIRCOM_CMD" ]; then
    echo "❌ circom compiler not found"
    echo "Please install circom:"
    echo "  npm install -g circom"
    echo "Or see: docs/CIRCUIT_SETUP_INSTRUCTIONS.md"
    exit 1
fi

echo "Using: $CIRCOM_CMD"

# Function to compile circuit
compile_circuit() {
    local circuit_name=$1
    local circuit_dir="$CIRCUITS_DIR/$circuit_name"
    
    echo ""
    echo "Compiling $circuit_name circuit..."
    
    if [ ! -f "$circuit_dir/circuit.circom" ]; then
        echo "❌ circuit.circom not found in $circuit_dir"
        return 1
    fi
    
    cd "$circuit_dir"
    
    # Compile circuit
    if $CIRCOM_CMD circuit.circom --wasm --r1cs 2>&1; then
        echo "✅ $circuit_name circuit compiled successfully"
        
        if [ -f "circuit.wasm" ] && [ -f "circuit.r1cs" ]; then
            echo "   Generated: circuit.wasm, circuit.r1cs"
        fi
    else
        echo "❌ $circuit_name circuit compilation failed"
        return 1
    fi
    
    cd "$SCRIPT_DIR"
}

# Compile each circuit
for op in shield unshield transfer; do
    compile_circuit "$op" || echo "⚠️  Skipping $op due to compilation error"
done

echo ""
echo "Circuit compilation complete!"
echo ""
echo "Next steps:"
echo "1. Generate powers of tau: snarkjs powersoftau new bn128 12 pot12_0000.ptau -v"
echo "2. Generate proving keys: snarkjs groth16 setup circuit.r1cs pot12_0001.ptau circuit.zkey"
echo "3. Generate verifying keys: snarkjs zkey export verificationkey circuit.zkey verification_key.json"
echo "4. Convert to Solana format: ts-node scripts/convert-verifying-key.ts verification_key.json verifying_key.bin"

