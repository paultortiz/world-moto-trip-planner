"use client";

import { useState } from "react";
import NewMotorcycleForm from "./NewMotorcycleForm";

interface MotorcyclesClientProps {
  motorcycles: any[];
}

export default function MotorcyclesClient({ motorcycles }: MotorcyclesClientProps) {
  const [items, setItems] = useState(motorcycles);
  const [status, setStatus] = useState<string | null>(null);

  async function createMotorcycle(year: number | null, make: string, model: string) {
    setStatus(null);
    try {
      const res = await fetch("/api/motorcycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, make, model }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create motorcycle");
      }
      const created = await res.json();
      setItems((prev) => [created, ...prev]);

      // Best-effort: immediately fetch AI specs for this bike so Garage entries are enriched.
      try {
        const aiRes = await fetch("/api/ai/motorcycle-specs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            motorcycleId: created.id,
            year: created.year,
            make: created.make,
            model: created.model,
          }),
        });

        if (aiRes.ok) {
          const data = await aiRes.json().catch(() => null);
          const aiMoto = data?.motorcycle ?? created;
          setItems((prev) => prev.map((m: any) => (m.id === aiMoto.id ? { ...m, ...aiMoto } : m)));
          setStatus("Motorcycle added with estimated specs.");
        } else {
          const data = await aiRes.json().catch(() => null);
          setStatus(
            `Motorcycle added, but specs could not be fetched: ${
              data?.error ?? "AI lookup failed"
            }`,
          );
        }
      } catch {
        setStatus(
          "Motorcycle added, but specs could not be fetched right now. You can try again from a trip later.",
        );
      }
    } catch (err: any) {
      setStatus(err?.message ?? "Failed to create motorcycle");
    }
  }

  async function updateMotorcycle(
    id: string,
    preferredRangeKm: number | null,
    preferredReserveKm: number | null,
    year: number | null,
    make: string,
    model: string,
  ) {
    setStatus(null);
    try {
      const res = await fetch(`/api/motorcycles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredRangeKm, preferredReserveKm, year, make, model }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update motorcycle");
      }
      const updated = await res.json();
      setItems((prev) => prev.map((m: any) => (m.id === updated.id ? updated : m)));
      setStatus("Motorcycle updated.");
    } catch (err: any) {
      setStatus(err?.message ?? "Failed to update motorcycle");
    }
  }

  async function deleteMotorcycle(id: string) {
    setStatus(null);
    try {
      const res = await fetch(`/api/motorcycles/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete motorcycle");
      }
      setItems((prev) => prev.filter((m: any) => m.id !== id));
      setStatus("Motorcycle deleted.");
    } catch (err: any) {
      setStatus(err?.message ?? "Failed to delete motorcycle");
    }
  }

  async function setDefaultMotorcycle(id: string | null) {
    setStatus(null);
    try {
      if (!id) {
        const currentDefault = items.find((m: any) => m.isDefaultForNewTrips);
        if (!currentDefault) return;

        const res = await fetch(`/api/motorcycles/${currentDefault.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDefaultForNewTrips: false }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to clear default motorcycle");
        }

        setItems((prev) => prev.map((m: any) => ({ ...m, isDefaultForNewTrips: false })));
        setStatus("Default motorcycle cleared.");
        return;
      }

      const res = await fetch(`/api/motorcycles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefaultForNewTrips: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to set default motorcycle");
      }
      const updated = await res.json();
      setItems((prev) =>
        prev.map((m: any) => ({
          ...m,
          isDefaultForNewTrips: m.id === updated.id,
        })),
      );
      setStatus("Default motorcycle for new trips updated.");
    } catch (err: any) {
      setStatus(err?.message ?? "Failed to update default motorcycle");
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-4 space-y-2 rounded border border-adv-border bg-slate-900/70 p-4 text-xs text-slate-200 shadow-adv-glow">
        <NewMotorcycleForm onCreate={createMotorcycle} />
        <p className="mt-4 text-sm text-slate-400">
          You don&apos;t have any motorcycles saved yet. From a trip detail page you can enter a bike and
          fetch specs from AI; it will show up here automatically.
        </p>
        <div aria-live="polite" role="status">
          {status && <p className="mt-1 text-[11px] text-slate-300">{status}</p>}
        </div>
      </div>
    );
  }

  const currentDefault = items.find((m: any) => m.isDefaultForNewTrips);

  return (
    <div className="mt-4 space-y-2 rounded border border-adv-border bg-slate-900/70 p-4 text-xs text-slate-200 shadow-adv-glow">
      <NewMotorcycleForm onCreate={createMotorcycle} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-300">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-slate-500">Default bike for new trips</span>
          {currentDefault ? (
            <span className="text-[11px] font-semibold text-emerald-300">
              {currentDefault.displayName ||
                `${currentDefault.year ?? ""} ${currentDefault.make ?? ""} ${currentDefault.model ?? ""}`.trim()}
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">None selected. New trips won&apos;t pre-fill a motorcycle.</span>
          )}
          <span className="text-[10px] text-slate-500">
            New trips will start with this bike selected, but you can always change it per trip.
          </span>
        </div>
        {currentDefault && (
          <button
            type="button"
            onClick={() => setDefaultMotorcycle(null)}
            className="self-start rounded border border-slate-600 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
          >
            Clear default
          </button>
        )}
      </div>
      <ul className="mt-2 space-y-2">
        {items.map((moto: any) => {
          const [range, reserve] = [
            typeof moto.preferredRangeKm === "number" ? moto.preferredRangeKm : moto.estimatedRangeKm,
            typeof moto.preferredReserveKm === "number" ? moto.preferredReserveKm : null,
          ];
          return (
            <MotorcycleRow
              key={moto.id}
              moto={moto}
              initialRange={range ?? ""}
              initialReserve={reserve ?? ""}
              onSave={updateMotorcycle}
              onDelete={deleteMotorcycle}
              onSetDefault={setDefaultMotorcycle}
            />
          );
        })}
      </ul>
      <div aria-live="polite" role="status">
        {status && <p className="mt-1 text-[11px] text-slate-300">{status}</p>}
      </div>
    </div>
  );
}

