/**
 * Turns an email into a readable display name: "luke.burywood@zarco.uk" →
 * "Luke Burywood". There's no profiles table yet — email is the only
 * identity we hold — so this is the display-name source for owners and
 * assignees everywhere. Swap for a real profiles lookup when one exists.
 *
 * Lives in its own module (no "server-only", no db import) so pure consumers —
 * the MCP tools' payload mappers and their vitest files — can import it without
 * dragging in the server graph; members.ts re-exports it for existing callers.
 */
export function displayNameFromEmail(email: string | null): string {
  if (!email) return "Unknown user";
  const local = email.split("@")[0] ?? "";
  const words = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1));
  return words.length ? words.join(" ") : email;
}
