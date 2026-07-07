"use client";

import Link from "next/link";
import { ArrowUpRight, MoreHorizontal, Pencil } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The ⋯ menu on list-view rows. Every table used to render a dead
 * MoreHorizontal button — this makes it real: View + Edit links.
 * (Delete stays on the detail page where it has a confirm dialog.)
 */
export function RowActionsMenu({
  viewHref,
  editHref,
}: {
  viewHref: string;
  editHref?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="btn-ghost"
        style={{
          padding: 4,
          borderRadius: 4,
          background: "transparent",
          border: 0,
          color: "var(--ink-4)",
          cursor: "pointer",
          display: "inline-flex",
        }}
        aria-label="Row actions"
      >
        <MoreHorizontal size={13} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={viewHref}>
            <ArrowUpRight className="h-3.5 w-3.5" />
            View
          </Link>
        </DropdownMenuItem>
        {editHref ? (
          <DropdownMenuItem asChild>
            <Link href={editHref}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
