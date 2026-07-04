"use client";

import { usePathname } from "next/navigation";

// Routes that always use the full content width regardless of the Appearance
// "page width" setting — data-dense screens that would otherwise force a lot of
// vertical scrolling inside a narrow reading column.
const FULL_WIDTH_ROUTES = ["/dashboard"];

export function PageMain({
  pageWidth,
  children,
}: {
  pageWidth: "constrained" | "full";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isFullWidth =
    pageWidth === "full" ||
    FULL_WIDTH_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

  return (
    <main
      id="main-content"
      className={`flex-1 p-6 ${isFullWidth ? "" : "mx-auto w-full max-w-6xl"}`}
    >
      {children}
    </main>
  );
}
