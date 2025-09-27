//-------------------------------------------------------------------------------
///
/// TASK: Implement the remove comment functionality for the Twitter program
/// 
/// Requirements:
/// - Close the comment account and return rent to comment author
/// 
/// NOTE: No implementation logic is needed in the function body - this 
/// functionality is achieved entirely through account constraints!
/// 
///-------------------------------------------------------------------------------

use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

use crate::states::*;

pub fn remove_comment(_ctx: Context<RemoveCommentContext>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct RemoveCommentContext<'info> {
    // Author receiving rent from closing the comment
    #[account(mut)]
    pub comment_author: Signer<'info>,
    
    // Close the existing Comment PDA derived from its own data
    // Seeds: [COMMENT_SEED, comment_author, hash(comment.content), comment.parent_tweet]
    #[account(
        mut,
        close = comment_author,
        seeds = [
            COMMENT_SEED.as_bytes(),
            comment.comment_author.as_ref(),
            &hash(comment.content.as_bytes()).to_bytes(),
            comment.parent_tweet.as_ref()
        ],
        bump = comment.bump
    )]
    pub comment: Account<'info, Comment>,
}
