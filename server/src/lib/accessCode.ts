import crypto from "crypto";
import { prisma } from "./prisma";

// Excludes visually-ambiguous characters (0/O, 1/I/L) since this is meant to be read off
// a screen and typed on a phone keyboard by a field salesperson.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomSegment(length: number): string {
  return Array.from(crypto.randomBytes(length))
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join("");
}

/** Generates a unique "SG-XXXXXX" access code, retrying on the rare unique-constraint
 * collision rather than trusting randomness alone to never repeat. */
export async function generateUniqueAccessCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `SG-${randomSegment(6)}`;
    const existing = await prisma.salesperson.findUnique({ where: { accessCode: code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique access code after 10 attempts");
}
