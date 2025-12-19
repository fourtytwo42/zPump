# Implementation Patterns

This document provides proven code patterns that work correctly. **Use these patterns for all new code.**

## Raw Instruction Pattern

**MANDATORY: Use for ALL instructions with 10+ accounts or complex PDA derivations**

**CRITICAL:** If an instruction has 10 or more accounts, you MUST use this pattern. There is no exception. Do not attempt to use standard Anchor pattern - it will fail with stack overflow.

**Pattern:**
```rust
// 1. Define minimal struct
#[derive(Accounts)]
pub struct ExecuteShieldRaw<'info> {
    /// CHECK: Phantom account - all real accounts in remaining_accounts
    pub _phantom: UncheckedAccount<'info>,
}

// 2. Extract accounts manually from remaining_accounts
pub fn execute_shield_v2(ctx: Context<ExecuteShieldRaw>, operation_id: [u8; 32]) -> Result<()> {
    let remaining_accounts = ctx.remaining_accounts;
    
    // Use two-pass pattern to identify accounts
    // First pass: Identify by owner
    let mut pool_state_info: Option<&AccountInfo> = None;
    let mut verifying_key_info: Option<&AccountInfo> = None;
    
    for account in remaining_accounts.iter() {
        if *account.owner == *ctx.program_id {
            // Account owned by pool program - MUST be one of:
            // - pool_state (PDA: ["pool", origin_mint])
            // - nullifier_set (PDA: ["nullifier-set", origin_mint])
            // - commitment_tree (PDA: ["commitment-tree", origin_mint])
            // - note_ledger (PDA: ["note-ledger", origin_mint])
            // - hook_config (PDA: ["hook-config", origin_mint])
            // - hook_whitelist (PDA: ["hook-whitelist", origin_mint])
            // - shield_claim (PDA: ["claim", pool_state])
            // Will be identified in second pass by matching derived addresses
        } else if *account.owner == ptf_verifier_groth16::ID {
            // Account owned by verifier program - must be verifying_key
            verifying_key_info = Some(account);
        } else if *account.owner == ptf_factory::ID {
            // Account owned by factory program - MUST be one of:
            // - mint_mapping (PDA: ["mint-mapping", origin_mint])
            // - factory_state (PDA: ["factory"])
            // Will be identified in second pass by matching derived addresses
        } else if *account.owner == ptf_vault::ID {
            // Account owned by vault program - could be:
            // - vault_state (PDA: ["vault", origin_mint])
            // Will be identified in second pass by matching derived addresses
        }
    }
    
    // Second pass: Match by derived addresses (MANDATORY)
    // MANDATORY: Use Box to reduce stack usage
    let pool_addresses = Box::new(ptf_common::addresses::PoolAddresses::derive_all(&origin_mint, ctx.program_id));
    
    // MANDATORY: Match each account by comparing keys to derived addresses
    for account in remaining_accounts.iter() {
        if account.key() == pool_addresses.pool_state {
            pool_state_info = Some(account);
        } else if account.key() == pool_addresses.commitment_tree {
            // commitment_tree_info = Some(account); // If needed
        } else if account.key() == pool_addresses.nullifier_set {
            // nullifier_set_info = Some(account); // If needed
        } else if account.key() == pool_addresses.note_ledger {
            // note_ledger_info = Some(account); // If needed
        } else if account.key() == pool_addresses.hook_config {
            // hook_config_info = Some(account); // If needed
        } else if account.key() == pool_addresses.hook_whitelist {
            // hook_whitelist_info = Some(account); // If needed
        }
    }
    
    // MANDATORY: Verify all required accounts were found
    // If any required account is missing, return error immediately
    
    // 3. MANDATORY: Manual validation (do not skip any checks)
    // MANDATORY: Check account exists
    let pool_state_info = pool_state_info.ok_or_else(|| {
        msg!("ERROR: pool_state account not found in remaining_accounts");
        anchor_lang::error::Error::from(PoolError::AccountNotFound)
    })?;
    
    // MANDATORY: Validate account owner
    if *pool_state_info.owner != *ctx.program_id {
        msg!("ERROR: pool_state owner mismatch: expected {:?}, got {:?}", ctx.program_id, pool_state_info.owner);
        return Err(anchor_lang::error::Error::from(PoolError::InvalidAccountOwner));
    }
    
    // MANDATORY: Validate account data length (must have at least discriminator)
    if pool_state_info.data_len() < 8 {
        msg!("ERROR: pool_state data too short: {} bytes (need at least 8)", pool_state_info.data_len());
        return Err(anchor_lang::error::Error::from(PoolError::AccountDataTooShort));
    }
    
    // MANDATORY: Validate account is writable (if needed)
    if !pool_state_info.is_writable {
        msg!("ERROR: pool_state account is not writable");
        return Err(anchor_lang::error::Error::from(PoolError::InvalidAccountOwner));
    }
    
    // MANDATORY: Validate account is not executable
    if pool_state_info.executable {
        msg!("ERROR: pool_state account is executable (should be data account)");
        return Err(anchor_lang::error::Error::from(PoolError::InvalidAccountOwner));
    }
    
    // 4. MANDATORY: Create typed wrappers with lifetime extension
    // MANDATORY: Use unsafe transmute to extend lifetime to 'static
    // This is required because remaining_accounts has shorter lifetime than 'info
    // CRITICAL: Only do this after all validation is complete
    let pool_state_static: &'static AccountInfo<'static> = unsafe { mem::transmute(pool_state_info) };
    
    // MANDATORY: Create AccountLoader from AccountInfo
    // This allows us to use typed wrapper for deserialization
    let pool_state_loader: AccountLoader<'static, PoolState> = unsafe {
        mem::transmute(AccountLoader::try_from(pool_state_static).map_err(|e| {
            msg!("ERROR: Failed to create AccountLoader from pool_state: {:?}", e);
            anchor_lang::error::Error::from(PoolError::AccountDataTooShort)
        })?)
    };
    
    // MANDATORY: Verify AccountLoader can load the account
    // This ensures the account data is valid and deserializable
    let _pool_state = pool_state_loader.load().map_err(|e| {
        msg!("ERROR: Failed to load PoolState from AccountLoader: {:?}", e);
        anchor_lang::error::Error::from(PoolError::AccountDataTooShort)
    })?;
    
    // 5. Call core function
    execute_shield_core(pool_state_loader, ...)?;
    
    Ok(())
}
```

