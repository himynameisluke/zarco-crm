"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  FileText,
  Home,
  Inbox,
  Layers,
  ListChecks,
  Megaphone,
  Plug,
  Plus,
  Settings,
  SquareKanban,
  Users,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export type PaletteEntity = {
  id: string;
  name: string;
  kind: "contact" | "organization" | "deal";
  subtitle?: string;
};

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/deals", label: "Deals", icon: SquareKanban },
  { href: "/projects", label: "Projects", icon: Layers },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings/mcp", label: "API & MCP", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

const CREATE_ITEMS = [
  { href: "/contacts/new", label: "New contact", icon: Users },
  { href: "/organizations/new", label: "New organization", icon: Building2 },
  { href: "/deals/new", label: "New deal", icon: SquareKanban },
  { href: "/projects/new", label: "New project", icon: Layers },
  { href: "/tasks", label: "New task", icon: ListChecks },
];

function entityHref(entity: PaletteEntity): string {
  switch (entity.kind) {
    case "contact":
      return `/contacts/${entity.id}`;
    case "organization":
      return `/organizations/${entity.id}`;
    case "deal":
      return `/deals/${entity.id}`;
  }
}

function entityIcon(kind: PaletteEntity["kind"]) {
  switch (kind) {
    case "contact":
      return Users;
    case "organization":
      return Building2;
    case "deal":
      return SquareKanban;
  }
}

export function CommandPalette({ entities }: { entities: PaletteEntity[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    function onCustomOpen() {
      setOpen(true);
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("zarco:command-palette:open", onCustomOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("zarco:command-palette:open", onCustomOpen);
    };
  }, []);

  function jumpTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or jump to…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        {entities.length > 0 ? (
          <>
            <CommandGroup heading="Recent">
              {entities.map((e) => {
                const Icon = entityIcon(e.kind);
                return (
                  <CommandItem
                    key={`${e.kind}-${e.id}`}
                    value={`${e.kind} ${e.name} ${e.subtitle ?? ""}`}
                    onSelect={() => jumpTo(entityHref(e))}
                  >
                    <Icon size={14} />
                    <span style={{ flex: 1 }}>{e.name}</span>
                    {e.subtitle ? (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--ink-4)",
                        }}
                      >
                        {e.subtitle}
                      </span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        ) : null}

        <CommandGroup heading="Create">
          {CREATE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`create ${item.label}`}
                onSelect={() => jumpTo(item.href)}
              >
                <Plus size={14} />
                <Icon size={13} />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading="Jump to">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`go ${item.label}`}
                onSelect={() => jumpTo(item.href)}
              >
                <Icon size={14} />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
