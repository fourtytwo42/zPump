use anchor_lang::prelude::*;

declare_id!("3UWzz6ZsPxnbCjJ3MfBrwpbMC54jPXHfMZHxhytVVYPC");

#[program]
pub mod ptf_dex {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

