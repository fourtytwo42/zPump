#!/bin/bash
# Circuit generation script for zPump operations
# This script generates .wasm and .zkey files for shield, unshield, and transfer circuits

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$SCRIPT_DIR/../circuits"

echo "Generating circuits for zPump operations..."

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "Error: circom not found. Please install circom first."
    echo "Visit: https://docs.circom.io/getting-started/installation/"
    exit 1
fi

# Check if snarkjs is installed (globally or via npx)
SNARKJS_CMD="snarkjs"
if ! command -v snarkjs &> /dev/null; then
    if command -v npx &> /dev/null; then
        echo "snarkjs not found globally, using npx snarkjs"
        SNARKJS_CMD="npx snarkjs"
    else
        echo "Error: snarkjs not found and npx not available."
        echo "Run: npm install -g snarkjs"
        exit 1
    fi
fi

# Function to generate circuit files
generate_circuit() {
    local circuit_name=$1
    local circuit_dir="$CIRCUITS_DIR/$circuit_name"
    
    echo "Generating $circuit_name circuit..."
    
    # Create directory if it doesn't exist
    mkdir -p "$circuit_dir"
    
    # For now, create placeholder circuit files
    # In production, these would be actual Circom circuit definitions
    echo "Note: Placeholder circuit generation. Replace with actual Circom circuits."
    
    # Check if circuit.circom exists
    if [ ! -f "$circuit_dir/circuit.circom" ]; then
        echo "Warning: circuit.circom not found in $circuit_dir"
        echo "Skipping $circuit_name circuit generation"
        return
    fi
    
    echo "Compiling $circuit_name circuit..."
    cd "$circuit_dir"
    
    # Compile circuit
    # Try to find circom in PATH or use local binary
    CIRCOM_CMD="circom"
    if ! command -v circom &> /dev/null; then
        if [ -f "$HOME/.local/bin/circom" ]; then
            CIRCOM_CMD="$HOME/.local/bin/circom"
        elif [ -f "/tmp/circom" ]; then
            CIRCOM_CMD="/tmp/circom"
        else
            echo "Warning: circom not found. Install with: ./scripts/install-circom-binary.sh"
            echo "Skipping compilation..."
            return
        fi
    fi
    
    if $CIRCOM_CMD circuit.circom --wasm --r1cs 2>&1; then
        echo "✅ Circuit compiled successfully"
    else
        echo "❌ Circuit compilation failed"
        echo "Check circuit syntax and dependencies"
        return 1
    fi
    
    # Generate proving key (if circuit compiled)
    if [ -f "circuit.r1cs" ]; then
        echo "Generating proving key for $circuit_name..."
        echo "Note: This requires powers of tau ceremony - using placeholder for now"
        # Uncomment when ready:
        # snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
        # snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
        # snarkjs groth16 setup circuit.r1cs pot12_0001.ptau circuit_0000.zkey
        # snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey --name="Second contribution" -v
        # snarkjs zkey export verificationkey circuit_0001.zkey verification_key.json
    fi
    
    cd "$SCRIPT_DIR"
    echo "$circuit_name circuit processing complete"
}

# Generate circuits for each operation type
generate_circuit "shield"
generate_circuit "unshield"
generate_circuit "transfer"

echo "Circuit generation complete!"
echo "Note: This is a placeholder. Replace with actual Circom circuit definitions."

