import { randomUUID, createHash } from "node:crypto";

export function id(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

/** Deterministic 32-bit seed from any string. Same words → same seed → the
 *  generator reproduces the same look. This is half of how consistency works. */
export function seedFrom(input: string): number {
  const h = createHash("sha256").update(input).digest();
  return h.readUInt32BE(0);
}

export function now(): string {
  return new Date().toISOString();
}
