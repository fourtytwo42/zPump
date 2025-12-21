#!/bin/bash
# Install circom binary from GitHub releases

set -e

CIRCOM_VERSION="${CIRCOM_VERSION:-v2.2.3}"
INSTALL_DIR="${HOME}/.local/bin"
CIRCOM_BIN="${INSTALL_DIR}/circom"

echo "Installing circom ${CIRCOM_VERSION}..."

# Create install directory if it doesn't exist
mkdir -p "$INSTALL_DIR"

# Download circom binary
echo "Downloading circom from GitHub..."
curl -L "https://github.com/iden3/circom/releases/download/${CIRCOM_VERSION}/circom-linux-amd64" -o "$CIRCOM_BIN"

# Make executable
chmod +x "$CIRCOM_BIN"

# Verify installation
if [ -f "$CIRCOM_BIN" ]; then
    echo "✅ circom installed successfully"
    echo "Location: $CIRCOM_BIN"
    echo "Version: $($CIRCOM_BIN --version 2>&1 | head -1)"
    echo ""
    echo "Add to PATH:"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
    echo "Or add to ~/.bashrc:"
    echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
else
    echo "❌ Installation failed"
    exit 1
fi

