import type { EmailTokenType } from "@prisma/client";
import { db } from "@/lib/db";
import { hashToken, newToken } from "@/lib/tokens";

const TTL: Record<EmailTokenType, number> = {
  VERIFY: 24 * 60 * 60_000,
  RESET: 60 * 60_000,
};

/** Token mentah dikembalikan sekali; hanya hash yang disimpan. */
export async function createEmailToken(userId: number, type: EmailTokenType): Promise<string> {
  const token = newToken();
  await db.emailToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TTL[type]),
    },
  });
  return token;
}

/** Pakai updateMany bersyarat agar token hanya bisa dipakai sekali (idempoten). */
export async function consumeEmailToken(token: string, type: EmailTokenType): Promise<number | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await db.emailToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true, type: true },
  });
  if (!row || row.type !== type || row.usedAt || row.expiresAt <= new Date()) return null;

  const claimed = await db.emailToken.updateMany({
    where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  return claimed.count === 1 ? row.userId : null;
}
