'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface Props {
  tripId: string;
}

export default function DeleteTripButton({ tripId }: Props) {
  const t = useTranslations("tripDetail");
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(t("deleteConfirm"))) {
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
        throw new Error(data?.error ?? t("failedToDelete"));
      }

      router.push("/trips");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? t("failedToDelete"));
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
        {deleting ? t("deleting") : t("deleteTrip")}
      </button>
      {error && <p className="text-red-300">{error}</p>}
    </div>
  );
}
