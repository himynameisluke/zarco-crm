import { displayNameFromEmail } from "@/lib/workspace/display-name";

/* Owner display names ride org and deal payloads so read-side consumers (the
   Console's deterministic book sync among them) never need a second lookup —
   same derivation the UI uses (displayNameFromEmail). The raw email is
   deliberately swapped OUT of the payload: the model needs a name to put in an
   owner column, not an address. Pure module (no db, no server-only) so the
   payload shape is vitest-able — the deal-update.ts precedent. */
export function withOwnerName<T extends { ownerEmail: string | null }>(
  row: T,
): Omit<T, "ownerEmail"> & { ownerName: string | null } {
  const { ownerEmail, ...rest } = row;
  return { ...rest, ownerName: ownerEmail ? displayNameFromEmail(ownerEmail) : null };
}
