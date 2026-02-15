"use client";

import { useTranslations } from "next-intl";
import { useHelpOptional } from "../HelpProvider";

interface HelpButtonProps {
  /** Position variant */
  position?: "floating" | "inline";
}

export function HelpButton({ position = "floating" }: HelpButtonProps) {
  const t = useTranslations("help");
  const helpContext = useHelpOptional();

  // If no context, don't render
  if (!helpContext) return null;

  const { openDrawer, isDrawerOpen } = helpContext;

  if (position === "inline") {
    return (
      <button
        type="button"
        onClick={openDrawer}
        className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-adv-accent"
        aria-label={t("title")}
        aria-expanded={isDrawerOpen}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    );
  }

  // Don't show floating button when drawer is open
  if (isDrawerOpen) return null;

  // Floating button (bottom-right corner)
  return (
    <button
      type="button"
      onClick={openDrawer}
      data-tour-help-button
      className="fixed bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-adv-accent text-black shadow-lg transition-transform hover:scale-105 hover:bg-adv-accentMuted focus:outline-none focus:ring-2 focus:ring-adv-accent focus:ring-offset-2 focus:ring-offset-slate-900"
      style={{ zIndex: 999999 }}
      aria-label={t("title")}
      aria-expanded={isDrawerOpen}
    >
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </button>
  );
}
