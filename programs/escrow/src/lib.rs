
use anchor_lang::prelude::*;

use instructions::*;

pub mod state;
pub mod instructions;
pub mod seeds;

declare_id!("J7w3wqRVTzs4CcSA6MRTtt584oaykVTbqQDxMtgbkQhL");

#[program]
pub mod anchor_escrow {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        random_seed: u64,
        initializer_amount: u64,
        taker_amount: u64,
    ) -> Result<()> {
        instructions::initialize::initialize(ctx,random_seed,initializer_amount,taker_amount)
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        instructions::cancel::cancel(ctx)
    }

    pub fn exchange(ctx: Context<Exchange>) -> Result<()> {
        instructions::exchange::exchange(ctx)
    }
}