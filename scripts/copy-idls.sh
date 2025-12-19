#!/bin/bash
set -e

echo "Copying IDL files..."

# Create idl directory if it doesn't exist
mkdir -p web/app/idl

# Copy IDL files from target/idl to web/app/idl
if [ -f "target/idl/ptf_factory.json" ]; then
    cp target/idl/ptf_factory.json web/app/idl/ptf_factory.json
    echo "Copied ptf_factory.json"
fi

if [ -f "target/idl/ptf_pool.json" ]; then
    cp target/idl/ptf_pool.json web/app/idl/ptf_pool.json
    echo "Copied ptf_pool.json"
fi

if [ -f "target/idl/ptf_vault.json" ]; then
    cp target/idl/ptf_vault.json web/app/idl/ptf_vault.json
    echo "Copied ptf_vault.json"
fi

if [ -f "target/idl/ptf_verifier_groth16.json" ]; then
    cp target/idl/ptf_verifier_groth16.json web/app/idl/ptf_verifier_groth16.json
    echo "Copied ptf_verifier_groth16.json"
fi

if [ -f "target/idl/ptf_dex.json" ]; then
    cp target/idl/ptf_dex.json web/app/idl/ptf_dex.json
    echo "Copied ptf_dex.json"
fi

echo "IDL files copied successfully"

