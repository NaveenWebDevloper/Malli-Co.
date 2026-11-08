"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from "motion/react";

export interface ActiveCampaignItem {
  id: string;
  name: string;
  slug: string;
  endsAt: string;
  discountKind: "PERCENT" | "FLAT";
  discountValue: number;
}

export function AnnouncementBar() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const [isHidden, setIsHidden] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // Default true until mounted check
  const [campaign, setCampaign] = useState<ActiveCampaignItem | null>(null);
  const [timeText, setTimeText] = useState<string>("");
  const clockDriftMs = useRef<number>(0);
  const lastScrollY = useRef(0);

  // Set CSS variable for header offset
  const setBarHeightVar = (heightPx: number) => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty(
        "--announcement-height",
        `${heightPx}px`,
      );
    }
  };

  useEffect(() => {
    let isMounted = true;

    fetch("/api/campaigns/active")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;

        if (data?.success && Array.isArray(data.campaigns) && data.campaigns.length > 0) {
          const topCampaign = data.campaigns[0] as ActiveCampaignItem;

          // Check session storage dismissal
          const dismissedId = sessionStorage.getItem("malli_dismissed_announcement");
          if (dismissedId === topCampaign.id) {
            setIsDismissed(true);
            setBarHeightVar(0);
            return;
          }

          const sNow = data.serverNow || new Date().toISOString();
          clockDriftMs.current = new Date(sNow).getTime() - Date.now();
          setCampaign(topCampaign);
          setIsDismissed(false);
          setBarHeightVar(36);
        } else {
          setIsDismissed(true);
          setBarHeightVar(0);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsDismissed(true);
          setBarHeightVar(0);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Countdown timer calculation
  useEffect(() => {
    if (!campaign?.endsAt || isDismissed) return;

    const endsAtMs = new Date(campaign.endsAt).getTime();

    const updateCountdown = () => {
      const effectiveNow = Date.now() + clockDriftMs.current;
      const diff = endsAtMs - effectiveNow;

      if (diff <= 0) {
        setTimeText("Ended");
        setIsDismissed(true);
        setBarHeightVar(0);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeText(`${days}d ${hours}h`);
      } else {
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeText(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [campaign?.endsAt, isDismissed]);

  // Synchronized hide-on-scroll-down behavior matching the floating header
  useMotionValueEvent(scrollY, "change", (latest) => {
    const diff = latest - lastScrollY.current;
    if (latest > 120 && diff > 10) {
      setIsHidden(true);
    } else if (diff < -6 || latest < 80) {
      setIsHidden(false);
    }
    lastScrollY.current = latest;
  });

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (campaign?.id) {
      sessionStorage.setItem("malli_dismissed_announcement", campaign.id);
    }
    setIsDismissed(true);
    setBarHeightVar(0);
  };

  if (isDismissed || !campaign) {
    return null;
  }

  const discountText =
    campaign.discountKind === "PERCENT"
      ? `Flat ${campaign.discountValue}% off`
      : `Flat ₹${campaign.discountValue / 100} off`;

  const bannerText = `${campaign.name}: ${discountText}${timeText ? ` — Ends in ${timeText}` : ""}`;

  return (
    <motion.aside
      initial={{ y: 0 }}
      animate={{ y: isHidden ? -40 : 0 }}
      transition={{
        duration: prefersReducedMotion ? 0.01 : 0.25,
        ease: "easeInOut",
      }}
      className="fixed top-0 inset-x-0 z-50 h-[36px] bg-[#0A0A0A] text-[#FBF9F5] border-b border-white/10 select-none shadow-sm"
      role="region"
      aria-label="Storewide Promotion Announcement"
      aria-live="off"
    >
      <div className="w-full h-full max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center justify-between">
        <div className="w-6" /> {/* Balance spacer */}

        <Link
          href={`/sale/${campaign.slug}`}
          className="group inline-flex items-center justify-center gap-2 text-[10.5px] sm:text-[11.5px] font-sans font-semibold uppercase tracking-[0.16em] sm:tracking-[0.20em] text-[#FBF9F5]/90 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/80"
        >
          <span>{bannerText}</span>
          <span
            className="text-xs transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </Link>

        {/* Per-session dismissal button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-white/50 hover:text-white text-xs transition-colors rounded"
          aria-label="Dismiss promotion bar"
        >
          ✕
        </button>
      </div>
    </motion.aside>
  );
}

export default AnnouncementBar;

