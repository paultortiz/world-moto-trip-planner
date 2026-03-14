"use client";

import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

interface EnlargeablePhotoProps {
  src: string;
  alt: string;
  /** Thumbnail width in pixels (default 112) */
  thumbWidth?: number;
  /** Thumbnail height in pixels (default 80) */
  thumbHeight?: number;
  /** Enlargement scale factor (default 3) */
  scale?: number;
  /** Additional className for the thumbnail */
  className?: string;
  /** Use inline styles instead of Tailwind (for Google Maps InfoWindow) */
  inlineStyles?: boolean;
}

/**
 * Enlargeable photo component with desktop hover and mobile tap support.
 * On desktop, hovering shows a scaled-up version positioned within the viewport.
 * On mobile, tapping opens a full-screen overlay.
 */
export default function EnlargeablePhoto({
  src,
  alt,
  thumbWidth = 112,
  thumbHeight = 80,
  scale = 3,
  className,
  inlineStyles = false,
}: EnlargeablePhotoProps) {
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const enlargedWidth = thumbWidth * scale;
  const enlargedHeight = thumbHeight * scale;

  const handleMouseEnter = useCallback(() => {
    if (!imgRef.current || window.innerWidth < 768) return;

    const rect = imgRef.current.getBoundingClientRect();
    const ew = thumbWidth * scale;
    const eh = thumbHeight * scale;

    let top = rect.top + rect.height / 2 - eh / 2;
    let left = rect.left + rect.width / 2 - ew / 2;

    const padding = 16;
    if (left < padding) left = padding;
    if (left + ew > window.innerWidth - padding) {
      left = window.innerWidth - ew - padding;
    }
    if (top < padding) top = padding;
    if (top + eh > window.innerHeight - padding) {
      top = window.innerHeight - eh - padding;
    }

    setPosition({ top, left });
    setIsEnlarged(true);
  }, [thumbWidth, thumbHeight, scale]);

  const handleMouseLeave = useCallback(() => {
    setIsEnlarged(false);
  }, []);

  const handleTap = useCallback(() => {
    if (window.innerWidth >= 768) return;
    setIsEnlarged(true);
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setIsEnlarged(false);
  }, []);

  if (inlineStyles) {
    return (
      <>
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          style={{
            width: thumbWidth,
            height: thumbHeight,
            objectFit: "cover",
            borderRadius: 4,
            flexShrink: 0,
            cursor: "zoom-in",
          }}
          loading="lazy"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleTap}
        />

        {isEnlarged && position && window.innerWidth >= 768 && createPortal(
          <div
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              zIndex: 9999,
              pointerEvents: "none",
            }}
          >
            <img
              src={src}
              alt={alt}
              style={{
                width: enlargedWidth,
                height: enlargedHeight,
                objectFit: "cover",
                borderRadius: 8,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                outline: "2px solid #475569",
              }}
            />
          </div>,
          document.body,
        )}

        {isEnlarged && window.innerWidth < 768 && createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.8)",
              padding: 16,
            }}
            onClick={handleCloseOverlay}
          >
            <div style={{ position: "relative", maxHeight: "80vh", maxWidth: "90vw" }}>
              <img
                src={src}
                alt={alt}
                style={{
                  maxHeight: "80vh",
                  maxWidth: "90vw",
                  borderRadius: 8,
                  objectFit: "contain",
                }}
              />
              <button
                type="button"
                onClick={handleCloseOverlay}
                style={{
                  position: "absolute",
                  top: -12,
                  right: -12,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  backgroundColor: "#334155",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.3)",
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  return (
    <>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={className ?? "h-20 w-28 flex-shrink-0 cursor-pointer rounded object-cover transition-transform md:cursor-zoom-in"}
        loading="lazy"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleTap}
      />

      {isEnlarged && position && window.innerWidth >= 768 && (
        <div
          className="pointer-events-none fixed z-50 hidden md:block"
          style={{ top: position.top, left: position.left }}
        >
          <img
            src={src}
            alt={alt}
            className="rounded-lg object-cover shadow-2xl ring-2 ring-slate-600"
            style={{ width: enlargedWidth, height: enlargedHeight }}
          />
        </div>
      )}

      {isEnlarged && window.innerWidth < 768 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 md:hidden"
          onClick={handleCloseOverlay}
        >
          <div className="relative max-h-[80vh] max-w-[90vw]">
            <img
              src={src}
              alt={alt}
              className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain"
            />
            <button
              type="button"
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-white shadow-lg"
              onClick={handleCloseOverlay}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
