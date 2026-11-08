"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const isLoadingRef = useRef(false);

  // When pathname or searchParams change, mark navigation as complete
  useEffect(() => {
    if (isLoadingRef.current) {
      isLoadingRef.current = false;
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept clicks on internal navigation links for instant (0ms) feedback
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target || !target.href) return;

      // Ignore modified clicks (cmd+click, ctrl+click, new tab, download, hash-only)
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.shiftKey
      ) {
        return;
      }

      try {
        const url = new URL(target.href, window.location.href);
        // Check if same origin and actually navigating to a new path/query
        if (url.origin === window.location.origin) {
          const isSamePathAndQuery =
            url.pathname === window.location.pathname &&
            url.search === window.location.search;

          const isHashAnchor =
            target.getAttribute("href")?.startsWith("#") || url.hash.length > 1;

          if (!isSamePathAndQuery && !isHashAnchor) {
            // Immediate reaction: show top progress bar
            isLoadingRef.current = true;
            setLoading(true);
            setProgress(30);
          }
        }
      } catch {
        // Ignore invalid URLs
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, []);

  // Incremental crawling while route renders on server
  useEffect(() => {
    if (!loading) return;

    const t1 = setTimeout(() => {
      setProgress((p) => (p < 60 ? 60 : p));
    }, 120);

    const t2 = setTimeout(() => {
      setProgress((p) => (p < 82 ? 82 : p));
    }, 320);

    const t3 = setTimeout(() => {
      setProgress((p) => (p < 92 ? 92 : p));
    }, 750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [loading]);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] pointer-events-none h-[3px] overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label="Loading page"
    >
      <div
        className="h-full bg-gradient-to-r from-[#D4AF37] via-[#C5A059] to-[#8C7A58] shadow-[0_0_12px_rgba(212,175,55,0.7)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: progress === 100
            ? "width 150ms ease-out, opacity 250ms ease-out"
            : "width 280ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
}
