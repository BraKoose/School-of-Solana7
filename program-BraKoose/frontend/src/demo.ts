import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, clusterApiUrl } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
dotenv.config();

// Simple Node client demonstrating how to interact with the Anchor program
// Attempts to read program ID from Anchor.toml; falls back to env PROGRAM_ID, then to hard-coded placeholder.

function readProgramIdFromAnchorToml(preferredCluster: string): string | null {
  try {
    // Resolve Anchor.toml relative to this file (frontend/src -> ../../anchor_project/Anchor.toml)
    const anchorTomlCandidates = [
      path.join(__dirname, "../../anchor_project/Anchor.toml"),
      path.join(process.cwd(), "anchor_project/Anchor.toml"),
    ];
    const anchorTomlPath = anchorTomlCandidates.find(p => fs.existsSync(p));
    if (!anchorTomlPath) return null;
    const text = fs.readFileSync(anchorTomlPath, "utf8");
    const cluster = preferredCluster || ((text.match(/\[provider\][\s\S]*?cluster\s*=\s*"(.*?)"/i) || [])[1] ?? "localnet");
    const re = new RegExp(`\\[programs\\.${cluster}\\][\\s\\S]*?pop_profiles\\s*=\\s*"([^"]+)"`, "i");
    const m = text.match(re);
    return m ? m[1] : null;
  } catch (_e) {
    return null;
  }
}

async function main() {
  const cluster = process.env.CLUSTER || "devnet"; // "localnet" or "devnet"
  const connection = new anchor.web3.Connection(cluster === "devnet" ? clusterApiUrl("devnet") : "http://127.0.0.1:8899", "confirmed");

  // Load wallet respecting ANCHOR_WALLET (canonical for Anchor), then SOLANA_WALLET/SOLANA_KEYPAIR, else default path
  const secretPath = process.env.ANCHOR_WALLET || process.env.SOLANA_WALLET || process.env.SOLANA_KEYPAIR || path.join(process.env.HOME || "", ".config/solana/id.json");
  if (!fs.existsSync(secretPath)) {
    throw new Error(`Wallet file not found at ${secretPath}`);
  }
  const raw = fs.readFileSync(secretPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length !== 64) {
    throw new Error(`Wallet JSON must be an array of 64 numbers (secret key bytes). Got: ${typeof parsed} length=${Array.isArray(parsed) ? parsed.length : "n/a"}`);
  }
  const payer = Keypair.fromSecretKey(Uint8Array.from(parsed));

  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());
  anchor.setProvider(provider);

  // Resolve Program ID: env override -> Anchor.toml -> placeholder
  const envPid = process.env.PROGRAM_ID;
  const tomlPid = readProgramIdFromAnchorToml(cluster);
  const pidStr = envPid || tomlPid || "PopPro111111111111111111111111111111111111111";
  const PROGRAM_ID = new PublicKey(pidStr);

  // Load IDL if built; otherwise, use ts types via workspace in a full Anchor env.
  // Here, we derive the program from IDL json if present under anchor_idl/pop_profiles.json.
  let idl: anchor.Idl | null = null;
  const idlPath = path.join(__dirname, "../../anchor_idl/pop_profiles.json");
  if (fs.existsSync(idlPath)) {
    idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  }
  const program = idl ? new anchor.Program(idl as any, PROGRAM_ID, provider) : (anchor.workspace as any).PopProfiles;

  if (!program) {
    console.error("Program not available. Build IDL or run via anchor test.");
    return;
  }

  const [profile] = PublicKey.findProgramAddressSync([Buffer.from("profile"), payer.publicKey.toBuffer()], program.programId);

  // Create Profile (idempotent demo)
  try {
    await program.methods
      .createUserProfile("alice", "solana freelancer")
      .accounts({ authority: payer.publicKey, profile, systemProgram: SystemProgram.programId })
      .signers([])
      .rpc();
    console.log("Profile created:", profile.toBase58());
  } catch (e: any) {
    console.log("Create profile skipped (likely exists):", e.message || e.toString());
  }

  let p = await program.account.userProfile.fetch(profile);
  console.log("Profile:", {
    owner: p.owner.toBase58(),
    username: p.username,
    bio: p.bio,
    certCount: p.certCount.toString(),
    endorsementCount: p.endorsementCount.toString(),
  });

  // Add a certification
  const idxCert = (p.certCount.toNumber ? p.certCount.toNumber() : p.certCount) as number;
  const [cert] = PublicKey.findProgramAddressSync([
    Buffer.from("cert"),
    profile.toBuffer(),
    new anchor.BN(idxCert).toArrayLike(Buffer, "le", 4),
  ], program.programId);

  try {
    await program.methods
      .addCertification("DeFi Project", "https://example.com/work/123", payer.publicKey)
      .accounts({ authority: payer.publicKey, profile, certification: cert, systemProgram: SystemProgram.programId })
      .rpc();
    console.log("Certification added:", cert.toBase58());
  } catch (e: any) {
    console.log("Add certification error (maybe duplicate index):", e.message || e.toString());
  }

  // Endorse profile from a different endorser
  const endorser = Keypair.generate();
  try { await provider.connection.requestAirdrop(endorser.publicKey, 1e9); } catch {}
  p = await program.account.userProfile.fetch(profile);
  const idxEnd = (p.endorsementCount.toNumber ? p.endorsementCount.toNumber() : p.endorsementCount) as number;
  const [endorsement] = PublicKey.findProgramAddressSync([
    Buffer.from("endorsement"),
    profile.toBuffer(),
    endorser.publicKey.toBuffer(),
    new anchor.BN(idxEnd).toArrayLike(Buffer, "le", 4),
  ], program.programId);

  try {
    await program.methods
      .endorseUser("Delivered high quality work on time", 5)
      .accounts({ endorser: endorser.publicKey, profile, endorsement, systemProgram: SystemProgram.programId })
      .signers([endorser])
      .rpc();
    console.log("Endorsement added:", endorsement.toBase58());
  } catch (e: any) {
    console.log("Endorsement failed:", e.message || e.toString());
  }

  // View profile and list endorsements and certifications via account fetches
  p = await program.account.userProfile.fetch(profile);
  console.log("Updated profile counts:", p.certCount.toString(), p.endorsementCount.toString());

  // Fetch certifications (indices 0..certCount-1)
  const certs: any[] = [];
  const certCount = p.certCount.toNumber ? p.certCount.toNumber() : p.certCount;
  for (let i = 0; i < certCount; i++) {
    const [cAddr] = PublicKey.findProgramAddressSync([
      Buffer.from("cert"), profile.toBuffer(), new anchor.BN(i).toArrayLike(Buffer, "le", 4)], program.programId);
    try { certs.push(await program.account.certification.fetch(cAddr)); } catch {}
  }
  console.log("Certifications:", certs.map(c => ({ title: c.title, uri: c.uri, issuer: c.issuer.toBase58() })));

  // Fetch endorsements: we don’t know endorsers; in a real app index with events or use a secondary index (not implemented here)
  console.log("Hint: Endorsements can be found by scanning program accounts filtered by profile field.");
}

main().catch(err => { console.error(err); process.exit(1); });
