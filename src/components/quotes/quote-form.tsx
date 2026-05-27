"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EntityCombobox } from "@/components/ui/entity-combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import {
  quickCreateContact,
  quickCreateDeal,
  quickCreateOrganization,
} from "@/app/(app)/quotes/quick-create";

type Option = { id: string; name: string };

type LineItem = {
  description: string;
  quantity: string;
  unitPrice: string;
};

type QuoteFormProps = {
  action: (state: unknown, formData: FormData) => Promise<{ error?: string } | void>;
  defaultValues?: {
    dealId?: string | null;
    organizationId?: string | null;
    contactId?: string | null;
    taxRate?: string | null;
    validUntil?: string | null;
    notes?: string | null;
    currency?: string | null;
    lineItems?: Array<{
      description: string;
      quantity: string;
      unitPricePence: number;
    }>;
  };
  organizationOptions: Option[];
  dealOptions: Option[];
  contactOptions: Option[];
  submitLabel?: string;
  cancelHref: string;
};

function emptyLine(): LineItem {
  return { description: "", quantity: "1", unitPrice: "" };
}

function penceToPounds(pence: number): string {
  return (pence / 100).toFixed(2);
}

export function QuoteForm({
  action,
  defaultValues,
  organizationOptions,
  dealOptions,
  contactOptions,
  submitLabel = "Save quote",
  cancelHref,
}: QuoteFormProps) {
  const initialItems: LineItem[] =
    defaultValues?.lineItems && defaultValues.lineItems.length > 0
      ? defaultValues.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: penceToPounds(li.unitPricePence),
        }))
      : [emptyLine()];

  const [lineItems, setLineItems] = useState<LineItem[]>(initialItems);
  const [taxRate, setTaxRate] = useState<string>(
    defaultValues?.taxRate ? (Number(defaultValues.taxRate) * 100).toString() : "0",
  );

  // Controlled values for the comboboxes. We also keep newly-created rows
  // in local state so they show up immediately after a quick-create (the
  // server-rendered list doesn't refresh until the form action runs).
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    defaultValues?.organizationId ?? null,
  );
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    defaultValues?.contactId ?? null,
  );
  const [selectedDealId, setSelectedDealId] = useState<string | null>(
    defaultValues?.dealId ?? null,
  );
  const [orgOptions, setOrgOptions] = useState(organizationOptions);
  const [contactOpts, setContactOpts] = useState(contactOptions);
  const [dealOpts, setDealOpts] = useState(dealOptions);

  const [state, formAction, pending] = useActionState(action, null);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, li) => {
      const q = Number(li.quantity);
      const p = Number(li.unitPrice);
      if (!Number.isFinite(q) || !Number.isFinite(p)) return sum;
      return sum + q * p;
    }, 0);
    const taxFraction = Number(taxRate) / 100;
    const tax = subtotal * (Number.isFinite(taxFraction) ? taxFraction : 0);
    const total = subtotal + tax;
    return {
      subtotalPence: Math.round(subtotal * 100),
      taxPence: Math.round(tax * 100),
      totalPence: Math.round(total * 100),
    };
  }, [lineItems, taxRate]);

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((li, i) => (i === index ? { ...li, ...patch } : li)),
    );
  }

  function addLine() {
    setLineItems((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  // Serialise line items for the server action.
  const lineItemsForSubmit = lineItems
    .filter((li) => li.description.trim().length > 0)
    .map((li) => ({
      description: li.description,
      quantity: Number(li.quantity) || 0,
      unitPricePounds: Number(li.unitPrice) || 0,
    }));

  return (
    <form action={formAction} className="space-y-6">
      <input
        type="hidden"
        name="lineItems"
        value={JSON.stringify(lineItemsForSubmit)}
      />
      <input
        type="hidden"
        name="taxRate"
        value={String((Number(taxRate) || 0) / 100)}
      />
      <input type="hidden" name="currency" value={defaultValues?.currency ?? "GBP"} />

      <Card>
        <CardHeader>
          <CardTitle>Recipient</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label>
              Organization <span className="text-destructive">*</span>
            </Label>
            <EntityCombobox
              name="organizationId"
              entityNoun="organization"
              required
              disabled={pending}
              value={selectedOrgId}
              onChange={setSelectedOrgId}
              items={orgOptions.map((o) => ({ id: o.id, label: o.name }))}
              onCreate={async (q) => {
                const created = await quickCreateOrganization(q);
                setOrgOptions((prev) => [
                  ...prev,
                  { id: created.id, name: created.label },
                ]);
                return created;
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>
              Linked deal <span className="text-destructive">*</span>
            </Label>
            <EntityCombobox
              name="dealId"
              entityNoun="deal"
              required
              disabled={pending}
              value={selectedDealId}
              onChange={setSelectedDealId}
              items={dealOpts.map((d) => ({ id: d.id, label: d.name }))}
              createHint={
                selectedOrgId
                  ? "Auto-linked to the selected organization. Stage: lead."
                  : "Stage: lead. Pick an organization first to link it."
              }
              onCreate={async (q) => {
                // selectedOrgId may be null here — that's allowed at the deal
                // level (deals can be unlinked from an org). The quote itself
                // still requires both.
                const created = await quickCreateDeal(
                  q,
                  selectedOrgId ?? undefined,
                );
                setDealOpts((prev) => [
                  ...prev,
                  { id: created.id, name: created.label },
                ]);
                return created;
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Contact</Label>
            <EntityCombobox
              name="contactId"
              entityNoun="contact"
              disabled={pending}
              value={selectedContactId}
              onChange={setSelectedContactId}
              items={contactOpts.map((c) => ({ id: c.id, label: c.name }))}
              createHint={
                selectedOrgId
                  ? "Name will be split into first/last. Auto-linked to the selected organization."
                  : "Name will be split into first/last. Pick an organization first to link it."
              }
              onCreate={async (q) => {
                const created = await quickCreateContact(
                  q,
                  selectedOrgId ?? undefined,
                );
                setContactOpts((prev) => [
                  ...prev,
                  { id: created.id, name: created.label },
                ]);
                return created;
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <table className="tbl">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ width: 90, textAlign: "right" }}>Qty</th>
                <th style={{ width: 130, textAlign: "right" }}>Unit (£)</th>
                <th style={{ width: 130, textAlign: "right" }}>Total</th>
                <th style={{ width: 32 }} aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, i) => {
                const qty = Number(li.quantity) || 0;
                const unit = Number(li.unitPrice) || 0;
                const lineTotal = Math.round(qty * unit * 100);
                return (
                  <tr key={i}>
                    <td style={{ padding: 4 }}>
                      <input
                        className="input"
                        style={{ height: 30 }}
                        value={li.description}
                        onChange={(e) =>
                          updateLine(i, { description: e.target.value })
                        }
                        placeholder="What you're charging for"
                        disabled={pending}
                      />
                    </td>
                    <td style={{ padding: 4 }}>
                      <input
                        className="input"
                        style={{ height: 30, textAlign: "right" }}
                        type="number"
                        step="0.01"
                        min={0}
                        value={li.quantity}
                        onChange={(e) =>
                          updateLine(i, { quantity: e.target.value })
                        }
                        disabled={pending}
                      />
                    </td>
                    <td style={{ padding: 4 }}>
                      <input
                        className="input"
                        style={{ height: 30, textAlign: "right" }}
                        type="number"
                        step="0.01"
                        min={0}
                        value={li.unitPrice}
                        onChange={(e) =>
                          updateLine(i, { unitPrice: e.target.value })
                        }
                        placeholder="0.00"
                        disabled={pending}
                      />
                    </td>
                    <td
                      className="t-num"
                      style={{ textAlign: "right", padding: "0 12px" }}
                    >
                      {formatMoney(lineTotal, defaultValues?.currency ?? "GBP")}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={pending || lineItems.length === 1}
                        aria-label="Remove line"
                        style={{
                          background: "transparent",
                          border: 0,
                          color: "var(--ink-4)",
                          padding: 4,
                          cursor: lineItems.length === 1 ? "not-allowed" : "pointer",
                          opacity: lineItems.length === 1 ? 0.4 : 1,
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button
            type="button"
            onClick={addLine}
            className="btn btn-ghost btn-sm"
            disabled={pending}
            style={{ color: "var(--ink-3)" }}
          >
            <Plus size={12} />
            Add line
          </button>

          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--hairline)",
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--ink-3)", fontSize: 12.5 }}>Subtotal</span>
            <span style={{ color: "var(--ink-4)", fontSize: 12 }}>
              tax rate %
            </span>
            <span
              className="t-num"
              style={{ textAlign: "right", fontSize: 14, color: "var(--ink-2)" }}
            >
              {formatMoney(totals.subtotalPence, defaultValues?.currency ?? "GBP")}
            </span>

            <span style={{ color: "var(--ink-3)", fontSize: 12.5 }}>VAT</span>
            <input
              className="input"
              style={{ height: 28, width: 80, textAlign: "right" }}
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              disabled={pending}
            />
            <span
              className="t-num"
              style={{ textAlign: "right", fontSize: 14, color: "var(--ink-2)" }}
            >
              {formatMoney(totals.taxPence, defaultValues?.currency ?? "GBP")}
            </span>

            <span style={{ color: "var(--ink)", fontWeight: 500, fontSize: 13 }}>
              Total
            </span>
            <span />
            <span
              className="t-num"
              style={{
                textAlign: "right",
                fontSize: 20,
                color: "var(--ink)",
              }}
            >
              {formatMoney(totals.totalPence, defaultValues?.currency ?? "GBP")}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Validity + notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="validUntil">Valid until</Label>
            <Input
              id="validUntil"
              name="validUntil"
              type="date"
              defaultValue={defaultValues?.validUntil ?? ""}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="notes">Notes for the recipient</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={defaultValues?.notes ?? ""}
              disabled={pending}
            />
          </div>
        </CardContent>
      </Card>

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" type="button" asChild disabled={pending}>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
