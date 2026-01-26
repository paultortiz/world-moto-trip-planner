'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tripId: string;
}

export default function RecalculateRouteButton({ tripId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  async function handleClick() {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/routes/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Request failed");
        }

        setStatus("Route recalculated.");
        router.refresh();
      } catch (err: any) {
        setStatus(`Error: ${err.message ?? "Failed to recalculate route"}`);
      }
    });
  }

  return (
    <div className="space-y-1 text-xs">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded bg-adv-accent px-3 py-1 text-xs font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
      >
        {pending ? "Recalculating..." : "Recalculate route"}
      </button>
      {status && <p className="text-slate-300">{status}</p>}
    </div>
  );
}
