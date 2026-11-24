import { NextRequest, NextResponse } from "next/server";
import { tenantContext } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { customerSchema, isDuplicateKeyError } from "@/lib/schemas";
import { canUseCashier } from "@/lib/tenant";
import { forbidden, isSameOrigin } from "@/lib/security";

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? 100);
  if (!Number.isSafeInteger(parsed)) return 100;
  return Math.min(Math.max(parsed, 1), 200);
}

export async function GET(req: NextRequest) {
  const auth = await tenantContext(req);
  if (auth.error) return auth.error;

  const query = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  const customers = await db.customer.findMany({
    where: {
      tenantId: auth.ctx.tenantId,
      ...(query
        ? { OR: [{ name: { contains: query } }, { email: { contains: query } }] }
        : {}),
    },
    orderBy: { name: "asc" },
    take: parseLimit(req.nextUrl.searchParams.get("limit")),
    select: {
      id: true,
      name: true,
      email: true,
      note: true,
      createdAt: true,
      _count: { select: { sales: true } },
    },
  });

  const ids = customers.map((customer) => customer.id);
  const summaries = ids.length
    ? await db.sale.groupBy({
        by: ["customerId"],
        where: { tenantId: auth.ctx.tenantId, customerId: { in: ids } },
        _sum: { total: true },
        _max: { createdAt: true },
      })
    : [];
  const summaryByCustomer = new Map(
    summaries
      .filter((summary) => summary.customerId !== null)
      .map((summary) => [summary.customerId as number, summary]),
  );

  return NextResponse.json({
    customers: customers.map((customer) => {
      const summary = summaryByCustomer.get(customer.id);
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        note: customer.note,
        createdAt: customer.createdAt,
        salesCount: customer._count.sales,
        totalSpent: summary?._sum.total ?? 0,
        lastVisit: summary?._max.createdAt ?? null,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return forbidden();

  const auth = await tenantContext(req);
  if (auth.error) return auth.error;
  if (!canUseCashier(auth.ctx.membership.role)) {
    return NextResponse.json({ error: "Role ini tidak bisa menambah member." }, { status: 403 });
  }

  const parsed = customerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data member tidak valid" }, { status: 400 });
  }

  try {
    const customer = await db.customer.create({
      data: { tenantId: auth.ctx.tenantId, ...parsed.data },
      select: { id: true, name: true, email: true },
    });

    void audit({
      action: "CUSTOMER_ADD",
      tenantId: auth.ctx.tenantId,
      userId: auth.ctx.viewer.uid,
      entity: "Customer",
      entityId: customer.id,
      req,
    });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: "Email ini sudah terdaftar sebagai member." }, { status: 409 });
    }
    throw error;
  }
}
