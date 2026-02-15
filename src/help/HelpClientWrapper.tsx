"use client";

import { type ReactNode } from "react";
import { HelpProvider } from "./HelpProvider";
import { HelpDrawer } from "./components/HelpDrawer";
import { HelpButton } from "./components/HelpButton";
import { FeatureTour } from "./components/FeatureTour";

interface HelpClientWrapperProps {
  children: ReactNode;
}

/**
 * Client-side wrapper that provides help functionality.
 * Use this in server components (like layout.tsx) to wrap content
 * that needs access to the help system.
 */
export function HelpClientWrapper({ children }: HelpClientWrapperProps) {
  return (
    <HelpProvider>
      {children}
      <HelpButton />
      <HelpDrawer />
      <FeatureTour />
    </HelpProvider>
  );
}
