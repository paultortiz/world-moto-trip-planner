"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import NewMotorcycleForm from "./NewMotorcycleForm";

interface MotorcyclesClientProps {
  motorcycles: any[];
}

/** Convert camelCase spec keys to readable labels with units */
function formatSpecLabel(key: string): string {
  // Map of keys to custom labels
  const labelMap: Record<string, string> = {
    engineDisplacementCc: "Engine Displacement (cc)",
    engineType: "Engine Type",
    engineCooling: "Cooling",
    horsepower: "Horsepower (HP)",
    torqueNm: "Torque (Nm)",
    transmissionType: "Transmission",
    finalDrive: "Final Drive",
    wetWeightKg: "Wet Weight (kg)",
    dryWeightKg: "Dry Weight (kg)",
    fuelCapacityLiters: "Fuel Capacity (L)",
    estimatedRangeKm: "Estimated Range (km)",
    fuelConsumptionLper100km: "Fuel Consumption (L/100km)",
    seatHeightMm: "Seat Height (mm)",
    seatHeightLowMm: "Low Seat Height (mm)",
    groundClearanceMm: "Ground Clearance (mm)",
    wheelbaseMm: "Wheelbase (mm)",
    frontSuspension: "Front Suspension",
    rearSuspension: "Rear Suspension",
    frontSuspensionTravelMm: "Front Suspension Travel (mm)",
    rearSuspensionTravelMm: "Rear Suspension Travel (mm)",
    frontBrake: "Front Brake",
    rearBrake: "Rear Brake",
    absType: "ABS Type",
    tractionControl: "Traction Control",
    ridingModes: "Riding Modes",
    cruiseControl: "Cruise Control",
    quickshifter: "Quickshifter",
    frontTireSize: "Front Tire Size",
    rearTireSize: "Rear Tire Size",
    frontWheelSizeInches: "Front Wheel (in)",
    rearWheelSizeInches: "Rear Wheel (in)",
    wheelType: "Wheel Type",
    windscreen: "Windscreen",
    handguards: "Handguards",
    centerStand: "Center Stand",
    heatedGrips: "Heated Grips",
    heatedSeats: "Heated Seats",
    luggageSystem: "Luggage System",
    usbCharging: "USB Charging",
    dashDisplay: "Dash Display",
    bluetooth: "Bluetooth",
    navigationReady: "Navigation Ready",
    offroadBias: "Offroad Bias",
    highwayComfort: "Highway Comfort",
    passengerComfort: "Passenger Comfort",
    category: "Category",
    msrpUsd: "MSRP (USD)",
    yearIntroduced: "Year Introduced",
    yearDiscontinued: "Year Discontinued",
    notes: "Notes",
  };

  if (labelMap[key]) return labelMap[key];

  // Fallback: convert camelCase to Title Case
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export default function MotorcyclesClient({ motorcycles }: MotorcyclesClientProps) {
  const t = useTranslations("garage");
  const [items, setItems] = useState(motorcycles);
  const [status, setStatus] = useState<string | null>(null);
  const [fetchingSpecsFor, setFetchingSpecsFor] = useState<string | null>(null);
  const [specsJustLoaded, setSpecsJustLoaded] = useState<string | null>(null);

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
        throw new Error(data?.error ?? t("failedToCreate"));
      }
      const created = await res.json();
      setItems((prev) => [created, ...prev]);
      setFetchingSpecsFor(created.id);

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
          setStatus(t("addedWithSpecs"));
          // Briefly highlight the specs button
          setSpecsJustLoaded(aiMoto.id);
          setTimeout(() => setSpecsJustLoaded(null), 3000);
        } else {
          const data = await aiRes.json().catch(() => null);
          setStatus(
            `${t("addedNoSpecs")}: ${
              data?.error ?? t("aiLookupFailed")
            }`,
          );
        }
      } catch {
        setStatus(t("addedSpecsLater"));
      } finally {
        setFetchingSpecsFor(null);
      }
    } catch (err: any) {
      setStatus(err?.message ?? t("failedToCreate"));
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
        throw new Error(data?.error ?? t("failedToUpdate"));
      }
      const updated = await res.json();
      setItems((prev) => prev.map((m: any) => (m.id === updated.id ? updated : m)));
      setStatus(t("updated"));
    } catch (err: any) {
      setStatus(err?.message ?? t("failedToUpdate"));
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
        throw new Error(data?.error ?? t("failedToDelete"));
      }
      setItems((prev) => prev.filter((m: any) => m.id !== id));
      setStatus(t("deleted"));
    } catch (err: any) {
      setStatus(err?.message ?? t("failedToDelete"));
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
          throw new Error(data?.error ?? t("failedToClearDefault"));
        }

        setItems((prev) => prev.map((m: any) => ({ ...m, isDefaultForNewTrips: false })));
        setStatus(t("defaultCleared"));
        return;
      }

      const res = await fetch(`/api/motorcycles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefaultForNewTrips: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? t("failedToSetDefault"));
      }
      const updated = await res.json();
      setItems((prev) =>
        prev.map((m: any) => ({
          ...m,
          isDefaultForNewTrips: m.id === updated.id,
        })),
      );
      setStatus(t("defaultUpdated"));
    } catch (err: any) {
      setStatus(err?.message ?? t("failedToSetDefault"));
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-4 space-y-2 rounded border border-adv-border bg-slate-900/70 p-4 text-xs text-slate-200 shadow-adv-glow">
        <NewMotorcycleForm onCreate={createMotorcycle} />
        <p className="mt-4 text-sm text-slate-400">
          {t("noMotorcycles")}
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
          <span className="text-[10px] uppercase tracking-wide text-slate-500">{t("defaultBikeLabel")}</span>
          {currentDefault ? (
            <span className="text-[11px] font-semibold text-emerald-300">
              {currentDefault.displayName ||
                `${currentDefault.year ?? ""} ${currentDefault.make ?? ""} ${currentDefault.model ?? ""}`.trim()}
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">{t("noDefaultSelected")}</span>
          )}
          <span className="text-[10px] text-slate-500">
            {t("defaultBikeHint")}
          </span>
        </div>
        {currentDefault && (
          <button
            type="button"
            onClick={() => setDefaultMotorcycle(null)}
            className="self-start rounded border border-slate-600 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
          >
            {t("clearDefault")}
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
              isFetchingSpecs={fetchingSpecsFor === moto.id}
              specsJustLoaded={specsJustLoaded === moto.id}
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
  isFetchingSpecs?: boolean;
  specsJustLoaded?: boolean;
}

function MotorcycleRow({ moto, initialRange, initialReserve, onSave, onDelete, onSetDefault, isFetchingSpecs, specsJustLoaded }: MotorcycleRowProps) {
  const t = useTranslations("garage");
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
  const [showSpecs, setShowSpecs] = useState(false);

  return (
    <li className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-950/70 p-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-semibold text-slate-100">
            {moto.displayName || `${yearInput || ""} ${makeInput || ""} ${modelInput || ""}`.trim()}
          </p>
          {typeof moto._count?.trips === "number" && moto._count.trips > 0 && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
              {t("inUseByTrips", { count: moto._count.trips })}
            </span>
          )}
          {isFetchingSpecs && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-900/50 px-2 py-0.5 text-[10px] text-amber-300">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Fetching specs from AI...
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-300">
          {typeof moto.engineDisplacementCc === "number" && (
            <span>{t("engine")}: {moto.engineDisplacementCc} cc</span>
          )}
          {typeof moto.wetWeightKg === "number" && <span>{t("wetWeight")}: {moto.wetWeightKg} kg</span>}
          {typeof moto.fuelCapacityLiters === "number" && (
            <span>{t("fuel")}: {moto.fuelCapacityLiters.toFixed(1)} L</span>
          )}
          {typeof moto.estimatedRangeKm === "number" && (
            <span>{t("estRange")}: {moto.estimatedRangeKm} km</span>
          )}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-end gap-3 text-[11px] text-slate-300 sm:mt-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400">{t("year")}</span>
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
          <span className="text-slate-400">{t("make")}</span>
          <input
            type="text"
            className="w-24 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
            value={makeInput}
            onChange={(e) => setMakeInput(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-slate-400">{t("model")}</span>
          <input
            type="text"
            className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
            value={modelInput}
            onChange={(e) => setModelInput(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-slate-400">{t("preferredRange")}</span>
          <input
            type="number"
            min={0}
            className="w-24 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-slate-400">{t("preferredReserve")}</span>
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
          {saving ? t("saving") : t("save")}
        </button>
        <button
          type="button"
          disabled={moto.isDefaultForNewTrips}
          onClick={async () => {
            await onSetDefault(moto.id);
          }}
          className="rounded border border-emerald-500 px-3 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
        >
          {moto.isDefaultForNewTrips ? t("defaultForNewTrips") : t("setAsDefault")}
        </button>
        <button
          type="button"
          disabled={deleting || (typeof moto._count?.trips === "number" && moto._count.trips > 0)}
          onClick={async () => {
            if (typeof moto._count?.trips === "number" && moto._count.trips > 0) {
              alert(t("inUseCannotDelete"));
              return;
            }
            if (!window.confirm(t("deleteConfirm"))) {
              return;
            }
            setDeleting(true);
            await onDelete(moto.id);
            setDeleting(false);
          }}
          className="rounded border border-red-600 px-3 py-1 text-[11px] text-red-300 hover:bg-red-600/20 disabled:opacity-50"
        >
          {deleting ? t("deleting") : t("delete")}
        </button>
        {moto.specs && (
          <button
            type="button"
            onClick={() => setShowSpecs(!showSpecs)}
            className={`rounded border px-3 py-1 text-[11px] transition-all duration-300 ${
              specsJustLoaded
                ? "animate-pulse border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400/50"
                : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {showSpecs ? "Hide Specs" : "Show All Specs"}
          </button>
        )}
      </div>
      {showSpecs && moto.specs && (
        <div className="mt-3 rounded border border-slate-700 bg-slate-900/50 p-3">
          <h4 className="mb-2 text-[12px] font-semibold text-slate-200">Full Specifications (from AI)</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(moto.specs).map(([key, value]) => {
              if (value === null || value === undefined) return null;
              const displayValue = Array.isArray(value)
                ? value.join(", ")
                : typeof value === "boolean"
                  ? value ? "Yes" : "No"
                  : String(value);
              // Convert camelCase to readable label with units
              const label = formatSpecLabel(key);
              return (
                <div key={key} className="flex flex-col">
                  <span className="text-[10px] text-slate-500">{label}</span>
                  <span className="text-slate-300">{displayValue}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </li>
  );
}