**Files Using This Pattern:**
- `execute_shield_v2` - Intercepted by custom entrypoint, routed to `execute_shield_v2_raw_handler`
- `execute_unshield` - Uses raw instruction pattern via `execute_unshield_core_from_raw`
- `execute_transfer` - Uses raw instruction pattern via `execute_transfer_core_from_raw`
- `execute_transfer_from` - Uses raw instruction pattern via `execute_transfer_from_core_from_raw`
- `approve_allowance` - Uses raw instruction pattern via `approve_allowance_core_from_raw`
- `prepare_shield` - Uses raw instruction pattern via `prepare_shield_core_from_raw`

**Note:** The pool program uses a hybrid approach:
- Custom entrypoint (`process_instruction`) intercepts `execute_shield_v2` and routes to raw handler
- Other instructions use Anchor's standard dispatch but call `_core_from_raw` functions internally
- All `_core_from_raw` functions extract accounts manually from `remaining_accounts`

---

## Centralized PDA Derivation

**MANDATORY: Use for ALL functions that need multiple PDAs**

**CRITICAL:** If a function needs 2 or more PDAs, you MUST use centralized derivation. Individual derivations cause stack overflow.

**Pattern:**
```rust
// BAD: Individual derivations (causes stack overflow)
let (pool_state, _) = Pubkey::find_program_address(
    &[b"pool", origin_mint.as_ref()],
    program_id,
);
let (tree, _) = Pubkey::find_program_address(
    &[b"tree", origin_mint.as_ref()],
    program_id,
);
// ... many more

// GOOD: Centralized derivation
let pool_addresses = Box::new(ptf_common::addresses::PoolAddresses::derive_all(&origin_mint, program_id));

// Access derived addresses
let pool_state = pool_addresses.pool_state;
let tree = pool_addresses.commitment_tree;
let nullifier_set = pool_addresses.nullifier_set;
// ... etc
```

