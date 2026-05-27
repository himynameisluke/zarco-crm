"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

// =============================================================================
// EntityCombobox
// =============================================================================
// Reusable search-and-create combobox. Use anywhere you'd otherwise reach for a
// Select but want users to be able to add a new option without leaving the
// form. Renders a button trigger (looks like an Input) and a floating panel
// with cmdk-powered search.
//
// - `value` is the entity id (UUID) currently selected, or null.
// - Items render as `{ id, label, sublabel? }`.
// - When the search query doesn't match any item, an inline "+ Create X" row
//   appears at the bottom. Clicking it calls `onCreate(query)` and selects
//   the returned id.
// - The component also renders a hidden <input name={name} /> so it slots
//   into standard server-action forms without extra wiring.
//
// Self-contained popover via absolute positioning + click-outside listener —
// avoids pulling in a new floating-ui dep.

export type ComboboxItem = {
  id: string;
  label: string;
  sublabel?: string;
};

export type EntityComboboxProps = {
  name: string;
  items: ComboboxItem[];
  value: string | null;
  onChange: (id: string | null) => void;
  onCreate?: (query: string) => Promise<ComboboxItem>;
  /** Required for the hidden input — UI label e.g. "Organization". */
  entityNoun: string;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Tag-line under the create row, e.g. "Stage will be set to 'lead'." */
  createHint?: ReactNode;
};

export function EntityCombobox({
  name,
  items,
  value,
  onChange,
  onCreate,
  entityNoun,
  placeholder,
  searchPlaceholder,
  required = false,
  disabled = false,
  createHint,
}: EntityComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => items.find((i) => i.id === value) ?? null,
    [items, value],
  );

  const trimmed = query.trim();
  const exactMatch = items.some(
    (i) => i.label.toLowerCase() === trimmed.toLowerCase(),
  );
  const showCreate = !!onCreate && trimmed.length > 0 && !exactMatch && !pending;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function select(item: ComboboxItem) {
    onChange(item.id);
    setOpen(false);
    setQuery("");
  }

  function handleCreate() {
    if (!onCreate || !trimmed) return;
    startTransition(async () => {
      try {
        const created = await onCreate(trimmed);
        select(created);
      } catch (err) {
        // Leave the popover open and let the parent surface the error.
        // Real apps would toast here — for v1 console suffices.
        console.error(`Failed to create ${entityNoun}:`, err);
      }
    });
  }

  return (
    <div ref={rootRef} className="relative" style={{ width: "100%" }}>
      <input
        type="hidden"
        name={name}
        value={value ?? ""}
        required={required}
      />
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "border-input hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className={cn(
            "truncate text-left",
            selected ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {selected ? selected.label : placeholder ?? `Select ${entityNoun}`}
        </span>
        <ChevronsUpDown size={14} className="opacity-50 shrink-0" />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md"
          style={{ minWidth: "100%" }}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder ?? `Search ${entityNoun}…`}
              value={query}
              onValueChange={setQuery}
              autoFocus
            />
            <CommandList>
              {items
                .filter((i) =>
                  trimmed === ""
                    ? true
                    : i.label.toLowerCase().includes(trimmed.toLowerCase()),
                )
                .slice(0, 50)
                .map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.label}
                    onSelect={() => select(item)}
                  >
                    <span className="flex flex-col">
                      <span>{item.label}</span>
                      {item.sublabel ? (
                        <span className="text-xs text-muted-foreground">
                          {item.sublabel}
                        </span>
                      ) : null}
                    </span>
                    {value === item.id ? (
                      <Check size={14} className="ml-auto" />
                    ) : null}
                  </CommandItem>
                ))}

              {showCreate ? (
                <CommandGroup heading="">
                  <CommandItem
                    value={`__create__${trimmed}`}
                    onSelect={handleCreate}
                    className="text-primary"
                  >
                    <Plus size={14} />
                    <span>
                      Create{" "}
                      <span className="font-medium">
                        &ldquo;{trimmed}&rdquo;
                      </span>{" "}
                      as new {entityNoun}
                    </span>
                  </CommandItem>
                  {createHint ? (
                    <p className="px-3 pb-2 pt-0 text-xs text-muted-foreground">
                      {createHint}
                    </p>
                  ) : null}
                </CommandGroup>
              ) : null}

              {pending ? (
                <div className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  Creating {entityNoun}…
                </div>
              ) : null}

              {!showCreate &&
              !pending &&
              items.filter((i) =>
                trimmed === ""
                  ? true
                  : i.label.toLowerCase().includes(trimmed.toLowerCase()),
              ).length === 0 ? (
                <CommandEmpty>No {entityNoun} found.</CommandEmpty>
              ) : null}
            </CommandList>
          </Command>
        </div>
      ) : null}
    </div>
  );
}
