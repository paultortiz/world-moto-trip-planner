"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

interface MobileNavProps {
  links: Array<{ href: string; label: string }>;
  email?: string | null;
  signOutLabel: string;
  signOutHref: string;
  localeSwitcher: React.ReactNode;
}

export function MobileNav({
  links,
  email,
  signOutLabel,
  signOutHref,
  localeSwitcher,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only render portal after component mounts (client-side)
  useEffect(() => {
    setMounted(true);
  }, []);

  const menuContent = isOpen ? (
    <div
      className="fixed inset-0"
      style={{ zIndex: 999999 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={() => setIsOpen(false)}
      />
      {/* Menu panel */}
      <div
        className="absolute left-4 right-4 top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border-2 border-adv-accent bg-slate-900 p-4 shadow-2xl"
      >
        {/* Close button at top */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-white">Menu</span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded bg-adv-accent"
            aria-label="Close menu"
          >
            <svg
              className="h-6 w-6 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="block rounded bg-slate-800 px-4 py-3 text-base font-medium text-white hover:bg-slate-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="my-3 border-t border-slate-700" />
        <div className="flex items-center justify-between rounded bg-slate-800 px-4 py-3">
          <span className="text-sm text-slate-300">Language</span>
          {localeSwitcher}
        </div>
        {email && (
          <div className="mt-2 px-4 py-2 text-sm text-slate-400">{email}</div>
        )}
        <Link
          href={signOutHref}
          onClick={() => setIsOpen(false)}
          className="mt-3 block rounded bg-adv-accent px-4 py-3 text-center text-base font-semibold text-black"
        >
          {signOutLabel}
        </Link>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Desktop nav - visible on md+ screens */}
      <div className="hidden items-center gap-4 text-xs md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-slate-200 hover:text-adv-accent"
          >
            {link.label}
          </Link>
        ))}
        {localeSwitcher}
        {email && <span className="text-slate-400">{email}</span>}
        <Link
          href={signOutHref}
          className="rounded border border-adv-accent/50 px-3 py-1 font-semibold text-adv-accent hover:bg-adv-accent/10"
        >
          {signOutLabel}
        </Link>
      </div>

      {/* Mobile hamburger button - visible on screens below md */}
      <div className="block md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded bg-adv-accent"
          aria-label="Open menu"
          aria-expanded={isOpen}
        >
          <svg
            className="h-6 w-6 text-black"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Portal menu to document.body to escape stacking contexts */}
      {mounted && menuContent && createPortal(menuContent, document.body)}
    </>
  );
}

interface MobileNavGuestProps {
  signInLabel: string;
  signInHref: string;
  localeSwitcher: React.ReactNode;
}

export function MobileNavGuest({
  signInLabel,
  signInHref,
  localeSwitcher,
}: MobileNavGuestProps) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {localeSwitcher}
      <Link
        href={signInHref}
        className="rounded bg-adv-accent px-3 py-1 text-xs font-semibold text-black shadow-adv-glow hover:bg-adv-accentMuted"
      >
        {signInLabel}
      </Link>
    </div>
  );
}
