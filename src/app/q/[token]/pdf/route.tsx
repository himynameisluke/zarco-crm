import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { QuotePdf } from "@/components/quotes/quote-pdf";
import { loadQuotePdfData } from "@/lib/quotes/pdf-data";

// react-pdf needs Node APIs (it shells out to a layout engine that imports
// from `fs` etc). Edge runtime won't work.
export const runtime = "nodejs";

// Don't cache — quote content can change between sends and a stale cached
// PDF would be worse than re-rendering on each request.
export const dynamic = "force-dynamic";

/**
 * Public PDF download for a quote. Access is gated by the unguessable
 * publicToken (UUID v4) on the quote row, same as the /q/[token] viewer
 * page. No auth required — clients receive the link by email.
 *
 * `?inline=1` returns Content-Disposition: inline so the browser renders
 * the PDF in-tab. Default is `attachment` (downloads).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const data = await loadQuotePdfData({ publicToken: token });
  if (!data) {
    return new NextResponse("Quote not found", { status: 404 });
  }

  const buffer = await renderToBuffer(<QuotePdf {...data} />);
  const inline = request.nextUrl.searchParams.get("inline") === "1";

  // Buffer extends Uint8Array but TS BodyInit overloads don't accept Buffer
  // directly. new Uint8Array(buffer) reuses the underlying memory.
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${data.quote.quoteNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
