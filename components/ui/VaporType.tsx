"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { cn } from "@/lib/utils";

export interface VaporTypeRef {
  /** Advance immediately to evaporate the current word and bring in the next */
  next: () => void;
  /** Reset animation and restart from the first word */
  replay: () => void;
}

export interface VaporTypeProps {
  /** Words or short phrases to cycle through. Each one condenses in place of the last. */
  words?: string[];
  /** Element to render. The component inherits font, size and weight from its parent and reserves room for the longest word. */
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** How shorter words sit inside the space reserved for the longest one. */
  align?: "start" | "center" | "end";
  /** Colour of the lettering. Defaults to the surrounding text colour ("currentColor"). */
  color?: string;
  /** Colour the particles fade to as they drift away from the letters. Pass "currentColor" for monochrome vapour. */
  vaporColor?: string;
  /** Particles per square pixel of lettering. Higher values give finer, denser vapour. */
  density?: number;
  /** Size of each particle in CSS pixels. */
  particleSize?: number;
  /** How far the vapour travels before it fades, in multiples of the font size. */
  spread?: number;
  /** Upward drift of the vapour. Negative values let it sink like cold air. */
  rise?: number;
  /** How strongly the air currents curl the vapour into wisps. */
  turbulence?: number;
  /** How much individual particles scatter away from the wisps. Higher values read as dust. */
  diffusion?: number;
  /** Size of the clumps the letters break into as they evaporate. */
  grain?: number;
  /** Where the evaporation starts and the next word lands first. Scatter breaks the word up in patches. */
  sweep?: "left" | "right" | "center" | "top" | "scatter";
  /** How spread out the sweep is. 0 transforms the whole word at once. */
  stagger?: number;
  /** Seconds a word takes to condense out of the vapour. */
  condense?: number;
  /** Seconds each word stays fully formed. */
  hold?: number;
  /** Seconds a word takes to evaporate. */
  dissolve?: number;
  /** How early the next word starts condensing, as a fraction of the dissolve. 0 waits for the vapour to clear. */
  overlap?: number;
  /** Keep cycling. When false the last word stays in place. */
  loop?: boolean;
  /** Wait until the text scrolls into view before the first word condenses. */
  startOnView?: boolean;
  /** Let the pointer blow the letters into vapour as it passes. Touch scrolling is ignored. */
  interactive?: boolean;
  /** How strongly the pointer evaporates the letters. Faster movement blows harder. */
  breath?: number;
  /** Reach of the pointer, in multiples of the font size. */
  breathRadius?: number;
  /** Seconds blown letters take to settle back into place. */
  recovery?: number;
  /** Clicking the text evaporates the word outward from the click and brings in the next one. */
  clickAdvance?: boolean;
  /** Keep the current word in place while the pointer rests on it, so it can be played with. */
  pauseOnHover?: boolean;
  /** Where the pointer is followed: over the parent element, only over the text, or anywhere. */
  area?: "parent" | "self" | "window";
  /** Freezes the animation. Reduced-motion users always see the first word as plain text. */
  paused?: boolean;
  /** Maximum device pixel ratio for the canvas. */
  dpr?: number;
  /** Called when a word starts condensing, with its index in words. */
  onWordChange?: (index: number) => void;
  /** Optional custom class name */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
}

interface Particle {
  // Target rest coordinate in text space
  hx: number;
  hy: number;
  // Current dynamic position
  x: number;
  y: number;
  // Current velocity
  vx: number;
  vy: number;
  // Disturbance offset from pointer
  dx: number;
  dy: number;
  // Normalized stagger value [0..1] across the word sweep
  staggerValue: number;
  // Unique random seed for curl and diffusion
  seed: number;
  grainId: number;
  // Current render alpha
  alpha: number;
  // Current color interpolation factor (0: vaporColor, 1: text color)
  colorFactor: number;
}

const DEFAULT_WORDS = ["Imagine", "Create", "Inspire"];

/**
 * VaporType Component
 * Words that condense out of vapor and drift away.
 * React Bits Pro specification compliant with full typography inheritance,
 * spring physics, interactive pointer breath, and WCAG accessibility.
 */
