"use client";

import React, { useState, useEffect } from "react";
import { Preloader, type PreloaderVariant } from "@/components/ui/Preloader";

interface StorePreloaderProps {
  variant?: PreloaderVariant;
  duration?: number;
  alwaysShow?: boolean;
}

export function StorePreloader({
  variant = "stairs",
  duration = 2200,
  alwaysShow = false,
}: StorePreloaderProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Only show once per session unless alwaysShow is specified
    const hasSeen = sessionStorage.getItem("malli_co_preloader_seen");
    if (!hasSeen || alwaysShow) {
      setShouldRender(true);
    }
  }, [alwaysShow]);

  const handleComplete = () => {
    sessionStorage.setItem("malli_co_preloader_seen", "true");
    setShouldRender(false);
  };

  if (!shouldRender) return null;

  return (
    <Preloader
      variant={variant}
      duration={duration}
      loadingText={[
        "MALLI & CO.",
        "HAUTE COUTURE",
        "ARTISANAL LINENS",
        "AUTUMN / WINTER 2026",
      ]}
      bgColor="#0D0D0D"
      accentColor="#8C7A58"
      onComplete={handleComplete}
    />
  );
}

export default StorePreloader;

