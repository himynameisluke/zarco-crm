import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Polygon,
} from "@react-pdf/renderer";

// =============================================================================
// Zarco-branded quote PDF — design system v2 (paper / ink / one magenta).
// =============================================================================
// A4 portrait, warm off-white paper. Brand:
//   - Paper background (#FAFAF7)
//   - Near-black ink (#0E0E0E) for text, dividers, and the Z tile
//   - Magenta accent (#FF0066) for the wordmark period, accent rule, corner
//     notch on the Z mark, and the "Total" emphasis.
//
// Typography is built-in Helvetica for now — @react-pdf needs Font.register()
// for Hanken Grotesk / DM Serif Display, which means shipping .ttf files.
// The PDF still reads as on-brand via color + the corner-notch mark; we can
// swap in the real Zarco fonts later without touching layout.

const BRAND = {
  ink: "#0E0E0E",
  inkMuted: "#5C5C5A",
  inkFaint: "#8E8E8C",
  line: "#D6D6D3",
  magenta: "#FF0066",
  magentaInk: "#B30049",
  magentaWash: "#FFE5EE",
  paper: "#FAFAF7",
  paperPure: "#FFFFFF",
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
    fontSize: 20,
    letterSpacing: -0.6,
    color: BRAND.ink,
  },
  wordmarkDot: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    color: BRAND.magenta,
  },
  quoteBlock: {
    alignItems: "flex-end",
  },
  // Eyebrow-style label above the quote number — mono-feel, all caps, faint.
  quoteEyebrow: {
    fontSize: 8,
    letterSpacing: 1.4,
    color: BRAND.inkFaint,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  quoteTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    letterSpacing: -0.4,
    color: BRAND.ink,
  },
  statusPill: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 8,
    letterSpacing: 0.6,
    fontFamily: "Helvetica-Bold",
  },
  // 56px magenta hairline below the header. The one rare moment of accent.
  accentRule: {
    height: 2,
    width: 56,
    backgroundColor: BRAND.magenta,
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
    backgroundColor: BRAND.paperPure,
    borderWidth: 1,
    borderColor: BRAND.line,
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

// Status pills on the PDF — quiet washes, status-color text. Same intent as
// the in-app .chip recipes but in PDF colors (no rgba on rgba surprises).
const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  draft: { bg: "#F2F2EE", fg: BRAND.ink },
  sent: { bg: "#E4ECF8", fg: "#1E5FBE" },
  viewed: { bg: "#E4ECF8", fg: "#1E5FBE" },
  accepted: { bg: "#E5F1EB", fg: "#1F7A4D" },
  declined: { bg: "#F8E4E7", fg: "#C7263C" },
  expired: { bg: "#F2F2EE", fg: BRAND.inkMuted },
};

/**
 * The Zarco mark — heavy Z on a near-black tile with a magenta corner notch.
 * Mirrors the in-app ZarcoMark and the bundled brand-mark.svg.
 *
 * The tile + notch are SVG primitives so they crisp at any zoom. The Z glyph
 * uses a plain `<Text>` positioned absolutely inside the tile because
 * @react-pdf's <Svg><Text> doesn't accept fontFamily/fontWeight props.
 */
function ZarcoMark({ size = 32 }: { size?: number }) {
  const radius = Math.max(4, size * 0.15);
  const notch = Math.max(6, size * 0.3);
  const fontSize = Math.round(size * 0.62);
  return (
    <View style={{ width: size, height: size, position: "relative" }}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <Rect width={size} height={size} rx={radius} fill={BRAND.ink} />
        <Polygon
          points={`${size},0 ${size},${notch} ${size - notch},0`}
          fill={BRAND.magenta}
        />
      </Svg>
      <Text
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size,
          height: size,
          textAlign: "center",
          paddingTop: Math.round(size * 0.15),
          color: BRAND.paper,
          fontFamily: "Helvetica-Bold",
          fontSize,
          letterSpacing: -0.5,
        }}
      >
        Z
      </Text>
    </View>
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
  // Wordmark renders the brand name in ink + a single magenta period — the
  // brand's only sanctioned ornament on the wordmark.
  const wordmarkName = issuer.name.replace(/\sLtd$/, "");

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
            <ZarcoMark size={32} />
            <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
              <Text style={styles.wordmark}>{wordmarkName}</Text>
              <Text style={styles.wordmarkDot}>.</Text>
            </View>
          </View>
          <View style={styles.quoteBlock}>
            <Text style={styles.quoteEyebrow}>QUOTE</Text>
            <Text style={styles.quoteTitle}>{quote.quoteNumber}</Text>
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
