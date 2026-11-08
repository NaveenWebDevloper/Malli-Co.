"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const caveatFont = "font-['Caveat',cursive]";

export function HeroCallouts() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftCalloutRef = useRef<HTMLDivElement>(null);
  const rightCalloutRef = useRef<HTMLDivElement>(null);

  const leftTextRef = useRef<HTMLDivElement>(null);
  const rightTextRef = useRef<HTMLDivElement>(null);

  const leftMainPathRef = useRef<SVGPathElement>(null);
  const leftHeadPathRef = useRef<SVGPathElement>(null);
  const rightMainPathRef = useRef<SVGPathElement>(null);
  const rightHeadPathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    // Accessibility: Respect user's reduced-motion preference
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Helper to calculate and initialize stroke-dash properties
    const initPath = (path: SVGPathElement | null) => {
      if (!path) return 0;
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = prefersReducedMotion ? "0" : `${length}`;
      return length;
    };

    initPath(leftMainPathRef.current);
    initPath(leftHeadPathRef.current);
    initPath(rightMainPathRef.current);
    initPath(rightHeadPathRef.current);

    if (prefersReducedMotion) {
      if (leftTextRef.current) leftTextRef.current.style.opacity = "1";
      if (rightTextRef.current) rightTextRef.current.style.opacity = "1";
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          once: true,
        },
      });

      // --- Callout 1 (Top-Left) Entrance ---
      tl.fromTo(
        leftTextRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.7 }
      );

      // Draw Left Arrow (swoop then arrowhead)
      if (leftMainPathRef.current) {
        tl.to(
          leftMainPathRef.current,
          {
            strokeDashoffset: 0,
            duration: 0.9,
          },
          "-=0.35"
        );
      }
      if (leftHeadPathRef.current) {
        tl.to(
          leftHeadPathRef.current,
          {
            strokeDashoffset: 0,
            duration: 0.3,
          },
          "-=0.2"
        );
      }

      // --- Callout 2 (Bottom-Right) Entrance (staggered by ~0.2s) ---
      tl.fromTo(
        rightTextRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.7 },
        0.55 // Staggered start
      );

      // Draw Right Arrow
      if (rightMainPathRef.current) {
        tl.to(
          rightMainPathRef.current,
          {
            strokeDashoffset: 0,
            duration: 0.9,
          },
          0.8
        );
      }
      if (rightHeadPathRef.current) {
        tl.to(
          rightHeadPathRef.current,
          {
            strokeDashoffset: 0,
            duration: 0.3,
          },
          "-=0.2"
        );
      }

      // --- Subtle Idle Float Animation (after entrance completes) ---
      tl.add(() => {
        if (leftCalloutRef.current) {
          gsap.to(leftCalloutRef.current, {
            y: "+=4",
            duration: 4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }
        if (rightCalloutRef.current) {
          gsap.to(rightCalloutRef.current, {
            y: "-=4",
            duration: 4.2,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: 0.6,
          });
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-10 hidden xl:block overflow-hidden"
      aria-hidden="true"
    >
      {/* =========================================================================
          Top-Left Callout: Artisanal Silhouettes (Rotated -4deg, curls down-right)
          Keeps >= 24px clearance from centered headline and navigation
      ========================================================================= */}
      <div
        ref={leftCalloutRef}
        className="absolute top-6 xl:top-8 left-4 sm:left-8 xl:left-14 2xl:left-24 max-w-[240px] flex flex-col items-start select-none"
      >
        <div ref={leftTextRef} className="opacity-0 space-y-1">
          <span className="text-[10px] xl:text-[11px] font-sans font-semibold uppercase tracking-[0.25em] text-[#8C7A58] block">
            Autumn / Winter Cuts
          </span>
          <p
            className={`${caveatFont} text-[28px] xl:text-[34px] font-bold text-[#1A1816] leading-none transform -rotate-4 origin-left tracking-wide`}
          >
            Artisanal Silhouettes
          </p>
        </div>

        {/* Hand-drawn Left Arrow (curling swoosh down-right toward lookbook) */}
        <div className="mt-2 ml-4">
          <svg
            width="110"
            height="75"
            viewBox="0 0 110 75"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="overflow-visible"
          >
            {/* Curled S-loop swoosh stroke */}
            <path
              ref={leftMainPathRef}
              d="M 14 14 C 44 2, 86 12, 82 38 C 78 58, 48 46, 56 30 C 64 16, 92 44, 106 68"
              stroke="#8C7A58"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Arrowhead tip */}
            <path
              ref={leftHeadPathRef}
              d="M 94 65 L 107 69 L 103 57"
              stroke="#8C7A58"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* =========================================================================
          Bottom-Right Callout: Interactive 3D Archive (Rotated +3deg, curls down-left)
          Keeps >= 24px clearance from centered headline and lookbook ribbon
      ========================================================================= */}
      <div
        ref={rightCalloutRef}
        className="absolute top-14 xl:top-16 right-4 sm:right-8 xl:right-14 2xl:right-24 max-w-[240px] flex flex-col items-end text-right select-none"
      >
        <div ref={rightTextRef} className="opacity-0 space-y-1">
          <span className="text-[10px] xl:text-[11px] font-sans font-semibold uppercase tracking-[0.25em] text-[#8C7A58] block">
            Interactive 3D Archive
          </span>
          <p
            className={`${caveatFont} text-[28px] xl:text-[34px] font-bold text-[#1A1816] leading-none transform rotate-3 origin-right tracking-wide`}
          >
            Drag to explore lookbook
          </p>
        </div>

        {/* Hand-drawn Right Arrow (curling swoosh down-left toward center lookbook) */}
        <div className="mt-2 mr-4">
          <svg
            width="110"
            height="75"
            viewBox="0 0 110 75"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="overflow-visible"
          >
            {/* Curled S-loop swoosh stroke */}
            <path
              ref={rightMainPathRef}
              d="M 96 14 C 66 2, 24 12, 28 38 C 32 58, 62 46, 54 30 C 46 16, 18 44, 4 68"
              stroke="#8C7A58"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Arrowhead tip */}
            <path
              ref={rightHeadPathRef}
              d="M 16 65 L 3 69 L 7 57"
              stroke="#8C7A58"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default HeroCallouts;
