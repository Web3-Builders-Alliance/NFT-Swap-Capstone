use anchor_lang::prelude::*;

use instructions::*;

pub mod instructions;
pub mod seeds;
pub mod state;

declare_id!("9FmWRCsKPpFsUxcs9nV2K4GVgHTnVXeEfT4uMK3vuurL");

#[program]
pub mod anchor_escrow {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        random_seed: u64,
        initializer_nft: Pubkey,
        taker_nft: Pubkey,
    ) -> Result<()> {
        instructions::initialize::initialize(ctx, random_seed, initializer_nft, taker_nft)
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        instructions::cancel::cancel(ctx)
    }

    pub fn exchange(ctx: Context<Exchange>) -> Result<()> {
        instructions::exchange::exchange(ctx)
    }
}
