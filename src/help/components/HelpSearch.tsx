"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useHelp } from "../HelpProvider";

export function HelpSearch() {
  const t = useTranslations("help");
  const { searchQuery, setSearchQuery } = useHelp();
  const [localValue, setLocalValue] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value when searchQuery changes externally
  useEffect(() => {
    setLocalValue(searchQuery);
  }, [searchQuery]);

  // Debounce search updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localValue);
    }, 200);

    return () => clearTimeout(timer);
  }, [localValue, setSearchQuery]);

  const handleClear = () => {
    setLocalValue("");
    setSearchQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Search icon */}
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="w-full rounded border border-slate-700 bg-slate-800 py-2 pl-9 pr-8 text-sm text-slate-100 placeholder-slate-500 focus:border-adv-accent focus:outline-none focus:ring-1 focus:ring-adv-accent"
        aria-label={t("searchPlaceholder")}
      />

      {/* Clear button */}
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-adv-accent"
          aria-label="Clear search"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
