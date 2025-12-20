use anchor_lang::prelude::*;
use anchor_lang::solana_program::account_info::AccountInfo;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_lang::solana_program::pubkey::Pubkey;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod entrypoint;

pub use errors::*;
pub use instructions::*;
pub use state::*;

declare_id!("6MLrNAydScBBWq6vFXPLjahvxjF1PzauuSYTuLS7yfYC");

// Custom entrypoint will be added after first build
// For now, we use Anchor's standard entrypoint

#[program]
pub mod ptf_pool {
    use super::*;

    pub fn prepare_shield(ctx: Context<PrepareShield>, args: PrepareShieldArgs) -> Result<()> {
        instructions::prepare_shield(ctx, args)
    }

    pub fn execute_shield_v2(ctx: Context<ExecuteShieldV2Raw>, operation_id: [u8; 32]) -> Result<()> {
        instructions::execute_shield_v2(ctx, operation_id)
    }

    pub fn prepare_unshield(ctx: Context<PrepareUnshield>, args: PrepareUnshieldArgs) -> Result<[u8; 32]> {
        instructions::prepare_unshield(ctx, args)
    }

    pub fn execute_unshield_verify(ctx: Context<ExecuteUnshieldVerify>, operation_id: [u8; 32]) -> Result<()> {
        instructions::execute_unshield_verify(ctx, operation_id)
    }

    pub fn execute_unshield_update(ctx: Context<ExecuteUnshieldUpdate>, operation_id: [u8; 32]) -> Result<()> {
        instructions::execute_unshield_update(ctx, operation_id)
    }

    pub fn execute_unshield_withdraw(ctx: Context<ExecuteUnshieldWithdraw>, operation_id: [u8; 32]) -> Result<()> {
        instructions::execute_unshield_withdraw(ctx, operation_id)
    }

    pub fn execute_transfer(ctx: Context<ExecuteTransfer>, args: TransferArgs) -> Result<()> {
        instructions::execute_transfer(ctx, args)
    }

    pub fn execute_transfer_from(ctx: Context<ExecuteTransferFrom>, args: TransferFromArgs) -> Result<()> {
        instructions::execute_transfer_from(ctx, args)
    }

    pub fn approve_allowance(ctx: Context<ApproveAllowance>, args: ApproveAllowanceArgs) -> Result<()> {
        instructions::approve_allowance(ctx, args)
    }

    pub fn execute_batch_transfer(ctx: Context<ExecuteBatchTransfer>, args: BatchTransferArgs) -> Result<()> {
        instructions::execute_batch_transfer(ctx, args)
    }

    pub fn execute_batch_transfer_from(ctx: Context<ExecuteBatchTransferFrom>, args: BatchTransferFromArgs) -> Result<()> {
        instructions::execute_batch_transfer_from(ctx, args)
    }
}

// Placeholder structs for instruction arguments
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PrepareShieldArgs {
    pub amount: u64,
    pub commitment: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PrepareUnshieldArgs {
    pub nullifier: [u8; 32],
    pub amount: u64,
    pub recipient: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TransferArgs {
    pub proof: Vec<u8>,
    pub public_inputs: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TransferFromArgs {
    pub proof: Vec<u8>,
    pub public_inputs: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ApproveAllowanceArgs {
    pub spender: Pubkey,
    pub amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct BatchTransferArgs {
    pub transfers: Vec<TransferArgs>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct BatchTransferFromArgs {
    pub transfers: Vec<TransferFromArgs>,
}

// Re-export for use in instructions
pub use instructions::approve_allowance::Allowance;

// Placeholder Context structs
#[derive(Accounts)]
pub struct PrepareShield<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Proof vault PDA
    #[account(mut)]
    pub proof_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

// ExecuteShieldV2Raw is defined in execute_shield_v2.rs

#[derive(Accounts)]
pub struct PrepareUnshield<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Proof vault PDA
    #[account(mut)]
    pub proof_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteUnshieldVerify<'info> {
    /// CHECK: Proof vault PDA
    #[account(mut)]
    pub proof_vault: UncheckedAccount<'info>,
    /// CHECK: Verifying key account
    pub verifying_key: UncheckedAccount<'info>,
    pub verifier_program: Program<'info, ptf_verifier_groth16::program::PtfVerifierGroth16>,
}

#[derive(Accounts)]
pub struct ExecuteUnshieldUpdate<'info> {
    #[account(mut)]
    pub pool_state: Account<'info, PoolState>,
    #[account(mut)]
    pub commitment_tree: Account<'info, CommitmentTree>,
    #[account(mut)]
    pub nullifier_set: Account<'info, NullifierSet>,
    /// CHECK: Proof vault PDA
    #[account(mut)]
    pub proof_vault: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ExecuteUnshieldWithdraw<'info> {
    #[account(mut)]
    pub pool_state: Account<'info, PoolState>,
    /// CHECK: Vault state account
    pub vault_state: UncheckedAccount<'info>,
    /// CHECK: Proof vault PDA
    #[account(mut)]
    pub proof_vault: UncheckedAccount<'info>,
    /// CHECK: Vault token account
    #[account(mut)]
    pub vault_token_account: UncheckedAccount<'info>,
    /// CHECK: User token account
    #[account(mut)]
    pub user_token_account: UncheckedAccount<'info>,
    pub vault_program: Program<'info, ptf_vault::program::PtfVault>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
}

#[derive(Accounts)]
pub struct ExecuteTransfer<'info> {
    /// CHECK: Phantom account - all real accounts in remaining_accounts
    pub _phantom: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ExecuteTransferFrom<'info> {
    /// CHECK: Phantom account - all real accounts in remaining_accounts
    pub _phantom: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ApproveAllowance<'info> {
    /// CHECK: Phantom account - all real accounts in remaining_accounts
    pub _phantom: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ExecuteBatchTransfer<'info> {
    /// CHECK: Phantom account - all real accounts in remaining_accounts
    pub _phantom: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ExecuteBatchTransferFrom<'info> {
    /// CHECK: Phantom account - all real accounts in remaining_accounts
    pub _phantom: UncheckedAccount<'info>,
}

