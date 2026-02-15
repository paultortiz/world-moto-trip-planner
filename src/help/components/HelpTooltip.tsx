"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useHelpOptional } from "../HelpProvider";
import { getArticleMeta } from "../lib/articles";
import { HelpPopover } from "./HelpPopover";

interface HelpTooltipProps {
  /** Article ID to link to */
  articleId: string;
  /** Size variant */
  size?: "sm" | "md";
  /** Display inline (no margin) */
  inline?: boolean;
  /** Custom class name */
  className?: string;
  /** Show popover on hover (default: true) */
  showPopover?: boolean;
}

/**
 * Small help icon that links to a specific article.
 * - Click: Opens help drawer to the article
 * - Hover: Shows brief description popover
 *
 * Usage:
 *   <label>
 *     AI Daily Plan <HelpTooltip articleId="ai-daily-plan" />
 *   </label>
 */
export function HelpTooltip({
  articleId,
  size = "sm",
  inline = false,
  className = "",
  showPopover = true,
}: HelpTooltipProps) {
  const t = useTranslations("help");
  const helpContext = useHelpOptional();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const article = getArticleMeta(articleId);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (helpContext) {
        helpContext.openArticle(articleId);
      }
    },
    [helpContext, articleId]
  );

  const handleMouseEnter = useCallback(() => {
    if (!showPopover) return;
    // Delay showing popover to avoid accidental triggers
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 300);
  }, [showPopover]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(false);
  }, []);

  const handlePopoverClose = useCallback(() => {
    setIsHovered(false);
  }, []);

  // If no context, render as a plain icon (non-functional)
  if (!helpContext) {
    return null;
  }

  const sizeClasses = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const marginClass = inline ? "" : "ml-1";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-flex items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-700 hover:text-adv-accent focus:outline-none focus:ring-2 focus:ring-adv-accent focus:ring-offset-1 focus:ring-offset-slate-900 ${marginClass} ${className}`}
        aria-label={t("viewArticle", { title: article?.title || articleId })}
        aria-describedby={isHovered ? `help-popover-${articleId}` : undefined}
      >
        <svg
          className={sizeClasses}
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

      {showPopover && article && (
        <HelpPopover
          triggerRef={buttonRef}
          isOpen={isHovered}
          onClose={handlePopoverClose}
        >
          <div id={`help-popover-${articleId}`}>
            <p className="font-medium text-slate-100">{article.title}</p>
            <p className="mt-1 text-slate-400">{article.description}</p>
            <p className="mt-2 text-xs text-adv-accent">
              {t("clickForMore")}
            </p>
          </div>
        </HelpPopover>
      )}
    </>
  );
}
