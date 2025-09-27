//-------------------------------------------------------------------------------
///
/// TASK: Implement the add comment functionality for the Twitter program
/// 
/// Requirements:
/// - Validate that comment content doesn't exceed maximum length
/// - Initialize a new comment account with proper PDA seeds
/// - Set comment fields: content, author, parent tweet, and bump
/// - Use content hash in PDA seeds for unique comment identification
/// 
///-------------------------------------------------------------------------------

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{hash::hash, system_program};

use crate::errors::TwitterError;
use crate::states::*;

pub fn add_comment(ctx: Context<AddCommentContext>, comment_content: String) -> Result<()> {
    // Validate length
    if comment_content.as_bytes().len() > COMMENT_LENGTH {
        return err!(TwitterError::CommentTooLong);
    }

    // Manually verify the PDA derivation
    let content_hash = hash(comment_content.as_bytes()).to_bytes();
    let (expected_pda, bump) = Pubkey::find_program_address(
        &[
            COMMENT_SEED.as_bytes(),
            ctx.accounts.comment_author.key().as_ref(),
            &content_hash,
            ctx.accounts.tweet.key().as_ref(),
        ],
        ctx.program_id,
    );
    
    // Verify that the provided comment account matches the expected PDA
    require_keys_eq!(ctx.accounts.comment.key(), expected_pda, TwitterError::InvalidCommentPDA);

    // Initialize the comment account manually
    let comment_account = &ctx.accounts.comment;
    let account_size = 8 + 4 + COMMENT_LENGTH + 32 + 32 + 1;
    let rent = Rent::get()?;
    let lamports_required = rent.minimum_balance(account_size);

    // Transfer lamports from payer to comment account
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.comment_author.to_account_info(),
            to: comment_account.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, lamports_required)?;

    // Allocate space and assign to our program
    let seeds = &[
        COMMENT_SEED.as_bytes(),
        ctx.accounts.comment_author.key().as_ref(),
        &content_hash,
        ctx.accounts.tweet.key().as_ref(),
        &[bump],
    ];

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Allocate {
            account_to_allocate: comment_account.to_account_info(),
        },
        &[seeds],
    );
    anchor_lang::system_program::allocate(cpi_context, account_size as u64)?;

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Assign {
            account_to_assign: comment_account.to_account_info(),
        },
        &[seeds],
    );
    anchor_lang::system_program::assign(cpi_context, ctx.program_id)?;

    // Now initialize the account data
    let mut account_data = comment_account.try_borrow_mut_data()?;
    
    // Set discriminator
    let discriminator = Comment::discriminator();
    account_data[0..8].copy_from_slice(&discriminator);

    // Create comment struct and serialize
    let comment = Comment {
        content: comment_content,
        comment_author: ctx.accounts.comment_author.key(),
        parent_tweet: ctx.accounts.tweet.key(),
        bump,
    };
    
    let serialized = comment.try_to_vec()?;
    account_data[8..8 + serialized.len()].copy_from_slice(&serialized);

    Ok(())
}

#[derive(Accounts)]
#[instruction(comment_content: String)]
pub struct AddCommentContext<'info> {
    // The author paying for the comment account rent
    #[account(mut)]
    pub comment_author: Signer<'info>,

    // Existing tweet being commented on
    pub tweet: Account<'info, Tweet>,

    /// CHECK: This account will be created and initialized manually with proper PDA validation
    #[account(mut)]
    pub comment: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
