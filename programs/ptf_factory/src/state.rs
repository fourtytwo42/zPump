use anchor_lang::prelude::*;

#[account]
pub struct FactoryState {
    pub authority: Pubkey,
    pub bump: u8,
}

impl FactoryState {
    pub const LEN: usize = 8 + 32 + 1;
}

#[account]
pub struct MintMapping {
    pub origin_mint: Pubkey,
    pub pool: Pubkey,
    pub twin_mint: Option<Pubkey>,
    pub bump: u8,
}

impl MintMapping {
    pub const LEN: usize = 8 + 32 + 32 + 33 + 1; // Option<Pubkey> is 33 bytes
}

