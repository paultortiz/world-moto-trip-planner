"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface HelpPopoverProps {
  /** Content to display in the popover */
  children: ReactNode;
  /** Element that triggers the popover */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** Whether the popover is visible */
  isOpen: boolean;
  /** Callback when popover should close */
  onClose: () => void;
}

type Placement = "top" | "bottom";

interface Position {
  top: number;
  left: number;
  placement: Placement;
}

/**
 * Lightweight popover that appears near the trigger element.
 * Uses portal to avoid overflow issues.
 */
export function HelpPopover({
  children,
  triggerRef,
  isOpen,
  onClose,
}: HelpPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate position when opening
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !mounted) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const popoverHeight = 100; // Approximate height
      const padding = 8;

      // Prefer showing above, fall back to below if not enough space
      const spaceAbove = rect.top;
      const placement: Placement = spaceAbove > popoverHeight + padding ? "top" : "bottom";

      const top =
        placement === "top"
          ? rect.top - padding
          : rect.bottom + padding;

      // Center horizontally, but keep within viewport
      const left = Math.max(
        padding,
        Math.min(
          rect.left + rect.width / 2,
          window.innerWidth - 150 // Keep some space for popover width
        )
      );

      setPosition({ top, left, placement });
    };

    updatePosition();

    // Close on scroll or resize
    const handleClose = () => onClose();
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);

    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, [isOpen, triggerRef, mounted, onClose]);

  if (!mounted || !isOpen || !position) return null;

  const popover = (
    <div
      ref={popoverRef}
      role="tooltip"
      className="fixed z-[999998] max-w-xs rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 shadow-lg"
      style={{
        top: position.placement === "top" ? "auto" : position.top,
        bottom: position.placement === "top" ? `calc(100vh - ${position.top}px)` : "auto",
        left: position.left,
        transform: "translateX(-50%)",
      }}
      onMouseEnter={() => {}} // Keep open when hovering popover
      onMouseLeave={onClose}
    >
      {/* Arrow */}
      <div
        className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-slate-700 bg-slate-800 ${
          position.placement === "top"
            ? "bottom-[-5px] border-b border-r"
            : "top-[-5px] border-l border-t"
        }`}
      />
      {children}
    </div>
  );

  return createPortal(popover, document.body);
}
