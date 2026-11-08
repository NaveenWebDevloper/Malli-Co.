"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

export interface ActiveCampaignItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  startsAt: string;
  endsAt: string;
  discountKind: "PERCENT" | "FLAT";
  discountValue: number;
  badgeLabel?: string;
  bannerImage?: string;
  themeColor?: string;
  showCountdown?: boolean;
  landingEnabled?: boolean;
}

export interface SaleBannerProps {
  initialCampaign?: ActiveCampaignItem | null;
  initialServerNow?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isEnded: boolean;
}

function calculateRemaining(endsAtMs: number, clockDriftMs: number): TimeRemaining {
  const effectiveNow = Date.now() + clockDriftMs;
  const diff = endsAtMs - effectiveNow;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isEnded: false };
}

export function SaleBanner({ initialCampaign, initialServerNow }: SaleBannerProps) {
  const prefersReducedMotion = useReducedMotion();
  const [campaign, setCampaign] = useState<ActiveCampaignItem | null>(initialCampaign || null);
  const [loading, setLoading] = useState<boolean>(!initialCampaign);

  // Clock drift reference
  const clockDriftMs = useRef<number>(
    new Date(initialServerNow || new Date().toISOString()).getTime() - Date.now(),
  );

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => {
    if (!initialCampaign?.endsAt) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: false };
    }
    return calculateRemaining(new Date(initialCampaign.endsAt).getTime(), clockDriftMs.current);
  });

  useEffect(() => {
    if (initialCampaign) return;

    let isMounted = true;
    fetch("/api/campaigns/active")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          if (data?.success && Array.isArray(data.campaigns)) {
            // Find highest priority campaign with a banner image
            const bannerCamp = data.campaigns.find(
              (c: ActiveCampaignItem) => Boolean(c.bannerImage && c.bannerImage.trim().length > 0),
            );
            if (bannerCamp) {
              setCampaign(bannerCamp);
              const sNow = data.serverNow || new Date().toISOString();
              clockDriftMs.current = new Date(sNow).getTime() - Date.now();
            }
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialCampaign]);

  // Server-time countdown interval (every 1,000ms)
  useEffect(() => {
    if (!campaign?.endsAt) return;

    const endsAtMs = new Date(campaign.endsAt).getTime();

    // Initial check
    setTimeRemaining(calculateRemaining(endsAtMs, clockDriftMs.current));

    const interval = setInterval(() => {
      const rem = calculateRemaining(endsAtMs, clockDriftMs.current);
      setTimeRemaining(rem);
      if (rem.isEnded) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [campaign?.endsAt]);

  if (loading || !campaign || !campaign.bannerImage || timeRemaining.isEnded) {
    return null;
  }

  const discountHeadline =
    campaign.discountKind === "PERCENT"
      ? `${campaign.discountValue}% OFF`
      : `FLAT ₹${campaign.discountValue / 100} OFF`;

  const bannerTheme = campaign.themeColor || "#8C7A58";

  return (
    <section className="w-[calc(100%-32px)] lg:w-[80%] mx-auto py-8 sm:py-14">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{
          duration: prefersReducedMotion ? 0.01 : 0.6,
          ease: "easeOut",
        }}
        className="relative overflow-hidden rounded-3xl bg-neutral-950 text-white shadow-xl border border-[#EAE3D4]/20 min-h-[380px] sm:min-h-[500px] flex flex-col justify-end p-6 sm:p-12"
      >
        {/* Background Banner Image */}
        <Image
          src={campaign.bannerImage}
          alt={campaign.name}
          fill
          sizes="(max-width: 1024px) calc(100vw - 32px), 80vw"
          className="object-cover object-center"
          priority={false}
        />

        {/* Ambient Darkened Gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 z-10" />

        {/* Content Container */}
        <div className="relative z-20 max-w-2xl space-y-4 sm:space-y-6">
          {/* Badge Label */}
          {campaign.badgeLabel && (
            <div>
              <span
                className="inline-block text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-md shadow-md text-white border border-white/20"
                style={{ backgroundColor: bannerTheme }}
              >
                {campaign.badgeLabel}
              </span>
            </div>
          )}

          {/* Headline & Discount */}
          <div className="space-y-1 sm:space-y-2">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-serif font-black uppercase tracking-tight text-white drop-shadow-sm">
              {campaign.name}
            </h2>
            <p className="text-sm sm:text-lg text-neutral-200 font-light">
              Limited time atelier event: Enjoy{" "}
              <strong className="text-white font-bold">{discountHeadline}</strong> across
              handcrafted linen and cotton capsules.
            </p>
          </div>

          {/* =====================================================================
              COUNTDOWN TIMER (Server-synced with drift correction)
          ===================================================================== */}
          {campaign.showCountdown !== false && (
            <div
              className="flex items-center gap-2.5 sm:gap-3.5 pt-1 select-none"
              role="timer"
              aria-live="off"
              aria-label={`Sale countdown: ${timeRemaining.days} days, ${timeRemaining.hours} hours, ${timeRemaining.minutes} minutes`}
            >
              {/* Days */}
              <div className="flex flex-col items-center justify-center w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-black/60 backdrop-blur-md border border-white/15">
                <span className="text-lg sm:text-2xl font-mono font-bold text-white">
                  {String(timeRemaining.days).padStart(2, "0")}
                </span>
                <span className="text-[8.5px] uppercase font-bold tracking-widest text-[#D5CBB5]">
                  Days
                </span>
              </div>

              <span className="text-lg font-bold text-white/50 pb-3">:</span>

              {/* Hours */}
              <div className="flex flex-col items-center justify-center w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-black/60 backdrop-blur-md border border-white/15">
                <span className="text-lg sm:text-2xl font-mono font-bold text-white">
                  {String(timeRemaining.hours).padStart(2, "0")}
                </span>
                <span className="text-[8.5px] uppercase font-bold tracking-widest text-[#D5CBB5]">
                  Hours
                </span>
              </div>

              <span className="text-lg font-bold text-white/50 pb-3">:</span>

              {/* Minutes */}
              <div className="flex flex-col items-center justify-center w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-black/60 backdrop-blur-md border border-white/15">
                <span className="text-lg sm:text-2xl font-mono font-bold text-white">
                  {String(timeRemaining.minutes).padStart(2, "0")}
                </span>
                <span className="text-[8.5px] uppercase font-bold tracking-widest text-[#D5CBB5]">
                  Mins
                </span>
              </div>

              <span className="text-lg font-bold text-white/50 pb-3">:</span>

              {/* Seconds */}
              <div className="flex flex-col items-center justify-center w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-black/60 backdrop-blur-md border border-white/15">
                <span className="text-lg sm:text-2xl font-mono font-bold text-white">
                  {String(timeRemaining.seconds).padStart(2, "0")}
                </span>
                <span className="text-[8.5px] uppercase font-bold tracking-widest text-[#D5CBB5]">
                  Secs
                </span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <Link
              href={`/sale/${campaign.slug}`}
              className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-full bg-white text-[#121212] text-xs sm:text-sm font-bold uppercase tracking-widest shadow-xl hover:bg-neutral-100 hover:scale-[1.03] active:scale-[0.98] transition-all"
            >
              <span>Shop the Sale</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default SaleBanner;
