"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import NewMotorcycleForm from "./NewMotorcycleForm";
import Combobox from "@/components/ui/Combobox";
import { MOTORCYCLE_MAKES } from "@/data/motorcycleMakes";

// Generate year options from current year down to 1950
function generateYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 1; y >= 1950; y--) {
    years.push(y);
  }
  return years;
}

// Progress stages for AI fetch - faster initial stages, then slow creep
const FETCH_STAGES = [
  { key: "lookingUpSpecs", progress: 20, duration: 1000 },
  { key: "fetchingMaintenance", progress: 45, duration: 1200 },
  { key: "processingData", progress: 70, duration: 1500 },
  { key: "almostDone", progress: 85, duration: 0 }, // No fixed duration - creeps slowly
] as const;

function useAiFetchProgress(isFetching: boolean, t: (key: string) => string) {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isFetching) {
      setStageIndex(0);
      setProgress(0);
      setElapsedSeconds(0);
      return;
    }

    // Start progress animation
    setProgress(FETCH_STAGES[0].progress);

    let currentStage = 0;
    const timers: NodeJS.Timeout[] = [];
    let creepInterval: NodeJS.Timeout | null = null;
    let elapsedInterval: NodeJS.Timeout | null = null;

    const advanceStage = () => {
      if (currentStage < FETCH_STAGES.length - 1) {
        currentStage++;
        setStageIndex(currentStage);
        setProgress(FETCH_STAGES[currentStage].progress);

        // When we reach the final stage, start slow creep toward 95% and elapsed counter
        if (currentStage === FETCH_STAGES.length - 1) {
          let creepProgress: number = FETCH_STAGES[currentStage].progress;
          creepInterval = setInterval(() => {
            creepProgress += 0.5; // Slow increment
            if (creepProgress >= 95) {
              creepProgress = 95; // Cap at 95%
              if (creepInterval) clearInterval(creepInterval);
            }
            setProgress(creepProgress);
          }, 200);

          // Start elapsed time counter
          let seconds = 0;
          elapsedInterval = setInterval(() => {
            seconds++;
            setElapsedSeconds(seconds);
          }, 1000);
        }
      }
    };

    // Set up timers to advance through stages
    let elapsed = 0;
    for (let i = 0; i < FETCH_STAGES.length - 1; i++) {
      elapsed += FETCH_STAGES[i].duration;
      timers.push(setTimeout(advanceStage, elapsed));
    }

    return () => {
      timers.forEach(clearTimeout);
      if (creepInterval) clearInterval(creepInterval);
      if (elapsedInterval) clearInterval(elapsedInterval);
    };
  }, [isFetching]);

  const stage = FETCH_STAGES[stageIndex];
  const baseMessage = t(`fetchProgress.${stage.key}`);
  // Show elapsed time during final stage
  const message = stageIndex === FETCH_STAGES.length - 1 && elapsedSeconds > 0
    ? `${baseMessage} (${elapsedSeconds}s)`
    : baseMessage;

  return { progress, message };
}

interface MotorcyclesClientProps {
  motorcycles: any[];
}

