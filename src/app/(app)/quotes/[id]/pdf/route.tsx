import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { QuotePdf } from "@/components/quotes/quote-pdf";
import { loadQuotePdfData } from "@/lib/quotes/pdf-data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Internal PDF route for the team. Requires an authenticated session — the
 * (app) layout's auth check doesn't apply to route handlers, so we re-check
 * here. Same renderer as the public /q/[token]/pdf route, just keyed by id
 * instead of token.
 *
 * `?inline=1` for in-tab viewing; default downloads.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const data = await loadQuotePdfData({ id });
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
