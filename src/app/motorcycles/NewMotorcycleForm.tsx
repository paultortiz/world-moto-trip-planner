"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface NewMotorcycleFormProps {
  onCreate: (year: number | null, make: string, model: string) => Promise<void>;
}

export default function NewMotorcycleForm({ onCreate }: NewMotorcycleFormProps) {
  const t = useTranslations("garage");
  const [yearInput, setYearInput] = useState("");
  const [makeInput, setMakeInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [saving, setSaving] = useState(false);

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
      }}
    >
      <div className="flex flex-col gap-1">
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
          className="w-28 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
          value={makeInput}
          onChange={(e) => setMakeInput(e.target.value)}
          placeholder="Yamaha"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-slate-400">{t("model")}</span>
        <input
          type="text"
          className="w-40 rounded border border-slate-600 bg-slate-950 p-1 text-[11px]"
          value={modelInput}
          onChange={(e) => setModelInput(e.target.value)}
          placeholder="Tenere 700"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-adv-accent px-3 py-1 text-[11px] font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted disabled:opacity-50"
      >
        {saving ? t("adding") : t("addMotorcycle")}
      </button>
    </form>
  );
}
