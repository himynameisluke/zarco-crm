/* One-off: create the "Meridian Robotics" workspace (the Console demo company's
   own CRM books) and populate it with a coherent story — 11 orgs, RoboCare
   retainer contracts with staggered renewals (2 risk / 2 watch / 4 healthy),
   a live deal pipeline, 60 days of activity texture, and open tasks.
   Idempotent: refuses if the slug already exists.

   Uses the raw `postgres` client, NOT drizzle: importing this repo's
   drizzle-orm build deadlocks at require-time under Node 25 (the same
   Node-25 family as the console's db:push gotcha). The bundled tsx (4.22.3)
   also hangs on Node 25 — run with a 4.22.4+ tsx:
   /Users/lukeburywood/zarco-console/node_modules/.bin/tsx --env-file=.env.local scripts/seed-meridian.ts
   Luke's ask 2026-07-11: "create that new workspace in CRM and populate it". */

import postgres from "postgres";

const DAYS = (n: number) => 1000 * 60 * 60 * 24 * n;
const past = (days: number) => new Date(Date.now() - DAYS(days));
const future = (days: number) => new Date(Date.now() + DAYS(days));
const iso = (d: Date) => d.toISOString().slice(0, 10);

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });

async function main() {
  const SLUG = "meridian-robotics";
  const clash = await sql`select id from workspaces where slug = ${SLUG}`;
  if (clash.length) { console.log(`SKIP — workspace slug "${SLUG}" already exists (${clash[0].id})`); process.exit(0); }

  // Owner = the owner of the earliest real (Zarco) workspace — Luke.
  const [zarco] = await sql`select owner_id from workspaces where type = 'real' order by created_at asc limit 1`;
  if (!zarco?.owner_id) throw new Error("couldn't resolve the Zarco workspace owner");
  const luke = zarco.owner_id as string;

  const [ws] = await sql`insert into workspaces (name, slug, type, owner_id)
    values ('Meridian Robotics', ${SLUG}, 'real', ${luke}) returning id`;
  await sql`insert into workspace_members (workspace_id, user_id, role) values (${ws.id}, ${luke}, 'owner')`;
  console.log(`workspace ${ws.id}`);

  // ── Customers (8, the RoboCare book) + prospects (3) ──────────────────────
  const ORGS = [
    { key: "aldgate", name: "Aldgate Cold Storage", industry: "Cold-chain logistics", employees: 140, domain: "aldgatecold.example.co.uk",
      notes: "3x MeriStack MS120 cold-store cells (-23C). RoboCare Total. Two PM windows missed since May — site contact gone quiet." },
    { key: "cormorant", name: "Cormorant Shipping", industry: "Port & marine logistics", employees: 320, domain: "cormorantshipping.example.com",
      notes: "4x dockside InspectaBot IB-Duo units. RoboCare Plus. New ops director (Marta Keane) since June — relationship needs rebuilding." },
    { key: "brightwell", name: "Brightwell Foods", industry: "Food & beverage manufacturing", employees: 260, domain: "brightwellfoods.example.co.uk",
      notes: "IB-HighSpeed on canning lines 2 and 4. RoboCare Plus. Queried the June invoice; second-line proposal in play." },
    { key: "foxglove", name: "Foxglove Health", industry: "Medical devices", employees: 95, domain: "foxglovehealth.example.com",
      notes: "IB-Duo on packaging QC. RoboCare Essential. Asked about pausing one lane over the summer shutdown." },
    { key: "dunmore", name: "Dunmore Analytics", industry: "Scientific instruments", employees: 60, domain: "dunmore.example.io",
      notes: "MS40 small-parts kitting cell. RoboCare Essential. Steady account, quarterly PM visits on schedule." },
    { key: "granta", name: "Granta Instruments", industry: "Precision engineering", employees: 180, domain: "granta.example.co.uk",
      notes: "2x MS120 cells feeding assembly. RoboCare Plus. Happy reference customer; third-cell conversation open." },
    { key: "harbourline", name: "Harbourline Logistics", industry: "3PL warehousing", employees: 410, domain: "harbourline.example.com",
      notes: "MS400 high-bay (4,200 locations). RoboCare Total. Uptime 99.7% last quarter — strongest reference site." },
    { key: "elmswell", name: "Elmswell Estates", industry: "Agri-tech / vertical farming", employees: 75, domain: "elmswell.example.co.uk",
      notes: "IB-Solo pilot converted to rollout in May. RoboCare Essential. Early days, onboarding milestones on track." },
    { key: "thorncliffe", name: "Thorncliffe Brewery", industry: "Brewing", employees: 55, domain: "thorncliffe.example.co.uk",
      notes: "Prospect. IB-Solo pilot quoted March — lost on price to a manual-inspection hire. Revisit next budget year." },
    { key: "pennine", name: "Pennine Foods", industry: "Food manufacturing", employees: 150, domain: "penninefoods.example.com",
      notes: "Prospect via Brightwell referral. Line-QC pain on ready-meals lines; site visit done." },
    { key: "westbourne", name: "Westbourne Pharma", industry: "Pharmaceutical packaging", employees: 220, domain: "westbournepharma.example.com",
      notes: "Prospect. Serialisation + seal-integrity checks; compliance-heavy sale, TS 15066 questions raised." },
  ];
  const orgId: Record<string, string> = {};
  for (const o of ORGS) {
    const [row] = await sql`insert into organizations (workspace_id, name, industry, employee_count, domain, website, notes, owner_id)
      values (${ws.id}, ${o.name}, ${o.industry}, ${o.employees}, ${o.domain}, ${"https://" + o.domain}, ${o.notes}, ${luke}) returning id`;
    orgId[o.key] = row.id;
  }
  console.log(`${ORGS.length} organizations`);

  // ── Contacts ──────────────────────────────────────────────────────────────
  const CONTACTS: Array<[string, string, string, string]> = [
    ["aldgate", "Ray", "Whitmore", "Site Operations Manager"],
    ["aldgate", "Priya", "Chandra", "Head of Engineering"],
    ["cormorant", "Marta", "Keane", "Operations Director"],
    ["cormorant", "Douglas", "Frame", "Terminal Engineering Lead"],
    ["brightwell", "Sophie", "Ellery", "Plant Manager"],
    ["brightwell", "Tom", "Askew", "Quality Manager"],
    ["foxglove", "Hannah", "Birch", "Production Lead"],
    ["foxglove", "Owen", "Craddock", "Procurement Manager"],
    ["dunmore", "Ailsa", "Munro", "Operations Manager"],
    ["dunmore", "Peter", "Voss", "Facilities Engineer"],
    ["granta", "Ed", "Latham", "Manufacturing Director"],
    ["granta", "Chloe", "Renshaw", "Automation Engineer"],
    ["harbourline", "Gareth", "Ives", "Warehouse Director"],
    ["harbourline", "Nadia", "Osei", "Continuous Improvement Lead"],
    ["elmswell", "Freya", "Dunbar", "Head of Growing Systems"],
    ["elmswell", "Callum", "Rhodes", "Site Manager"],
    ["thorncliffe", "Ben", "Ackerley", "Head Brewer"],
    ["pennine", "Louise", "Garside", "Operations Director"],
    ["westbourne", "Sanjay", "Mehta", "Head of Packaging Compliance"],
  ];
  for (const [org, first, last, title] of CONTACTS) {
    const domain = ORGS.find((o) => o.key === org)!.domain;
    const email = `${first.toLowerCase().replace(/[^a-z]/g, "")}.${last.toLowerCase()}@${domain}`;
    await sql`insert into contacts (workspace_id, first_name, last_name, title, email, organization_id, owner_id)
      values (${ws.id}, ${first}, ${last}, ${title}, ${email}, ${orgId[org]}, ${luke})`;
  }
  console.log(`${CONTACTS.length} contacts`);

  // ── RoboCare contracts (renewals book: 2 risk / 2 watch / 4 healthy) ──────
  const CONTRACTS: Array<[string, string, number, number, string]> = [
    ["aldgate", "RoboCare Total", 6500, 17, "RISK STORY: two missed PM windows, no reply to May or June check-ins. Renewal imminent."],
    ["cormorant", "RoboCare Plus", 3200, 25, "RISK STORY: new ops director hasn't engaged; June QBR declined."],
    ["brightwell", "RoboCare Plus", 4100, 45, "WATCH: June invoice queried (resolved); second-line proposal open — renewal likely rides on it."],
    ["foxglove", "RoboCare Essential", 1800, 53, "WATCH: asked about pausing one lane over summer shutdown — scope conversation needed before renewal."],
    ["dunmore", "RoboCare Essential", 1500, 126, "Healthy — PM visits on schedule, no open issues."],
    ["granta", "RoboCare Plus", 3800, 151, "Healthy — reference customer, third-cell expansion in pipeline."],
    ["harbourline", "RoboCare Total", 7900, 195, "Healthy — 99.7% uptime last quarter, strongest reference site."],
    ["elmswell", "RoboCare Essential", 1600, 181, "Healthy — onboarding milestones on track since May rollout."],
  ];
  for (const [org, tier, monthly, renewIn, note] of CONTRACTS) {
    const name = `${tier} — ${ORGS.find((o) => o.key === org)!.name}`;
    await sql`insert into contracts (workspace_id, name, organization_id, status, value_pence, billing_period, start_date, end_date, auto_renew, notes, owner_id)
      values (${ws.id}, ${name}, ${orgId[org]}, 'active', ${monthly * 100}, 'monthly', ${iso(past(348 + renewIn))}, ${iso(future(renewIn))}, false, ${note}, ${luke})`;
  }
  console.log(`${CONTRACTS.length} contracts`);

  // ── Deal pipeline ─────────────────────────────────────────────────────────
  const DEALS: Array<[string, string, string, string, number, number, string | null]> = [
    ["brightwell", "InspectaBot IB-HighSpeed — line 3", "sale", "proposal", 24000, 21, null],
    ["granta", "MeriStack MS120 — third cell", "sale", "qualified", 38000, 60, null],
    ["foxglove", "RoboCare upgrade Essential to Plus", "retainer", "negotiation", 9000, 14, null],
    ["cormorant", "Renewal + berth-3 expansion", "retainer", "lead", 12000, 30, null],
    ["harbourline", "MS400 second aisle", "project", "proposal", 85000, 45, null],
    ["pennine", "IB-Solo pilot — ready-meals line", "sale", "qualified", 11000, 40, null],
    ["westbourne", "InspectaBot serialisation QC", "sale", "lead", 45000, 90, null],
    ["elmswell", "IB-Solo pilot to rollout", "sale", "won", 12000, -49, null],
    ["thorncliffe", "IB-Solo pilot", "sale", "lost", 9500, -84, "Chose to hire a manual inspector — price sensitivity at pilot stage"],
  ];
  for (const [org, name, type, stage, value, closeIn, lostReason] of DEALS) {
    const closeDate = iso(closeIn >= 0 ? future(closeIn) : past(-closeIn));
    const stageChanged = past((Math.abs(closeIn) % 21) + 2);
    await sql`insert into deals (workspace_id, name, type, stage, value_pence, close_date, lost_reason, stage_changed_at, organization_id, owner_id)
      values (${ws.id}, ${name}, ${type}, ${stage}, ${value * 100}, ${closeDate}, ${lostReason}, ${stageChanged}, ${orgId[org]}, ${luke})`;
  }
  console.log(`${DEALS.length} deals`);

  // ── Activity texture (60 days, tells the risk story) ──────────────────────
  const ACTS: Array<[string, string, string, string, number]> = [
    ["aldgate", "meeting", "Quarterly service review", "Ray flagged freezer-aisle shuttle wear; PM visit booked for May.", 55],
    ["aldgate", "note", "PM visit missed", "Site declined the May PM window — 'busy period, will rebook'. Never rebooked.", 38],
    ["aldgate", "email", "Renewal check-in (no reply)", "Sent renewal overview + updated RoboCare Total terms. No response.", 26],
    ["aldgate", "email", "Second chase (no reply)", "Followed up on renewal + outstanding PM visit. No response from Ray or Priya.", 12],
    ["cormorant", "note", "Ops director change", "Douglas confirmed Marta Keane joined as Operations Director — owns the RoboCare budget now.", 33],
    ["cormorant", "email", "Intro to new ops director (no reply)", "Sent Marta a service summary + Q2 uptime report. No reply yet.", 19],
    ["cormorant", "call", "June QBR declined", "Marta's PA declined the QBR slot — 'reviewing all supplier arrangements'.", 9],
    ["brightwell", "email", "June invoice query", "Sophie queried the retrain line item on the June invoice.", 24],
    ["brightwell", "email", "Invoice query resolved", "Credited the duplicate retrain; Sophie happy. Good moment to progress line-3 proposal.", 17],
    ["brightwell", "meeting", "Line 3 walk-through", "Surveyed line 3 with Tom — 620 units/min, strobe kit needed. Proposal sent.", 10],
    ["foxglove", "call", "Summer shutdown question", "Hannah asked about pausing one IB-Duo lane during the August shutdown.", 15],
    ["foxglove", "note", "Upgrade angle", "Owen hinted budget exists for Plus if retrains are bundled — negotiation open.", 8],
    ["dunmore", "meeting", "Quarterly PM visit", "MS40 serviced, no faults. Ailsa happy; next visit booked.", 20],
    ["granta", "meeting", "Reference call + site tour", "Hosted a prospect tour; Ed pitched the third-cell expansion himself.", 13],
    ["harbourline", "email", "Q2 uptime report sent", "99.7% uptime; Gareth circulated it to their board.", 11],
    ["elmswell", "call", "Onboarding milestone 2", "Defect model live on the second SKU; false-reject rate 0.3%.", 6],
    ["pennine", "meeting", "Site visit — ready-meals line", "Louise walked the line; sleeve-seal defects are the pain. Pilot scoped.", 16],
    ["westbourne", "call", "Compliance scoping call", "Dr. Mehta needs TS 15066 evidence pack + serialisation spec before RFP.", 22],
    ["thorncliffe", "note", "Loss review", "Ben went with a manual hire. Revisit at next budget cycle (Nov).", 80],
  ];
  for (const [org, type, subject, body, ago] of ACTS) {
    await sql`insert into activities (workspace_id, type, source, subject_type, subject_id, subject, body, occurred_at, created_by)
      values (${ws.id}, ${type}, 'manual', 'organization', ${orgId[org]}, ${subject}, ${body}, ${past(ago)}, ${luke})`;
  }
  console.log(`${ACTS.length} activities`);

  // ── Open tasks ────────────────────────────────────────────────────────────
  const TASKS: Array<[string, string, number, string]> = [
    ["aldgate", "Escalate Aldgate renewal — phone Priya directly, chase the 2 missed PM windows", -4, "todo"],
    ["cormorant", "Book intro meeting with Marta Keane before renewal window", 2, "in_progress"],
    ["brightwell", "Follow up line-3 proposal with Sophie (sent 10 days ago)", 1, "todo"],
    ["foxglove", "Price the pause-one-lane option vs Plus upgrade bundle", 3, "todo"],
    ["granta", "Draft MS120 third-cell proposal for Ed", 7, "todo"],
    ["pennine", "Send pilot quote — ready-meals line", 4, "todo"],
    ["westbourne", "Assemble TS 15066 evidence pack for Dr. Mehta", 9, "todo"],
    ["harbourline", "Schedule Q3 PM visits (both shifts)", 12, "todo"],
  ];
  for (const [org, title, dueIn, status] of TASKS) {
    await sql`insert into tasks (workspace_id, title, status, due_at, subject_type, subject_id, assigned_to, created_by)
      values (${ws.id}, ${title}, ${status}, ${dueIn >= 0 ? future(dueIn) : past(-dueIn)}, 'organization', ${orgId[org]}, ${luke}, ${luke})`;
  }
  console.log(`${TASKS.length} tasks`);

  console.log(`DONE — Meridian Robotics workspace ${ws.id} seeded.`);
  process.exit(0);
}

main().catch((e) => { console.error("SEED FAILED:", e.message); process.exit(1); });
