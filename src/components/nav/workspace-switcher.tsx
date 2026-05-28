"use client";

import { useTransition } from "react";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Sparkles,
  Building2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createDemoWorkspace,
  switchWorkspace,
} from "@/lib/workspace/actions";

export type WorkspaceSwitcherWorkspace = {
  id: string;
  name: string;
  type: "real" | "demo";
};

type WorkspaceSwitcherProps = {
  workspaces: WorkspaceSwitcherWorkspace[];
  currentWorkspaceId: string | null;
};

/**
 * Top of the sidebar bottom-section: shows the current workspace name with a
 * dropdown that lists all workspaces the user belongs to. Includes a
 * "Create demo workspace" action when no demo exists yet (one-shot — once a
 * demo workspace exists for this user, the action disappears).
 *
 * Switching is a server action that sets the currentWorkspaceId cookie and
 * redirects to /. The page reload is intentional — every server component
 * re-resolves workspace context, so the whole UI flips cleanly to the new
 * workspace's data.
 */
export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
}: WorkspaceSwitcherProps) {
  const [pending, startTransition] = useTransition();

  const current =
    workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];
  const hasDemo = workspaces.some((w) => w.type === "demo");

  function handleSwitch(id: string) {
    if (id === currentWorkspaceId) return;
    startTransition(async () => {
      await switchWorkspace(id);
    });
  }

  function handleCreateDemo() {
    startTransition(async () => {
      await createDemoWorkspace();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
          "hover:bg-[color:var(--hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--amber)]",
        )}
        style={{
          background: "transparent",
          border: "1px solid var(--hairline)",
        }}
        disabled={pending}
      >
        <Building2 size={13} color="var(--ink-3)" />
        <span
          className="truncate"
          style={{ fontSize: 12.5, color: "var(--ink)", flex: 1 }}
        >
          {current?.name ?? "No workspace"}
        </span>
        {current?.type === "demo" ? (
          <span
            className="t-mono"
            style={{
              fontSize: 9,
              padding: "1px 6px",
              borderRadius: 999,
              background: "oklch(0.82 0.14 70 / 0.18)",
              color: "oklch(0.86 0.14 70)",
              letterSpacing: "0.06em",
            }}
          >
            DEMO
          </span>
        ) : null}
        {pending ? (
          <Loader2 size={12} className="animate-spin" color="var(--ink-3)" />
        ) : (
          <ChevronsUpDown size={12} color="var(--ink-4)" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={6}
        className="w-60"
      >
        {/* base-ui requires DropdownMenuLabel (renders Menu.GroupLabel) to
            live inside a Menu.Group — bare label throws error #31. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[11px] tracking-wide uppercase opacity-60">
            Workspaces
          </DropdownMenuLabel>
          {workspaces.map((w) => {
            const isCurrent = w.id === currentWorkspaceId;
            return (
              <DropdownMenuItem
                key={w.id}
                onClick={() => handleSwitch(w.id)}
                className="flex items-center gap-2 cursor-pointer"
                disabled={pending}
              >
                <Building2 size={12} className="opacity-70" />
                <span className="flex-1 truncate text-sm">{w.name}</span>
                {w.type === "demo" ? (
                  <span
                    className="text-[9px] tracking-wide uppercase"
                    style={{ color: "oklch(0.86 0.14 70)" }}
                  >
                    Demo
                  </span>
                ) : null}
                {isCurrent ? <Check size={12} className="ml-1" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>

        {!hasDemo ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleCreateDemo}
                disabled={pending}
                className="flex items-center gap-2 cursor-pointer"
                style={{ color: "oklch(0.86 0.20 145)" }}
              >
                <Sparkles size={12} />
                <span className="text-sm">Create demo workspace</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <div
              className="px-2 py-1 text-[10.5px]"
              style={{ color: "var(--ink-4)", lineHeight: 1.4 }}
            >
              Spins up a sandbox with fake orgs, deals, contacts, and
              activities. Switch back any time.
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
