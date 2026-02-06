'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface NewTripClientProps {
  motorcycles: any[];
}

export default function NewTripClient({ motorcycles }: NewTripClientProps) {
  const router = useRouter();
  const t = useTranslations("newTrip");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const defaultFromGarage = motorcycles.find((m) => m.isDefaultForNewTrips);
  const [selectedMotorcycleId, setSelectedMotorcycleId] = useState<string>(
    defaultFromGarage?.id ?? "",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          startDate: startDate || null,
          motorcycleId: selectedMotorcycleId || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "Request failed");
      }

      if (data?.id) {
        // Fire route calculation immediately after trip creation so the detail page
        // is likely to show the route on first load. Ignore failures here; the
        // user can always recalc from the trip page.
        try {
          await fetch("/api/routes/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tripId: data.id }),
          });
        } catch {
          // Swallow errors; the recalc button on the trip page is the fallback.
        }

        router.push(`/trips/${data.id}`);
        return;
      }

      setStatus(t("tripCreated"));
      setName("");
      setDescription("");
    } catch (err: any) {
      setStatus(`${t("error")}: ${err.message ?? t("failedToCreate")}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 space-y-4">
      <header className="max-w-5xl">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {t("subtitle")}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {t("garageHint")}
        </p>
      </header>

      <section className="max-w-md rounded border border-adv-border bg-slate-900/80 p-4 shadow-adv-glow">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">{t("tripName")}</label>
            <input
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">{t("description")}</label>
            <textarea
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">{t("startDate")}</label>
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">{t("motorcycle")}</label>
            <select
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm text-slate-200"
              value={selectedMotorcycleId}
              onChange={(e) => setSelectedMotorcycleId(e.target.value)}
            >
              <option value="">{t("noMotorcycle")}</option>
              {motorcycles.map((moto: any) => {
                const baseLabel =
                  moto.displayName ||
                  `${moto.year ?? ""} ${moto.make ?? ""} ${moto.model ?? ""}`.trim() ||
                  "Motorcycle";
                const suffix = moto.isDefaultForNewTrips ? ` ${t("defaultForTrips")}` : "";
                return (
                  <option key={moto.id} value={moto.id}>
                    {baseLabel}
                    {suffix}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              {t("motorcycleHint")}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded bg-adv-accent px-4 py-2 text-sm font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
          >
            {loading ? t("creating") : t("createTrip")}
          </button>
        </form>

        {status && (
          <p className="mt-3 text-xs text-slate-300">{status}</p>
        )}
      </section>

      {/* After creating the trip, the rider will be redirected to the trip
          detail page where the full planning map and Places overlays live. */}
    </main>
  );
}