**Files Using This Pattern:**
- `execute_shield_v2_core_from_raw` - Uses `ptf_common::addresses::PoolAddresses::derive_all`
- `execute_unshield_core_from_raw` - Uses `ptf_common::addresses::PoolAddresses::derive_all`
- `initialize_pool_core_from_raw` - Uses `ptf_common::addresses::PoolAddresses::derive_all`

**Location:** `programs/common/src/addresses.rs` - `PoolAddresses::derive_all()` function

---

## Manual Account Validation

**MANDATORY: Use for ALL account validation**

**CRITICAL:** You MUST validate all accounts manually. Do not rely on Anchor's validation - it has bugs that cause false failures.

**Pattern:**
```rust
// BAD: Using AccountValidator (has bugs)
AccountValidator::validate_ownership(&account_info, &expected_owner)?;

// GOOD: Manual validation
fn validate_account(
    account_info: &AccountInfo,
    expected_owner: &Pubkey,
    min_data_len: usize,
) -> Result<()> {
    if *account_info.owner != *expected_owner {
        return Err(anchor_lang::error::Error::from(PoolError::InvalidAccountOwner));
    }
    if account_info.data_len() < min_data_len {
        return Err(anchor_lang::error::Error::from(PoolError::AccountDataTooShort));
    }
    Ok(())
}

// Usage
validate_account(&pool_state_info, &ctx.program_id, 8)?;
```

**Files Using This Pattern:**
- `initialize_pool_core_from_raw` - Manual validation for all accounts
- All `_core_from_raw` functions - Manual validation

---

## Manual Account Creation

**MANDATORY: Use for ALL account creation**

**CRITICAL:** You MUST manually create all accounts. Never use `init_if_needed` - it uses wrong serialization format and will cause deserialization failures.

**Pattern:**
```rust
pub fn prepare_shield(ctx: Context<PrepareShield>, ...) -> Result<()> {
    let proof_vault_info = &ctx.accounts.proof_vault;
    
    // Check if account exists
    if proof_vault_info.data_len() == 0 {
        // Create account manually
        let space = 8 + UserProofVault::LEN;
        let lamports = Rent::get()?.minimum_balance(space);
        
        // Create account
        invoke_signed(
            &system_instruction::create_account(
                ctx.accounts.payer.key,
                proof_vault_info.key,
                lamports,
                space as u64,
                ctx.accounts.proof_vault_program.key,
            ),
            &[
                ctx.accounts.payer.to_account_info(),
                proof_vault_info.clone(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[
                b"proof-vault",
                ctx.accounts.payer.key.as_ref(),
                &[bump],
            ]],
        )?;
        
        // Set discriminator
        let discriminator = UserProofVault::discriminator();
        let mut account_data = proof_vault_info.try_borrow_mut_data()?;
        account_data[0..8].copy_from_slice(&discriminator);
        
        // Serialize with AnchorSerialize
        let vault = UserProofVault {
            prepared_operations: Vec::new(),
            // ... other fields
        };
        vault.serialize(&mut &mut account_data[8..])?;
    } else {
        // Reinitialize existing account if needed
        // ... reinitialization logic
    }
    
    Ok(())
}
```

**Files Using This Pattern:**
- `prepare_shield` - Manual account creation
- `prepare_shield_core_from_raw` - Manual account creation

---

## Stack Optimization Pattern

**MANDATORY: Use for ALL functions with 15+ parameters or large local variables**

**CRITICAL:** If a function has 15 or more parameters, you MUST optimize stack usage. Functions with 20+ parameters will exceed 4KB stack limit.

**Pattern:**
```rust
// BAD: All parameters as typed wrappers (causes stack overflow)
fn execute_shield_impl(
    pool_state: &AccountLoader<'info, PoolState>,
    nullifier_set: &Account<'info, NullifierSet>,
    commitment_tree: &AccountLoader<'info, CommitmentTree>,
    // ... 20 more typed wrappers
) -> Result<()>

// GOOD: Unused parameters as AccountInfo
fn execute_shield_impl(
    pool_state: &AccountLoader<'info, PoolState>,
    _nullifier_set_info: &'info AccountInfo<'info>, // Unused, so use AccountInfo
    commitment_tree: &AccountLoader<'info, CommitmentTree>,
    // ... only used parameters as typed wrappers
) -> Result<()> {
    // Function body
}
```

