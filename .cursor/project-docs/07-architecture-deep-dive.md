# Architecture Deep Dive

This document provides detailed architecture documentation for the zPump project.

## System Architecture

### High-Level Flow

```
User → Frontend → SDK → Proof Service → On-Chain Programs
                ↓
            Indexer ← On-Chain State
```

### Component Interactions

1. **User initiates operation** (shield/unshield/transfer)
2. **Frontend calls SDK** to build transaction
3. **SDK calls Proof Service** to generate Groth16 proof
4. **SDK builds transaction** with proof and accounts
5. **Transaction submitted** to Solana
6. **On-chain programs** verify proof and update state
7. **Indexer mirrors** on-chain state for off-chain queries

## Program Architecture

### ptf_pool Program

**Purpose:** Core privacy pool orchestrator

**Key Responsibilities:**
- Shield/unshield operations
- Private transfers
- Commitment tree management
- Nullifier set management
- Note ledger updates
- Coordination with vault and factory

**Key PDAs:**
- `PoolState`: `["pool", origin_mint]` - Main pool state
- `CommitmentTree`: `["commitment-tree", origin_mint]` - Merkle tree
- `NullifierSet`: `["nullifier-set", origin_mint]` - Spent nullifiers
- `NoteLedger`: `["note-ledger", origin_mint]` - Note history
- `ShieldClaim`: `["claim", pool_state]` - Shield operation state

**Key Instructions:**
- `prepare_shield` - Prepare shield operation (off-chain proof generation)
- `execute_shield_v2` - Execute shield (on-chain verification)
- `execute_unshield` - Execute unshield
- `execute_transfer` - Private transfer
- `execute_transfer_from` - Private transfer with allowance
- `approve_allowance` - Approve spender allowance
- `shield_finalize_tree` - Finalize shield tree update

