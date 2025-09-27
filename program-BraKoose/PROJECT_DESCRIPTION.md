# Project Description

**Deployed Frontend URL:** [TODO: Link to your deployed frontend]

**Solana Program ID:** PopPro111111111111111111111111111111111111111

## Project Overview

### Description
Pop Profiles is a simple decentralized application on Solana (Anchor framework) that allows freelancers to create on-chain profiles, add certifications or work records, and receive verifiable endorsements (feedback) from clients. Each piece of data is stored in a Program Derived Address (PDA), making relationships deterministic and secure. Endorsements serve as Proof of Performance (PoP) that can be reused across platforms.

### Key Features
- Create User Profile: Each wallet can initialize exactly one profile PDA
- Add Certification/WorkRecord: Profile owner adds indexed work attestations with title and URI (link/IPFS)
- Endorse User: Any client can leave verifiable feedback and rating; self-endorsement is prevented
- View Profile: Off-chain helpers fetch profile with all certifications and endorsements
- Deterministic PDAs: Profile, certifications, and endorsements are securely tied together via seeds
  
### How to Use the dApp
1. Connect Wallet (Anchor provider wallet or a browser wallet in a UI)
2. Create Profile: Call create_user_profile(username, bio)
3. Add Certification: Call add_certification(title, uri, issuer_pubkey)
4. Endorse: Another wallet calls endorse_user(feedback, rating)
5. View: Fetch UserProfile account and iterate indexed PDAs to collect certifications and endorsements

## Program Architecture
The program consists of three account types linked through PDAs. A UserProfile is unique per wallet. Certifications are appended with an index maintained on the profile. Endorsements are created by clients against a profile, uniquely addressed by profile + endorser + index.

### PDA Usage
PDAs ensure deterministic, non-colliding addresses tied to the owner’s profile.

**PDAs Used:**
- Profile PDA: seeds ["profile", owner_pubkey] — one profile per wallet
- Certification PDA: seeds ["cert", profile_pda, index_le_bytes] — indexed list of certifications per profile
- Endorsement PDA: seeds ["endorsement", profile_pda, endorser_pubkey, index_le_bytes] — endorsements per profile per endorser with ordering

### Program Instructions
**Instructions Implemented:**
- create_user_profile(username, bio): Initializes the caller’s profile PDA with metadata and counters
- add_certification(title, uri, issuer): Only profile owner may add; creates indexed certification PDA and increments counter
- endorse_user(feedback, rating): Any signer may endorse; prevents self-endorsement; creates endorsement PDA and increments counter
- emit_view_profile(): No-op read helper to satisfy example; off-chain fetch is recommended for viewing

### Account Structure
```rust
#[account]
pub struct UserProfile {
    pub owner: Pubkey,
    pub bump: u8,
    pub username: String,       // <= 32
    pub bio: String,            // <= 160
    pub created_at: i64,
    pub cert_count: u32,
    pub endorsement_count: u32,
}

#[account]
pub struct Certification {
    pub profile: Pubkey,
    pub index: u32,
    pub title: String,          // <= 64
    pub uri: String,            // <= 128
    pub issuer: Pubkey,
    pub issued_at: i64,
    pub bump: u8,
}

#[account]
pub struct Endorsement {
    pub profile: Pubkey,
    pub index: u32,
    pub endorser: Pubkey,
    pub feedback: String,       // <= 280
    pub rating: u8,             // 0..=5
    pub created_at: i64,
    pub bump: u8,
}
```

## Testing

### Test Coverage
The test suite (tests/pop_profiles.ts) covers happy and unhappy flows for each instruction.

**Happy Path Tests:**
- Create User Profile: Initializes a profile and validates initial counters
- Add Certification: Appends a certification and verifies fields
- Endorse User: Endorser creates endorsement with rating 5
- Emit View Profile: Executes no-op successfully

**Unhappy Path Tests:**
- Create Duplicate Profile: Fails on re-initialization (account already in use)
- Add Certification Unauthorized: Fails when a non-owner attempts to add (seed constraint mismatch)
- Self Endorsement: Fails when owner tries to endorse own profile

### Running Tests
```bash
cd anchor_project
yarn install
anchor test
```

### Additional Notes for Evaluators
- The View flow is intentionally off-chain using account fetches. In production, you may add secondary indexing or events consumption. PDAs ensure a cryptographically verifiable link between a freelancer’s profile and their certifications/endorsements.