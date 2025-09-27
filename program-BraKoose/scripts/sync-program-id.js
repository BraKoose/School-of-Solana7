#!/usr/bin/env node
/**
 * Sync program ID from Anchor.toml into:
 *  - anchor_project/programs/pop_profiles/src/lib.rs (declare_id!)
 *  - frontend/src/demo.ts (PROGRAM_ID constant)
 *
 * Usage:
 *   node scripts/sync-program-id.js [cluster]
 * Where cluster is one of: localnet, devnet (defaults to value under [provider].cluster or localnet)
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const anchorTomlPath = path.join(repoRoot, 'anchor_project', 'Anchor.toml');
const libRsPath = path.join(repoRoot, 'anchor_project', 'programs', 'pop_profiles', 'src', 'lib.rs');
const demoTsPath = path.join(repoRoot, 'frontend', 'src', 'demo.ts');

function readFile(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
}

function parseAnchorToml(text) {
  // Very small TOML parser for the specific sections we need
  // Detect current cluster from [provider] section
  const providerClusterMatch = text.match(/\[provider\][\s\S]*?cluster\s*=\s*"(.*?)"/i);
  const providerCluster = providerClusterMatch ? providerClusterMatch[1] : 'localnet';

  function programIdFor(cluster) {
    const re = new RegExp(`\\[programs\\.${cluster}\\][\\s\\S]*?pop_profiles\\s*=\\s*"([^"]+)"`, 'i');
    const m = text.match(re);
    return m ? m[1] : null;
  }

  return { providerCluster, programIdFor };
}

function replaceDeclareId(src, newId) {
  const re = /declare_id!\("[^"]+"\);/;
  if (!re.test(src)) throw new Error('Could not find declare_id! macro in lib.rs');
  return src.replace(re, `declare_id!("${newId}");`);
}

function replaceProgramIdInDemo(src, newId) {
  const re = /const PROGRAM_ID = new PublicKey\("[^"]+"\);/;
  if (!re.test(src)) return src; // demo may be reading dynamically; no hard-coded const found
  return src.replace(re, `const PROGRAM_ID = new PublicKey("${newId}");`);
}

function main() {
  const anchorToml = readFile(anchorTomlPath);
  if (!anchorToml) {
    console.error('Anchor.toml not found at', anchorTomlPath);
    process.exit(1);
  }

  const { providerCluster, programIdFor } = parseAnchorToml(anchorToml);
  const argCluster = process.argv[2];
  const cluster = argCluster || providerCluster || 'localnet';
  const programId = programIdFor(cluster) || programIdFor('localnet') || programIdFor('devnet');
  if (!programId) {
    console.error('Could not find program ID for cluster', cluster, 'in Anchor.toml');
    process.exit(1);
  }

  // Update lib.rs
  const libRs = readFile(libRsPath);
  if (libRs) {
    const updated = replaceDeclareId(libRs, programId);
    if (updated !== libRs) {
      writeFile(libRsPath, updated);
      console.log('Updated declare_id! in', libRsPath);
    } else {
      console.log('declare_id! already up to date in', libRsPath);
    }
  } else {
    console.warn('lib.rs not found at', libRsPath);
  }

  // Update frontend demo if the constant exists
  const demoTs = readFile(demoTsPath);
  if (demoTs) {
    const updatedDemo = replaceProgramIdInDemo(demoTs, programId);
    if (updatedDemo !== demoTs) {
      writeFile(demoTsPath, updatedDemo);
      console.log('Updated PROGRAM_ID in', demoTsPath);
    } else {
      console.log('PROGRAM_ID in demo.ts already matches or not hard-coded.');
    }
  }

  console.log('Program ID sync complete for cluster', cluster, '->', programId);
}

main();
