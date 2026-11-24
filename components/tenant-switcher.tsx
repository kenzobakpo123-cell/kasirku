"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MembershipInfo } from "@/lib/tenant";

export function TenantSwitcher({
  memberships,
  activeTenantId,
}: {
  memberships: MembershipInfo[];
  activeTenantId: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function change(tenantId: number) {
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/auth/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) {
        setError("Gagal mengganti toko.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <select
        value={activeTenantId}
        disabled={pending || memberships.length === 0}
        onChange={(event) => change(Number(event.target.value))}
        aria-label="Pilih toko aktif"
      >
        {memberships.map((item) => (
          <option key={item.tenantId} value={item.tenantId}>
            {item.tenant.name} · {item.role}
          </option>
        ))}
      </select>
      {error ? <span className="small" style={{ color: "#f2b8b4", display: "block", marginTop: 6 }}>{error}</span> : null}
    </div>
  );
}
