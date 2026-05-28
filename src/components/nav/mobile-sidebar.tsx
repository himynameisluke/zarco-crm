"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Hamburger trigger + slide-in sheet for the sidebar on narrow viewports.
 *
 * Avoids the base-ui Sheet primitive (and its asChild Trigger SSR pitfall)
 * by managing open state locally. Renders nothing on >=lg screens via
 * Tailwind class.
 *
 * Layout notes (don't regress these):
 *   - Outer wrapper is `fixed inset-0 flex` — flex lets the drawer + backdrop
 *     size themselves via align-items: stretch (default).
 *   - Drawer uses explicit `height: 100vh` + `display: flex; flex-direction:
 *     column` so the Sidebar's `height: 100%` actually resolves. Using `inset-
 *     y-0` for height makes `height: 100%` on children collapse to content
 *     height — caused the original "only header renders" bug.
 *   - We close the drawer whenever the route changes (so navigating from an
 *     item dismisses it). usePathname tracked in the parent layout would be
 *     cleaner, but bouncing off setOpen(false) onClick of any link inside
 *     children is the simplest invariant — keep the close-on-route behaviour
 *     in the body listener below.
 *   - The drawer is rendered via createPortal into document.body. The Topbar
 *     uses `backdrop-filter`, which creates a new containing block for fixed-
 *     positioned descendants — so `position: fixed; inset: 0` here would size
 *     to the topbar (920×47) instead of the viewport. Portaling escapes that.
 */
export function MobileSidebarTrigger({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // createPortal needs document.body, only available client-side post-mount.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={cn("btn btn-ghost btn-icon sm:hidden")}
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu size={16} />
      </button>

      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-50 sm:hidden flex"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
          {/* Drawer: positioned wrapper, NOT a flex container, so the
              Sidebar's `height: 100%` resolves cleanly against the explicit
              100vh. Flexbox here caused the Sidebar to collapse to intrinsic
              content height in some browsers. */}
          <div
            className="relative z-10"
            style={{
              width: 232,
              height: "100vh",
              background: "var(--paper)",
            }}
            onClick={(e) => e.stopPropagation()}
            onClickCapture={(e) => {
              // Auto-close when an anchor is clicked (e.g. nav item).
              const target = e.target as HTMLElement;
              if (target.closest("a")) setOpen(false);
            }}
          >
            {children}
            <button
              type="button"
              className="absolute right-2 top-2 btn btn-ghost btn-icon"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              style={{ zIndex: 1 }}
            >
              <X size={16} />
            </button>
          </div>
          {/* Backdrop: fills remaining width, click to close */}
          <button
            type="button"
            aria-label="Close navigation"
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        </div>,
            document.body,
          )
        : null}
    </>
  );
}
