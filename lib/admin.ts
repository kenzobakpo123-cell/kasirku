import { db } from "@/lib/db";

export async function isAdmin(userId: number): Promise<boolean> {
  return Boolean(
    await db.membership.findFirst({
      where: { userId, role: "ADMIN" },
      select: { id: true },
    }),
  );
}
