#!/bin/bash
# Validate circuit files and structure

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$SCRIPT_DIR/../circuits"

echo "Validating zPump circuits..."

# Check for required circuit files
operations=("shield" "unshield" "transfer")
missing_files=0

for op in "${operations[@]}"; do
    circuit_file="$CIRCUITS_DIR/$op/circuit.circom"
    
    if [ ! -f "$circuit_file" ]; then
        echo "❌ Missing: $circuit_file"
        missing_files=$((missing_files + 1))
    else
        echo "✅ Found: $circuit_file"
        
        # Check for basic structure
        if ! grep -q "pragma circom" "$circuit_file"; then
            echo "   ⚠️  Warning: Missing 'pragma circom'"
        fi
        
        if ! grep -q "template" "$circuit_file"; then
            echo "   ⚠️  Warning: Missing 'template' definition"
        fi
        
        if ! grep -q "component main" "$circuit_file"; then
            echo "   ⚠️  Warning: Missing 'component main'"
        fi
    fi
done

# Check for circomlib (for Poseidon hash)
if [ -d "$CIRCUITS_DIR/node_modules/circomlib" ]; then
    echo "✅ circomlib found"
else
    echo "⚠️  circomlib not found (needed for Poseidon hash)"
    echo "   Install with: cd circuits && npm install circomlib"
fi

# Check for circom compiler
if command -v circom &> /dev/null; then
    circom_version=$(circom --version 2>&1 || echo "unknown")
    echo "✅ circom found: $circom_version"
else
    echo "⚠️  circom not found"
    echo "   Install with: npm install -g circom"
fi

# Check for snarkjs
if command -v snarkjs &> /dev/null; then
    echo "✅ snarkjs found"
else
    echo "⚠️  snarkjs not found"
    echo "   Install with: npm install -g snarkjs"
fi

# Summary
echo ""
if [ $missing_files -eq 0 ]; then
    echo "✅ All required circuit files found"
else
    echo "❌ Missing $missing_files circuit file(s)"
    exit 1
fi

echo "Circuit validation complete!"

