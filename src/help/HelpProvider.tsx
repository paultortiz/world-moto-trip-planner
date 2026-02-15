"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import type { HelpContextValue } from "./types";

const HelpContext = createContext<HelpContextValue | null>(null);

interface HelpProviderProps {
  children: ReactNode;
}

export function HelpProvider({ children }: HelpProviderProps) {
  // Drawer and article state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Tour state
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [activeTourStep, setActiveTourStep] = useState(0);

  // Actions
  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setActiveArticleId(null);
    setSearchQuery("");
  }, []);

  const openArticle = useCallback((articleId: string) => {
    if (articleId) {
      setActiveArticleId(articleId);
      setIsDrawerOpen(true);
      setSearchQuery("");
    } else {
      // Empty string clears the active article (back to list)
      setActiveArticleId(null);
    }
  }, []);

  const startTour = useCallback((tourId: string) => {
    setActiveTourId(tourId);
    setActiveTourStep(0);
    setIsDrawerOpen(false); // Close drawer when tour starts
  }, []);

  const nextTourStep = useCallback(() => {
    setActiveTourStep((prev) => prev + 1);
  }, []);

  const prevTourStep = useCallback(() => {
    setActiveTourStep((prev) => Math.max(0, prev - 1));
  }, []);

  const endTour = useCallback(() => {
    setActiveTourId(null);
    setActiveTourStep(0);
  }, []);

  // Keyboard shortcut: ? or F1 to open help
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // ? key opens/closes help (Shift not required on most keyboards)
      if (e.key === "?") {
        e.preventDefault();
        if (isDrawerOpen) {
          closeDrawer();
        } else {
          openDrawer();
        }
      }

      // Escape to close drawer
      if (e.key === "Escape" && isDrawerOpen) {
        closeDrawer();
      }

      // Escape to end tour
      if (e.key === "Escape" && activeTourId) {
        endTour();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, activeTourId, openDrawer, closeDrawer, endTour]);

  const value = useMemo<HelpContextValue>(
    () => ({
      // State
      isDrawerOpen,
      activeArticleId,
      searchQuery,
      activeTourId,
      activeTourStep,
      // Actions
      openDrawer,
      closeDrawer,
      openArticle,
      setSearchQuery,
      startTour,
      nextTourStep,
      prevTourStep,
      endTour,
    }),
    [
      isDrawerOpen,
      activeArticleId,
      searchQuery,
      activeTourId,
      activeTourStep,
      openDrawer,
      closeDrawer,
      openArticle,
      startTour,
      nextTourStep,
      prevTourStep,
      endTour,
    ]
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp(): HelpContextValue {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error("useHelp must be used within a HelpProvider");
  }
  return context;
}

// Optional hook that doesn't throw (for components that may render outside provider)
export function useHelpOptional(): HelpContextValue | null {
  return useContext(HelpContext);
}