**Additional Optimizations:**

1. **Use `#[inline(never)]` on large functions:**
```rust
#[inline(never)]
fn large_function() -> Result<()> {
    // Prevents inlining which can increase stack usage
}
```

2. **Extract logic to helper functions:**
```rust
// BAD: All logic in one function
fn execute_unshield_impl(...) -> Result<()> {
    // 500 lines of code
}

// GOOD: Split into helpers
fn execute_unshield_impl(...) -> Result<()> {
    let proof_data = extract_proof_data(...)?;
    verify_proof(...)?;
    update_tree(...)?;
    Ok(())
}

#[inline(never)]
fn extract_proof_data(...) -> Result<ProofData> {
    // Extraction logic
}

#[inline(never)]
fn verify_proof(...) -> Result<()> {
    // Verification logic
}
```

**Files Using This Pattern:**
- `execute_shield_impl` - Uses AccountInfo for unused parameters
- `execute_unshield_impl` - Still needs more optimization

---

## CPI Error Handling Pattern

**MANDATORY: Use for ALL CPI calls to verifier program**

**CRITICAL:** You MUST use this pattern for all CPI calls to `ptf_verifier_groth16`. The verifier program has error code reporting bugs that must be handled.

**Pattern:**
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
let mut instruction_data = Vec::new();
let verify_discriminator: [u8; 8] = [228, 26, 135, 7, 19, 253, 172, 97];
instruction_data.extend_from_slice(&verify_discriminator);
// ... serialize args

let mut account_infos = Vec::new();
let mut account_metas = Vec::new();
account_metas.push(AccountMeta::new_readonly(verifying_key_info.key(), false));
account_infos.push(verifying_key_info.to_account_info());

let instruction = Instruction {
    program_id: verifier_program.key(),
    accounts: account_metas,
    data: instruction_data,
};

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
        } else {
            // MANDATORY: Try string parsing for non-custom errors
            let error_str = format!("{:?}", program_err);
            // Parse error string for numeric codes (e.g., "Custom(6013)" or "0x177d")
            if error_str.contains("Custom(") {
                // Extract number from "Custom(6013)"
                if let Some(start) = error_str.find("Custom(") {
                    let end = error_str[start+7..].find(')').unwrap_or(error_str.len());
                    if let Ok(code) = error_str[start+7..start+7+end].parse::<u32>() {
                        error_code_opt = Some(code);
                    }
                }
            } else if error_str.contains("0x") {
                // Extract hex code from "0x177d"
                if let Some(start) = error_str.find("0x") {
                    let hex_str = &error_str[start+2..start+2+4.min(error_str.len()-start-2)];
                    if let Ok(code) = u32::from_str_radix(hex_str, 16) {
                        error_code_opt = Some(code);
                    }
                }
            } else if error_str.contains("KeyRevoked") || error_str.contains("AlreadyRevoked") {
                // Known error strings from verifier
                error_code_opt = Some(6012); // Treat as KeyRevoked
            }
        }
        
        // Catch ALL verifier errors (6000-6099)
        if let Some(code) = error_code_opt {
            if code >= 6000 && code < 6100 {
                return Err(anchor_lang::error::Error::from(crate::PoolError::VerifierMismatch));
            }
        }
        
        // MANDATORY: If we couldn't extract a code, treat as verifier error
        // This handles cases where error is not ProgramError::Custom
        // All verifier errors must be caught and converted to VerifierMismatch
        msg!("ERROR: Verifier CPI call failed with non-custom error: {:?}", program_err);
        return Err(anchor_lang::error::Error::from(crate::PoolError::VerifierMismatch));
    }
}
```

**Files Using This Pattern:**
- `execute_private_transfer` - Lines ~5855-5920

---

## Lifetime Extension Pattern

**MANDATORY: Use when working with `AccountInfo` from `remaining_accounts`**

**CRITICAL:** You MUST use lifetime extension when creating typed wrappers from `remaining_accounts`. The borrow checker will fail without it.

**Pattern:**
```rust
// Extract account from remaining_accounts
let account_info = remaining_accounts.iter()
    .find(|acc| acc.key() == expected_key)
    .ok_or(PoolError::AccountNotFound)?;

