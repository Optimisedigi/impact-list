"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  children: React.ReactNode;
}

// Portal that targets the dashboard shell's mobile-only banner slot. Lets a
// page render content next to the "Impact List" title without restructuring
// the shell. Falls back to nothing if the slot isn't mounted yet (SSR).
export function MobileBannerPortal({ children }: Props) {
  const [container, setContainer] = useState<Element | null>(null);

  useEffect(() => {
    setContainer(document.getElementById("mobile-banner-slot"));
  }, []);

  if (!container) return null;
  return createPortal(children, container);
}
