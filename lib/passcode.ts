import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Whether a typed passcode is the one in the environment, for the gates that
 * check against a single shared value: the hosts' passphrase and the
 * helpers' code.
 *
 * Hashing first gives both sides a fixed length, so the comparison can't leak
 * the passcode one character at a time through response timing.
 */
export function passcodeMatches(input: string, expected: string) {
  return timingSafeEqual(
    createHash("sha256").update(input).digest(),
    createHash("sha256").update(expected).digest(),
  );
}