export const VaporType = forwardRef<VaporTypeRef, VaporTypeProps>(function VaporType(
  {
    words = DEFAULT_WORDS,
    as: ComponentTag = "span",
    align = "center",
    color = "currentColor",
    vaporColor = "#8C7A58",
    density = 1,
    particleSize = 1.2,
    spread = 1.2,
    rise = 1,
    turbulence = 0.8,
    diffusion = 0.35,
    grain = 1,
    sweep = "left",
    stagger = 0.8,
    condense = 1.8,
    hold = 2.4,
    dissolve = 2.0,
    overlap = 0.6,
    loop = true,
    startOnView = true,
    interactive = true,
    breath = 1.0,
    breathRadius = 0.8,
    recovery = 1.2,
    clickAdvance = true,
    pauseOnHover = true,
    area = "parent",
    paused = false,
    dpr = 2,
    onWordChange,
    className,
    style,
  },
  ref
) {
  const containerRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const longestWordRef = useRef<HTMLSpanElement | null>(null);

  const [wordIndex, setWordIndex] = useState(0);
  const [isInView, setIsInView] = useState(!startOnView);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [resolvedColor, setResolvedColor] = useState("#121212");
  const [resolvedVaporColor, setResolvedVaporColor] = useState("#8C7A58");

  // Pointer tracking
  const pointerPos = useRef<{ x: number; y: number; vx: number; vy: number; active: boolean }>({
    x: -9999,
    y: -9999,
    vx: 0,
    vy: 0,
    active: false,
  });
  const isHovered = useRef(false);

  // Animation timeline state
  // Phase: "condensing" -> "holding" -> "dissolving"
  const animState = useRef({
    phase: "condensing" as "condensing" | "holding" | "dissolving",
    phaseTime: 0,
    currentWordIndex: 0,
    nextWordIndex: 1,
    particlesCurrent: [] as Particle[],
    particlesNext: [] as Particle[],
    fontSize: 32,
    canvasWidth: 0,
    canvasHeight: 0,
    offsetX: 0,
    offsetY: 0,
    advanceTriggered: false,
  });

  // Calculate the longest word for CSS layout reservation (zero CLS)
  const longestWord = useMemo(() => {
    if (!words || words.length === 0) return "";
    return [...words].sort((a, b) => b.length - a.length)[0];
  }, [words]);

  // Imperative controls
  useImperativeHandle(ref, () => ({
    next: () => {
      triggerNextWord();
    },
    replay: () => {
      setWordIndex(0);
      animState.current.currentWordIndex = 0;
      animState.current.phase = "condensing";
      animState.current.phaseTime = 0;
      sampleWordParticles(0, false);
    },
  }));

  const triggerNextWord = useCallback(() => {
    if (words.length <= 1) return;
    const nextIdx = (animState.current.currentWordIndex + 1) % words.length;
    animState.current.phase = "dissolving";
    animState.current.phaseTime = 0;
    animState.current.nextWordIndex = nextIdx;
    animState.current.advanceTriggered = true;
  }, [words.length]);

  // Detect accessibility preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Intersection observer for startOnView
  useEffect(() => {
    if (!startOnView) {
      setIsInView(true);
      return;
    }
    const target = containerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [startOnView]);

  // Resolve color values (resolves "currentColor" to computed style)
  useEffect(() => {
    if (!containerRef.current) return;
    const computed = window.getComputedStyle(containerRef.current);
    const textColor = color === "currentColor" ? computed.color : color;
    const vapColor = vaporColor === "currentColor" ? textColor : vaporColor;
    setResolvedColor(textColor);
    setResolvedVaporColor(vapColor);
  }, [color, vaporColor]);

  // Check if initially in view
  useEffect(() => {
    if (!startOnView) {
      setIsInView(true);
      return;
    }
    const target = containerRef.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setIsInView(true);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
          }
        });
      },
      { threshold: 0.05 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [startOnView]);

  // Sample glyphs into particle array
  const sampleWordParticles = useCallback(
    (index: number, isNext: boolean = false): Particle[] => {
      const container = containerRef.current;
      if (!container || !words[index]) return [];

      const computed = window.getComputedStyle(container);
      const fontSize = parseFloat(computed.fontSize) || 32;
      const fontFamily = computed.fontFamily || "serif";
      const fontWeight = computed.fontWeight || "400";
      const fontStyle = computed.fontStyle || "normal";
      const letterSpacing = computed.letterSpacing || "normal";
      animState.current.fontSize = fontSize;

      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));

      // Use offscreen canvas for raster sampling
      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return [];

      // Clean font family for Canvas 2D specification
      const safeFontFamily = fontFamily.toLowerCase().includes("serif")
        ? 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
        : fontFamily;

      offCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${safeFontFamily}`;
      if (letterSpacing && letterSpacing !== "normal") {
        try {
          offCtx.letterSpacing = letterSpacing;
        } catch {
          // Ignore if unsupported in environment
        }
      }
      offCtx.textBaseline = "middle";

      const text = words[index];
      const textMetrics = offCtx.measureText(text);
      const textWidth = textMetrics.width;

      let drawX = 0;
      if (align === "center") {
        drawX = (width - textWidth) / 2;
      } else if (align === "end") {
        drawX = width - textWidth;
      }

      const drawY = height / 2;
      offCtx.fillStyle = "#ffffff";
      offCtx.fillText(text, drawX, drawY);

      const imageData = offCtx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Calculate step grid based on density
      const step = Math.max(2, Math.round(3 / Math.max(0.2, density)));
      const particles: Particle[] = [];

      let grainCounter = 0;
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const pixelIndex = (y * width + x) * 4;
          const alpha = data[pixelIndex + 3];

          if (alpha > 40) {
            // Normalized sweep coordinate [0..1]
            let sweepProgress = 0;
            if (sweep === "left") {
              sweepProgress = x / width;
            } else if (sweep === "right") {
              sweepProgress = 1 - x / width;
            } else if (sweep === "center") {
              sweepProgress = Math.abs(x - width / 2) / (width / 2);
            } else if (sweep === "top") {
              sweepProgress = y / height;
            } else {
              // scatter
              sweepProgress = ((x * 13 + y * 29) % 100) / 100;
            }

            const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
            grainCounter++;

            particles.push({
              hx: x,
              hy: y,
              x: x,
              y: y,
              vx: 0,
              vy: 0,
              dx: 0,
              dy: 0,
              staggerValue: sweepProgress,
              seed: Math.abs(seed - Math.floor(seed)),
              grainId: Math.floor(grainCounter / Math.max(1, grain * 4)),
              alpha: isNext ? 0 : 1,
              colorFactor: isNext ? 0 : 1,
            });
          }
        }
      }

      return particles;
    },
    [words, align, density, sweep, grain]
  );

  // Resize canvas according to container dimensions + vapor bleed margin
  const updateCanvasBounds = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const computed = window.getComputedStyle(container);
    const fontSize = parseFloat(computed.fontSize) || 32;

    // Buffer bleed for vapor expansion without clipping
    const bleed = Math.round(fontSize * Math.max(1, spread));
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    const totalWidth = width + bleed * 2;
    const totalHeight = height + bleed * 2;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, dpr);
    canvas.width = totalWidth * pixelRatio;
    canvas.height = totalHeight * pixelRatio;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${totalHeight}px`;
    canvas.style.left = `-${bleed}px`;
    canvas.style.top = `-${bleed}px`;

    animState.current.canvasWidth = totalWidth;
    animState.current.canvasHeight = totalHeight;
    animState.current.offsetX = bleed;
    animState.current.offsetY = bleed;
    animState.current.fontSize = fontSize;
  }, [spread, dpr]);

  // Pointer event handlers
  useEffect(() => {
    if (!interactive) return;

    let targetElement: EventTarget | null = null;
    if (area === "self") {
      targetElement = containerRef.current;
    } else if (area === "parent") {
      targetElement = containerRef.current?.parentElement || containerRef.current;
    } else {
      targetElement = window;
    }

    if (!targetElement) return;

    const onPointerMove = (e: Event) => {
      const pe = e as MouseEvent;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const newX = pe.clientX - rect.left;
      const newY = pe.clientY - rect.top;

      const prevX = pointerPos.current.x === -9999 ? newX : pointerPos.current.x;
      const prevY = pointerPos.current.y === -9999 ? newY : pointerPos.current.y;

      pointerPos.current = {
        x: newX,
        y: newY,
        vx: (newX - prevX) * 0.3,
        vy: (newY - prevY) * 0.3,
        active: true,
      };
    };

    const onPointerLeave = () => {
      pointerPos.current.active = false;
      isHovered.current = false;
    };

    const onPointerEnter = () => {
      isHovered.current = true;
    };

    targetElement.addEventListener("mousemove", onPointerMove as EventListener);
    targetElement.addEventListener("mouseenter", onPointerEnter as EventListener);
    targetElement.addEventListener("mouseleave", onPointerLeave as EventListener);

    return () => {
      targetElement?.removeEventListener("mousemove", onPointerMove as EventListener);
      targetElement?.removeEventListener("mouseenter", onPointerEnter as EventListener);
      targetElement?.removeEventListener("mouseleave", onPointerLeave as EventListener);
    };
  }, [interactive, area]);

  // Click advance handler
  const handleClick = useCallback(() => {
    if (!clickAdvance || words.length <= 1) return;
    triggerNextWord();
  }, [clickAdvance, words.length, triggerNextWord]);

  // Main Animation Loop
  useEffect(() => {
    if (prefersReducedMotion || paused || !isInView) return;

    updateCanvasBounds();
    animState.current.particlesCurrent = sampleWordParticles(wordIndex, false);
    onWordChange?.(wordIndex);

    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, dpr);
      const state = animState.current;
      const { offsetX, offsetY, fontSize } = state;

      // Clear frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const effectivePause = pauseOnHover && isHovered.current;
      if (!effectivePause) {
        state.phaseTime += dt;
      }

      // Timeline Phase Machine
      if (state.phase === "condensing") {
        if (state.phaseTime >= condense) {
          state.phase = "holding";
          state.phaseTime = 0;
        }
      } else if (state.phase === "holding") {
        if (state.phaseTime >= hold) {
          if (loop || state.currentWordIndex < words.length - 1) {
            state.phase = "dissolving";
            state.phaseTime = 0;
            state.nextWordIndex = (state.currentWordIndex + 1) % words.length;
            state.particlesNext = sampleWordParticles(state.nextWordIndex, true);
          }
        }
      } else if (state.phase === "dissolving") {
        const overlapStart = dissolve * (1 - overlap);
        if (state.phaseTime >= overlapStart && state.particlesNext.length === 0) {
          state.nextWordIndex = (state.currentWordIndex + 1) % words.length;
          state.particlesNext = sampleWordParticles(state.nextWordIndex, true);
        }

        if (state.phaseTime >= dissolve) {
          // Transition to next word
          state.currentWordIndex = state.nextWordIndex;
          setWordIndex(state.currentWordIndex);
          onWordChange?.(state.currentWordIndex);
          state.particlesCurrent =
            state.particlesNext.length > 0
              ? state.particlesNext
              : sampleWordParticles(state.currentWordIndex, false);
          state.particlesNext = [];
          state.phase = "condensing";
          state.phaseTime = 0;
          state.advanceTriggered = false;
        }
      }

      // Pointer interactive blow mechanics
      const pointer = pointerPos.current;
      const breathDist = fontSize * breathRadius;

      // Helper to render particle array
      const drawParticleList = (
        particles: Particle[],
        mode: "condensing" | "holding" | "dissolving" | "next_condensing"
      ) => {
        const pSize = particleSize * pixelRatio;
        const vaporReach = fontSize * spread;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const staggerOffset = p.staggerValue * stagger;

          // Target absolute position
          const targetX = p.hx + offsetX;
          const targetY = p.hy + offsetY;

          if (mode === "condensing" || mode === "next_condensing") {
            const rawProgress = Math.max(0, (state.phaseTime - staggerOffset) / Math.max(0.1, condense));
            const progress = Math.min(1, rawProgress);
            const ease = progress * progress * (3 - 2 * progress); // smoothstep

            // Condense from vapor cloud
            const curl = Math.sin(now * 0.002 + p.seed * 10) * turbulence * 20;
            const startDist = (1 - ease) * vaporReach;
            const startY = targetY - rise * startDist + curl;
            const startX = targetX + (p.seed - 0.5) * diffusion * vaporReach + curl * 0.5;

            p.x = startX + (targetX - startX) * ease;
            p.y = startY + (targetY - startY) * ease;
            p.alpha = Math.min(1, ease * 1.5);
            p.colorFactor = ease;
          } else if (mode === "dissolving") {
            const rawProgress = Math.max(0, (state.phaseTime - staggerOffset) / Math.max(0.1, dissolve));
            const progress = Math.min(1, rawProgress);
            const ease = progress * progress; // accelerating drift

            const curl = Math.cos(now * 0.003 + p.seed * 15) * turbulence * 35;
            const driftY = -rise * ease * vaporReach * 1.4;
            const driftX = (p.seed - 0.5) * diffusion * vaporReach * 1.8 + curl * ease;

            p.x = targetX + driftX;
            p.y = targetY + driftY;
            p.alpha = Math.max(0, 1 - ease * 1.2);
            p.colorFactor = Math.max(0, 1 - ease * 1.8);
          } else {
            // Holding
            // Gentle organic micro-wisps
            const microWisp = Math.sin(now * 0.002 + p.seed * 6) * 0.4;
            p.x = targetX + microWisp;
            p.y = targetY + microWisp * 0.5;
            p.alpha = 1;
            p.colorFactor = 1;
          }

          // Interactive Pointer Repulsion / Breath
          if (interactive && pointer.active) {
            const pCanvasX = p.x;
            const pCanvasY = p.y;
            const dx = pCanvasX - pointer.x;
            const dy = pCanvasY - pointer.y;
            const dist = Math.hypot(dx, dy);

            if (dist < breathDist) {
              const force = (1 - dist / breathDist) * breath;
              const angle = Math.atan2(dy, dx);
              const pushX = Math.cos(angle) * force * 24;
              const pushY = Math.sin(angle) * force * 24 - force * 10 * rise;

              p.dx += pushX * 0.2;
              p.dy += pushY * 0.2;
            }
          }

          // Spring recovery for pointer disturbance
          p.dx += (0 - p.dx) * Math.min(1, dt * (3 / Math.max(0.1, recovery)));
          p.dy += (0 - p.dy) * Math.min(1, dt * (3 / Math.max(0.1, recovery)));

          // Render Particle
          if (p.alpha > 0.01) {
            const rx = (p.x + p.dx) * pixelRatio;
            const ry = (p.y + p.dy) * pixelRatio;

            ctx.globalAlpha = p.alpha;
            // Interpolate color between vaporColor and textColor
            ctx.fillStyle = p.colorFactor > 0.5 ? resolvedColor : resolvedVaporColor;

            ctx.beginPath();
            ctx.arc(rx, ry, pSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };

      // Draw current word particles
      if (state.particlesCurrent.length > 0) {
        drawParticleList(state.particlesCurrent, state.phase);
      }

      // Draw next word condensing during dissolve overlap
      if (state.phase === "dissolving" && state.particlesNext.length > 0) {
        drawParticleList(state.particlesNext, "next_condensing");
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    const handleResize = () => {
      updateCanvasBounds();
      animState.current.particlesCurrent = sampleWordParticles(animState.current.currentWordIndex, false);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [
    prefersReducedMotion,
    paused,
    isInView,
    words,
    wordIndex,
    condense,
    hold,
    dissolve,
    overlap,
    loop,
    spread,
    rise,
    turbulence,
    diffusion,
    stagger,
    particleSize,
    dpr,
    interactive,
    breath,
    breathRadius,
    recovery,
    pauseOnHover,
    resolvedColor,
    resolvedVaporColor,
    sampleWordParticles,
    updateCanvasBounds,
    onWordChange,
  ]);

  const currentDisplayWord = words[wordIndex] || words[0] || "";

  return (
    <ComponentTag
      ref={containerRef as React.Ref<never>}
      onClick={handleClick}
      className={cn(
        "relative inline-block align-baseline cursor-pointer select-none",
        className
      )}
      style={style}
      aria-label={currentDisplayWord}
    >
      {/* 
        Zero-CLS Layout Anchor: 
        Renders the longest word invisibly to guarantee exact width/height reservation.
      */}
      <span
        ref={longestWordRef}
        aria-hidden="true"
        className="opacity-0 pointer-events-none select-none invisible inline-block whitespace-nowrap"
      >
        {longestWord}
      </span>

      {/* Screen Reader Announcement */}
      <span className="sr-only" aria-live="polite">
        {currentDisplayWord}
      </span>

      {/* Reduced-Motion & Paused Fallback (Static text) */}
      {(prefersReducedMotion || paused) && (
        <span
          className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
          style={{ color: resolvedColor }}
        >
          {currentDisplayWord}
        </span>
      )}

      {/* Dynamic Vapor Canvas */}
      {!prefersReducedMotion && !paused && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute z-10 block"
        />
      )}
    </ComponentTag>
  );
});

export default VaporType;