**Critical Implementation Details:**
- Uses custom entrypoint (`solana_program::entrypoint!`) that intercepts `execute_shield_v2`
- Routes `execute_shield_v2` to raw handler that bypasses Anchor validation
- Other instructions use Anchor's standard dispatch but with raw instruction patterns
- Manual account extraction from `remaining_accounts` for raw handlers
- Centralized PDA derivation via `PoolAddresses::derive_all()` (from `programs/common/src/addresses.rs`)
- Manual account validation (bypasses Anchor's buggy validation)
- Catches all verifier errors (6000-6099) and converts to `VerifierMismatch`

---

### ptf_factory Program

**Purpose:** Mint and pool management

**Key Responsibilities:**
- Mint-to-pool mapping
- Twin mint creation (privacy tokens)
- Verifying key registration
- Pool metadata management

**Key PDAs:**
- `FactoryState`: `["factory"]` - Factory state
- `MintMapping`: `["mint-mapping", origin_mint]` - Mint mapping

**Key Instructions:**
- `initialize_factory` - Initialize factory
- `register_mint` - Register new mint
- `create_verifying_key` - Register verifying key (CPI to verifier)

---

### ptf_vault Program

**Purpose:** Token custody

**Key Responsibilities:**
- Custody of underlying SPL tokens
- Token account management per pool
- Deposits and withdrawals

**Key PDAs:**
- `VaultState`: `["vault", origin_mint]` - Vault state

**Key Instructions:**
- `deposit` - Deposit tokens to vault
- `withdraw` - Withdraw tokens from vault

---

### ptf_verifier_groth16 Program

**Purpose:** Zero-knowledge proof verification

**Key Responsibilities:**
- Groth16 proof verification
- Verifying key storage
- CPI interface for other programs

**Key PDAs:**
- `VerifyingKeyAccount`: `["verifying-key", circuit_tag, version]` - Verifying key

**Key Instructions:**
- `initialize_verifying_key` - Initialize verifying key (called by factory)
- `verify_groth16` - Verify Groth16 proof (CPI from pool)

**Critical Implementation Details:**
- Uses Solana's alt_bn128 syscalls for verification
- Stores verifying keys in uncompressed Arkworks format
- Checks for key revocation before verification
- **Known Issue:** Error code reporting bug (6012 reported as 6013)

---

## Data Flow

### Shield (Wrap) Flow

1. **User deposits tokens** to vault
2. **User calls `prepare_shield`** - Creates `UserProofVault` account with operation
3. **Off-chain proof service** generates Groth16 proof
4. **User calls `execute_shield_v2`** - Submits proof to pool program
5. **Pool program** verifies proof via `ptf_verifier_groth16` CPI
6. **Pool program** updates commitment tree
7. **Pool program** records note in note ledger
8. **User receives** privacy notes (off-chain, via indexer)

### Unshield (Unwrap) Flow

1. **User provides nullifier** for spent note
2. **Off-chain proof service** generates Groth16 proof
3. **User calls `execute_unshield`** - Submits proof to pool program
4. **Pool program** verifies proof and nullifier
5. **Pool program** updates commitment tree
6. **Pool program** withdraws tokens from vault
7. **User receives** public tokens

### Private Transfer Flow

1. **User provides nullifiers** for input notes
2. **Off-chain proof service** generates Groth16 proof
3. **User calls `execute_transfer`** - Submits proof to pool program
4. **Pool program** verifies proof
5. **Pool program** updates commitment tree with new commitments
6. **Recipient receives** new privacy notes (off-chain, via indexer)

### TransferFrom Flow

1. **Owner approves allowance** via `approve_allowance`
2. **Spender provides nullifiers** for input notes
3. **Off-chain proof service** generates Groth16 proof
4. **Spender calls `execute_transfer_from`** - Submits proof to pool program
5. **Pool program** verifies proof and allowance
6. **Pool program** updates commitment tree
7. **Recipient receives** new privacy notes (off-chain, via indexer)

## Account Structure

### PoolState Account

```rust
pub struct PoolState {
    pub current_root: [u8; 32],
    pub recent_roots: [[u8; 32]; 16],
    pub recent_roots_len: u8,
    pub origin_mint: Pubkey,
    pub vault: Pubkey,
    pub twin_mint: Option<Pubkey>,
    pub verifying_key: Pubkey,
    pub verifying_key_hash: [u8; 32],
    pub features: FeatureFlags,
    // ... more fields
}
```

### CommitmentTree Account

```rust
pub struct CommitmentTree {
    pub pool: Pubkey,
    pub canopy_depth: u8,
    pub next_index: u64,
    pub current_root: [u8; 32],
    pub frontier: [[u8; 32]; DEPTH],
    pub zeroes: [[u8; 32]; DEPTH],
    pub canopy: [[u8; 32]; MAX_CANOPY],
    pub recent_commitments: [[u8; 32]; MAX_CANOPY],
    pub recent_amount_commitments: [[u8; 32]; MAX_CANOPY],
    pub recent_indices: [u64; MAX_CANOPY],
    pub recent_len: u8,
    pub bump: u8,
}
```

### UserProofVault Account

```rust
pub struct UserProofVault {
    pub prepared_operations: Vec<PreparedOperation>,
}
```

**CRITICAL:** This account must use `AnchorSerialize` format, not Borsh.

## Security Considerations

### Proof Verification

- All proofs verified on-chain via `ptf_verifier_groth16`
- Verifying keys registered by factory (authority control)
- Key revocation checked before verification
- All verifier errors (6000-6099) caught and converted to `VerifierMismatch`

### Nullifier Set

- Nullifiers prevent double-spending
- Nullifiers checked before tree updates
- Nullifier set is append-only (never removed)

### Root Validation

- Tree roots validated before operations
- Recent roots stored for validation
- Root synchronization checked between tree and pool state

### Allowance System

- Allowances stored in PDA accounts
- Allowance amounts validated against spend amounts
- Allowance owner/spender validated
- Allowance pool validated

## Performance Considerations

### Stack Optimization

- Functions optimized to stay under 4KB stack limit
- Unused parameters use `AccountInfo` instead of typed wrappers
- Large functions use `#[inline(never)]`
- PDA derivation centralized to reduce stack usage

### Compute Budget

- Operations stay under 1.4M compute units
- Tree updates optimized
- Proof verification uses efficient syscalls
- Batch operations supported

### Account Size

- Accounts sized appropriately for data
- Large accounts use reallocation when needed
- Account discriminators set correctly

## Known Limitations

### Anchor Framework

- Cannot use `#[derive(Accounts)]` for 10+ accounts
- Must use raw instruction pattern
- Must manually validate accounts
- Must manually create accounts (no `init_if_needed`)

### Solana Runtime

- 4KB stack limit requires careful optimization
- Account size limits require reallocation
- Compute budget limits require optimization

### Verifier Program

- Error code reporting bug (6012 reported as 6013)
- Workaround: Catch all verifier errors (6000-6099)

## Required Improvements (Not Optional)

**These improvements are REQUIRED for production. They are not optional.**

### 1. Stack Optimization (REQUIRED)

**CRITICAL:** `execute_unshield` MUST be split into multiple instructions. See [Critical Issues](02-critical-issues-and-solutions.md) for detailed implementation steps.

**Required Instructions:**
1. `prepare_unshield` - Extract and validate accounts, store operation
2. `execute_unshield_verify` - Verify proof
3. `execute_unshield_update` - Update tree and ledger
4. `execute_unshield_withdraw` - Withdraw tokens from vault

**Implementation:** See [Critical Issues](02-critical-issues-and-solutions.md) section "CRITICAL SOLUTION FOR execute_unshield Stack Overflow"

### 2. Security Enhancements (REQUIRED)

**MANDATORY Security Measures:**
1. **Rate Limiting** - MUST be implemented in all operation instructions
2. **Reentrancy Protection** - MUST be implemented for all multi-step operations
3. **Enhanced Input Validation** - MUST validate all inputs (amounts, proofs, public inputs)
4. **Account Relationship Validation** - MUST validate all account relationships

**Implementation:** See [Critical Issues](02-critical-issues-and-solutions.md) section "Security Requirements"

### 3. Enhanced Error Handling (REQUIRED)

**MANDATORY:** All error handling MUST use standardized error with context.

**Implementation:** See [Implementation Patterns](03-implementation-patterns.md) section "Enhanced Error Handling Pattern"

### 4. Testing Requirements (REQUIRED)

**MANDATORY:** All operations and edge cases MUST be tested.

**Implementation:** See [Testing Guide](05-testing-guide.md) section "Test Coverage Requirements"

### 5. Deployment Requirements (REQUIRED)

**MANDATORY:** All deployment steps MUST be followed in order.

**Implementation:** See [Build and Deployment Guide](04-build-and-deployment.md) section "Production Deployment"

## Related Documentation

- [Project Overview](01-project-overview.md) - High-level overview
- [Critical Issues](02-critical-issues-and-solutions.md) - Known problems
- [Implementation Patterns](03-implementation-patterns.md) - Code patterns
- [Build Guide](04-build-and-deployment.md) - Setup instructions
- [Testing Guide](05-testing-guide.md) - Testing instructions
- [Troubleshooting Guide](06-troubleshooting-guide.md) - Common issues

