# zPump

Solana-based privacy pool smart contracts with zero-knowledge proofs.

## Overview

zPump is a privacy-preserving token pool system built on Solana that allows users to shield SPL tokens into privacy-preserving zTokens and later unshield them back. The system uses Groth16 zero-knowledge proofs for privacy.

## Architecture

The system consists of 5 Anchor programs:

- **ptf_pool**: Core privacy pool orchestrator (shield/unshield/transfer operations)
- **ptf_factory**: Mint and pool management
- **ptf_vault**: Token custody
- **ptf_verifier_groth16**: Zero-knowledge proof verification
- **ptf_dex**: Decentralized exchange

## Features

### Implemented Operations

- ✅ **Shield** (wrap): Convert public tokens to privacy tokens
- ✅ **Unshield** (unwrap): Convert privacy tokens back to public (4-step process)
- ✅ **Transfer**: Private transfers between users
- ✅ **TransferFrom**: Private transfers with allowance
- ✅ **Approve**: Approve spender allowances
- ✅ **BatchTransfer**: Batch private transfers
- ✅ **BatchTransferFrom**: Batch private transfers with allowance

### Supported Tokens

- ✅ Standard SPL tokens
- ✅ wSOL (wrapped SOL)

## Prerequisites

- Rust (latest stable)
- Solana CLI (latest)
- Anchor (latest)
- Node.js (v18+)
- npm (v10.8.2+)

## Getting Started

### 1. Install Dependencies

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Node.js dependencies
npm install
cd tests && npm install
```

### 2. Build Programs

```bash
# Build all programs
npm run build

# Copy IDL files
npm run copy-idls
```

### 3. Start Local Validator

**Option A: Automated (may have issues)**
```bash
npm run start-validator
```

**Option B: Manual (Recommended)**
See [VALIDATOR_SETUP.md](./VALIDATOR_SETUP.md) for detailed manual setup instructions.

Quick start:
```bash
# Terminal 1: Start validator
solana-test-validator --reset --rpc-port 8899

# Terminal 2: Deploy programs
npm run deploy-all
```

### 4. Bootstrap Environment

```bash
# Bootstrap wSOL and environment
npm run bootstrap-wsol
npm run bootstrap
```

**Note:** If bootstrap scripts fail, ensure the validator is running and programs are deployed (see [VALIDATOR_SETUP.md](./VALIDATOR_SETUP.md)).

### 5. Run Tests

```bash
# Run all tests
cd tests && npm test

# Run unit tests
cd tests && npm run test:unit

# Run integration tests
cd tests && npm run test:integration

# Run E2E tests
cd tests && npm run test:e2e

# Generate coverage report
cd tests && npm run coverage
```

## Project Structure

```
zPump/
├── programs/
│   ├── ptf_pool/              # Core pool program
│   ├── ptf_factory/           # Factory program
│   ├── ptf_vault/             # Vault program
│   ├── ptf_verifier_groth16/  # Verifier program
│   ├── ptf_dex/               # DEX program
│   └── common/                # Shared library
├── scripts/
│   ├── start-private-devnet-with-upgrade.sh
│   ├── bootstrap-wsol.ts
│   ├── bootstrap-private-devnet.ts
│   ├── create-test-token.ts
│   ├── copy-idls.sh
│   └── reset-dev-env.sh
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   ├── e2e/                   # End-to-end tests
│   ├── utils/                 # Test utilities
│   └── fixtures/              # Test fixtures
├── Anchor.toml                 # Anchor configuration
├── Cargo.toml                  # Rust workspace
└── package.json                # Node.js dependencies
```

## Program IDs (Local Development)

- `ptf_factory`: `AG2eT5fyfPdv6wjDWCxr5Y9JBK9cD5rahLzuz2UbbBvg`
- `ptf_pool`: `9ykdCimDZGsCBB9ihC9QfDKib4KxYzpRZZTVrGp425Ku`
- `ptf_vault`: `iHWU2DfontkA7ZT2C6hFph3SSpkTjPm2a4t2C54CxSw`
- `ptf_verifier_groth16`: `DMvUxHwdJGkaRAJFXEKgDxsmVXL3gYttNsVP16xEr9TE`
- `ptf_dex`: `EkCLPUfEtSMJsEwJbVtDifeZ5H4dJREkMeFXAxwBde6b`

## Testing

The project includes comprehensive testing infrastructure:

- **Unit Tests**: Test individual program instructions
- **Integration Tests**: Test complete operation flows
- **E2E Tests**: Test full user journeys
- **Coverage Tracking**: Automatic coverage reporting (target: 99%)
- **Gas Monitoring**: Automatic gas usage tracking

### Test Coverage

All operations are tested with:
- Standard SPL tokens
- wSOL (wrapped SOL)
- Edge cases (zero amounts, max amounts, invalid inputs, etc.)
- Error conditions
- State machine validation

## Development

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

### Reset Environment

```bash
npm run reset-env
```

## Documentation

See `.cursor/project-docs/` for detailed documentation:

- [Project Overview](.cursor/project-docs/01-project-overview.md)
- [Critical Issues and Solutions](.cursor/project-docs/02-critical-issues-and-solutions.md)
- [Implementation Patterns](.cursor/project-docs/03-implementation-patterns.md)
- [Build and Deployment Guide](.cursor/project-docs/04-build-and-deployment.md)
- [Testing Guide](.cursor/project-docs/05-testing-guide.md)
- [Troubleshooting Guide](.cursor/project-docs/06-troubleshooting-guide.md)
- [Architecture Deep Dive](.cursor/project-docs/07-architecture-deep-dive.md)

## License

MIT

