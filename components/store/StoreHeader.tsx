"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
  useReducedMotion,
} from "motion/react";
import { useCart } from "./CartContext";
import { cn } from "@/lib/utils";

export interface StoreHeaderProps {
  isAdmin?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
}

const NAV_LINKS: NavItem[] = [
  { id: "men", label: "Men", href: "/men" },
  { id: "kids", label: "Kids", href: "/kids" },
  { id: "shirts", label: "Shirts", href: "/category/mens-shirts" },
  { id: "tshirts", label: "T-Shirts", href: "/category/mens-t-shirts" },
  { id: "collections", label: "Collections", href: "/collections" },
];

export function StoreHeader({ isAdmin = false }: StoreHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { openCart, itemCount } = useCart();
  const prefersReducedMotion = useReducedMotion();

  // Scroll & visibility states
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Nav hover state for sliding indicator pill
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [pendingNav, setPendingNav] = useState<string | null>(null);

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Cart badge animation state
  const prevCount = useRef(itemCount);
  const [cartBadgePopping, setCartBadgePopping] = useState(false);
  const [cartIconShaking, setCartIconShaking] = useState(false);

  // Cart bounce trigger
  useEffect(() => {
    if (itemCount !== prevCount.current) {
      prevCount.current = itemCount;
      if (!prefersReducedMotion) {
        setCartBadgePopping(true);
        setCartIconShaking(true);
        const t1 = setTimeout(() => setCartBadgePopping(false), 400);
        const t2 = setTimeout(() => setCartIconShaking(false), 450);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    }
  }, [itemCount, prefersReducedMotion]);

  // Scroll direction detection (shrink past 80px, hide down past 120px, reveal up)
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 80);

    const diff = latest - lastScrollY.current;
    if (latest > 120 && diff > 10) {
      // Scrolling down -> hide
      setIsHidden(true);
    } else if (diff < -6 || latest < 80) {
      // Scrolling up or near top -> show
      setIsHidden(false);
    }
    lastScrollY.current = latest;
  });

  // Nav item hover handlers for sliding indicator & route prefetch
  const handleNavMouseEnter = (link: NavItem) => {
    setHoveredNav(link.id);
    // Instant prefetch on hover so route is warm before click
    router.prefetch(link.href);
  };

  const handleNavMouseLeave = () => {
    setHoveredNav(null);
  };

  // Close mobile menu & reset pending navigation on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setPendingNav(null);
  }, [pathname]);

  return (
    <>
      {/* =========================================================================
          FULL-WIDTH ARCHITECTURAL HEADER
          Spans 100% viewport width, crisp bottom border, subtle backdrop blur
      ========================================================================= */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{
          y: isHidden ? -140 : 0,
          opacity: 1,
        }}
        transition={{
          type: "spring",
          stiffness: prefersReducedMotion ? 1000 : 380,
          damping: prefersReducedMotion ? 100 : 32,
        }}
        className={cn(
          "fixed inset-x-0 z-50 w-full",
          "transition-[height,top,background-color,box-shadow,border-color] duration-300 ease-out",
          "border-b border-[#EAE3D4]/90",
          isScrolled
            ? "top-0 h-[76px] sm:h-[80px] lg:h-[88px] bg-[#FBF9F5]/98 backdrop-blur-xl shadow-md"
            : "top-[var(--announcement-height,36px)] h-[82px] sm:h-[88px] lg:h-[110px] bg-[#FBF9F5]/95 backdrop-blur-md shadow-sm"
        )}
        role="banner"
      >
        <div className="w-full h-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex items-center justify-between">
          {/* =====================================================================
              LEFT: BRAND LOGO + NAV LINKS (Beside each other)
          ===================================================================== */}
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 xl:gap-10">
            {/* Mobile Hamburger Trigger */}
            <div className="flex items-center lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="w-10 h-10 flex flex-col items-center justify-center space-y-1.5 text-neutral-800 rounded-full focus-visible:ring-2 focus-visible:ring-[#8C7A58] focus-visible:outline-none"
                aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isMobileMenuOpen}
              >
                <motion.span
                  animate={isMobileMenuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="w-5 h-[2px] bg-neutral-900 block rounded-full"
                />
                <motion.span
                  animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="w-5 h-[2px] bg-neutral-900 block rounded-full"
                />
                <motion.span
                  animate={isMobileMenuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="w-5 h-[2px] bg-neutral-900 block rounded-full"
                />
              </button>
            </div>

            {/* Brand Logo (Responsive: circular emblem on mobile, expanded brandmark on desktop) */}
            <Link
              href="/"
              className="group flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#8C7A58] focus-visible:outline-none rounded-md p-1 transition-transform duration-300 ease-out hover:scale-105 active:scale-95 flex-shrink-0"
              aria-label="Malli & Co. Home"
            >
              {/* Mobile circular emblem logo (< lg) */}
              <Image
                src="/images/logo-mobile.png"
                alt="Malli & Co. — Kids & Men's Wear"
                width={160}
                height={160}
                priority
                className={cn(
                  "block lg:hidden object-contain w-auto transition-all duration-300 ease-out",
                  isScrolled
                    ? "h-12 w-12 sm:h-14 sm:w-14"
                    : "h-14 w-14 sm:h-16 sm:w-16"
                )}
              />

              {/* Desktop brandmark logo (lg+) - enlarged for crisp detail */}
              <Image
                src="/images/logo.png"
                alt="Malli & Co. — Kids & Men's Wear"
                width={280}
                height={270}
                priority
                className={cn(
                  "hidden lg:block object-contain w-auto transition-all duration-300 ease-out",
                  isScrolled
                    ? "lg:h-[72px] xl:h-[76px]"
                    : "lg:h-[90px] xl:h-[96px]"
                )}
              />
            </Link>

            {/* Desktop Navigation Links (Directly beside logo) */}
            <nav
              className="hidden lg:flex items-center space-x-1.5 xl:space-x-2"
              role="navigation"
              aria-label="Main Store Navigation"
              onMouseLeave={handleNavMouseLeave}
            >
              {NAV_LINKS.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/" && pathname?.startsWith(`${link.href}/`));
                const isHovered = hoveredNav === link.id;
                const isPending = pendingNav === link.href;

                return (
                  <div
                    key={link.id}
                    className="relative"
                    onMouseEnter={() => handleNavMouseEnter(link)}
                  >
                    <Link
                      href={link.href}
                      prefetch={true}
                      onClick={() => setPendingNav(link.href)}
                      className={cn(
                        "relative block px-3.5 xl:px-4 py-2 text-[13px] xl:text-[14px] font-medium uppercase tracking-[0.10em] xl:tracking-[0.12em]",
                        "transition-colors duration-200 rounded-full",
                        "focus-visible:ring-2 focus-visible:ring-[#8C7A58] focus-visible:outline-none",
                        isActive || isHovered || isPending
                          ? "text-[#121212] font-semibold"
                          : "text-neutral-600 hover:text-[#121212]"
                      )}
                    >
                      {/* Sliding Pill Indicator (layoutId) */}
                      {(isHovered || (!hoveredNav && (isActive || isPending))) && (
                        <motion.span
                          layoutId="navHoverPill"
                          className={cn(
                            "absolute inset-0 rounded-full -z-10",
                            isPending
                              ? "bg-[#DDD4C1] animate-pulse"
                              : "bg-[#EAE3D4]/70"
                          )}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                          }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        {link.label}
                        {isPending && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8C7A58] animate-ping" />
                        )}
                      </span>
                    </Link>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* =====================================================================
              RIGHT: ACTION ICONS (Wishlist, Cart, Account, Admin Badge)
          ===================================================================== */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Conditional ADMIN Link (Rule 7 compliant: ADMIN role only) */}
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 border border-amber-300/60 text-[11px] font-bold uppercase tracking-wider hover:bg-amber-200 transition-colors mr-2 focus-visible:ring-2 focus-visible:ring-[#8C7A58]"
                title="Admin Management Console"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                <span>Admin</span>
              </Link>
            )}

            {/* Wishlist Icon */}
            <MagneticIconButton
              ariaLabel="View Saved Wishlist"
              className="hidden sm:flex"
              onClick={() => {
                // Future expansion or toast
              }}
            >
              <svg
                className="w-[22px] h-[22px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </MagneticIconButton>

            {/* Cart Button with Spring Pop Badge & Shake */}
            <MagneticIconButton
              onClick={openCart}
              ariaLabel={`Shopping Bag with ${itemCount} items`}
            >
              <motion.div
                animate={cartIconShaking ? { rotate: [0, -9, 9, -6, 6, 0] } : { rotate: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <svg
                  className="w-[22px] h-[22px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </motion.div>

              {/* Dynamic Badge */}
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{
                      scale: cartBadgePopping ? 1.35 : 1,
                      opacity: 1,
                    }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 18 }}
                    className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#121212] text-[10px] font-bold text-[#FBF9F5] shadow-sm"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </MagneticIconButton>

            {/* Account / Profile Icon */}
            <MagneticIconButton
              ariaLabel="Customer Account & Orders"
              onClick={() => {
                window.location.href = "/account";
              }}
            >
              <svg
                className="w-[22px] h-[22px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </MagneticIconButton>
          </div>
        </div>
      </motion.header>

      {/* =========================================================================
          MOBILE SLIDE-DOWN DRAWER MENU (Inside rounded luxury aesthetic)
      ========================================================================= */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -30, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-20 left-4 right-4 rounded-3xl bg-[#FBF9F5] border border-[#EAE3D4] shadow-2xl p-6 overflow-hidden max-h-[85vh] overflow-y-auto"
            >
              {/* Mobile Navigation List */}
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#8C7A58] block pb-1 border-b border-[#EAE3D4]/80">
                  Store Navigation
                </span>

                <motion.div
                  initial="closed"
                  animate="open"
                  variants={{
                    open: {
                      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.04 },
                    },
                    closed: {},
                  }}
                  className="space-y-3"
                >
                  <motion.div
                    variants={{
                      open: { opacity: 1, x: 0 },
                      closed: { opacity: 0, x: -10 },
                    }}
                  >
                    <Link
                      href="/"
                      className="block text-base font-serif font-bold uppercase tracking-wider text-neutral-900 hover:text-[#8C7A58]"
                    >
                      Home
                    </Link>
                  </motion.div>

                  {NAV_LINKS.map((link) => (
                    <motion.div
                      key={link.id}
                      variants={{
                        open: { opacity: 1, x: 0 },
                        closed: { opacity: 0, x: -10 },
                      }}
                    >
                      <Link
                        href={link.href}
                        prefetch={true}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-base font-serif font-bold uppercase tracking-wider text-neutral-900 hover:text-[#8C7A58]"
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}

                  <motion.div
                    variants={{
                      open: { opacity: 1, x: 0 },
                      closed: { opacity: 0, x: -10 },
                    }}
                  >
                    <Link
                      href="/account"
                      className="block text-base font-serif font-bold uppercase tracking-wider text-[#8C7A58] hover:text-neutral-900"
                    >
                      My Account &amp; Orders
                    </Link>
                  </motion.div>
                </motion.div>

                {/* Mobile Admin Link if ADMIN */}
                {isAdmin && (
                  <div className="pt-4 border-t border-[#EAE3D4]">
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                      <span>Admin Management Console</span>
                    </Link>
                  </div>
                )}

                {/* Mobile Footer Meta */}
                <div className="pt-4 border-t border-[#EAE3D4] text-xs text-neutral-500 space-y-1">
                  <p className="font-serif italic text-neutral-700">Malli &amp; Co.</p>
                  <p>Near Vikas Pre School, Govt High School Road, Mallampet, Bachupally, Hyderabad, Telangana - 500090</p>
                  <p className="text-[11px] text-[#8C7A58]">French Linen • Pima Cotton • Royal Silks</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// =============================================================================
// SUB-COMPONENT: MAGNETIC ICON BUTTON (Subtle 6px magnetic pull & tap scale)
// =============================================================================
interface MagneticIconButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel: string;
  className?: string;
}

function MagneticIconButton({
  children,
  onClick,
  ariaLabel,
  className,
}: MagneticIconButtonProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (prefersReducedMotion || !btnRef.current) return;
    const { left, top, width, height } = btnRef.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const deltaX = (e.clientX - centerX) * 0.28;
    const deltaY = (e.clientY - centerY) * 0.28;
    // Bound to max 6px
    setPos({
      x: Math.max(-6, Math.min(6, deltaX)),
      y: Math.max(-6, Math.min(6, deltaY)),
    });
  };

  const handleMouseLeave = () => {
    setPos({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={btnRef}
      type="button"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      whileHover={{ scale: prefersReducedMotion ? 1 : 1.08 }}
      whileTap={{ scale: prefersReducedMotion ? 1 : 0.94 }}
      className={cn(
        "relative w-11 h-11 flex items-center justify-center rounded-full text-neutral-800 hover:text-black transition-colors",
        "focus-visible:ring-2 focus-visible:ring-[#8C7A58] focus-visible:outline-none select-none",
        className
      )}
      aria-label={ariaLabel}
    >
      {children}
    </motion.button>
  );
}

export default StoreHeader;
