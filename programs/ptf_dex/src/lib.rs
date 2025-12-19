use anchor_lang::prelude::*;

declare_id!("EkCLPUfEtSMJsEwJbVtDifeZ5H4dJREkMeFXAxwBde6b");

#[program]
pub mod ptf_dex {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

