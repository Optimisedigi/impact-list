"use client";

import { usePathname } from "next/navigation";

interface Props {
  children: React.ReactNode;
  // Hide the children when the pathname starts with any of these prefixes.
  hideOn: string[];
}

// Wraps server children with a client-side check so we can hide them on
// specific routes without converting the parent layout to a client component.
export function HideOnRoutes({ children, hideOn }: Props) {
  const pathname = usePathname();
  if (hideOn.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <>{children}</>;
}

interface ShowOnProps {
  children: React.ReactNode;
  showOn: string[];
}

export function ShowOnRoutes({ children, showOn }: ShowOnProps) {
  const pathname = usePathname();
  if (showOn.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return <>{children}</>;
  }
  return null;
}
