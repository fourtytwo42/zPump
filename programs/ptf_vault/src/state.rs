use anchor_lang::prelude::*;

#[account]
pub struct VaultState {
    pub origin_mint: Pubkey,
    pub vault_token_account: Pubkey,
    pub authority: Pubkey,
    pub bump: u8,
}

impl VaultState {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1;
}

