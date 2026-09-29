/**
 * Password hashing for the SecondBrain accounts.
 *
 * scrypt from `node:crypto` rather than Web Crypto, which has no password KDF
 * at all — PBKDF2 is the closest it offers and it is the weakest of the three
 * standard choices against GPU attack. Unlike `lib/hmac.ts`, nothing here ever
 * has to run inside `proxy.ts`: the proxy checks a signature, and only a route
 * handler or a server action ever verifies a password. So the Node runtime is
 * available and there is no reason not to use it.
 *
 * scrypt rather than argon2 or bcrypt because it is memory-hard AND it is in
 * the standard library. A dependency that holds the password hashing for a
 * personal site is a supply-chain surface that has to be watched forever; this
 * one ships with the runtime.
 *
 * Nothing in this file is a secret. The salt and the parameters are stored in
 * the clear alongside the hash, which is how every password format works: the
 * cost is the defence, not the obscurity.
 */

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/**
 * Promisified by hand rather than with `promisify`: scrypt is overloaded, and
 * `promisify` resolves to the three-argument signature, so passing options
 * (which is mandatory here — see MAX_MEM) fails to typecheck.
 */
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/**
 * Cost parameters, written into every hash so they can be raised later without
 * invalidating what is already stored.
 *
 * N=2^16 with r=8 needs 128 * N * r ≈ 64 MB per hash. That is deliberately
 * more than the usual 16 MB: sign-ins here are rare (one person, once a month)
 * so the cost falls entirely on an attacker with a copy of the table, for whom
 * 64 MB per guess is the difference between renting one GPU and renting many.
 */
const PARAMS = { N: 2 ** 16, r: 8, p: 1 };

/** Bytes. 16 is the usual floor; 32 costs nothing and removes the question. */
const SALT_BYTES = 32;
const KEY_BYTES = 64;

/**
 * Node's default `maxmem` is 32 MB and the parameters above need twice that,
 * so without this every call throws "memory limit exceeded". Raised to 128 MB
 * rather than exactly 64 so a future bump of N doesn't reintroduce the same
 * failure at the worst possible moment.
 */
const MAX_MEM = 128 * 1024 * 1024;

/** `scrypt$N$r$p$salt$hash`, both fields base64. */
const PREFIX = "scrypt";

async function derive(
  password: string,
  salt: Buffer,
  params: typeof PARAMS,
): Promise<Buffer> {
  return scrypt(password.normalize("NFKC"), salt, KEY_BYTES, {
    ...params,
    maxmem: MAX_MEM,
  });
}

/** The encoded hash to store. A fresh salt every call, so two users with the
 * same password get different rows and one cracked hash proves nothing about
 * the other. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, PARAMS);

  return [
    PREFIX,
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

/**
 * Whether the password matches the stored hash.
 *
 * Returns false rather than throwing on a malformed hash: a corrupt row is a
 * failed sign-in, not a 500 that tells whoever is trying that they found
 * something interesting.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== PREFIX) return false;

  const [, rawN, rawR, rawP, rawSalt, rawKey] = parts;
  const params = { N: Number(rawN), r: Number(rawR), p: Number(rawP) };
  if (!Object.values(params).every((n) => Number.isInteger(n) && n > 0)) {
    return false;
  }

  try {
    const salt = Buffer.from(rawSalt, "base64");
    const expected = Buffer.from(rawKey, "base64");
    if (salt.length === 0 || expected.length === 0) return false;

    const actual = await derive(password, salt, params);

    // Length must match before timingSafeEqual, which throws on a mismatch
    // rather than returning false.
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    // Bad base64, or parameters so large scrypt refuses them — both are a
    // broken row rather than a correct password.
    return false;
  }
}

/**
 * Whether a stored hash was written with weaker parameters than the current
 * ones, so a successful sign-in can quietly rewrite it at the new cost. Nobody
 * has to be told to change their password to benefit from a raised N.
 */
export function needsRehash(stored: string): boolean {
  const [prefix, n, r, p] = stored.split("$");
  if (prefix !== PREFIX) return true;
  return (
    Number(n) < PARAMS.N || Number(r) < PARAMS.r || Number(p) < PARAMS.p
  );
}
