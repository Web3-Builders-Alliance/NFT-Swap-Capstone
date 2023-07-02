use anchor_lang::prelude::*;

#[account]
pub struct EscrowState {
    pub random_seed: u64,
    pub initializer_key: Pubkey,
    pub initializer_deposit_token_account: Pubkey,
    pub initializer_receive_token_account: Pubkey,
    pub initializer_nft: Pubkey,
    pub taker_nft: Pubkey,
    pub vault_authority_bump: u8,
}

impl EscrowState {
    pub fn space() -> usize {
        8 + 121
    }
}