interface MotorcycleRowProps {
  moto: any;
  initialRange: number | "";
  initialReserve: number | "";
  onSave: (
    id: string,
    range: number | null,
    reserve: number | null,
    year: number | null,
    make: string,
    model: string,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
}

function MotorcycleRow({ moto, initialRange, initialReserve, onSave, onDelete, onSetDefault }: MotorcycleRowProps) {
  const [rangeInput, setRangeInput] = useState<string>(
    initialRange === "" ? "" : String(initialRange),
  );
  const [reserveInput, setReserveInput] = useState<string>(
    initialReserve === "" ? "" : String(initialReserve),
  );
  const [yearInput, setYearInput] = useState<string>(
    typeof moto.year === "number" ? String(moto.year) : "",
  );
  const [makeInput, setMakeInput] = useState<string>(moto.make ?? "");
  const [modelInput, setModelInput] = useState<string>(moto.model ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <li className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-950/70 p-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-semibold text-slate-100">
            {moto.displayName || `${yearInput || ""} ${makeInput || ""} ${modelInput || ""}`.trim()}
          </p>
          {typeof moto._count?.trips === "number" && moto._count.trips > 0 && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
              In use by {moto._count.trips} trip{moto._count.trips === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-300">
          {typeof moto.engineDisplacementCc === "number" && (
            <span>Engine: {moto.engineDisplacementCc} cc</span>
          )}
          {typeof moto.wetWeightKg === "number" && <span>Wet weight: {moto.wetWeightKg} kg</span>}
          {typeof moto.fuelCapacityLiters === "number" && (
            <span>Fuel: {moto.fuelCapacityLiters.toFixed(1)} L</span>
          )}
          {typeof moto.estimatedRangeKm === "number" && (
            <span>Est. range: {moto.estimatedRangeKm} km</span>
          )}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-end gap-3 text-[11px] text-slate-300 sm:mt-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400">Year</span>
          <input
            type="number"
            min={1970}
            max={2100}
            className="w-20 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
            value={yearInput}
            onChange={(e) => setYearInput(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-slate-400">Make</span>
          <input
            type="text"
            className="w-24 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
            value={makeInput}
            onChange={(e) => setMakeInput(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          ￼<span className="text-slate-400">Model</span>
          <input
            type="text"
            className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
            value={modelInput}
            onChange={(e) => setModelInput(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-slate-400">Preferred range (km)</span>
          <input
            type="number"
            min={0}
            className="w-24 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-slate-400">Preferred reserve (km)</span>
          <input
            type="number"
            min={0}
            className="w-24 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
            value={reserveInput}
            onChange={(e) => setReserveInput(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            const rangeVal = rangeInput.trim() === "" ? null : Number(rangeInput);
            const reserveVal = reserveInput.trim() === "" ? null : Number(reserveInput);
            const yearVal = yearInput.trim() === "" ? null : Number(yearInput);
            await onSave(moto.id, rangeVal, reserveVal, yearVal, makeInput, modelInput);
            setSaving(false);
          }}
          className="rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          disabled={moto.isDefaultForNewTrips}
          onClick={async () => {
            await onSetDefault(moto.id);
          }}
          className="rounded border border-emerald-500 px-3 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
        >
          {moto.isDefaultForNewTrips ? "Default for new trips" : "Set as default"}
        </button>
        <button
          type="button"
          disabled={deleting || (typeof moto._count?.trips === "number" && moto._count.trips > 0)}
          onClick={async () => {
            if (typeof moto._count?.trips === "number" && moto._count.trips > 0) {
              alert(
                "This motorcycle is in use by one or more trips. Detach it from those trips before deleting.",
              );
              return;
            }
            if (
              !window.confirm(
                "Delete this motorcycle from your garage? It will be permanently removed.",
              )
            ) {
              return;
            }
            setDeleting(true);
            await onDelete(moto.id);
            setDeleting(false);
          }}
          className="rounded border border-red-600 px-3 py-1 text-[11px] text-red-300 hover:bg-red-600/20 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </li>
  );
}
