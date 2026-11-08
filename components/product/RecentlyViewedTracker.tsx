"use client";

import { useEffect } from "react";

const RECENTLY_VIEWED_STORAGE_KEY = "malli_recent_views";

export function RecentlyViewedTracker({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug || typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
      let list: string[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            list = parsed.filter((item): item is string => typeof item === "string");
          }
        } catch {
          list = [];
        }
      }

      // Prepend current slug and remove duplicate
      const cleanSlug = slug.trim().toLowerCase();
      const updated = [cleanSlug, ...list.filter((s) => s.toLowerCase() !== cleanSlug)].slice(0, 16);

      localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(updated));

      // Dispatch event so other components on page (RecentlyViewedSection) update immediately
      window.dispatchEvent(
        new CustomEvent("malli_recent_views_updated", {
          detail: { slug: cleanSlug, recentSlugs: updated },
        }),
      );
    } catch (e) {
      console.warn("Could not save recently viewed product to localStorage:", e);
    }
  }, [slug]);

  return null;
}

