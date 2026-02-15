"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import type { TourStep } from "../types";

interface TourStepCardProps {
  /** Current step data */
  step: TourStep;
  /** Current step index (0-based) */
  stepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** Callback to go to next step */
  onNext: () => void;
  /** Callback to go to previous step */
  onPrev: () => void;
  /** Callback to skip/end the tour */
  onSkip: () => void;
  /** Whether this is the last step */
  isLastStep: boolean;
}

type Placement = "top" | "bottom" | "left" | "right";

interface Position {
  top: number;
  left: number;
  placement: Placement;
}

/**
 * Tour step card that displays alongside the highlighted target element.
 * Positions itself based on the step's placement preference.
 */
export function TourStepCard({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isLastStep,
}: TourStepCardProps) {
  const t = useTranslations("help");
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate position based on target element and placement
  const updatePosition = useCallback(() => {
    const target = document.querySelector(step.targetSelector);
    const padding = step.highlightPadding ?? 8;
    const cardWidth = 320;
    const cardHeight = 180;
    const gap = 16;
    const viewportPadding = 16;

    if (!target) {
      // Center in viewport if no target
      setPosition({
        top: window.innerHeight / 2 - cardHeight / 2,
        left: window.innerWidth / 2 - cardWidth / 2,
        placement: "bottom",
      });
      return;
    }

    const rect = target.getBoundingClientRect();
    const targetTop = rect.top - padding;
    const targetLeft = rect.left - padding;
    const targetWidth = rect.width + padding * 2;
    const targetHeight = rect.height + padding * 2;

    // For very large targets, position card in a visible area of the viewport
    // rather than relative to the full element
    const isTargetTooTall = targetHeight > window.innerHeight * 0.6;
    const isTargetTooWide = targetWidth > window.innerWidth * 0.6;

    let placement = step.placement;
    let top = 0;
    let left = 0;

    if (isTargetTooTall || isTargetTooWide) {
      // For large targets, position card at bottom-right corner
      // Card renders on top of help button (higher z-index)
      top = window.innerHeight - cardHeight - viewportPadding;
      left = window.innerWidth - cardWidth - viewportPadding;
      placement = "right";
    } else {
      // Normal positioning for reasonably-sized targets
      switch (placement) {
        case "top":
          top = targetTop - cardHeight - gap;
          left = targetLeft + targetWidth / 2 - cardWidth / 2;
          break;
        case "bottom":
          top = targetTop + targetHeight + gap;
          left = targetLeft + targetWidth / 2 - cardWidth / 2;
          break;
        case "left":
          top = targetTop + targetHeight / 2 - cardHeight / 2;
          left = targetLeft - cardWidth - gap;
          break;
        case "right":
          top = targetTop + targetHeight / 2 - cardHeight / 2;
          left = targetLeft + targetWidth + gap;
          break;
      }

      // Adjust if card would be off-screen
      if (left < viewportPadding) {
        left = viewportPadding;
      } else if (left + cardWidth > window.innerWidth - viewportPadding) {
        left = window.innerWidth - cardWidth - viewportPadding;
      }

      if (top < viewportPadding) {
        if (placement === "top") {
          top = targetTop + targetHeight + gap;
          placement = "bottom";
        }
        // Clamp to viewport
        if (top < viewportPadding) {
          top = viewportPadding;
        }
      } else if (top + cardHeight > window.innerHeight - viewportPadding) {
        if (placement === "bottom") {
          top = targetTop - cardHeight - gap;
          placement = "top";
        }
        // Clamp to viewport
        if (top + cardHeight > window.innerHeight - viewportPadding) {
          top = window.innerHeight - cardHeight - viewportPadding;
        }
      }
    }

    setPosition({ top, left, placement });
  }, [step]);

  useEffect(() => {
    if (!mounted) return;

    updatePosition();

    // Update on scroll/resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [mounted, updatePosition]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onSkip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (isLastStep) {
          onSkip();
        } else {
          onNext();
        }
      } else if (e.key === "ArrowLeft" && stepIndex > 0) {
        onPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext, onPrev, onSkip, stepIndex, isLastStep]);

  if (!mounted || !position) return null;

  // Resolve translation keys - step title and content are i18n keys
  const title = t(step.title as any);
  const content = t(step.content as any);

  const card = (
    <div
      className="fixed z-[1000000] w-80 rounded-lg border border-slate-600 bg-slate-800 p-4 shadow-2xl"
      style={{
        top: position.top,
        left: position.left,
      }}
      role="dialog"
      aria-label={title}
    >
      {/* Progress indicator */}
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          {t("tour.stepOf", { current: stepIndex + 1, total: totalSteps })}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                i === stepIndex ? "bg-adv-accent" : "bg-slate-600"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-slate-100">{title}</h3>

      {/* Content */}
      <p className="mb-4 text-sm text-slate-300">{content}</p>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          {t("tour.skip")}
        </button>

        <div className="flex gap-2">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={onPrev}
              className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
            >
              {t("tour.back")}
            </button>
          )}
          <button
            type="button"
            onClick={isLastStep ? onSkip : onNext}
            className="rounded bg-adv-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-adv-accentMuted"
          >
            {isLastStep ? t("tour.finish") : t("tour.next")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(card, document.body);
}
