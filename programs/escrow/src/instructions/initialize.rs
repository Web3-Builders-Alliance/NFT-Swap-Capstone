use crate::seeds::*;
use crate::state::*;

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{MasterEditionAccount, Metadata};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use mpl_token_metadata::state;

pub fn initialize(
    ctx: Context<Initialize>,
    random_seed: u64,
    initializer_nft: Pubkey,
    taker_nft: Pubkey,
) -> Result<()> {
    ctx.accounts.escrow_state.initializer_key = *ctx.accounts.initializer.key;
    ctx.accounts.escrow_state.initializer_deposit_token_account = *ctx
        .accounts
        .initializer_deposit_token_account
        .to_account_info()
        .key;
    ctx.accounts.escrow_state.initializer_receive_token_account = *ctx
        .accounts
        .initializer_receive_token_account
        .to_account_info()
        .key;
    ctx.accounts.escrow_state.initializer_nft = initializer_nft;
    ctx.accounts.escrow_state.taker_nft = taker_nft;
    ctx.accounts.escrow_state.random_seed = random_seed;

    let (_vault_authority, vault_authority_bump) =
        Pubkey::find_program_address(&[AUTHORITY_SEED], ctx.program_id);
    ctx.accounts.escrow_state.vault_authority_bump = vault_authority_bump;

    token::transfer(ctx.accounts.into_transfer_to_pda_context(), 1)?;

    Ok(())
}

impl<'info> Initialize<'info> {
    fn into_transfer_to_pda_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.initializer_deposit_token_account.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.initializer.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

#[derive(Accounts)]
#[instruction(escrow_seed: u64, initializer_nft: Pubkey)]
pub struct Initialize<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        seeds = [state::PREFIX.as_bytes(), Metadata::id().as_ref(), mint.key().as_ref(), state::EDITION.as_bytes()],
        seeds::program = Metadata::id(),
        bump,
    )]
    pub master_edition: Account<'info, MasterEditionAccount>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(
        seeds = [AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: AccountInfo<'info>,
    #[account(
        init,
        payer = initializer,
        associated_token::mint = mint,
        associated_token::authority = vault_authority
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = initializer_deposit_token_account.amount == 1
    )]
    pub initializer_deposit_token_account: Account<'info, TokenAccount>,
    pub initializer_receive_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        seeds = [ESCROW_STATE_SEED.as_ref(), &escrow_seed.to_le_bytes()],
        bump,
        payer = initializer,
        space = EscrowState::space()
    )]
    pub escrow_state: Box<Account<'info, EscrowState>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub system_program: Program<'info, System>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_program: Program<'info, Token>,
    pub metadata_program: Program<'info, Metadata>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub associated_token_program: Program<'info, AssociatedToken>,
}
