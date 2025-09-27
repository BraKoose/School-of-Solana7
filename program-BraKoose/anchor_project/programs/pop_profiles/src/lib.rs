use anchor_lang::prelude::*;
use anchor_lang::prelude::Sysvar;

// Replace with your deployed program ID when available
declare_id!("G1zjKn49JAVXw7jcdUdMtkJztGshRZWhojDKy6QjoFfx");

pub const SEED_PROFILE: &[u8] = b"profile";
pub const SEED_CERT: &[u8] = b"cert";
pub const SEED_ENDORSE: &[u8] = b"endorsement";

#[program]
pub mod pop_profiles {
    use super::*;

    /// Creates a new user profile PDA. Each wallet may only have one profile.
    pub fn create_user_profile(ctx: Context<CreateUserProfile>, username: String, bio: String) -> Result<()> {
        require!(username.len() <= 32, PopError::UsernameTooLong);
        require!(bio.len() <= 160, PopError::BioTooLong);

        let profile = &mut ctx.accounts.profile;
        profile.owner = ctx.accounts.authority.key();
        profile.bump = ctx.bumps.profile;
        profile.username = username;
        profile.bio = bio;
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.cert_count = 0;
        profile.endorsement_count = 0;

        emit!(ProfileEvent::from_profile(profile));
        Ok(())
    }

    /// Adds a certification/work record to the user's profile. Only the profile owner can add.
    pub fn add_certification(ctx: Context<AddCertification>, title: String, uri: String, issuer: Pubkey) -> Result<()> {
        require!(title.len() <= 64, PopError::TitleTooLong);
        require!(uri.len() <= 128, PopError::UriTooLong);

        let profile = &mut ctx.accounts.profile;
        require_keys_eq!(profile.owner, ctx.accounts.authority.key(), PopError::Unauthorized);

        let cert = &mut ctx.accounts.certification;
        cert.profile = profile.key();
        cert.index = profile.cert_count;
        cert.title = title;
        cert.uri = uri;
        cert.issuer = issuer;
        cert.issued_at = Clock::get()?.unix_timestamp;
        cert.bump = ctx.bumps.certification;

        profile.cert_count = profile.cert_count.checked_add(1).ok_or(PopError::Overflow)?;

        emit!(CertificationEvent::from_cert(cert));
        Ok(())
    }

    /// Endorse a user with feedback and optional rating. Self-endorsement is not allowed.
    pub fn endorse_user(ctx: Context<EndorseUser>, feedback: String, rating: u8) -> Result<()> {
        require!(feedback.len() <= 280, PopError::FeedbackTooLong);
        require!(rating <= 5, PopError::InvalidRating);

        let profile = &mut ctx.accounts.profile;
        require_keys_neq!(profile.owner, ctx.accounts.endorser.key(), PopError::SelfEndorsementNotAllowed);

        let endorsement = &mut ctx.accounts.endorsement;
        endorsement.profile = profile.key();
        endorsement.index = profile.endorsement_count;
        endorsement.endorser = ctx.accounts.endorser.key();
        endorsement.feedback = feedback;
        endorsement.rating = rating;
        endorsement.created_at = Clock::get()?.unix_timestamp;
        endorsement.bump = ctx.bumps.endorsement;

        profile.endorsement_count = profile.endorsement_count.checked_add(1).ok_or(PopError::Overflow)?;

        emit!(EndorsementEvent::from_endorsement(endorsement));
        Ok(())
    }

    /// Emits the current profile state (read helper). Does not modify state.
    pub fn emit_view_profile(_ctx: Context<EmitViewProfile>) -> Result<()> {
        // No-op; clients should fetch accounts. Keeping to satisfy the example instruction list.
        Ok(())
    }
}

