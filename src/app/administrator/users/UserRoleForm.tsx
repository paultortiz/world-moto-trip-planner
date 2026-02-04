"use client";

import { useState } from "react";

interface Props {
  userId: string;
  initialRole: string;
}

const ROLE_OPTIONS = ["USER", "SPONSOR", "ADMIN"] as const;

export default function UserRoleForm({ userId, initialRole }: Props) {
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleChange(nextRole: string) {
    setRole(nextRole);
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: nextRole }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update role");
      }

      setStatus("Role updated.");
    } catch (err: any) {
      setStatus(err?.message ?? "Failed to update role");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 text-xs">
      <select
        className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
        value={role}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value)}
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {status && <p className="text-[10px] text-slate-400">{status}</p>}
    </div>
  );
}
