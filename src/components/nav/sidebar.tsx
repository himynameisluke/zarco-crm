"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  ChevronsLeftRight,
  FileText,
  Home,
  Inbox,
  Layers,
  LogOut,
  Megaphone,
  Plug,
  Plus,
  Search,
  Settings,
  SquareKanban,
  ListChecks,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { signOut } from "@/app/(auth)/actions";
import { ZarcoMark } from "./zarco-mark";

export type SidebarCounts = {
  inbox?: number;
  tasks?: number;
};

type NavItemDef = {
  href: string;
  label: string;
  icon: typeof Home;
  countKey?: keyof SidebarCounts;
};

const PRIMARY_NAV: NavItemDef[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/inbox", label: "Inbox", icon: Inbox, countKey: "inbox" },
];

const WORKSPACE_NAV: NavItemDef[] = [
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/deals", label: "Deals", icon: SquareKanban },
  { href: "/projects", label: "Projects", icon: Layers },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/tasks", label: "Tasks", icon: ListChecks, countKey: "tasks" },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
];

const SETTINGS_NAV: NavItemDef[] = [
  { href: "/settings/mcp", label: "API & MCP", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

type PinnedView = {
  href: string;
  label: string;
  dotClass: string;
  count?: string | number;
};

const PINNED_VIEWS: PinnedView[] = [
  { href: "/deals?stage=negotiation", label: "In negotiation", dotClass: "--amber", count: 5 },
  { href: "/contacts?stale=14d", label: "No activity 14d", dotClass: "--warn", count: 11 },
  { href: "/organizations?segment=uk-smes", label: "UK SMEs", dotClass: "--info", count: 38 },
];

function NavItem({
  item,
  active,
  counts,
}: {
  item: NavItemDef;
  active: boolean;
  counts: SidebarCounts;
}) {
  const Icon = item.icon;
  const count = item.countKey ? counts[item.countKey] : undefined;
  return (
    <li>
      <Link href={item.href} className={cn("nav-item", active && "--active")}>
        <Icon className="ni-ico" size={15} />
        <span className="grow truncate">{item.label}</span>
        {count !== undefined && count > 0 ? (
          <span className="ni-count">{count}</span>
        ) : null}
      </Link>
    </li>
  );
}

type SidebarProps = {
  userEmail?: string;
  counts?: SidebarCounts;
};

function getInitials(email: string) {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function Sidebar({ userEmail = "guest@zarco.uk", counts = {} }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const initials = getInitials(userEmail);
  const displayName = userEmail.split("@")[0] ?? userEmail;

  return (
    <aside
      style={{
        width: 232,
        flexShrink: 0,
        height: "100%",
        background: "var(--panel-2)",
        borderRight: "1px solid var(--hairline)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Brand + workspace switcher */}
      <div
        style={{
          padding: "14px 14px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <ZarcoMark size={20} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            lineHeight: 1.1,
          }}
        >
          <span
            style={{
              fontFamily: "var(--display)",
              fontSize: 14.5,
              fontWeight: 500,
              letterSpacing: "-0.02em",
            }}
          >
            zarco
          </span>
          <span
            style={{
              fontFamily: "var(--code)",
              fontSize: 9.5,
              letterSpacing: "0.14em",
              color: "var(--ink-4)",
            }}
          >
            ZRC · UK
          </span>
        </div>
        <button
          type="button"
          className="btn-ghost"
          style={{ marginLeft: "auto", padding: 4, borderRadius: 4 }}
          aria-label="Switch workspace"
        >
          <ChevronsLeftRight size={13} color="var(--ink-4)" />
        </button>
      </div>

      {/* Search / Cmd-K trigger */}
      <div style={{ padding: "0 12px 10px" }}>
        <button
          type="button"
          className="input"
          onClick={() => {
            window.dispatchEvent(new Event("zarco:command-palette:open"));
          }}
          style={{
            justifyContent: "flex-start",
            height: 28,
            padding: "0 8px",
            cursor: "pointer",
          }}
        >
          <Search size={13} color="var(--ink-4)" />
          <span style={{ color: "var(--ink-4)", fontSize: 12.5, flex: 1, textAlign: "left" }}>
            Jump to…
          </span>
          <span className="kbd">⌘K</span>
        </button>
      </div>

      {/* Nav groups */}
      <nav
        style={{
          padding: "4px 8px",
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <ul style={{ display: "flex", flexDirection: "column", gap: 1, listStyle: "none", margin: 0, padding: 0 }}>
          {PRIMARY_NAV.map((item) => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} counts={counts} />
          ))}
        </ul>

        <div>
          <div
            style={{
              padding: "6px 12px 4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span className="t-eyebrow" style={{ fontSize: 9.5 }}>
              Workspace
            </span>
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: 2, borderRadius: 4 }}
              aria-label="Add workspace item"
            >
              <Plus size={12} color="var(--ink-4)" />
            </button>
          </div>
          <ul style={{ display: "flex", flexDirection: "column", gap: 1, listStyle: "none", margin: 0, padding: 0 }}>
            {WORKSPACE_NAV.map((item) => (
              <NavItem key={item.href} item={item} active={isActive(item.href)} counts={counts} />
            ))}
          </ul>
        </div>

        <div>
          <div style={{ padding: "6px 12px 4px" }}>
            <span className="t-eyebrow" style={{ fontSize: 9.5 }}>
              Pinned views
            </span>
          </div>
          <ul style={{ display: "flex", flexDirection: "column", gap: 1, listStyle: "none", margin: 0, padding: 0 }}>
            {PINNED_VIEWS.map((view) => (
              <li key={view.href}>
                <Link href={view.href} className="nav-item">
                  <span className={cn("dot", view.dotClass)} />
                  <span className="grow truncate">{view.label}</span>
                  {view.count !== undefined ? (
                    <span className="ni-count">{view.count}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Bottom: settings + user card */}
      <div style={{ borderTop: "1px solid var(--hairline)", padding: 8 }}>
        <ul style={{ display: "flex", flexDirection: "column", gap: 1, listStyle: "none", margin: 0, padding: 0 }}>
          {SETTINGS_NAV.map((item) => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} counts={counts} />
          ))}
        </ul>
        <div
          style={{
            marginTop: 8,
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 9,
            borderRadius: 6,
            background: "var(--hover)",
          }}
        >
          <span
            className="zk-avatar"
            style={{
              background: "oklch(0.78 0.20 145 / 0.20)",
              borderColor: "oklch(0.78 0.20 145 / 0.35)",
              color: "oklch(0.86 0.20 145)",
            }}
          >
            {initials}
          </span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1.15,
              minWidth: 0,
              flex: 1,
            }}
          >
            <span
              className="truncate"
              style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}
            >
              {displayName}
            </span>
            <span
              className="truncate"
              style={{ fontSize: 11, color: "var(--ink-4)" }}
            >
              {userEmail}
            </span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="btn-ghost btn-icon"
              aria-label="Sign out"
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-4)",
                background: "transparent",
                border: 0,
                cursor: "pointer",
              }}
            >
              <LogOut size={13} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