// -------------------- Accounts --------------------
#[derive(Accounts)]
pub struct CreateUserProfile<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
                space = 8 + 249,
        seeds = [SEED_PROFILE, authority.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddCertification<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_PROFILE, authority.key().as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, UserProfile>,
    #[account(
        init,
        payer = authority,
                space = 8 + 277,
        seeds = [SEED_CERT, profile.key().as_ref(), &profile.cert_count.to_le_bytes()],
        bump
    )]
    pub certification: Account<'info, Certification>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EndorseUser<'info> {
    #[account(mut)]
    pub endorser: Signer<'info>,
    /// Profile can belong to any user; endorsement is from `endorser`
    #[account(
        mut,
        seeds = [SEED_PROFILE, profile.owner.as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, UserProfile>,
    #[account(
        init,
        payer = endorser,
                space = 8 + 362,
        seeds = [SEED_ENDORSE, profile.key().as_ref(), endorser.key().as_ref(), &profile.endorsement_count.to_le_bytes()],
        bump
    )]
    pub endorsement: Account<'info, Endorsement>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EmitViewProfile<'info> {
    /// The profile to view
    #[account(seeds = [SEED_PROFILE, profile.owner.as_ref()], bump = profile.bump)]
    pub profile: Account<'info, UserProfile>,
}

// -------------------- State --------------------
#[account]
pub struct UserProfile {
    pub owner: Pubkey,          // 32
    pub bump: u8,               // 1
    pub username: String,       // 4 + up to 32
    pub bio: String,            // 4 + up to 160
    pub created_at: i64,        // 8
    pub cert_count: u32,        // 4
    pub endorsement_count: u32, // 4
}

#[account]
pub struct Certification {
    pub profile: Pubkey,  // 32
    pub index: u32,       // 4
    pub title: String,    // 4 + up to 64
    pub uri: String,      // 4 + up to 128 (could be IPFS or HTTPS)
    pub issuer: Pubkey,   // 32 (issuer or client pubkey)
    pub issued_at: i64,   // 8
    pub bump: u8,         // 1
}

#[account]
pub struct Endorsement {
    pub profile: Pubkey,   // 32
    pub index: u32,        // 4
    pub endorser: Pubkey,  // 32
    pub feedback: String,  // 4 + up to 280
    pub rating: u8,        // 1 (0-5)
    pub created_at: i64,   // 8
    pub bump: u8,          // 1
}

// -------------------- Events --------------------
#[event]
pub struct ProfileEvent {
    pub profile: Pubkey,
    pub owner: Pubkey,
    pub username: String,
    pub bio: String,
    pub created_at: i64,
    pub cert_count: u32,
    pub endorsement_count: u32,
}

impl ProfileEvent {
    pub fn from_profile(p: &Account<UserProfile>) -> Self {
        Self {
            profile: p.key(),
            owner: p.owner,
            username: p.username.clone(),
            bio: p.bio.clone(),
            created_at: p.created_at,
            cert_count: p.cert_count,
            endorsement_count: p.endorsement_count,
        }
    }
}

#[event]
pub struct CertificationEvent {
    pub profile: Pubkey,
    pub index: u32,
    pub title: String,
    pub uri: String,
    pub issuer: Pubkey,
}
impl CertificationEvent {
    pub fn from_cert(c: &Certification) -> Self {
        Self {
            profile: c.profile,
            index: c.index,
            title: c.title.clone(),
            uri: c.uri.clone(),
            issuer: c.issuer,
        }
    }
}

#[event]
pub struct EndorsementEvent {
    pub profile: Pubkey,
    pub index: u32,
    pub endorser: Pubkey,
    pub rating: u8,
}
impl EndorsementEvent {
    pub fn from_endorsement(e: &Endorsement) -> Self {
        Self { profile: e.profile, index: e.index, endorser: e.endorser, rating: e.rating }
    }
}

// -------------------- Errors --------------------
#[error_code]
pub enum PopError {
    #[msg("Username too long")] UsernameTooLong,
    #[msg("Bio too long")] BioTooLong,
    #[msg("Title too long")] TitleTooLong,
    #[msg("URI too long")] UriTooLong,
    #[msg("Feedback too long")] FeedbackTooLong,
    #[msg("Invalid rating (0-5)")] InvalidRating,
    #[msg("Unauthorized")] Unauthorized,
    #[msg("Overflow")] Overflow,
    #[msg("Self endorsement not allowed")] SelfEndorsementNotAllowed,
}