// Extend lifetime to 'static
let account_static: &'static AccountInfo<'static> = unsafe { mem::transmute(account_info) };

// Create typed wrapper
let account_loader: AccountLoader<'static, PoolState> = unsafe {
    mem::transmute(AccountLoader::try_from(account_static)?)
};

// Use typed wrapper
let pool_state = account_loader.load()?;
```

**Files Using This Pattern:**
- All `_core_from_raw` functions - Use `mem::transmute` for lifetime extension

---

## Account Reinitialization Pattern

**MANDATORY: Use when reinitializing accounts with wrong format**

**CRITICAL:** If an account exists but has wrong format (Borsh instead of AnchorSerialize), you MUST reinitialize it using this pattern.

**Pattern:**
```rust
// Check if account needs reinitialization
if account_info.data_len() > 0 {
    // Try to deserialize
    match Account::try_from(account_info) {
        Ok(_) => {
            // Account is valid, no reinitialization needed
        }
        Err(_) => {
            // Account has wrong format, reinitialize
            // Preserve data if possible
            let preserved_data = match Account::try_from_unchecked(account_info) {
                Ok(acc) => Some(acc.prepared_operations.clone()),
                Err(_) => None,
            };
            
            // Clear all data
            let mut account_data = account_info.try_borrow_mut_data()?;
            account_data.fill(0);
            
            // Set discriminator
            let discriminator = AccountName::discriminator();
            account_data[0..8].copy_from_slice(&discriminator);
            
            // Serialize with AnchorSerialize
            let mut account = AccountName {
                prepared_operations: preserved_data.unwrap_or_default(),
                // ... other fields
            };
            account.serialize(&mut &mut account_data[8..])?;
        }
    }
}
```

**Files Using This Pattern:**
- `prepare_shield` - Reinitializes accounts with wrong format
- `prepare_shield_core_from_raw` - Reinitializes accounts with wrong format

---

## Summary: Pattern Checklist

When implementing new code, verify:

- [ ] Using raw instruction pattern for 10+ accounts?
- [ ] Using centralized PDA derivation?
- [ ] Using manual account validation?
- [ ] Using manual account creation (not `init_if_needed`)?
- [ ] Using `AccountInfo` for unused parameters?
- [ ] Using `#[inline(never)]` on large functions?
- [ ] Using proper error handling for CPI calls?
- [ ] Using lifetime extension when needed?
- [ ] Setting account discriminator?
- [ ] Using `AnchorSerialize` for account data?

---

## Enhanced Error Handling Pattern

**When to Use:** All error handling in the program

**REQUIRED Pattern:** Use standardized error handling with context for better debugging.

**Implementation:**
```rust
// Standardized error with context (MUST use this pattern)
pub struct PoolErrorWithContext {
    pub error: PoolError,
    pub account: Option<Pubkey>,
    pub validation_step: Option<&'static str>,
}

impl From<PoolErrorWithContext> for ProgramError {
    fn from(err: PoolErrorWithContext) -> Self {
        msg!(
            "Error: {:?} at account {:?} during step: {}",
            err.error,
            err.account.unwrap_or_default(),
            err.validation_step.unwrap_or("unknown")
        );
        ProgramError::Custom(err.error as u32)
    }
}

// Usage in validation functions (MANDATORY)
fn validate_account(
    account_info: &AccountInfo,
    expected_owner: &Pubkey,
    account_name: &'static str,
) -> Result<()> {
    if *account_info.owner != *expected_owner {
        return Err(PoolErrorWithContext {
            error: PoolError::InvalidAccountOwner,
            account: Some(*account_info.key),
            validation_step: Some(account_name),
        }.into());
    }
    if account_info.data_len() < 8 {
        return Err(PoolErrorWithContext {
            error: PoolError::AccountDataTooShort,
            account: Some(*account_info.key),
            validation_step: Some(account_name),
        }.into());
    }
    Ok(())
}

// Usage in instructions (MANDATORY)
pub fn execute_shield(...) -> Result<()> {
    // Validate pool_state account
    validate_account(
        &pool_state_info,
        &ctx.program_id,
        "pool_state_validation",
    )?;
    
    // Validate mint_mapping account
    validate_account(
        &mint_mapping_info,
        &ptf_factory::ID,
        "mint_mapping_validation",
    )?;
    
    // ... rest of instruction
}
```

