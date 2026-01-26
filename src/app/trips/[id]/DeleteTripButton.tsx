'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  tripId: string;
}

export default function DeleteTripButton({ tripId }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this trip? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete trip");
      }

      router.push("/trips");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Failed to delete trip");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-1 text-xs">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded border border-red-500/70 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
      >
        {deleting ? "Deleting..." : "Delete trip"}
      </button>
      {error && <p className="text-red-300">{error}</p>}
    </div>
  );
}
