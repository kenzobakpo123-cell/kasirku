import { PrismaClient } from "@prisma/client";

const globalForDb = globalThis as unknown as { kasirkuDb?: PrismaClient };

export const db = globalForDb.kasirkuDb ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForDb.kasirkuDb = db;