**Files That MUST Use This Pattern:**
- ALL account validation functions
- ALL instruction handlers
- ALL error returns

---

## Enhanced Account Validation Pattern

**When to Use:** All account validation (REQUIRED)

**REQUIRED Pattern:** Validate all account relationships before processing.

**Implementation:**
```rust
// Account relationship validation (MUST use this pattern)
pub struct AccountRelationship {
    pub parent: Pubkey,
    pub child: Pubkey,
    pub relationship_type: RelationshipType,
}

#[derive(Clone, Copy, Debug)]
pub enum RelationshipType {
    OwnedBy,      // Child is owned by parent
    DerivedFrom,  // Child is PDA derived from parent
    RelatedTo,    // Child is related to parent (custom logic)
}

fn validate_account_relationships(
    accounts: &[AccountInfo],
    relationships: &[AccountRelationship],
) -> Result<()> {
    for rel in relationships {
        let parent_account = accounts.iter()
            .find(|acc| acc.key() == &rel.parent)
            .ok_or_else(|| PoolErrorWithContext {
                error: PoolError::AccountNotFound,
                account: Some(rel.parent),
                validation_step: Some("find_parent_account"),
            })?;
        
        let child_account = accounts.iter()
            .find(|acc| acc.key() == &rel.child)
            .ok_or_else(|| PoolErrorWithContext {
                error: PoolError::AccountNotFound,
                account: Some(rel.child),
                validation_step: Some("find_child_account"),
            })?;
        
        match rel.relationship_type {
            RelationshipType::OwnedBy => {
                require_keys_eq!(
                    *child_account.owner,
                    *parent_account.key,
                    PoolError::InvalidAccountOwner,
                );
            }
            RelationshipType::DerivedFrom => {
                // Validate PDA derivation
                // This requires knowing the seeds, which should be passed in
            }
            RelationshipType::RelatedTo => {
                // Custom validation logic
            }
        }
    }
    Ok(())
}

// Usage in instructions (MANDATORY)
pub fn execute_shield(...) -> Result<()> {
    // Define expected relationships
    let relationships = vec![
        AccountRelationship {
            parent: pool_state.key(),
            child: commitment_tree.key(),
            relationship_type: RelationshipType::DerivedFrom,
        },
        AccountRelationship {
            parent: pool_state.key(),
            child: nullifier_set.key(),
            relationship_type: RelationshipType::DerivedFrom,
        },
        // ... more relationships
    ];
    
    // MANDATORY: Validate all relationships
    validate_account_relationships(remaining_accounts, &relationships)?;
    
    // ... rest of instruction
}
```

**Files That MUST Use This Pattern:**
- ALL instruction handlers
- ALL account validation functions

---

## Security Validation Pattern

**When to Use:** All instructions (REQUIRED)

**REQUIRED Pattern:** Validate all inputs and check security constraints.

**Complete Validation Checklist (MUST follow in order):**

1. **Validate Amounts:**
```rust
// MANDATORY: Validate amount
InputValidator::validate_amount(amount, MAX_SHIELD_AMOUNT)?;

// MANDATORY: Check minimum (prevent dust)
require!(amount >= MIN_AMOUNT, PoolError::AmountTooSmall);

// MANDATORY: Check maximum (prevent overflow)
require!(amount <= MAX_AMOUNT, PoolError::AmountTooLarge);
```

2. **Validate Proofs:**
```rust
// MANDATORY: Sanitize proof
InputSanitizer::sanitize_proof(&proof, MAX_PROOF_SIZE)?;

// MANDATORY: Check proof length
require!(proof.len() <= MAX_PROOF_SIZE, PoolError::ProofTooLarge);
require!(proof.len() >= MIN_PROOF_SIZE, PoolError::ProofTooSmall);
```

3. **Validate Public Inputs:**
```rust
// MANDATORY: Sanitize public inputs
InputSanitizer::sanitize_public_inputs(&public_inputs, MAX_PUBLIC_INPUTS_SIZE)?;

// MANDATORY: Check public inputs length
require!(public_inputs.len() <= MAX_PUBLIC_INPUTS_SIZE, PoolError::PublicInputsTooLarge);
```

