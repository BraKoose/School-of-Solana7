import pkg from "@coral-xyz/anchor";
const anchor: any = pkg;
const { Program, BN } = anchor;
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import * as fs from "fs";

// Types are inferred from IDL when built during anchor test; here we use any to keep it simple.

// Ensure ANCHOR_WALLET is set, falling back to SOLANA_WALLET or SOLANA_KEYPAIR for Node-side tests.
(() => {
  try {
    const env = process.env as Record<string, string | undefined>;
    if (!env.ANCHOR_WALLET) {
      const candidate = env.SOLANA_WALLET || env.SOLANA_KEYPAIR;
      if (candidate) {
        // Quick checks if it still fails
        if (!fs.existsSync(candidate)) {
          console.warn(`[tests] Wallet file not found at ${candidate}.`);
        } else {
          try {
            const head = fs.readFileSync(candidate, "utf8");
            const json = JSON.parse(head);
            if (!Array.isArray(json) || json.length !== 64) {
              console.warn("[tests] Wallet JSON is not a 64-byte secret key array.");
            }
          } catch (e) {
            console.warn(`[tests] Could not read/parse wallet file ${candidate}: ${e}`);
          }
        }
        process.env.ANCHOR_WALLET = candidate;
      }
    }
  } catch (e) {
    console.warn(`[tests] Wallet env bootstrap warning: ${e}`);
  }
})();

describe("pop_profiles program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PopProfiles as Program<any>;

  const wallet = (provider.wallet as anchor.Wallet);
  const authority = wallet.payer as anchor.web3.Signer;

  async function airdropAndConfirm(pubkey: PublicKey, lamports = 2e9) {
    try {
      const sig = await provider.connection.requestAirdrop(pubkey, lamports);
      const bh = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction({
        signature: sig,
        blockhash: bh.blockhash,
        lastValidBlockHeight: bh.lastValidBlockHeight,
      }, "confirmed");
      // tiny delay to ensure balance is reflected
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.warn("[tests] airdropAndConfirm warning:", e);
    }
  }

  function profilePda(owner: PublicKey) {
    return PublicKey.findProgramAddressSync([
      Buffer.from("profile"),
      owner.toBuffer(),
    ], program.programId);
  }

  function certPda(profile: PublicKey, index: number) {
    return PublicKey.findProgramAddressSync([
      Buffer.from("cert"),
      profile.toBuffer(),
      new BN(index).toArrayLike(Buffer, "le", 4)
    ], program.programId);
  }

  function endorsementPda(profile: PublicKey, endorser: PublicKey, index: number) {
    return PublicKey.findProgramAddressSync([
      Buffer.from("endorsement"),
      profile.toBuffer(),
      endorser.toBuffer(),
      new BN(index).toArrayLike(Buffer, "le", 4)
    ], program.programId);
  }

  it("Create user profile (happy)", async () => {
    const [profile] = profilePda(wallet.publicKey);

    await program.methods
      .createUserProfile("alice", "rust&anchor dev")
      .accounts({
        authority: wallet.publicKey,
        profile,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.userProfile.fetch(profile);
    expect(account.owner.toBase58()).to.eq(wallet.publicKey.toBase58());
    expect(account.username).to.eq("alice");
    expect(account.certCount.toNumber ? account.certCount.toNumber() : account.certCount).to.eq(0);
  });

  it("Create user profile (unhappy duplicate)", async () => {
    const [profile] = profilePda(wallet.publicKey);
    try {
      await program.methods
        .createUserProfile("alice2", "duplicate should fail")
        .accounts({ authority: wallet.publicKey, profile, systemProgram: SystemProgram.programId })
        .rpc();
      expect.fail("should have failed due to account already initialized");
    } catch (e: any) {
      expect(e.toString()).to.include("already in use");
    }
  });

  it("Add certification (happy)", async () => {
    const [profile] = profilePda(wallet.publicKey);
    const profileAcc = await program.account.userProfile.fetch(profile);
    const idx = profileAcc.certCount.toNumber ? profileAcc.certCount.toNumber() : profileAcc.certCount;
    const [cert] = certPda(profile, idx);

    await program.methods
      .addCertification("Solana PoP", "https://ipfs.example/hash", wallet.publicKey)
      .accounts({
        authority: wallet.publicKey,
        profile,
        certification: cert,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const c = await program.account.certification.fetch(cert);
    expect(c.title).to.eq("Solana PoP");
    expect(c.profile.toBase58()).to.eq(profile.toBase58());
  });

  it("Add certification (unhappy unauthorized other signer)", async () => {
    const rogue = Keypair.generate();
    const [profile] = profilePda(wallet.publicKey);
    const profileAcc = await program.account.userProfile.fetch(profile);
    const idx = profileAcc.certCount.toNumber ? profileAcc.certCount.toNumber() : profileAcc.certCount;
    const [cert] = certPda(profile, idx);

    try {
      await program.methods
        .addCertification("ShouldFail", "uri", rogue.publicKey)
        .accounts({
          authority: rogue.publicKey,
          profile,
          certification: cert,
          systemProgram: SystemProgram.programId,
        })
        .signers([rogue])
        .rpc();
      expect.fail("should fail: authority mismatch");
    } catch (e: any) {
      const s = e?.toString?.() || String(e);
      expect(s).to.match(/ConstraintSeeds|Simulation failed|constraint|already in use|failed/i);
    }
  });

  it("Endorse user (happy)", async () => {
    const endorser = Keypair.generate();
    // airdrop endorser some SOL in localnet and confirm
    await airdropAndConfirm(endorser.publicKey, 2e9);

    const [profile] = profilePda(wallet.publicKey);
    const p = await program.account.userProfile.fetch(profile);
    const idx = p.endorsementCount.toNumber ? p.endorsementCount.toNumber() : p.endorsementCount;
    const [endorsement] = endorsementPda(profile, endorser.publicKey, idx);

    await program.methods
      .endorseUser("Great work!", 5)
      .accounts({
        endorser: endorser.publicKey,
        profile,
        endorsement,
        systemProgram: SystemProgram.programId,
      })
      .signers([endorser])
      .rpc();

    const e = await program.account.endorsement.fetch(endorsement);
    expect(e.rating).to.eq(5);
    expect(e.endorser.toBase58()).to.eq(endorser.publicKey.toBase58());
  });

  it("Endorse user (unhappy self endorsement)", async () => {
    const [profile] = profilePda(wallet.publicKey);
    const p = await program.account.userProfile.fetch(profile);
    const idx = p.endorsementCount.toNumber ? p.endorsementCount.toNumber() : p.endorsementCount;
    const [endorsement] = endorsementPda(profile, wallet.publicKey, idx);

    try {
      await program.methods
        .endorseUser("I endorse myself", 5)
        .accounts({ endorser: wallet.publicKey, profile, endorsement, systemProgram: SystemProgram.programId })
        .rpc();
      expect.fail("should fail: self endorsement not allowed");
    } catch (e: any) {
      expect(e.toString()).to.include("Self endorsement not allowed");
    }
  });

  it("Emit view profile (no-op)", async () => {
    const [profile] = profilePda(wallet.publicKey);
    await program.methods
      .emitViewProfile()
      .accounts({ profile })
      .rpc();
  });
});
