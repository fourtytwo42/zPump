# Circuit Setup Instructions

Complete guide for setting up the development environment to compile zPump circuits.

## Prerequisites

### 1. Install Node.js (18+)

```bash
# Check if Node.js is installed
node --version

# If not installed, install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install Rust (Required for circom)

```bash
# Check if Rust is installed
rustc --version

# If not installed, install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 3. Install circom Compiler

```bash
# Option 1: Using the provided script
./scripts/install-circom.sh

# Option 2: Manual installation via cargo
cargo install --locked circom

# Verify installation
circom --version
```

### 4. Install snarkjs

```bash
# Install globally
npm install -g snarkjs

# Verify installation
snarkjs --version
```

### 5. Install Circuit Dependencies

```bash
cd circuits
npm install

# Verify circomlib is installed
npm list circomlib
```

## Quick Setup

Run the automated setup script:

```bash
# Install all dependencies
./scripts/install-circuit-deps.sh

# If circom is not installed, install it
./scripts/install-circom.sh
```

## Verification

After installation, verify everything is set up:

```bash
# Validate circuit setup
./scripts/validate-circuits.sh

# Should show:
# ✅ circomlib found
# ✅ circom found: <version>
# ✅ snarkjs found
```

## Troubleshooting

### circom Installation Fails

**Error**: `cargo: command not found`

**Solution**: Install Rust first:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### circomlib Not Found

**Error**: `Cannot find module 'circomlib'`

**Solution**: Install dependencies:
```bash
cd circuits
npm install
```

### Circuit Compilation Fails

**Error**: `Cannot find module 'node_modules/circomlib/circuits/poseidon.circom'`

**Solution**: 
1. Verify circomlib is installed: `cd circuits && npm list circomlib`
2. Check file exists: `ls circuits/node_modules/circomlib/circuits/poseidon.circom`
3. Reinstall if needed: `cd circuits && npm install circomlib@^2.0.5`

## Next Steps

After setup is complete:

1. **Compile circuits**: `./scripts/generate-circuits.sh`
2. **Generate keys**: Follow [CIRCUIT_COMPILATION.md](./CIRCUIT_COMPILATION.md)
3. **Test circuits**: Follow [CIRCUIT_IMPLEMENTATION.md](./CIRCUIT_IMPLEMENTATION.md)

## See Also

- [CIRCUIT_COMPILATION.md](./CIRCUIT_COMPILATION.md) - How to compile circuits
- [CIRCUIT_IMPLEMENTATION.md](./CIRCUIT_IMPLEMENTATION.md) - Circuit implementation details
- [PROOF_SERVICE_SETUP.md](./PROOF_SERVICE_SETUP.md) - Proof service setup

