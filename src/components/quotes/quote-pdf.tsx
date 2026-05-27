import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from "@react-pdf/renderer";

// =============================================================================
// Zarco-branded quote PDF
// =============================================================================
// A4 portrait, white paper. Brand accents:
//   - Deep navy ink (#0E1A2E) for text and dividers
//   - Amber-green primary (#7FCE85) for the ring mark + accent rules
//
// Typography is built-in Helvetica for now — react-pdf needs Font.register()
// to use Inter / Space Grotesk and that requires shipping the .ttf files. The
// PDF reads as Zarco-branded via colour + the ring mark; we can swap in the
// real brand fonts in a follow-up without changing the layout.

const BRAND = {
  ink: "#0E1A2E",
  inkMuted: "rgba(14,26,46,0.62)",
  inkFaint: "rgba(14,26,46,0.4)",
  line: "rgba(14,26,46,0.12)",
  ringStart: "#5EE07B",
  ringEnd: "#7FCFE5",
  primary: "#7FCE85",
  paper: "#FFFFFF",
  bandBg: "#F7F5EE",
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: BRAND.ink,
    backgroundColor: BRAND.paper,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wordmark: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    letterSpacing: -0.4,
    color: BRAND.ink,
  },
  quoteBlock: {
    alignItems: "flex-end",
  },
  quoteTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    letterSpacing: 1.2,
    color: BRAND.ink,
  },
  quoteMeta: {
    fontSize: 9,
    color: BRAND.inkMuted,
    marginTop: 4,
  },
  statusPill: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 8,
    letterSpacing: 0.6,
    fontFamily: "Helvetica-Bold",
  },
  accentRule: {
    height: 2,
    width: 56,
    backgroundColor: BRAND.primary,
    marginBottom: 18,
  },
  partiesRow: {
    flexDirection: "row",
    gap: 28,
    marginBottom: 28,
  },
  partyBlock: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 8,
    letterSpacing: 1.4,
    color: BRAND.inkFaint,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  partyLine: {
    fontSize: 9.5,
    color: BRAND.inkMuted,
    marginBottom: 1.5,
  },
  table: {
    borderTopWidth: 1,
    borderTopColor: BRAND.line,
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
  },
  th: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: BRAND.inkFaint,
    fontFamily: "Helvetica-Bold",
  },
  td: {
    fontSize: 10,
    color: BRAND.ink,
  },
  colDesc: { flex: 4, paddingRight: 8 },
  colQty: { flex: 1, textAlign: "right", paddingRight: 8 },
  colUnit: { flex: 1.4, textAlign: "right", paddingRight: 8 },
  colTotal: { flex: 1.4, textAlign: "right" },
  totalsBlock: {
    alignSelf: "flex-end",
    minWidth: 220,
    marginTop: 6,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    fontSize: 10,
  },
  totalsRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: BRAND.ink,
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  totalsLabel: {
    color: BRAND.inkMuted,
  },
  totalsValue: {
    color: BRAND.ink,
  },
  notesBlock: {
    marginTop: 28,
    padding: 14,
    backgroundColor: BRAND.bandBg,
    borderRadius: 6,
  },
  notesHeader: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: BRAND.inkFaint,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  notesBody: {
    fontSize: 10,
    color: BRAND.ink,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BRAND.line,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: BRAND.inkFaint,
    letterSpacing: 0.4,
  },
});

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  draft: { bg: "rgba(14,26,46,0.08)", fg: "#0E1A2E" },
  sent: { bg: "rgba(127,207,229,0.18)", fg: "#1F5E7A" },
  viewed: { bg: "rgba(127,207,229,0.18)", fg: "#1F5E7A" },
  accepted: { bg: "rgba(127,206,133,0.20)", fg: "#1F6A33" },
  declined: { bg: "rgba(217,82,82,0.16)", fg: "#7A1F1F" },
  expired: { bg: "rgba(14,26,46,0.08)", fg: "rgba(14,26,46,0.55)" },
};

function ZarcoRing({ size = 28 }: { size?: number }) {
  // Hollow ring with the green→teal gradient stroke. Mirrors the favicon /
  // brand mark from the Zarco design system.
  const stroke = size * 0.18;
  const r = (size - stroke) / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="zk-ring" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={BRAND.ringStart} />
          <Stop offset="1" stopColor={BRAND.ringEnd} />
        </LinearGradient>
      </Defs>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#zk-ring)"
        strokeWidth={stroke}
        fill="none"
      />
    </Svg>
  );
}

