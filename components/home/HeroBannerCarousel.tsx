"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useDrag } from "@use-gesture/react";

export interface BannerSlide {
  id: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  imageDesktop: {
    url: string;
    publicId?: string;
    width?: number;
    height?: number;
  };
  imageMobile?: {
    url: string;
    publicId?: string;
    width?: number;
    height?: number;
  };
  altText: string;
  textPosition: "left" | "center" | "right";
  textTheme: "light" | "dark";
  overlayOpacity: number;
  sortOrder: number;
}

export interface HeroBannerCarouselProps {
  banners: BannerSlide[];
}

const AUTOPLAY_DURATION_MS = 6000;

export function HeroBannerCarousel({ banners }: HeroBannerCarouselProps) {
  // Edge Case: 0 banners -> render nothing
  if (!banners || banners.length === 0) {
    return null;
  }

  return <HeroBannerCarouselInner banners={banners} />;
}

function HeroBannerCarouselInner({ banners }: { banners: BannerSlide[] }) {
  const totalSlides = banners.length;
  const isSingleSlide = totalSlides === 1;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 });

  const progressRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 1. Accessibility: Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  // 2. Page Visibility API: Pause rotation when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Slide navigation callbacks
  const nextSlide = useCallback(() => {
    if (isSingleSlide) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
    setProgress(0);
    progressRef.current = 0;
  }, [isSingleSlide, totalSlides]);

  const prevSlide = useCallback(() => {
    if (isSingleSlide) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    setProgress(0);
    progressRef.current = 0;
  }, [isSingleSlide, totalSlides]);

  const goToSlide = useCallback((idx: number) => {
    if (idx === currentIndex) return;
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
    setProgress(0);
    progressRef.current = 0;
  }, [currentIndex]);

  // 3. Autoplay & Progress Line Loop (every 6 seconds)
  useEffect(() => {
    if (isSingleSlide || prefersReducedMotion) {
      setProgress(0);
      progressRef.current = 0;
      return;
    }

    const shouldPause = isPaused || isHovered || isFocused || isTabHidden;

    let startTime = Date.now() - progressRef.current * AUTOPLAY_DURATION_MS;

    const tick = () => {
      if (!shouldPause) {
        const elapsed = Date.now() - startTime;
        const currentProgress = Math.min(elapsed / AUTOPLAY_DURATION_MS, 1);
        progressRef.current = currentProgress;
        setProgress(currentProgress);

        if (currentProgress >= 1) {
          progressRef.current = 0;
          nextSlide();
          return;
        }
      } else {
        startTime = Date.now() - progressRef.current * AUTOPLAY_DURATION_MS;
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    isSingleSlide,
    isPaused,
    isHovered,
    isFocused,
    isTabHidden,
    prefersReducedMotion,
    currentIndex,
    nextSlide,
  ]);

  // 4. Keyboard Arrow Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      if (
        document.activeElement &&
        containerRef.current.contains(document.activeElement)
      ) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          prevSlide();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          nextSlide();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevSlide, nextSlide]);

  // 5. Swipe & Drag Gestures (Touch and Mouse)
  const bindGesture = useDrag(
    ({ swipe: [swipeX], movement: [mx], down, velocity: [vx] }) => {
      if (isSingleSlide) return;
      if (!down) {
        if (swipeX === -1 || (mx < -70 && vx > 0.2)) {
          nextSlide();
        } else if (swipeX === 1 || (mx > 70 && vx > 0.2)) {
          prevSlide();
        }
      }
    },
    {
      filterTaps: true,
      axis: "x",
      pointer: { touch: true },
    },
  );

  // 6. Subtle Mouse Parallax Depth (Desktop only, up to 12px)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || typeof window === "undefined" || window.innerWidth < 1024) {
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const normX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const normY = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

    setMouseParallax({
      x: normX * 12,
      y: normY * 12,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMouseParallax({ x: 0, y: 0 });
  };

  const activeBanner = banners[currentIndex];

  return (
    <section
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Homepage Featured Banners"
      aria-live={isPaused ? "polite" : "off"}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      {...bindGesture()}
      className="group relative w-[calc(100%-24px)] sm:w-[calc(100%-32px)] lg:w-[80%] mx-auto overflow-hidden select-none bg-[#121212] touch-pan-y rounded-[20px] sm:rounded-[24px] lg:rounded-[32px] h-[60vh] min-h-[440px] md:h-[76vh] md:min-h-[520px] md:max-h-[800px] mb-12 md:mb-16 isolate"
      style={{
        WebkitMaskImage: "-webkit-radial-gradient(white, black)",
        transform: "translateZ(0)",
      }}
    >
      {/* Visual Slides Crossfade with Ken Burns & Parallax */}
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.div
          key={activeBanner.id}
          custom={direction}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0.01 : 0.85,
            ease: "easeInOut",
          }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Ken Burns & Mouse Parallax Wrapper */}
          <motion.div
            initial={{ scale: prefersReducedMotion ? 1 : 1.0 }}
            animate={{
              scale: prefersReducedMotion ? 1 : 1.06,
              x: mouseParallax.x,
              y: mouseParallax.y,
            }}
            transition={{
              scale: {
                duration: AUTOPLAY_DURATION_MS / 1000,
                ease: "linear",
              },
              x: { duration: 0.3, ease: "easeOut" },
              y: { duration: 0.3, ease: "easeOut" },
            }}
            className="absolute -inset-4 w-[calc(100%+32px)] h-[calc(100%+32px)] will-change-transform"
          >
            {/* Desktop Image (hidden on mobile if mobile asset exists) */}
            <div
              className={`relative w-full h-full ${
                activeBanner.imageMobile?.url ? "hidden md:block" : "block"
              }`}
            >
              <Image
                src={activeBanner.imageDesktop.url}
                alt={activeBanner.altText || activeBanner.title}
                fill
                priority={currentIndex === 0}
                loading={currentIndex === 0 ? "eager" : "lazy"}
                sizes="(max-width: 640px) calc(100vw - 24px), (max-width: 1024px) calc(100vw - 32px), 80vw"
                className="object-cover object-center"
              />
            </div>

            {/* Dedicated Mobile Image (if available) */}
            {activeBanner.imageMobile?.url && (
              <div className="relative w-full h-full md:hidden">
                <Image
                  src={activeBanner.imageMobile.url}
                  alt={activeBanner.altText || activeBanner.title}
                  fill
                  priority={currentIndex === 0}
                  loading={currentIndex === 0 ? "eager" : "lazy"}
                  sizes="(max-width: 640px) calc(100vw - 24px), (max-width: 1024px) calc(100vw - 32px), 80vw"
                  className="object-cover object-center"
                />
              </div>
            )}
          </motion.div>

          {/* Dark Overlay Layer driven by overlayOpacity */}
          <div
            className="absolute inset-0 bg-black pointer-events-none transition-opacity"
            style={{ opacity: activeBanner.overlayOpacity / 100 }}
          />

          {/* Luxury Atelier Gradient Vignette (adds editorial depth behind text) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                activeBanner.textPosition === "center"
                  ? "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.85) 100%)"
                  : activeBanner.textPosition === "right"
                  ? "linear-gradient(to left, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)"
                  : "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)",
            }}
          />

          {/* Top Subtle Fade */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 via-transparent to-transparent pointer-events-none" />

          {/* Bottom Fade for Controls Readability */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Slide Text Content Layer (40px desktop / 24px mobile inset padding) */}
      <div className="relative z-20 h-full w-full p-6 lg:p-10 flex flex-col justify-end pb-20 sm:pb-24 lg:pb-24 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeBanner.id}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: prefersReducedMotion ? 0 : 0.12,
                  delayChildren: prefersReducedMotion ? 0 : 0.1,
                },
              },
              exit: {
                opacity: 0,
                transition: { duration: prefersReducedMotion ? 0.01 : 0.25 },
              },
            }}
            className={`max-w-5xl pointer-events-auto md:px-6 lg:px-8 ${
              activeBanner.textPosition === "center"
                ? "mx-auto text-center items-center"
                : activeBanner.textPosition === "right"
                ? "ml-auto text-right items-end"
                : "mr-auto text-left items-start"
            }`}
          >
            {/* 1. Eyebrow Tag (e.g. THE FINER SIDE OF) */}
            {activeBanner.eyebrow && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, ease: "easeOut" },
                  },
                }}
                className="mb-2 sm:mb-3"
              >
                <span
                  className={`inline-block text-[11px] sm:text-xs md:text-[13px] font-sans font-semibold uppercase tracking-[0.28em] ${
                    activeBanner.textTheme === "light"
                      ? "text-neutral-300 drop-shadow-sm"
                      : "text-neutral-700"
                  }`}
                >
                  {activeBanner.eyebrow}
                </span>
              </motion.div>
            )}

            {/* 2. Main Title (High-impact typography with balanced luxury tracking) */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 18 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="mb-3 sm:mb-4 overflow-visible"
            >
              <h1
                className={`font-serif font-black uppercase leading-[1.08] break-normal [word-break:keep-all] ${
                  activeBanner.textTheme === "light"
                    ? "text-white drop-shadow-lg"
                    : "text-[#121212]"
                } text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-[0.02em] sm:tracking-[0.04em] md:tracking-[0.06em]`}
              >
                {activeBanner.title}
              </h1>
            </motion.div>

            {/* 3. Subtitle Fade-Up */}
            {activeBanner.subtitle && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.55, ease: "easeOut" },
                  },
                }}
                className="mb-6 sm:mb-8"
              >
                <p
                  className={`text-xs sm:text-sm md:text-base font-light leading-relaxed max-w-lg ${
                    activeBanner.textTheme === "light"
                      ? "text-neutral-300/90 drop-shadow-sm"
                      : "text-neutral-800"
                  }`}
                >
                  {activeBanner.subtitle}
                </p>
              </motion.div>
            )}

            {/* 4. CTA Buttons Rise Last */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 14 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, ease: "easeOut" },
                },
              }}
              className={`flex flex-wrap items-center gap-3.5 ${
                activeBanner.textPosition === "center"
                  ? "justify-center"
                  : activeBanner.textPosition === "right"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              {/* Primary CTA */}
              <Link
                href={activeBanner.ctaUrl}
                className="inline-flex items-center gap-2 px-7 sm:px-9 py-3.5 rounded-full bg-white text-[#121212] text-xs font-serif font-bold uppercase tracking-[0.2em] shadow-2xl hover:bg-neutral-100 hover:scale-[1.03] active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>{activeBanner.ctaLabel}</span>
                <span className="text-sm font-sans">→</span>
              </Link>

              {/* Secondary CTA (Optional) */}
              {activeBanner.secondaryCtaLabel && activeBanner.secondaryCtaUrl && (
                <Link
                  href={activeBanner.secondaryCtaUrl}
                  className="inline-flex items-center px-6 sm:px-7 py-3.5 rounded-full border border-white/50 bg-black/30 text-[#FBF9F5] text-xs font-serif font-bold uppercase tracking-[0.2em] backdrop-blur-md hover:bg-white/15 hover:border-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]"
                >
                  <span>{activeBanner.secondaryCtaLabel}</span>
                </Link>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop Navigation Chevrons (Appear smoothly on banner hover at outer edges) */}
      {!isSingleSlide && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous slide"
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full items-center justify-center border border-white/20 bg-black/40 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black hover:scale-105 active:scale-95 transition-all shadow-xl focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg
              className="w-5 h-5 -translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next slide"
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full items-center justify-center border border-white/20 bg-black/40 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black hover:scale-105 active:scale-95 transition-all shadow-xl focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg
              className="w-5 h-5 translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Bottom Controls Bar: Left Lookbook Cue & Right Wrogn-Style Indicators */}
      <div className="absolute inset-x-0 bottom-6 sm:bottom-8 px-6 sm:px-10 z-30 pointer-events-none">
        <div className="w-full flex items-center justify-between">
          {/* Bottom-Left: Subtle Lookbook Anchor Cue */}
          <div className="pointer-events-auto">
            <a
              href="#lookbook"
              onClick={(e) => {
                e.preventDefault();
                const target = document.getElementById("lookbook");
                if (target) {
                  target.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="group flex items-center gap-2 text-[10px] font-sans font-semibold uppercase tracking-[0.20em] text-white/70 hover:text-white transition-colors"
            >
              <span>Explore Lookbook</span>
              <span className="text-xs transition-transform group-hover:translate-y-0.5">↓</span>
            </a>
          </div>

          {/* Bottom-Right: Wrogn-style Square/Dash Slide Indicators */}
          {!isSingleSlide ? (
            <div
              className="flex items-center gap-2 pointer-events-auto"
              role="tablist"
              aria-label="Slide navigation"
            >
              {banners.map((_, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Slide ${idx + 1} of ${totalSlides}`}
                    onClick={() => goToSlide(idx)}
                    className={`relative overflow-hidden transition-all duration-300 rounded-[2px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white ${
                      isActive
                        ? "w-4 sm:w-5 h-2 bg-white/40 shadow-sm"
                        : "w-2 sm:w-2.5 h-2 bg-white/35 hover:bg-white/60"
                    }`}
                  >
                    {isActive && (
                      <span
                        className="absolute inset-0 bg-white rounded-[2px]"
                        style={{
                          transform: `scaleX(${progress})`,
                          transformOrigin: "left",
                        }}
                      />
                    )}
                  </button>
                );
              })}

              {/* Accessible Pause / Play Button */}
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                aria-label={isPaused ? "Play slide rotation" : "Pause slide rotation"}
                className="ml-1 p-1 text-white/50 hover:text-white transition-colors text-[10px] focus-visible:outline-none"
                title={isPaused ? "Play slide rotation" : "Pause slide rotation"}
              >
                {isPaused ? "▶" : "❚❚"}
              </button>
            </div>
          ) : (
            <div />
          )}
        </div>
      </div>
    </section>
  );
}

export default HeroBannerCarousel;
