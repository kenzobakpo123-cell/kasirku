import { z } from "zod";

// bcryptjs memotong input setelah 72 byte, bukan 72 karakter.
export const passwordSchema = z
  .string()
  .min(8)
  .max(100)
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, {
    message: "Password maksimal 72 byte",
  });

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(120),
  password: passwordSchema,
  tenantName: z.string().trim().min(2).max(120),
  referralCode: z.string().trim().min(4).max(24).optional(),
});

export const loginSchema = z.object({
  email: z.email().max(120),
  password: z.string().min(1).max(100),
});

export const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  sku: z.string().trim().max(64).optional(),
  imageData: z
    .string()
    .max(2_000_000, "Gambar terlalu besar")
    .regex(/^data:image\/(png|jpeg|webp|svg\+xml);base64,/, "Format gambar tidak didukung")
    .nullish(),
  price: z.number().int().positive().max(2_000_000_000),
  cost: z.number().int().nonnegative().max(2_000_000_000).default(0),
  stock: z.number().int().nonnegative().max(10_000_000).default(0),
  minStock: z.number().int().nonnegative().max(10_000_000).default(0),
  outletId: z.number().int().positive().optional(),
});

export const customerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z
    .email()
    .max(120)
    .transform((value) => value.toLowerCase()),
  note: z.string().trim().max(200).optional(),
});

export const customerUpdateSchema = customerSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Minimal satu field harus diisi" },
);

export const saleSchema = z.object({
  outletId: z.number().int().positive(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        qty: z.number().int().positive().max(10_000),
      }),
    )
    .min(1)
    .max(200),
  discount: z.number().int().nonnegative().default(0),
  paid: z.number().int().nonnegative().max(2_000_000_000),
  method: z.enum(["CASH", "QRIS", "TRANSFER", "OTHER"]).default("CASH"),
  note: z.string().trim().max(200).optional(),
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
  customerName: z.string().trim().min(1).max(120),
  customerEmail: z
    .email()
    .max(120)
    .transform((value) => value.toLowerCase()),
  // Transaksi baru selalu email; NONE hanya dipakai data historis/seed.
  receiptChannel: z.literal("EMAIL").default("EMAIL"),
});

export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