/** Convert camelCase spec keys to readable labels - uses translation function */
function formatSpecLabel(key: string, t: (key: string) => string): string {
  // Try to get translated label from specLabels namespace
  const translated = t(`specLabels.${key}`);
  // If translation exists and isn't the key itself, use it
  if (translated && translated !== `specLabels.${key}` && !translated.startsWith("specLabels.")) {
    return translated;
  }

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
  const { progress, message: progressMessage } = useAiFetchProgress(isFetchingSpecs ?? false, t);
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
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState<any>(moto.maintenanceSchedule ?? null);
  const [maintenanceJustLoaded, setMaintenanceJustLoaded] = useState(false);

  // Sync maintenanceData when moto prop changes (e.g., after AI fetch completes)
  useEffect(() => {
    if (moto.maintenanceSchedule && !maintenanceData) {
      setMaintenanceData(moto.maintenanceSchedule);
      // Trigger pulse animation to indicate data is ready
      setMaintenanceJustLoaded(true);
      setTimeout(() => setMaintenanceJustLoaded(false), 3000);
    }
  }, [moto.maintenanceSchedule, maintenanceData]);

  // Model fetching state
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [lastFetchedMake, setLastFetchedMake] = useState(moto.make ?? "");

  const yearOptions = useMemo(() => generateYearOptions(), []);

  // Fetch models when make changes
  useEffect(() => {
    const trimmedMake = makeInput.trim();
    
    // Don't fetch if make is empty or same as last fetched
    if (!trimmedMake || trimmedMake === lastFetchedMake) {
      return;
    }

    // Debounce the fetch
    const timeoutId = setTimeout(async () => {
      setModelsLoading(true);
      setLastFetchedMake(trimmedMake);
      
      try {
        const res = await fetch(`/api/ai/motorcycle-models?make=${encodeURIComponent(trimmedMake)}`);
        if (res.ok) {
          const data = await res.json();
          setModels(data.models ?? []);
        } else {
          setModels([]);
        }
      } catch {
        setModels([]);
      } finally {
        setModelsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [makeInput, lastFetchedMake]);

  // Clear model when make changes significantly
  const handleMakeChange = (newMake: string) => {
    const oldMake = makeInput.toLowerCase();
    const newMakeLower = newMake.toLowerCase();
    setMakeInput(newMake);
    // Clear model if make changed significantly
    if (newMakeLower !== oldMake && !newMakeLower.startsWith(oldMake) && !oldMake.startsWith(newMakeLower)) {
      setModelInput("");
      setModels([]);
    }
  };

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
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-32 items-center overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-amber-300 transition-opacity duration-300">
                {progressMessage}
              </span>
            </div>
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
        <div className="flex flex-col gap-1">
          <span className="text-slate-400">{t("year")}</span>
          <select
            className="w-20 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
            value={yearInput}
            onChange={(e) => setYearInput(e.target.value)}
          >
            <option value="">--</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-slate-400">{t("make")}</span>
          <div className="w-28">
            <Combobox
              value={makeInput}
              onChange={handleMakeChange}
              options={[...MOTORCYCLE_MAKES]}
              placeholder={t("selectOrType")}
              noOptionsText={t("noMatchingMakes")}
              aria-label={t("make")}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-slate-400">{t("model")}</span>
          <div className="w-36">
            <Combobox
              value={modelInput}
              onChange={setModelInput}
              options={models}
              placeholder={makeInput ? t("selectOrType") : t("selectMakeFirst")}
              loading={modelsLoading}
              loadingText={t("loadingModels")}
              noOptionsText={t("noMatchingModels")}
              disabled={!makeInput.trim()}
              aria-label={t("model")}
            />
          </div>
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
            {showSpecs ? t("hideSpecs") : t("showAllSpecs")}
        </button>
        )}
        {maintenanceData && (
          <button
            type="button"
            onClick={() => setShowMaintenance(!showMaintenance)}
            className={`rounded border px-3 py-1 text-[11px] transition-all duration-300 ${
              maintenanceJustLoaded
                ? "animate-pulse border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400/50"
                : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {showMaintenance ? t("maintenance.hide") : t("maintenance.show")}
          </button>
        )}
      </div>
      {showSpecs && moto.specs && (
        <div className="mt-3 rounded border border-slate-700 bg-slate-900/50 p-3">
          <h4 className="mb-2 text-[12px] font-semibold text-slate-200">{t("fullSpecsTitle")}</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(moto.specs).map(([key, value]) => {
              if (value === null || value === undefined) return null;
              const displayValue = Array.isArray(value)
                ? value.join(", ")
                : typeof value === "boolean"
                  ? value ? t("booleanYes") : t("booleanNo")
                  : String(value);
              // Convert camelCase to readable label with units
              const label = formatSpecLabel(key, t);
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
      {showMaintenance && maintenanceData && (
        <div className="mt-3 rounded border border-teal-800 bg-slate-900/50 p-3">
          <h4 className="mb-3 text-[12px] font-semibold text-teal-300">{t("maintenance.title")}</h4>
          
          {/* Service Intervals */}
          {maintenanceData.serviceIntervals && maintenanceData.serviceIntervals.length > 0 && (
            <div className="mb-4">
              <h5 className="mb-2 text-[11px] font-semibold text-slate-200">{t("maintenance.serviceIntervals")}</h5>
              <div className="space-y-2">
                {maintenanceData.serviceIntervals.map((interval: any, idx: number) => (
                  <div key={idx} className="rounded border border-slate-700 bg-slate-950/50 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-100">{interval.name}</span>
                      <span className="rounded bg-teal-900/50 px-1.5 py-0.5 text-[10px] text-teal-300">
                        {interval.intervalMiles?.toLocaleString()} mi / {interval.intervalKm?.toLocaleString()} km
                      </span>
                      {typeof interval.estimatedCostUsd === "number" && (
                        <span className="text-[10px] text-slate-400">
                          ~${interval.estimatedCostUsd}
                        </span>
                      )}
                    </div>
                    {interval.tasks && interval.tasks.length > 0 && (
                      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                        {interval.tasks.map((task: string, tidx: number) => (
                          <li key={tidx} className="flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-slate-500" />
                            {task}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wear Items */}
          {maintenanceData.wearItems && maintenanceData.wearItems.length > 0 && (
            <div className="mb-4">
              <h5 className="mb-2 text-[11px] font-semibold text-slate-200">{t("maintenance.wearItems")}</h5>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {maintenanceData.wearItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex flex-col rounded border border-slate-700 bg-slate-950/50 p-2">
                    <span className="text-[11px] font-medium text-slate-200">{item.item}</span>
                    <span className="text-[10px] text-teal-400">
                      {item.intervalMiles?.toLocaleString()} mi / {item.intervalKm?.toLocaleString()} km
                    </span>
                    {item.notes && (
                      <span className="mt-0.5 text-[9px] text-slate-500">{item.notes}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fluid Capacities */}
          {maintenanceData.fluidCapacities && (
            <div className="mb-4">
              <h5 className="mb-2 text-[11px] font-semibold text-slate-200">{t("maintenance.fluidCapacities")}</h5>
              <div className="flex flex-wrap gap-3 text-[10px]">
                {maintenanceData.fluidCapacities.engineOilLiters && (
                  <div className="flex flex-col">
                    <span className="text-slate-500">{t("maintenance.engineOil")}</span>
                    <span className="text-slate-300">{maintenanceData.fluidCapacities.engineOilLiters} L</span>
                  </div>
                )}
                {maintenanceData.fluidCapacities.coolantLiters && (
                  <div className="flex flex-col">
                    <span className="text-slate-500">{t("maintenance.coolant")}</span>
                    <span className="text-slate-300">{maintenanceData.fluidCapacities.coolantLiters} L</span>
                  </div>
                )}
                {maintenanceData.fluidCapacities.forkOilMlPerLeg && (
                  <div className="flex flex-col">
                    <span className="text-slate-500">{t("maintenance.forkOil")}</span>
                    <span className="text-slate-300">{maintenanceData.fluidCapacities.forkOilMlPerLeg} ml/leg</span>
                  </div>
                )}
                {maintenanceData.fluidCapacities.brakeFluidMl && (
                  <div className="flex flex-col">
                    <span className="text-slate-500">{t("maintenance.brakeFluid")}</span>
                    <span className="text-slate-300">{maintenanceData.fluidCapacities.brakeFluidMl} ml</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {maintenanceData.notes && (
            <p className="text-[10px] text-slate-500 italic">{maintenanceData.notes}</p>
          )}
        </div>
      )}
    </li>
  );
}