function formatMoney(pence: number, currency: string): string {
  const symbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
  const pounds = (pence / 100).toFixed(2);
  // Thousands separators
  const [whole, frac] = pounds.split(".");
  const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return symbol
    ? `${symbol}${wholeWithCommas}.${frac}`
    : `${wholeWithCommas}.${frac} ${currency}`;
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export type QuotePdfProps = {
  quote: {
    quoteNumber: string;
    status: string;
    currency: string;
    taxRate: string;
    subtotalPence: number;
    totalPence: number;
    validUntil: string | null;
    notes: string | null;
    createdAt: Date | string;
    sentAt: Date | string | null;
  };
  lineItems: {
    description: string;
    quantity: string;
    unitPricePence: number;
    totalPence: number;
  }[];
  organization: { name: string; website: string | null; domain: string | null };
  contact: { firstName: string | null; lastName: string | null; email: string | null } | null;
  deal: { name: string };
  // Issuer-side branding. Hard-coded for Zarco today; lift to settings later.
  issuer?: {
    name: string;
    line1: string;
    line2?: string;
    email: string;
    website: string;
    registration?: string;
  };
};

const DEFAULT_ISSUER: NonNullable<QuotePdfProps["issuer"]> = {
  name: "Zarco Ltd",
  line1: "London, United Kingdom",
  email: "hello@zarco.uk",
  website: "zarco.uk",
  registration: "© 2026 Zarco Ltd",
};

export function QuotePdf({
  quote,
  lineItems,
  organization,
  contact,
  deal,
  issuer = DEFAULT_ISSUER,
}: QuotePdfProps) {
  const status = STATUS_COLOR[quote.status] ?? STATUS_COLOR.draft;
  const taxRatePct = (parseFloat(quote.taxRate) * 100).toFixed(taxRateFraction(quote.taxRate));
  const taxAmountPence = quote.totalPence - quote.subtotalPence;
  const contactName = contact
    ? [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim()
    : "";

  return (
    <Document
      title={`${quote.quoteNumber} — ${issuer.name}`}
      author={issuer.name}
      subject={`Quote ${quote.quoteNumber} for ${organization.name}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header: brand left, quote meta right */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <ZarcoRing size={28} />
            <Text style={styles.wordmark}>{issuer.name.replace(/\sLtd$/, "")}</Text>
          </View>
          <View style={styles.quoteBlock}>
            <Text style={styles.quoteTitle}>QUOTE</Text>
            <Text style={styles.quoteMeta}>{quote.quoteNumber}</Text>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: status.bg, color: status.fg },
              ]}
            >
              <Text>{quote.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.accentRule} />

        {/* From / To */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>FROM</Text>
            <Text style={styles.partyName}>{issuer.name}</Text>
            <Text style={styles.partyLine}>{issuer.line1}</Text>
            {issuer.line2 ? (
              <Text style={styles.partyLine}>{issuer.line2}</Text>
            ) : null}
            <Text style={styles.partyLine}>{issuer.email}</Text>
            <Text style={styles.partyLine}>{issuer.website}</Text>
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>TO</Text>
            <Text style={styles.partyName}>{organization.name}</Text>
            {contactName ? (
              <Text style={styles.partyLine}>{contactName}</Text>
            ) : null}
            {contact?.email ? (
              <Text style={styles.partyLine}>{contact.email}</Text>
            ) : null}
            {organization.website ? (
              <Text style={styles.partyLine}>{organization.website}</Text>
            ) : organization.domain ? (
              <Text style={styles.partyLine}>{organization.domain}</Text>
            ) : null}
            <Text style={[styles.partyLine, { marginTop: 6 }]}>
              Re: {deal.name}
            </Text>
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>DATES</Text>
            <Text style={styles.partyLine}>
              Issued: {formatDate(quote.createdAt)}
            </Text>
            <Text style={styles.partyLine}>
              Valid until: {formatDate(quote.validUntil)}
            </Text>
            {quote.sentAt ? (
              <Text style={styles.partyLine}>
                Sent: {formatDate(quote.sentAt)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colDesc]}>DESCRIPTION</Text>
            <Text style={[styles.th, styles.colQty]}>QTY</Text>
            <Text style={[styles.th, styles.colUnit]}>UNIT PRICE</Text>
            <Text style={[styles.th, styles.colTotal]}>TOTAL</Text>
          </View>
          {lineItems.map((li, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={[styles.td, styles.colDesc]}>{li.description}</Text>
              <Text style={[styles.td, styles.colQty]}>{li.quantity}</Text>
              <Text style={[styles.td, styles.colUnit]}>
                {formatMoney(li.unitPricePence, quote.currency)}
              </Text>
              <Text style={[styles.td, styles.colTotal]}>
                {formatMoney(li.totalPence, quote.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>
              {formatMoney(quote.subtotalPence, quote.currency)}
            </Text>
          </View>
          {parseFloat(quote.taxRate) > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>VAT ({taxRatePct}%)</Text>
              <Text style={styles.totalsValue}>
                {formatMoney(taxAmountPence, quote.currency)}
              </Text>
            </View>
          ) : null}
          <View style={styles.totalsRowGrand}>
            <Text>Total</Text>
            <Text>{formatMoney(quote.totalPence, quote.currency)}</Text>
          </View>
        </View>

        {/* Notes (if any) */}
        {quote.notes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesHeader}>NOTES</Text>
            <Text style={styles.notesBody}>{quote.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{issuer.registration ?? issuer.name}</Text>
          <Text>{issuer.website}  ·  {issuer.email}</Text>
        </View>
      </Page>
    </Document>
  );
}

// Render 0.2 → "0", 0.175 → "1", etc. Picks enough decimals to avoid "20.0%".
function taxRateFraction(rate: string): number {
  const n = parseFloat(rate);
  if (!Number.isFinite(n) || n === 0) return 0;
  const pct = n * 100;
  return Number.isInteger(pct) ? 0 : 1;
}
