"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

interface PageTransitionProviderProps {
  children: React.ReactNode;
}

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !containerRef.current) {
      return;
    }

    // Skip entrance animation on initial SSR hydration to preserve LCP
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    // Subtle, editorial fade-in transition on route changes (Rule 9)
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        {
          opacity: 0.88,
          y: 6,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: "power2.out",
          clearProps: "all",
        },
      );
    }, containerRef);

    return () => {
      ctx.revert(); // Proper cleanup kills all GSAP triggers and tweens (Rule 9)
    };
  }, [pathname]);

  return (
    <div ref={containerRef} className="min-h-screen w-full">
      {children}
    </div>
  );
}

