# Project Overview

## What is zPump?

zPump is a Solana-based privacy exchange stack that allows users to shield SPL tokens into privacy-preserving zTokens and later unshield them back into their public form. The system combines zero-knowledge proofs, multiple Anchor programs, an off-chain proof service, an indexer, and a Next.js frontend.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  - Wallet integration                                        │
│  - Convert UI (shield/unshield)                              │
│  - Faucet UI                                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    SDK (TypeScript)                          │
│  - Transaction builders                                       │
│  - Proof client (calls /api/proof)                          │
│  - Indexer client (calls /api/indexer)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────┐            ┌──────────────────┐
│  Proof RPC    │            │  Photon Indexer  │
│  Service      │            │  Service         │
│  - Generates  │            │  - Mirrors       │
│    Groth16    │            │    on-chain      │
│    proofs     │            │    state         │
└───────────────┘            └──────────────────┘
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              On-Chain Programs (Solana)                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  ptf_pool    │  │  ptf_factory │  │  ptf_vault   │     │
│  │  - Shield    │  │  - Mint      │  │  - Token     │     │
│  │  - Unshield  │  │    mapping   │  │    custody   │     │
│  │  - Transfer  │  │  - Twin      │  │              │     │
│  │  - Tree      │  │    mints     │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐                                           │
│  │ ptf_verifier │                                           │
│  │ _groth16     │                                           │
│  │  - ZK proof  │                                           │
│  │    verify    │                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### On-Chain Programs

1. **ptf_pool** - Core privacy pool program
   - Orchestrates shield/unshield instructions
   - Maintains commitment tree (Merkle tree)
   - Tracks note ledger
   - Enforces nullifier set
   - Coordinates with vault and factory

2. **ptf_factory** - Mint and pool management
   - Maintains mint-to-pool mappings
   - Creates twin mints (privacy tokens)
   - Registers verifying keys
   - Manages pool metadata

3. **ptf_vault** - Token custody
   - Custodies underlying SPL tokens
   - Manages token accounts per pool
   - Handles deposits and withdrawals

4. **ptf_verifier_groth16** - Zero-knowledge proof verification
   - Verifies Groth16 proofs
   - Stores verifying keys
   - Provides CPI interface for other programs

5. **ptf_dex** - Decentralized exchange (required for DEX functionality)
   - Enables trading of privacy tokens
   - Integrates with pool program

### Off-Chain Services

1. **Proof RPC Service** - Proof generation
   - Derives Groth16 public inputs
   - Calls snarkjs to generate proofs
   - Provides REST API for proof generation

2. **Photon Indexer** - State mirroring
   - Mirrors on-chain state (roots, nullifiers, notes)
   - Supports incremental queries
   - Persists snapshots to disk
   - Provides REST API for state queries

### Frontend

1. **Next.js Application**
   - Wallet integration (Phantom, etc.)
   - Convert UI (shield/unshield interface)
   - Faucet UI (for testing)
   - API routes (proxy to services)

## Key Concepts

### Shield (Wrap)

Process of converting public SPL tokens into privacy-preserving zTokens:

1. User deposits tokens to vault
2. Off-chain proof service generates Groth16 proof
3. User submits proof to `ptf_pool` program
4. Program verifies proof via `ptf_verifier_groth16`
5. Program updates commitment tree
6. User receives privacy notes (off-chain)

### Unshield (Unwrap)

Process of converting privacy-preserving zTokens back to public tokens:

**MANDATORY Flow (4 separate instructions - MUST be called in order):**

1. **`prepare_unshield`** - User provides nullifier and operation details
   - Off-chain proof service generates Groth16 proof
   - Operation stored in `UserProofVault` with status `Pending`
   - Returns `operation_id: [u8; 32]`

2. **`execute_unshield_verify`** - Verify proof
   - Loads operation from `UserProofVault` by `operation_id`
   - Verifies operation status is `Pending`
   - Verifies Groth16 proof via CPI to `ptf_verifier_groth16`
   - Updates operation status to `Verified`

3. **`execute_unshield_update`** - Update tree and ledger
   - Loads operation from `UserProofVault` by `operation_id`
   - Verifies operation status is `Verified`
   - Updates commitment tree with nullifier
   - Inserts nullifier into nullifier set
   - Updates operation status to `Updated`

4. **`execute_unshield_withdraw`** - Withdraw tokens
   - Loads operation from `UserProofVault` by `operation_id`
   - Verifies operation status is `Updated`
   - Withdraws tokens from vault via CPI to `ptf_vault`
   - Removes operation from `UserProofVault`
   - User receives public tokens

**CRITICAL:** These MUST be called sequentially. Each step MUST succeed before proceeding to the next. See [Critical Issues](02-critical-issues-and-solutions.md) for exact implementation.

### Private Transfer

Process of transferring privacy tokens between users without revealing amounts:

1. User provides nullifiers for input notes
2. Off-chain proof service generates Groth16 proof
3. User submits proof to `ptf_pool` program
4. Program verifies proof and updates tree
5. Recipient receives new privacy notes (off-chain)

## Program IDs (Local Development)

**CRITICAL:** These IDs must match across all files:

- `ptf_factory`: `AG2eT5fyfPdv6wjDWCxr5Y9JBK9cD5rahLzuz2UbbBvg`
- `ptf_pool`: `9ykdCimDZGsCBB9ihC9QfDKib4KxYzpRZZTVrGp425Ku`
- `ptf_vault`: `iHWU2DfontkA7ZT2C6hFph3SSpkTjPm2a4t2C54CxSw`
- `ptf_verifier_groth16`: `DMvUxHwdJGkaRAJFXEKgDxsmVXL3gYttNsVP16xEr9TE`
- `ptf_dex`: `EkCLPUfEtSMJsEwJbVtDifeZ5H4dJREkMeFXAxwBde6b` (Note: SDK uses `HRbTSfU2WoUWqq2Y7y5WfGPy7LaXxMQoyrcdJPfEhd7U` - verify which is correct)

**Files that must have matching IDs:**

1. `Anchor.toml` - `[programs.localnet]` section
2. `web/app/lib/onchain/programIds.ts` - All `*_PROGRAM_ID` constants
3. `programs/*/src/lib.rs` - `declare_id!` macros
4. `scripts/start-private-devnet-with-upgrade.sh` - Program deployment
5. `web/app/scripts/bootstrap-private-devnet.ts` - `PROGRAM_IDS` constant

**CRITICAL:** If you change program IDs, you MUST update ALL of these files. Use `grep` to find all occurrences.

## Technology Stack

- **Blockchain:** Solana
- **Framework:** Anchor (with custom entrypoint workarounds)
- **Language:** Rust (programs), TypeScript (SDK/frontend)
- **Frontend:** Next.js, React
- **ZK Proofs:** Groth16 (via snarkjs)
- **Indexer:** Photon (custom implementation)

## Development Environment

- **Local Validator:** `solana-test-validator`
- **Program Deployment:** Manual via `solana program deploy`
- **Services:** PM2 or systemd
- **Testing:** TypeScript scripts with `tsx`

## Next Steps

1. Read [Critical Issues and Solutions](02-critical-issues-and-solutions.md) to understand what NOT to do
2. Review [Implementation Patterns](03-implementation-patterns.md) for correct approaches
3. Follow [Build and Deployment Guide](04-build-and-deployment.md) for setup

