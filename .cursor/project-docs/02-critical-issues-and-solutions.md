# Critical Issues and Solutions

This document lists all critical issues we've encountered and how to avoid them. **READ THIS BEFORE WRITING ANY CODE.**

## Anchor Framework Issues

### ⚠️ CRITICAL: Access Violation in Anchor Validation Phase

**Problem:** Anchor's `#[derive(Accounts)]` validation causes access violations (stack overflow) when:
- Instruction has 10+ accounts
- Complex PDA derivations
- Even minimal structs can fail (we've seen failures with just 4 accounts)

**Error Symptoms:**
- Access violation at addresses like `0x200005xxx`
- No function logs appear (error happens before `msg!()` calls)
- Low compute unit usage (~7000-8000) indicating early failure

**Solution:**
✅ **ALWAYS use raw instruction pattern for instructions with 10+ accounts:**

```rust
#[derive(Accounts)]
pub struct ExecuteShieldRaw<'info> {
    /// CHECK: Phantom account - all real accounts in remaining_accounts
    pub _phantom: UncheckedAccount<'info>,
}

pub fn execute_shield_v2(ctx: Context<ExecuteShieldRaw>, operation_id: [u8; 32]) -> Result<()> {
    // Extract all accounts manually from ctx.remaining_accounts
    // Manual validation and extraction
    // Call core function with manually constructed context
}
```

**Files Using This Pattern:**
- `execute_shield_v2` - Uses custom entrypoint to intercept and route to raw handler
- `execute_unshield` - Uses raw instruction pattern
- `execute_transfer` - Uses raw instruction pattern
- `execute_transfer_from` - Uses raw instruction pattern
- `approve_allowance` - Uses raw instruction pattern
- `execute_batch_transfer` - Uses raw instruction pattern
- `execute_batch_transfer_from` - Uses raw instruction pattern
- `prepare_shield` - Uses raw instruction pattern
- `initialize_pool` - Uses raw instruction pattern

**Note:** The pool program uses a custom entrypoint (`solana_program::entrypoint!`) that intercepts `execute_shield_v2` and routes it to a raw handler, while other instructions use Anchor's standard dispatch.

**References:**
- See `.cursor/rules/anchor-raw-instruction-workaround.mdc` for detailed implementation
- See `docs/development/anchor-access-violation-workaround.md` for full documentation

---

### ⚠️ CRITICAL: Stack Overflow in Functions

**Problem:** Solana has a 4KB stack limit. Functions with many parameters or large local variables exceed this limit.

**Error Symptoms:**
- Access violation at addresses like `0x200009xxx`
- Error occurs inside function (not during validation)
- Function has 20+ parameters or large structs

**Solutions:**

1. **Convert unused parameters to `AccountInfo`:**
```rust
// BAD: All parameters as typed wrappers
fn execute_shield_impl(
    pool_state: &AccountLoader<'info, PoolState>,
    nullifier_set: &Account<'info, NullifierSet>,
    // ... 20 more typed wrappers
) -> Result<()>

// GOOD: Unused parameters as AccountInfo
fn execute_shield_impl(
    pool_state: &AccountLoader<'info, PoolState>,
    _nullifier_set_info: &'info AccountInfo<'info>, // Unused, so use AccountInfo
    // ... only used parameters as typed wrappers
) -> Result<()>
```

2. **Use `#[inline(never)]` on large functions:**
```rust
#[inline(never)]
fn large_function() -> Result<()> {
    // Prevents inlining which can increase stack usage
}
```

3. **Extract PDA derivation to separate function:**
```rust
// BAD: Multiple find_program_address calls in main function
let (pool_state, _) = Pubkey::find_program_address(&[b"pool", ...], program_id);
let (tree, _) = Pubkey::find_program_address(&[b"tree", ...], program_id);
// ... many more

// GOOD: Centralized derivation
let pool_addresses = Box::new(PoolAddresses::derive_all(&origin_mint, program_id));
```

4. **Use `Box` for large structs:**
```rust
let pool_addresses = Box::new(PoolAddresses::derive_all(&origin_mint, program_id));
```

**Files Using These Patterns:**
- `execute_shield_impl` - Uses AccountInfo for unused parameters
- `execute_unshield_impl` - Still has stack overflow (see solution below)
- All `_core_from_raw` functions - Use centralized PDA derivation

**CRITICAL SOLUTION FOR execute_unshield Stack Overflow:**

Despite extensive optimization (converting 5+ parameters to AccountInfo, using `#[inline(never)]`, extracting helpers), `execute_unshield_impl` still exceeds the 4KB stack limit with 22 parameters.

**REQUIRED SOLUTION: Split into Multiple Instructions**

You MUST split `execute_unshield` into multiple smaller instructions. This is not optional - it's the only way to solve the stack overflow.

**Implementation Steps (MANDATORY):**

1. **Create `prepare_unshield` instruction:**
```rust
#[derive(Accounts)]
pub struct PrepareUnshield<'info> {
    pub payer: Signer<'info>,
    #[account(mut)]
    pub proof_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn prepare_unshield(
    ctx: Context<PrepareUnshield>,
    args: UnshieldArgs,
) -> Result<[u8; 32]> {
    // Generate operation_id
    let operation_id = hash_operation(&args);
    
    // Store operation in UserProofVault
    let vault = &mut ctx.accounts.proof_vault;
    // ... store operation with status Pending
    
    Ok(operation_id)
}
```

2. **Create `execute_unshield_verify` instruction:**
```rust
#[derive(Accounts)]
pub struct ExecuteUnshieldVerify<'info> {
    #[account(mut)]
    pub proof_vault: UncheckedAccount<'info>,
    pub verifying_key: UncheckedAccount<'info>,
    pub verifier_program: Program<'info, PtfVerifierGroth16>,
}

pub fn execute_unshield_verify(
    ctx: Context<ExecuteUnshieldVerify>,
    operation_id: [u8; 32],
) -> Result<()> {
    // Load operation from vault
    let vault = load_vault(&ctx.accounts.proof_vault)?;
    let operation = find_operation(&vault, &operation_id)?;
    
    // Verify proof via CPI
    verify_proof_cpi(&ctx, &operation)?;
    
    // Update operation status to Verified
    update_operation_status(&mut ctx.accounts.proof_vault, &operation_id, Verified)?;
    
    Ok(())
}
```

3. **Create `execute_unshield_update` instruction:**
```rust
#[derive(Accounts)]
pub struct ExecuteUnshieldUpdate<'info> {
    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,
    #[account(mut)]
    pub commitment_tree: AccountLoader<'info, CommitmentTree>,
    #[account(mut)]
    pub nullifier_set: Account<'info, NullifierSet>,
    #[account(mut)]
    pub proof_vault: UncheckedAccount<'info>,
}

pub fn execute_unshield_update(
    ctx: Context<ExecuteUnshieldUpdate>,
    operation_id: [u8; 32],
) -> Result<()> {
    // Load operation
    let operation = load_operation(&ctx.accounts.proof_vault, &operation_id)?;
    require!(operation.status == Verified, PoolError::InvalidOperationStatus);
    
    // Update tree
    update_tree(&mut ctx.accounts.commitment_tree, &operation)?;
    
    // Update nullifier set
    insert_nullifier(&mut ctx.accounts.nullifier_set, &operation.nullifier)?;
    
    // Update operation status to Updated
    update_operation_status(&mut ctx.accounts.proof_vault, &operation_id, Updated)?;
    
    Ok(())
}
```

4. **Create `execute_unshield_withdraw` instruction:**
```rust
#[derive(Accounts)]
pub struct ExecuteUnshieldWithdraw<'info> {
    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,
    #[account(mut)]
    pub vault_state: Account<'info, ptf_vault::VaultState>,
    #[account(mut)]
    pub proof_vault: UncheckedAccount<'info>,
    pub user_token_account: UncheckedAccount<'info>,
    pub vault_program: Program<'info, ptf_vault::program::PtfVault>,
}

pub fn execute_unshield_withdraw(
    ctx: Context<ExecuteUnshieldWithdraw>,
    operation_id: [u8; 32],
) -> Result<()> {
    // Load operation
    let operation = load_operation(&ctx.accounts.proof_vault, &operation_id)?;
    require!(operation.status == Updated, PoolError::InvalidOperationStatus);
    
    // Withdraw from vault via CPI
    withdraw_from_vault_cpi(&ctx, &operation)?;
    
    // Clean up operation
    remove_operation(&mut ctx.accounts.proof_vault, &operation_id)?;
    
    Ok(())
}
```

**SDK Changes Required (MANDATORY):**

The SDK MUST call these instructions sequentially. The exact implementation is as follows:

**File:** `web/app/lib/sdk.ts`

**Function:** `executeUnshield` (or similar name)

**Exact Implementation:**
```typescript
export async function executeUnshield(
    connection: Connection,
    wallet: Wallet,
    args: UnshieldArgs,
): Promise<string> {
    // STEP 1: MANDATORY - Prepare unshield operation
    // This stores the operation in UserProofVault with status Pending
    const prepareTx = await prepareUnshieldTransaction(connection, wallet, args);
    const prepareSig = await wallet.sendTransaction(prepareTx, connection);
    await connection.confirmTransaction(prepareSig, 'confirmed');
    
    // Extract operation_id from transaction logs or return value
    const operationId = extractOperationId(prepareSig);
    
    // STEP 2: MANDATORY - Verify proof
    // This verifies the Groth16 proof via CPI to verifier program
    const verifyTx = await executeUnshieldVerifyTransaction(connection, wallet, operationId);
    const verifySig = await wallet.sendTransaction(verifyTx, connection);
    await connection.confirmTransaction(verifySig, 'confirmed');
    
    // Verify transaction succeeded
    const verifyTxResult = await connection.getTransaction(verifySig, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
    });
    if (verifyTxResult.meta.err) {
        throw new Error(`Unshield verify failed: ${verifyTxResult.meta.err}`);
    }
    
    // STEP 3: MANDATORY - Update tree and ledger
    // This updates the commitment tree and nullifier set
    const updateTx = await executeUnshieldUpdateTransaction(connection, wallet, operationId);
    const updateSig = await wallet.sendTransaction(updateTx, connection);
    await connection.confirmTransaction(updateSig, 'confirmed');
    
    // Verify transaction succeeded
    const updateTxResult = await connection.getTransaction(updateSig, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
    });
    if (updateTxResult.meta.err) {
        throw new Error(`Unshield update failed: ${updateTxResult.meta.err}`);
    }
    
    // STEP 4: MANDATORY - Withdraw tokens
    // This withdraws tokens from vault to user's token account
    const withdrawTx = await executeUnshieldWithdrawTransaction(connection, wallet, operationId);
    const withdrawSig = await wallet.sendTransaction(withdrawTx, connection);
    await connection.confirmTransaction(withdrawSig, 'confirmed');
    
    // Verify transaction succeeded
    const withdrawTxResult = await connection.getTransaction(withdrawSig, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
    });
    if (withdrawTxResult.meta.err) {
        throw new Error(`Unshield withdraw failed: ${withdrawTxResult.meta.err}`);
    }
    
    // Return final transaction signature
    return withdrawSig;
}
```

**Helper Functions Required (MANDATORY):**

You MUST implement these helper functions:

```typescript
// MANDATORY: Build prepare unshield transaction
async function prepareUnshieldTransaction(
    connection: Connection,
    wallet: Wallet,
    args: UnshieldArgs,
): Promise<Transaction> {
    const tx = new Transaction();
    
    // Add instruction
    const instruction = await buildPrepareUnshieldInstruction(connection, wallet, args);
    tx.add(instruction);
    
    // Set recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    
    return tx;
}

// MANDATORY: Build verify transaction
async function executeUnshieldVerifyTransaction(
    connection: Connection,
    wallet: Wallet,
    operationId: [u8; 32],
): Promise<Transaction> {
    const tx = new Transaction();
    
    // Add instruction
    const instruction = await buildExecuteUnshieldVerifyInstruction(connection, wallet, operationId);
    tx.add(instruction);
    
    // Set recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    
    return tx;
}

// MANDATORY: Build update transaction
async function executeUnshieldUpdateTransaction(
    connection: Connection,
    wallet: Wallet,
    operationId: [u8; 32],
): Promise<Transaction> {
    const tx = new Transaction();
    
    // Add instruction
    const instruction = await buildExecuteUnshieldUpdateInstruction(connection, wallet, operationId);
    tx.add(instruction);
    
    // Set recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    
    return tx;
}

// MANDATORY: Build withdraw transaction
async function executeUnshieldWithdrawTransaction(
    connection: Connection,
    wallet: Wallet,
    operationId: [u8; 32],
): Promise<Transaction> {
    const tx = new Transaction();
    
    // Add instruction
    const instruction = await buildExecuteUnshieldWithdrawInstruction(connection, wallet, operationId);
    tx.add(instruction);
    
    // Set recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    
    return tx;
}
```

**Error Handling (MANDATORY):**

You MUST handle errors at each step:

```typescript
// MANDATORY: Handle errors at each step
try {
    // Step 1: Prepare
    const operationId = await prepareUnshield(...);
} catch (error) {
    if (error.code === 0x19) {
        throw new Error("Account data too short during prepare");
    }
    throw error;
}

try {
    // Step 2: Verify
    await executeUnshieldVerify(...);
} catch (error) {
    if (error.code === 0x177d) {
        throw new Error("Proof verification failed");
    }
    throw error;
}

try {
    // Step 3: Update
    await executeUnshieldUpdate(...);
} catch (error) {
    if (error.code === 0x179f) {
        throw new Error("Tree update failed");
    }
    throw error;
}

try {
    // Step 4: Withdraw
    await executeUnshieldWithdraw(...);
} catch (error) {
    if (error.code === 0x19) {
        throw new Error("Withdrawal failed");
    }
    throw error;
}
```

**CRITICAL:** Each step MUST be confirmed before proceeding to the next step. Do not proceed if any step fails.

**Benefits:**
- Each instruction stays well under 4KB stack limit
- Better separation of concerns
- Easier to test individual steps
- More granular error handling
- Can retry individual steps if they fail

**CRITICAL:** This is the ONLY solution that will work. Do not attempt further optimization of the single-instruction approach - it will fail.

---

### ⚠️ CRITICAL: Account Ownership Validation Errors

**Problem:** Anchor's `AccountValidator::validate_ownership` has bugs that cause false failures.

**Error Symptoms:**
- Error code `0x1770` (InvalidAccountOwner)
- Account exists and is owned by correct program (verified via `solana account`)
- Error occurs in `AccountValidator::validate_ownership`

**Solution:**
✅ **ALWAYS bypass `AccountValidator::validate_ownership` and do manual validation:**

```rust
// BAD: Using AccountValidator
AccountValidator::validate_ownership(&account_info, &expected_owner)?;

// GOOD: Manual validation
if *account_info.owner != expected_owner {
    return Err(ProgramError::Custom(InvalidAccountOwner as u32));
}
if account_info.data_len() < 8 {
    return Err(ProgramError::Custom(AccountDataTooShort as u32));
}
```

**Files Using This Pattern:**
- `initialize_pool_core_from_raw` - Manual validation for `mint_mapping` and `factory_state`
- All `_core_from_raw` functions - Manual validation for all accounts

---

### ⚠️ CRITICAL: Never Use `init_if_needed`

**Problem:** Anchor's `init_if_needed` uses Borsh serialization format, but Anchor accounts must use `AnchorSerialize` format. This causes deserialization failures.

**Error Symptoms:**
- Error `0x19` (AccountDataTooShort) when deserializing accounts
- Account created successfully but can't be deserialized
- Discriminator is correct but deserialization fails

**Solution:**
✅ **ALWAYS manually create accounts with `AnchorSerialize` format:**

```rust
// BAD: Using init_if_needed
#[account(init_if_needed, payer = user, space = 8 + UserProofVault::LEN)]
pub proof_vault: Account<'info, UserProofVault>,

// GOOD: Manual account creation
pub fn prepare_shield(ctx: Context<PrepareShield>, ...) -> Result<()> {
    let proof_vault_info = &ctx.accounts.proof_vault;
    
    // Check if account exists
    if proof_vault_info.data_len() == 0 {
        // Create account manually
        let discriminator = UserProofVault::discriminator();
        let mut account_data = proof_vault_info.try_borrow_mut_data()?;
        account_data[0..8].copy_from_slice(&discriminator);
        // Serialize with AnchorSerialize
        let mut vault = UserProofVault {
            prepared_operations: Vec::new(),
            // ... other fields
        };
        vault.serialize(&mut &mut account_data[8..])?;
    } else {
        // Reinitialize existing account if needed
        // ... reinitialization logic
    }
}
```

**Files Using This Pattern:**
- `prepare_shield` - Manual account creation
- `prepare_shield_core_from_raw` - Manual account creation
- All account creation code - Never uses `init_if_needed`

---

## Account Initialization Issues

### ⚠️ CRITICAL: Always Set Account Discriminator

**Problem:** Accounts created manually must have discriminator set, or Anchor can't deserialize them.

**Error Symptoms:**
- Error `0x0` (generic Anchor error) when deserializing
- Account created successfully but deserialization fails
- No specific error message

**Solution:**
✅ **ALWAYS set discriminator when creating accounts:**

```rust
let discriminator = AccountName::discriminator();
let mut account_data = account_info.try_borrow_mut_data()?;
account_data[0..8].copy_from_slice(&discriminator);
```

**Files Using This Pattern:**
- `prepare_shield_core_from_raw` - Sets discriminator when creating `UserProofVault`
- All account creation code - Always sets discriminator

---

### ⚠️ CRITICAL: Account Serialization Format

**Problem:** Accounts must use `AnchorSerialize` format, not Borsh format.

**Error Symptoms:**
- Error `0x19` (AccountDataTooShort) when deserializing
- Account data length is correct but deserialization fails
- Borsh deserialization works but Anchor deserialization fails

**Solution:**
✅ **ALWAYS use `AnchorSerialize::serialize` for account data:**

```rust
// BAD: Using Borsh
use borsh::BorshSerialize;
account.serialize(&mut &mut account_data[8..])?;

// GOOD: Using AnchorSerialize
use anchor_lang::AnchorSerialize;
account.serialize(&mut &mut account_data[8..])?;
```

**Files Using This Pattern:**
- `prepare_shield` - Uses `AnchorSerialize::serialize`
- `prepare_shield_core_from_raw` - Uses `AnchorSerialize::serialize`
- All account serialization code - Always uses `AnchorSerialize`

---

## Verifier Program Errors

### ⚠️ CRITICAL: Verifier Error Code Mismatch

**Problem:** Verifier program throws error 6013 ("AlreadyRevoked") when calling `verify_groth16`, even though the verifying key is not revoked. This is likely an Anchor bug in error code reporting for CPI calls.

**Error Symptoms:**
- Error code `0x177d` (6013 decimal) = "AlreadyRevoked"
- Error occurs during CPI call to `ptf_verifier_groth16::verify_groth16`
- Verifying key account shows `revoked = 0` (not revoked)
- Error only thrown in `revoke_verifying_key`, not `verify_groth16`

**Solution:**
✅ **ALWAYS catch all verifier errors (6000-6099) and convert to VerifierMismatch:**

```rust
// Check revocation before CPI
let verifying_key_data = verifying_key_info.try_borrow_data()?;
let revoked = if verifying_key_data.len() >= 8 + 32 + 32 + 32 + 32 + 1 {
    verifying_key_data[8 + 32 + 32 + 32 + 32 + 1] == 1
} else {
    return Err(anchor_lang::error::Error::from(crate::PoolError::AccountDataTooShort));
};
drop(verifying_key_data);

if revoked {
    return Err(anchor_lang::error::Error::from(crate::PoolError::VerifierMismatch));
}

// Use raw invoke to catch raw error codes
let verify_result = invoke(&instruction, &account_infos);
match verify_result {
    Ok(_) => {
        // Success
    }
    Err(program_err) => {
        // Extract error code
        let mut error_code_opt: Option<u32> = None;
        if let solana_program::program_error::ProgramError::Custom(custom_code) = program_err {
            error_code_opt = Some(custom_code);
        }
        
        // Catch ALL verifier errors (6000-6099)
        if let Some(code) = error_code_opt {
            if code >= 6000 && code < 6100 {
                return Err(anchor_lang::error::Error::from(crate::PoolError::VerifierMismatch));
            }
        }
        
        // If we couldn't extract a code, treat as verifier error
        return Err(anchor_lang::error::Error::from(crate::PoolError::VerifierMismatch));
    }
}
```

**Files Using This Pattern:**
- `execute_private_transfer` - Catches all verifier errors (6000-6099)
- All CPI calls to verifier - MUST use this pattern (no exceptions)

---

## Program ID Mismatches

### ⚠️ CRITICAL: Program IDs Must Match Everywhere

**Problem:** Program IDs must match across all files, or PDA derivations fail.

**Error Symptoms:**
- `OriginMintMismatch` errors
- PDA derivations produce different addresses than expected
- SDK and program derive different addresses for same inputs

**Solution:**
✅ **ALWAYS verify program IDs match in all files:**

1. `Anchor.toml` - `[programs.localnet]` section
2. `web/app/lib/onchain/programIds.ts` - All `*_PROGRAM_ID` constants
3. `programs/*/src/lib.rs` - `declare_id!` macros
4. `scripts/start-private-devnet-with-upgrade.sh` - Program deployment
5. `web/app/scripts/bootstrap-private-devnet.ts` - `PROGRAM_IDS` constant

**Use this command to verify:**
```bash
grep -r "declare_id!" programs/
grep -r "PROGRAM_ID" web/app/lib/onchain/programIds.ts
grep -r "programs.localnet" Anchor.toml
```

**Files That Must Match:**
- All files listed above must have identical program IDs

---

## Deployment Issues

### ⚠️ CRITICAL: Always Deploy with Upgrade Authority

**Problem:** Programs deployed with system program authority (`11111111111111111111111111111111`) are immutable and cannot be upgraded.

**Error Symptoms:**
- Cannot upgrade programs after deployment
- Error: "Program's authority Some(11111111111111111111111111111111) does not match authority provided"
- Cannot deploy fixes or improvements

**Solution:**
✅ **ALWAYS deploy programs with upgrade authority:**

```bash
# Generate upgrade authority keypair
solana-keygen new -o tmp/upgrade-authority.json

# Deploy with upgrade authority
solana program deploy target/deploy/ptf_pool.so \
  --url http://127.0.0.1:8899 \
  --program-id target/deploy/ptf_pool-keypair.json \
  --upgrade-authority tmp/upgrade-authority.json
```

**Files Using This Pattern:**
- `scripts/start-private-devnet-with-upgrade.sh` - Deploys all programs with upgrade authority
- All deployment scripts - Must use upgrade authority

---

## Lifetime and Type Issues

### ⚠️ CRITICAL: AccountInfo Lifetime Issues

**Problem:** Borrow checker errors when working with `AccountInfo` from `remaining_accounts`.

**Error Symptoms:**
- Borrow checker errors about lifetimes
- Cannot create `Account` from `AccountInfo` with wrong lifetimes
- Multiple mutable borrows of same account

**Solution:**
✅ **ALWAYS use `unsafe { mem::transmute }` to extend lifetimes to `'static`:**

```rust
let account_static: &'static AccountInfo<'static> = unsafe { mem::transmute(account) };
```

**Files Using This Pattern:**
- All `_core_from_raw` functions - Use `mem::transmute` for lifetime extension

---

## Testing Issues

### ⚠️ CRITICAL: Test Failures Due to Stale State

**Problem:** Tests fail because on-chain state doesn't match expected state.

**Error Symptoms:**
- Tests fail with account not found errors
- Accounts created with wrong parameters
- Program state from previous test runs

**Solution:**
✅ **ALWAYS use fresh keypairs for each test:**

```typescript
// Generate fresh keypair for each test
const userKeypair = Keypair.generate();
```

✅ **ALWAYS initialize accounts before use:**

```typescript
// Initialize pool before testing
await initializePool(connection, factoryProgram, mint);
```

✅ **ALWAYS clean up test state between runs:**

```bash
# Reset validator and clear ledger
./scripts/reset-dev-env.sh
```

**Files Using This Pattern:**
- All test scripts - Use fresh keypairs
- Bootstrap script - Initializes all accounts

---

## Security Requirements

### ⚠️ CRITICAL: Enhanced Input Validation

**REQUIRED:** All inputs MUST be validated before processing. This is not optional.

**MANDATORY Validation Steps:**

1. **Validate Amounts:**
```rust
// ALWAYS validate amount before processing
InputValidator::validate_amount(amount, MAX_SHIELD_AMOUNT)?;

// Check minimum amount (prevent dust attacks)
require!(amount >= MIN_AMOUNT, PoolError::AmountTooSmall);

// Check maximum amount (prevent overflow)
require!(amount <= MAX_AMOUNT, PoolError::AmountTooLarge);
```

2. **Validate Proofs:**
```rust
// ALWAYS sanitize proof before processing
InputSanitizer::sanitize_proof(&proof, MAX_PROOF_SIZE)?;

// Check proof length
require!(proof.len() <= MAX_PROOF_SIZE, PoolError::ProofTooLarge);
require!(proof.len() >= MIN_PROOF_SIZE, PoolError::ProofTooSmall);
```

3. **Validate Public Inputs:**
```rust
// ALWAYS sanitize public inputs
InputSanitizer::sanitize_public_inputs(&public_inputs, MAX_PUBLIC_INPUTS_SIZE)?;

// Check public inputs length
require!(public_inputs.len() <= MAX_PUBLIC_INPUTS_SIZE, PoolError::PublicInputsTooLarge);
```

4. **Validate Account Relationships:**
```rust
// ALWAYS validate account relationships before processing
// Example: Verify mint_mapping is owned by factory
require_keys_eq!(
    *mint_mapping_info.owner,
    ptf_factory::ID,
    PoolError::InvalidAccountOwner,
);

// Verify PDA derivation matches
let (expected_pda, _) = Pubkey::find_program_address(
    &[seeds::MINT_MAPPING, origin_mint.as_ref()],
    &ptf_factory::ID,
);
require_keys_eq!(
    mint_mapping_info.key(),
    &expected_pda,
    PoolError::OriginMintMismatch,
);
```

**Files That MUST Use This Pattern:**
- ALL instruction handlers - No exceptions
- ALL account validation functions
- ALL input processing functions

---

### ⚠️ CRITICAL: Rate Limiting (REQUIRED)

**REQUIRED:** Implement rate limiting to prevent spam attacks. This is mandatory for production.

**Implementation (MANDATORY):**

```rust
// Add to PoolState account
pub struct PoolState {
    // ... existing fields
    pub last_operation_slot: u64,  // Track last operation slot per user
    pub operation_count: u64,      // Track operation count
}

// Rate limiting constants (MUST be defined)
const MIN_SLOTS_BETWEEN_SHIELD: u64 = 10;      // Minimum slots between shield operations
const MIN_SLOTS_BETWEEN_UNSHIELD: u64 = 10;    // Minimum slots between unshield operations
const MIN_SLOTS_BETWEEN_TRANSFER: u64 = 5;      // Minimum slots between transfer operations
const MAX_OPERATIONS_PER_SLOT: u64 = 100;       // Maximum operations per slot globally

// Rate limiting check (MUST be called in every instruction)
fn check_rate_limit(
    pool_state: &PoolState,
    operation_type: OperationType,
    current_slot: u64,
) -> Result<()> {
    let min_slots = match operation_type {
        OperationType::Shield => MIN_SLOTS_BETWEEN_SHIELD,
        OperationType::Unshield => MIN_SLOTS_BETWEEN_UNSHIELD,
        OperationType::Transfer => MIN_SLOTS_BETWEEN_TRANSFER,
    };
    
    // Check per-user rate limit
    require!(
        current_slot >= pool_state.last_operation_slot + min_slots,
        PoolError::RateLimitExceeded,
    );
    
    // Check global rate limit (if tracking)
    // This requires additional state tracking
    
    Ok(())
}
```

**Usage (MANDATORY in all instructions):**
```rust
pub fn execute_shield(...) -> Result<()> {
    // ... account validation
    
    // MANDATORY: Check rate limit
    let clock = Clock::get()?;
    check_rate_limit(&pool_state, OperationType::Shield, clock.slot)?;
    
    // ... rest of instruction
}
```

**Files That MUST Implement This:**
- `execute_shield_v2` - MUST check rate limit
- `execute_unshield` - MUST check rate limit
- `execute_transfer` - MUST check rate limit
- `execute_transfer_from` - MUST check rate limit
- ALL operation instructions - No exceptions

---

### ⚠️ CRITICAL: Reentrancy Protection (REQUIRED)

**REQUIRED:** Implement reentrancy protection for multi-step operations. This prevents attacks where operations are called recursively.

**Implementation (MANDATORY):**

```rust
// Operation status enum (MUST be defined)
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OperationStatus {
    Pending,      // Operation prepared, not started
    InProgress,   // Operation in progress (prevents reentrancy)
    Verified,     // Proof verified
    Updated,      // Tree updated
    Completed,    // Operation complete
    Failed,       // Operation failed
}

// Reentrancy check (MUST be called before processing)
fn check_not_in_progress(
    vault: &UserProofVault,
    operation_id: &[u8; 32],
) -> Result<()> {
    for op in &vault.prepared_operations {
        if op.id() == *operation_id {
            require!(
                op.status() != OperationStatus::InProgress,
                PoolError::OperationInProgress,
            );
        }
    }
    Ok(())
}

// Set operation status (MUST be called when starting operation)
fn set_operation_status(
    vault: &mut UserProofVault,
    operation_id: &[u8; 32],
    status: OperationStatus,
) -> Result<()> {
    for op in &mut vault.prepared_operations {
        if op.id() == *operation_id {
            op.set_status(status);
            return Ok(());
        }
    }
    Err(PoolError::OperationNotFound.into())
}
```

**Usage (MANDATORY in all multi-step operations):**
```rust
pub fn execute_shield_v2(...) -> Result<()> {
    // ... account validation
    
    // MANDATORY: Check reentrancy
    let vault = load_vault(&proof_vault)?;
    check_not_in_progress(&vault, &operation_id)?;
    
    // MANDATORY: Set status to InProgress
    set_operation_status(&mut proof_vault, &operation_id, OperationStatus::InProgress)?;
    
    // ... process operation
    
    // MANDATORY: Set status to Completed or Failed
    set_operation_status(&mut proof_vault, &operation_id, OperationStatus::Completed)?;
    
    Ok(())
}
```

**Files That MUST Implement This (MANDATORY - No Exceptions):**

**Exact File Locations:**
- `programs/pool/src/lib.rs` - `execute_shield_v2` function (around line ~13000) - MUST check reentrancy
- `programs/pool/src/lib.rs` - `prepare_unshield` function (MUST be created) - MUST check reentrancy before setting status to InProgress
- `programs/pool/src/lib.rs` - `execute_unshield_verify` function (MUST be created) - MUST check reentrancy (verify status is Pending, set to InProgress)
- `programs/pool/src/lib.rs` - `execute_unshield_update` function (MUST be created) - MUST check reentrancy (verify status is Verified, set to InProgress)
- `programs/pool/src/lib.rs` - `execute_unshield_withdraw` function (MUST be created) - MUST check reentrancy (verify status is Updated, set to InProgress)
- `programs/pool/src/lib.rs` - `execute_transfer` function (around line ~3400) - MUST check reentrancy
- `programs/pool/src/lib.rs` - `execute_transfer_from` function (around line ~3800) - MUST check reentrancy
- `programs/pool/src/lib.rs` - ALL multi-step operations - No exceptions

**MANDATORY Implementation Checklist:**

For each instruction handler, you MUST:

1. [ ] Load vault account at start of function
2. [ ] Check operation status is not `InProgress` before processing
3. [ ] Set operation status to `InProgress` when starting processing
4. [ ] Set operation status to next state when step completes
5. [ ] Set operation status to `Completed` when all steps done
6. [ ] Set operation status to `Failed` if any step fails
7. [ ] Remove operation from vault when fully complete

**CRITICAL:** If any checkbox is not implemented, the instruction is incomplete and will fail in production.

---

## Summary: Rules to Follow

**MANDATORY Rules (No Exceptions):**

1. ✅ **Never use `#[derive(Accounts)]` for instructions with 10+ accounts** - Use raw instruction pattern
2. ✅ **Always use `AccountInfo` instead of `Account` types when possible** - Reduces stack usage
3. ✅ **Never use `init_if_needed`** - Always manually create accounts with `AnchorSerialize` format
4. ✅ **Always set account discriminator** - Required for Anchor deserialization
5. ✅ **Always use `AnchorSerialize` for account data** - Not Borsh
6. ✅ **Always deploy programs with upgrade authority** - Never deploy with system program authority
7. ✅ **Always use centralized PDA derivation** - Use `ptf_common::addresses::PoolAddresses::derive_all()` instead of individual derivations
8. ✅ **Always validate accounts manually** - Don't rely on Anchor's validation (it has bugs)
9. ✅ **Always catch all verifier errors (6000-6099)** - Convert to VerifierMismatch
10. ✅ **Always verify program IDs match everywhere** - Use `grep` to check all files
11. ✅ **Always validate all inputs** - Amounts, proofs, public inputs, account relationships
12. ✅ **Always implement rate limiting** - Prevent spam attacks
13. ✅ **Always implement reentrancy protection** - Prevent recursive operation calls
14. ✅ **Split `execute_unshield` into multiple instructions** - Only solution for stack overflow

**Next:** Read [Implementation Patterns](03-implementation-patterns.md) for correct code patterns with detailed examples

