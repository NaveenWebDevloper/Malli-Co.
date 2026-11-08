"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

export type PreloaderVariant =
  | "stairs"
  | "percentage"
  | "circle"
  | "slide"
  | "curtain";

export interface PreloaderProps {
  /** Controls if the preloader is visible/active. If omitted, manages its own lifecycle using duration. */
  loading?: boolean;
  /** Visual variant matching React Bits Pro styles */
  variant?: PreloaderVariant;
  /** Animation duration in milliseconds before finishing (default: 2400ms) */
  duration?: number;
  /** Number of vertical columns for the stairs variant (default: 6) */
  stairCount?: number;
  /** Text or array of words displayed sequentially during load */
  loadingText?: string | string[];
  /** Callback fired when the preloader exit animation completes */
  onComplete?: () => void;
  /** Custom background color (defaults to luxury brand obsidian #0D0D0D) */
  bgColor?: string;
  /** Custom accent color (defaults to Malli & Co. bronze #8C7A58) */
  accentColor?: string;
  /** Whether to show percentage sign in percentage variant */
  showPercentageSign?: boolean;
  /** Whether to show a progress line */
  showProgressBar?: boolean;
  /** Optional custom class name */
  className?: string;
}

const DEFAULT_WORDS = [
  "MALLI & CO.",
  "HAUTE COUTURE",
  "ARTISANAL LINENS",
  "AUTUMN / WINTER 2026",
];

