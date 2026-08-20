"use client";

import { createPortal } from "react-dom";
import { useHydrated } from "@/lib/use-hydrated";

interface Props {
  children: React.ReactNode;
}

// Portal that targets the dashboard shell's mobile-only banner slot. Lets a
// page render content next to the "Impact List" title without restructuring
// the shell. Falls back to nothing if the slot isn't mounted yet (SSR).
export function MobileBannerPortal({ children }: Props) {
  const hydrated = useHydrated();

  const container = hydrated ? document.getElementById("mobile-banner-slot") : null;
  if (!container) return null;
  return createPortal(children, container);
}
