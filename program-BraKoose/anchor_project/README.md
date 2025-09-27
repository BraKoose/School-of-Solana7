# Pop Profiles Anchor Program

This is an Anchor program demonstrating Program Derived Addresses (PDAs) to manage on-chain freelancer profiles, certifications, and client endorsements (Proof of Performance).

Program name: pop_profiles

Instructions:
- create_user_profile(username, bio)
- add_certification(title, uri, issuer)
- endorse_user(feedback, rating)
- emit_view_profile() (no-op read helper)

Accounts:
- UserProfile (PDA: ["profile", owner])
- Certification (PDA: ["cert", profile, index])
- Endorsement (PDA: ["endorsement", profile, endorser, index])

## Build, Test, Deploy

Prereqs: Anchor CLI, Solana CLI, Node.js/yarn.

1) Install deps (tests use ts-mocha):
- cd anchor_project && yarn install

2) Upgrade/Set Program ID (declare_id):
- Generate a new program keypair:
  solana-keygen new -o target/deploy/pop_profiles-keypair.json -s -f
- Sync Anchor.toml with the generated public key:
  anchor keys sync
  (This reads keypairs under target/deploy and writes their pubkeys into Anchor.toml.)
- Sync Rust declare_id! and frontend demo PROGRAM_ID from Anchor.toml:
  yarn sync-id

3) Build:
- yarn build

4) Local test (spawns a local validator):
- yarn test

5) Deploy:
- Localnet (default in Anchor.toml provider): yarn deploy
- Devnet: set provider.cluster to devnet in Anchor.toml or export ANCHOR_PROVIDER_URL/ANCHOR_WALLET, then run yarn deploy

Notes:
- Frontend demo attempts to read the program ID from Anchor.toml, or you can set env PROGRAM_ID.
- If you change the program keypair, re-run anchor keys sync then yarn sync-id to keep declare_id consistent.

See tests/pop_profiles.ts for happy and unhappy scenarios for each instruction.