export function Preloader({
  loading: controlledLoading,
  variant = "stairs",
  duration = 2400,
  stairCount = 6,
  loadingText = DEFAULT_WORDS,
  onComplete,
  bgColor = "#0D0D0D",
  accentColor = "#8C7A58",
  showPercentageSign = true,
  showProgressBar = true,
  className,
}: PreloaderProps) {
  const [internalLoading, setInternalLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  const textArray = useMemo(() => {
    return Array.isArray(loadingText) ? loadingText : [loadingText];
  }, [loadingText]);

  const activeLoading =
    controlledLoading !== undefined ? controlledLoading : internalLoading;

  // Manage duration & progress counter
  useEffect(() => {
    if (!activeLoading && !isExiting) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setHasCompleted(true);
        onComplete?.();
      }, 700);
      return () => clearTimeout(timer);
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      // Cycle text
      if (textArray.length > 1) {
        const wordIdx = Math.min(
          textArray.length - 1,
          Math.floor((pct / 100) * textArray.length)
        );
        setCurrentWordIndex(wordIdx);
      }

      if (elapsed >= duration) {
        clearInterval(interval);
        setInternalLoading(false);
        setIsExiting(true);
        setTimeout(() => {
          setHasCompleted(true);
          onComplete?.();
        }, 750);
      }
    }, 24);

    return () => clearInterval(interval);
  }, [activeLoading, duration, isExiting, onComplete, textArray.length]);

  if (hasCompleted) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center overflow-hidden pointer-events-auto select-none",
        className
      )}
      style={{
        backgroundColor: variant === "stairs" || variant === "curtain" ? "transparent" : bgColor,
      }}
      aria-label="Loading Malli & Co."
      role="status"
    >
      {/* =====================================================================
          VARIANT 1: STAIRS
          Vertical columns staggered sliding away
      ===================================================================== */}
      {variant === "stairs" && (
        <div className="absolute inset-0 flex w-full h-full pointer-events-none">
          {Array.from({ length: stairCount }).map((_, idx) => (
            <div
              key={idx}
              className="flex-1 h-full transition-transform duration-700 ease-[cubic-bezier(0.77,0,0.175,1)]"
              style={{
                backgroundColor: bgColor,
                transform: isExiting ? "translateY(-100%)" : "translateY(0%)",
                transitionDelay: isExiting ? `${idx * 0.07}s` : "0s",
              }}
            />
          ))}
        </div>
      )}

      {/* =====================================================================
          VARIANT 2: CURTAIN
          Split double curtains opening to left & right
      ===================================================================== */}
      {variant === "curtain" && (
        <div className="absolute inset-0 flex w-full h-full pointer-events-none">
          {/* Left Curtain */}
          <div
            className="w-1/2 h-full transition-transform duration-800 ease-[cubic-bezier(0.85,0,0.15,1)]"
            style={{
              backgroundColor: bgColor,
              transform: isExiting ? "translateX(-100%)" : "translateX(0%)",
            }}
          />
          {/* Right Curtain */}
          <div
            className="w-1/2 h-full transition-transform duration-800 ease-[cubic-bezier(0.85,0,0.15,1)]"
            style={{
              backgroundColor: bgColor,
              transform: isExiting ? "translateX(100%)" : "translateX(0%)",
            }}
          />
        </div>
      )}

      {/* =====================================================================
          VARIANT 3: CIRCLE
          Expanding radial aperture reveal
      ===================================================================== */}
      {variant === "circle" && (
        <div
          className="absolute inset-0 transition-[clip-path] duration-800 ease-[cubic-bezier(0.77,0,0.175,1)] pointer-events-none"
          style={{
            backgroundColor: bgColor,
            clipPath: isExiting
              ? "circle(0% at 50% 50%)"
              : "circle(150% at 50% 50%)",
          }}
        />
      )}

      {/* =====================================================================
          VARIANT 4: SLIDE
          Monolithic panel sliding upward
      ===================================================================== */}
      {variant === "slide" && (
        <div
          className="absolute inset-0 transition-transform duration-800 ease-[cubic-bezier(0.77,0,0.175,1)] pointer-events-none"
          style={{
            backgroundColor: bgColor,
            transform: isExiting ? "translateY(-100%)" : "translateY(0%)",
          }}
        />
      )}

      {/* =====================================================================
          CENTRAL CONTENT CONTAINER (Shared across variants)
      ===================================================================== */}
      <div
        className={cn(
          "relative z-10 flex flex-col items-center justify-center px-6 max-w-md text-center transition-opacity duration-400",
          isExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
      >
        {/* Brand Crest / Monogram */}
        <div className="mb-6 flex items-center justify-center">
          <div
            className="w-12 h-12 rounded-full border border-[#8C7A58]/40 flex items-center justify-center text-[#FBF9F5] font-serif tracking-widest text-sm"
            style={{ borderColor: accentColor }}
          >
            M&C
          </div>
        </div>

        {/* Small Editorial Header */}
        <span
          className="text-[10px] uppercase font-semibold tracking-[0.35em] mb-2 block"
          style={{ color: accentColor }}
        >
          Noble Tailoring & Atelier
        </span>

        {/* Dynamic Text / Headline */}
        <div className="h-10 flex items-center justify-center overflow-hidden">
          <p
            key={currentWordIndex}
            className="text-xl sm:text-2xl font-serif text-[#FBF9F5] tracking-wide animate-fade-in"
          >
            {textArray[currentWordIndex]}
          </p>
        </div>

        {/* ===================================================================
            PERCENTAGE DISPLAY (Variant 2 & Optional Progress Indicators)
        =================================================================== */}
        {(variant === "percentage" || showProgressBar) && (
          <div className="w-48 sm:w-64 mt-6 flex flex-col items-center space-y-3">
            {/* Percentage Digits */}
            {variant === "percentage" && (
              <span
                className="font-mono text-3xl sm:text-4xl font-light text-[#FBF9F5] tracking-tight"
                style={{ color: "#FBF9F5" }}
              >
                {progress}
                {showPercentageSign && (
                  <span className="text-sm font-sans ml-1 text-[#8C7A58]">
                    %
                  </span>
                )}
              </span>
            )}

            {/* Slim Minimalist Luxury Progress Bar */}
            {showProgressBar && (
              <div className="w-full h-[1px] bg-white/10 overflow-hidden relative">
                <div
                  className="h-full transition-all duration-75 ease-out"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: accentColor,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Preloader;
