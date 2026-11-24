import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const password = (value) => bcrypt.hashSync(value, 10);

async function reset() {
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.saleItem.deleteMany(),
    db.stockMovement.deleteMany(),
    db.sale.deleteMany(),
    db.payment.deleteMany(),
    db.referral.deleteMany(),
    db.referralCode.deleteMany(),
    db.product.deleteMany(),
    db.outlet.deleteMany(),
    db.subscription.deleteMany(),
    db.membership.deleteMany(),
    db.session.deleteMany(),
    db.tenant.deleteMany(),
    db.user.deleteMany(),
  ]);
}

async function createUser({ name, email, plainPassword }) {
  return db.user.create({
    data: { name, email, passwordHash: password(plainPassword), emailVerifiedAt: new Date() },
    select: { id: true, name: true, email: true },
  });
}

async function createTenant({ name, slug, ownerId, plan = "FREE", role = "OWNER", agencyId }) {
  const tenant = await db.tenant.create({
    data: { name, slug, ownerId, plan },
    select: { id: true, name: true, slug: true },
  });
  await db.membership.create({ data: { userId: ownerId, tenantId: tenant.id, role } });
  await db.outlet.create({ data: { tenantId: tenant.id, name: "Kasir Utama" } });
  await db.subscription.create({ data: { tenantId: tenant.id, plan, status: "ACTIVE" } });
  if (agencyId && agencyId !== ownerId) {
    await db.membership.create({ data: { userId: agencyId, tenantId: tenant.id, role: "AGENCY" } });
  }
  return tenant;
}

async function addProduct(tenantId, name, price, cost, stock, minStock, sku) {
  return db.product.create({
    data: { tenantId, name, price, cost, stock, minStock, sku },
    select: { id: true, name: true, sku: true, price: true, cost: true, stock: true },
  });
}

async function addSale({ tenantId, cashierId, products, lines, discount, daysAgo }) {
  const selected = lines.map(({ index, qty }) => ({ product: products[index], qty }));
  const subtotal = selected.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const total = subtotal - discount;
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const suffix = Math.random().toString(16).slice(2, 8).toUpperCase();

  await db.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        tenantId,
        outletId: (await tx.outlet.findFirstOrThrow({ where: { tenantId }, select: { id: true } })).id,
        cashierId,
        number: `INV-${createdAt.toISOString().slice(0, 10).replace(/-/g, "")}-${suffix}`,
        subtotal,
        discount,
        total,
        paid: total,
        method: "CASH",
        createdAt,
        items: {
          create: selected.map((item) => ({
            productId: item.product.id,
            nameSnapshot: item.product.name,
            qty: item.qty,
            price: item.product.price,
            cost: item.product.cost,
          })),
        },
      },
      select: { id: true, number: true },
    });

    for (const item of selected) {
      await tx.product.update({ where: { id: item.product.id }, data: { stock: { decrement: item.qty } } });
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: item.product.id,
          delta: -item.qty,
          type: "SALE",
          note: `Penjualan ${sale.number}`,
          refId: `sale:${sale.id}:${item.product.id}`,
          createdAt,
        },
      });
    }
  });
}

async function main() {
  await reset();

  const admin = await createUser({ name: "Admin Kasirku", email: "admin@kasirku.test", plainPassword: "admin12345" });
  const agency = await createUser({ name: "Rani Agensi", email: "agency@kasirku.test", plainPassword: "agency12345" });
  const kopiOwner = await createUser({ name: "Dimas", email: "kopi@kasirku.test", plainPassword: "demo12345" });
  const bajuOwner = await createUser({ name: "Sinta", email: "baju@kasirku.test", plainPassword: "demo12345" });

  await createTenant({ name: "Kasirku HQ", slug: "kasirku-hq", ownerId: admin.id, role: "ADMIN" });
  const agensi = await createTenant({ name: "Agensi Kreatif", slug: "agensi-kreatif", ownerId: agency.id, plan: "AGENCY" });
  const kopi = await createTenant({
    name: "Kopi Senja",
    slug: "kopi-senja",
    ownerId: kopiOwner.id,
    plan: "PRO",
    agencyId: agency.id,
  });
  const baju = await createTenant({
    name: "Baju Rapi",
    slug: "baju-rapi",
    ownerId: bajuOwner.id,
    agencyId: agency.id,
  });

  const code = await db.referralCode.create({
    data: { agencyId: agency.id, code: "RANI15", commissionBps: 1500 },
    select: { id: true, code: true },
  });
  for (const tenant of [agensi, kopi, baju]) {
    await db.referral.create({
      data: { codeId: code.id, agencyId: agency.id, tenantId: tenant.id, commissionBps: 1500 },
    });
  }

  const kopiProducts = [
    await addProduct(kopi.id, "Kopi Americano", 18000, 6000, 40, 10, "KS-AMER-001"),
    await addProduct(kopi.id, "Kopi Latte", 22000, 8000, 30, 10, "KS-LATE-002"),
    await addProduct(kopi.id, "Croissant", 15000, 5000, 18, 5, "KS-CROI-003"),
    await addProduct(kopi.id, "Teh Hangat", 8000, 2000, 25, 5, "KS-TEH-004"),
  ];
  await addProduct(kopi.id, "Kue Coklat", 12000, 4000, 3, 5, "KS-KUE-005");

  for (const [index, daysAgo] of [0, 0, 1, 2, 3, 5, 8, 12].entries()) {
    await addSale({
      tenantId: kopi.id,
      cashierId: kopiOwner.id,
      products: kopiProducts,
      lines: [
        { index: index % kopiProducts.length, qty: 1 + (index % 2) },
        { index: (index + 1) % kopiProducts.length, qty: 1 },
      ],
      discount: index % 3 === 0 ? 2000 : 0,
      daysAgo,
    });
  }

  const bajuProducts = [
    await addProduct(baju.id, "Kaos Polos", 65000, 35000, 24, 6, "BR-KAOS-001"),
    await addProduct(baju.id, "Kemeja Flanel", 129000, 75000, 12, 4, "BR-FLAN-002"),
    await addProduct(baju.id, "Tote Bag", 45000, 20000, 2, 5, "BR-TOTE-003"),
  ];
  await addSale({
    tenantId: baju.id,
    cashierId: bajuOwner.id,
    products: bajuProducts,
    lines: [{ index: 0, qty: 2 }],
    discount: 5000,
    daysAgo: 1,
  });

  await db.payment.create({
    data: {
      tenantId: baju.id,
      amount: 199000,
      plan: "PRO",
      method: "TRANSFER",
      proof: "Transfer BCA 24 Nov 2026",
      status: "PENDING",
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Seed selesai.");
  console.log("Admin      : admin@kasirku.test / admin12345");
  console.log("Agensi     : agency@kasirku.test / agency12345 (kode RANI15)");
  console.log("Kopi Senja : kopi@kasirku.test / demo12345");
  console.log("Baju Rapi  : baju@kasirku.test / demo12345");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