4. **Check Rate Limits:**
```rust
// MANDATORY: Check rate limit
let clock = Clock::get()?;
check_rate_limit(&pool_state, operation_type, clock.slot)?;
```

5. **Check Reentrancy:**
```rust
// MANDATORY: Check reentrancy
let vault = load_vault(&proof_vault)?;
check_not_in_progress(&vault, &operation_id)?;

// MANDATORY: Set status to InProgress
set_operation_status(&mut proof_vault, &operation_id, OperationStatus::InProgress)?;
```

6. **Validate Account Ownership:**
```rust
// MANDATORY: Validate all account ownership
for account_info in accounts_to_validate {
    validate_account(account_info, expected_owner, account_name)?;
}
```

7. **Validate Account Relationships:**
```rust
// MANDATORY: Validate all account relationships
validate_account_relationships(remaining_accounts, &relationships)?;
```

**Complete Example (MANDATORY pattern for all instructions):**
```rust
pub fn execute_shield_v2(...) -> Result<()> {
    // STEP 1: MANDATORY - Validate amounts
    InputValidator::validate_amount(args.amount, MAX_SHIELD_AMOUNT)?;
    require!(args.amount >= MIN_AMOUNT, PoolError::AmountTooSmall);
    require!(args.amount <= MAX_AMOUNT, PoolError::AmountTooLarge);
    
    // STEP 2: MANDATORY - Validate proofs
    InputSanitizer::sanitize_proof(&args.proof, MAX_PROOF_SIZE)?;
    require!(args.proof.len() <= MAX_PROOF_SIZE, PoolError::ProofTooLarge);
    require!(args.proof.len() >= MIN_PROOF_SIZE, PoolError::ProofTooSmall);
    
    // STEP 3: MANDATORY - Validate public inputs
    InputSanitizer::sanitize_public_inputs(&args.public_inputs, MAX_PUBLIC_INPUTS_SIZE)?;
    require!(args.public_inputs.len() <= MAX_PUBLIC_INPUTS_SIZE, PoolError::PublicInputsTooLarge);
    
    // STEP 4: MANDATORY - Check rate limit
    let clock = Clock::get()?;
    check_rate_limit(&pool_state, OperationType::Shield, clock.slot)?;
    
    // STEP 5: MANDATORY - Check reentrancy
    let vault = load_vault(&proof_vault)?;
    check_not_in_progress(&vault, &operation_id)?;
    set_operation_status(&mut proof_vault, &operation_id, OperationStatus::InProgress)?;
    
    // STEP 6: MANDATORY - Validate account ownership
    validate_account(&pool_state_info, &ctx.program_id, "pool_state")?;
    validate_account(&mint_mapping_info, &ptf_factory::ID, "mint_mapping")?;
    // ... validate all accounts
    
    // STEP 7: MANDATORY - Validate account relationships
    validate_account_relationships(remaining_accounts, &relationships)?;
    
    // STEP 8: Process operation
    // ... actual operation logic
    
    // STEP 9: MANDATORY - Set status to Completed
    set_operation_status(&mut proof_vault, &operation_id, OperationStatus::Completed)?;
    
    Ok(())
}
```

**Files That MUST Use This Pattern:**
- ALL instruction handlers - No exceptions
- Follow this exact order in every instruction

---

## Summary: Pattern Checklist

When implementing new code, verify:

- [ ] Using raw instruction pattern for 10+ accounts?
- [ ] Using centralized PDA derivation?
- [ ] Using manual account validation?
- [ ] Using manual account creation (not `init_if_needed`)?
- [ ] Using `AccountInfo` for unused parameters?
- [ ] Using `#[inline(never)]` on large functions?
- [ ] Using proper error handling for CPI calls?
- [ ] Using lifetime extension when needed?
- [ ] Setting account discriminator?
- [ ] Using `AnchorSerialize` for account data?
- [ ] Using enhanced error handling with context?
- [ ] Validating all account relationships?
- [ ] Validating all inputs (amounts, proofs, public inputs)?
- [ ] Checking rate limits?
- [ ] Checking reentrancy protection?
- [ ] Following security validation checklist in order?

**Next:** Read [Build and Deployment Guide](04-build-and-deployment.md) for setup instructions

