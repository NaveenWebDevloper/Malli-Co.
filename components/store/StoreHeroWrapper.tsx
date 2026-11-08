"use client";

import React from "react";
import dynamic from "next/dynamic";
import { HeroPosterFallback } from "@/components/three/HeroPosterFallback";

// Rule 8: 3D Code Isolation & Lazy Loading with Graceful Non-3D Fallback
const Hero3D = dynamic(() => import("@/components/three/Hero"), {
  ssr: false,
  loading: () => <HeroPosterFallback />,
});

export function StoreHeroWrapper() {
  return <Hero3D />;
}

export default StoreHeroWrapper;

