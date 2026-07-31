#!/usr/bin/env node
// Applies supabase/policies.sql (idempotent: drop-if-exists + create) to the
// live database. The file is the source of truth for RLS policy state —
// same hand-apply convention as the invoicing/support siblings.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(path.join(root, ".env.local"), "utf8");
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!url) throw new Error("DATABASE_URL not found in .env.local");
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
const content = readFileSync(path.join(root, "supabase", "policies.sql"), "utf8");
await sql.begin((tx) => tx.unsafe(content));
console.log("policies.sql applied");
await sql.end();
