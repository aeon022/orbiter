/**
 * orbiter encrypt / orbiter decrypt
 * AES-256-GCM encryption of .pod files for safe storage in git / cloud.
 *
 * Format: ORBENC | version(1) | salt(32) | iv(12) | authTag(16) | ciphertext
 *
 * Usage:
 *   orbiter encrypt [--pod ./content.pod] [--out ./content.pod.enc] [--key <pass>]
 *   orbiter decrypt [--in ./content.pod.enc] [--out ./content.pod]  [--key <pass>]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { askSecret, closeRl } from './prompt.js';

const MAGIC   = Buffer.from('ORBENC');
const VERSION = 0x01;
const SCRYPT  = { N: 1 << 14, r: 8, p: 1 };

function deriveKey(passphrase, salt) {
  return scryptSync(passphrase, salt, 32, SCRYPT);
}

function arg(args, flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

export async function runEncrypt(args) {
  const podArg = arg(args, '--pod') ?? 'content.pod';
  const podPath = resolve(process.cwd(), podArg);
  const outPath = resolve(process.cwd(), arg(args, '--out') ?? (podArg + '.enc'));
  let   key     = arg(args, '--key');

  if (!existsSync(podPath)) { console.error(`\n  ✕  Pod not found: ${podPath}\n`); process.exit(1); }

  if (!key) {
    key = await askSecret('Encryption passphrase');
    const confirm = await askSecret('Confirm passphrase');
    closeRl();
    if (key !== confirm) { console.error('\n  ✕  Passphrases do not match.\n'); process.exit(1); }
  } else {
    closeRl();
  }

  console.log(`\n  ◆  Orbiter Encrypt\n  ${basename(podPath)}  →  ${basename(outPath)}\n`);

  const plain  = readFileSync(podPath);
  const salt   = randomBytes(32);
  const iv     = randomBytes(12);
  const dk     = deriveKey(key, salt);
  const cipher = createCipheriv('aes-256-gcm', dk, iv);
  const ct     = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag    = cipher.getAuthTag();

  const out = Buffer.concat([MAGIC, Buffer.from([VERSION]), salt, iv, tag, ct]);
  writeFileSync(outPath, out);

  const kb = (out.length / 1024).toFixed(1);
  console.log(`  ✓  Encrypted → ${outPath}  (${kb} KB)\n`);
  console.log(`  Keep the passphrase safe — it cannot be recovered.\n`);
}

export async function runDecrypt(args) {
  const inArg   = arg(args, '--in') ?? arg(args, '--pod') ?? 'content.pod.enc';
  const inPath  = resolve(process.cwd(), inArg);
  const defaultOut = inPath.endsWith('.enc') ? inPath.slice(0, -4) : inPath + '.dec';
  const outPath = resolve(process.cwd(), arg(args, '--out') ?? defaultOut);
  let   key     = arg(args, '--key');

  if (!existsSync(inPath)) { console.error(`\n  ✕  File not found: ${inPath}\n`); process.exit(1); }

  if (!key) {
    key = await askSecret('Passphrase');
    closeRl();
  } else {
    closeRl();
  }

  console.log(`\n  ◆  Orbiter Decrypt\n  ${basename(inPath)}  →  ${basename(outPath)}\n`);

  const buf = readFileSync(inPath);

  if (!buf.slice(0, 6).equals(MAGIC)) {
    console.error('  ✕  Not a valid .pod.enc file (magic mismatch).\n');
    process.exit(1);
  }
  const version = buf[6];
  if (version !== VERSION) {
    console.error(`  ✕  Unsupported format version: ${version}\n`);
    process.exit(1);
  }

  let off = 7;
  const salt = buf.slice(off, off += 32);
  const iv   = buf.slice(off, off += 12);
  const tag  = buf.slice(off, off += 16);
  const ct   = buf.slice(off);

  const dk = deriveKey(key, salt);
  try {
    const decipher = createDecipheriv('aes-256-gcm', dk, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
    writeFileSync(outPath, plain);
    console.log(`  ✓  Decrypted → ${outPath}\n`);
  } catch {
    console.error('  ✕  Decryption failed — wrong passphrase or corrupted file.\n');
    process.exit(1);
  }
}
