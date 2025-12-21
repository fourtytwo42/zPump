#!/bin/bash
# Install circom compiler
# Circom requires Rust to build from source

set -e

echo "Installing circom compiler..."

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "Rust is required to build circom from source"
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# Check if circom is already installed
if command -v circom &> /dev/null; then
    echo "circom is already installed: $(circom --version)"
    exit 0
fi

# Install circom via cargo (if Rust is available)
if command -v cargo &> /dev/null; then
    echo "Installing circom via cargo..."
    cargo install --locked circom
    echo "✅ circom installed successfully"
    echo "Add to PATH: export PATH=\"\$HOME/.cargo/bin:\$PATH\""
else
    echo "❌ cargo not found. Please install Rust first."
    echo "Visit: https://docs.circom.io/getting-started/installation/"
    exit 1
fi

