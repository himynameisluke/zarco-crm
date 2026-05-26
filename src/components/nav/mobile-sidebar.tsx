"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Hamburger trigger + slide-in sheet for the sidebar on narrow viewports.
 *
 * Avoids the base-ui Sheet primitive (and its asChild Trigger SSR pitfall)
 * by managing open state locally. Renders nothing on >=lg screens via
 * Tailwind class.
 */
export function MobileSidebarTrigger({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={cn("btn btn-ghost btn-icon lg:hidden")}
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu size={16} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-y-0 left-0 flex"
            style={{ width: 232 }}
            onClick={(e) => e.stopPropagation()}
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
        </div>
      ) : null}
    </>
  );
}
