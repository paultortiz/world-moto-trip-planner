"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import Combobox from "@/components/ui/Combobox";
import { MOTORCYCLE_MAKES } from "@/data/motorcycleMakes";

interface NewMotorcycleFormProps {
  onCreate: (year: number | null, make: string, model: string) => Promise<void>;
}

// Generate year options from current year down to 1950
function generateYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 1; y >= 1950; y--) {
    years.push(y);
  }
  return years;
}

export default function NewMotorcycleForm({ onCreate }: NewMotorcycleFormProps) {
  const t = useTranslations("garage");
  const [yearInput, setYearInput] = useState("");
  const [makeInput, setMakeInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Model fetching state
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [lastFetchedMake, setLastFetchedMake] = useState("");

  const yearOptions = useMemo(() => generateYearOptions(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Clear model when make changes
  const handleMakeChange = (newMake: string) => {
    setMakeInput(newMake);
    // Clear model if make changed significantly
    if (newMake.toLowerCase() !== makeInput.toLowerCase()) {
      setModelInput("");
      setModels([]);
    }
  };

  return (
    <form
      className="flex flex-wrap items-end gap-3 text-[11px] text-slate-300"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        const yearVal = yearInput.trim() === "" ? null : Number(yearInput);
        await onCreate(yearVal, makeInput.trim(), modelInput.trim());
        setSaving(false);
        setYearInput("");
        setMakeInput("");
        setModelInput("");
        setModels([]);
        setLastFetchedMake("");
      }}
    >
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
        <div className="w-32">
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
        <div className="w-44">
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
      <button
        type="submit"
        disabled={saving || !mounted}
        className="rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
      >
        {saving ? t("adding") : t("addMotorcycle")}
      </button>
    </form>
  );
}
