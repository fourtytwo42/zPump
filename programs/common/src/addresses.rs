use anchor_lang::prelude::*;
use solana_program::pubkey::Pubkey;

pub struct PoolAddresses {
    pub pool_state: Pubkey,
    pub commitment_tree: Pubkey,
    pub nullifier_set: Pubkey,
    pub note_ledger: Pubkey,
    pub hook_config: Pubkey,
    pub hook_whitelist: Pubkey,
}

impl PoolAddresses {
    pub fn derive_all(origin_mint: &Pubkey, program_id: &Pubkey) -> Self {
        let (pool_state, _) = Pubkey::find_program_address(
            &[b"pool", origin_mint.as_ref()],
            program_id,
        );
        
        let (commitment_tree, _) = Pubkey::find_program_address(
            &[b"commitment-tree", origin_mint.as_ref()],
            program_id,
        );
        
        let (nullifier_set, _) = Pubkey::find_program_address(
            &[b"nullifier-set", origin_mint.as_ref()],
            program_id,
        );
        
        let (note_ledger, _) = Pubkey::find_program_address(
            &[b"note-ledger", origin_mint.as_ref()],
            program_id,
        );
        
        let (hook_config, _) = Pubkey::find_program_address(
            &[b"hook-config", origin_mint.as_ref()],
            program_id,
        );
        
        let (hook_whitelist, _) = Pubkey::find_program_address(
            &[b"hook-whitelist", origin_mint.as_ref()],
            program_id,
        );
        
        Self {
            pool_state,
            commitment_tree,
            nullifier_set,
            note_ledger,
            hook_config,
            hook_whitelist,
        }
    }
}

