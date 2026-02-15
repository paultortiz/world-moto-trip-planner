"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface TourSpotlightProps {
  /** CSS selector for the target element to highlight */
  targetSelector: string;
  /** Padding around the highlight area */
  padding?: number;
  /** Whether the spotlight is active */
  isActive: boolean;
  /** Click handler for the backdrop (outside spotlight) */
  onBackdropClick?: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Creates a full-screen overlay with a cutout highlighting the target element.
 * Uses CSS clip-path for the spotlight effect.
 */
export function TourSpotlight({
  targetSelector,
  padding = 8,
  isActive,
  onBackdropClick,
}: TourSpotlightProps) {
  const [mounted, setMounted] = useState(false);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Find and track the target element's position
  useEffect(() => {
    if (!isActive || !mounted) {
      setTargetRect(null);
      return;
    }

    const updateRect = (isInitial = false) => {
      const target = document.querySelector(targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        const newRect = {
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        };
        
        // On initial call or significant change, update immediately
        if (isInitial) {
          setTargetRect(newRect);
        } else {
          // Only update if significantly different to avoid flickering
          setTargetRect((prev) => {
            if (!prev) return newRect;
            const diff = Math.abs(prev.top - newRect.top) + 
                         Math.abs(prev.left - newRect.left) +
                         Math.abs(prev.width - newRect.width) +
                         Math.abs(prev.height - newRect.height);
            return diff > 5 ? newRect : prev;
          });
        }

        // Scroll target into view if needed (only on initial load)
        if (
          isInitial && (
            rect.top < 0 ||
            rect.bottom > window.innerHeight ||
            rect.left < 0 ||
            rect.right > window.innerWidth
          )
        ) {
          // For large elements, scroll to show the top; for small elements, center them
          const isLargeElement = rect.height > window.innerHeight * 0.5;
          target.scrollIntoView({
            behavior: "smooth",
            block: isLargeElement ? "start" : "center",
            inline: "center",
          });
        }
      } else if (isInitial) {
        // Only set to null on initial if target not found
        setTargetRect(null);
      }
      // Don't set to null on subsequent checks - keep previous rect
    };

    // Initial position - set immediately
    updateRect(true);

    // Wrapper for event listeners (non-initial updates)
    const handleUpdate = () => updateRect(false);

    // Update on scroll/resize
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    // Also update periodically in case of dynamic content
    const interval = setInterval(handleUpdate, 500);

    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
      clearInterval(interval);
    };
  }, [isActive, targetSelector, padding, mounted]);

  if (!mounted || !isActive) return null;

  // Create clip-path for the spotlight cutout
  // If no target found, just show semi-transparent overlay without cutout
  const hasTarget = targetRect !== null;
  
  // Clamp rect values to valid viewport bounds for clip-path
  const clampedRect = targetRect ? {
    left: Math.max(0, targetRect.left),
    top: Math.max(0, targetRect.top),
    right: Math.min(window.innerWidth, targetRect.left + targetRect.width),
    bottom: Math.min(window.innerHeight, targetRect.top + targetRect.height),
  } : null;
  
  const clipPath = clampedRect
    ? `polygon(
        0% 0%,
        0% 100%,
        ${clampedRect.left}px 100%,
        ${clampedRect.left}px ${clampedRect.top}px,
        ${clampedRect.right}px ${clampedRect.top}px,
        ${clampedRect.right}px ${clampedRect.bottom}px,
        ${clampedRect.left}px ${clampedRect.bottom}px,
        ${clampedRect.left}px 100%,
        100% 100%,
        100% 0%
      )`
    : undefined;

  const spotlight = (
    <div
      className="fixed inset-0 z-[999990] transition-all duration-300"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        clipPath,
      }}
      // Only allow backdrop click to end tour if there's a visible target
      // Otherwise user must use the step card buttons
      onClick={hasTarget ? onBackdropClick : undefined}
      aria-hidden="true"
    />
  );

  return createPortal(spotlight, document.body);
}

/**
 * Get the bounding rect of the target element for positioning the tour step card.
 */
export function getTargetRect(
  targetSelector: string,
  padding: number = 8
): TargetRect | null {
  const target = document.querySelector(targetSelector);
  if (!target) return null;

  const rect = target.getBoundingClientRect();
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}
