"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleChange(newLocale: Locale) {
    // Update cookie via API
    await fetch("/api/user/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    });

    // Refresh the page to apply new locale
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        disabled={isPending}
        className="appearance-none rounded border border-adv-border bg-slate-800/50 px-2 py-1 pr-6 text-xs text-slate-200 hover:border-slate-600 focus:border-adv-accent focus:outline-none disabled:opacity-50"
        aria-label="Select language"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400">
        ▾
      </span>
    </div>
  );
}
