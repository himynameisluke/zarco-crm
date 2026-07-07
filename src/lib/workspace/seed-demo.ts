import "server-only";

import { db } from "@/lib/db";
import { nextQuoteNumber } from "@/lib/quotes/number";
import {
  activities,
  contacts,
  deals,
  organizations,
  quoteLineItems,
  quotes,
  tasks,
} from "@/lib/db/schema";

// =============================================================================
// Demo workspace seed
// =============================================================================
// Hand-crafted UK SME pipeline so a demo workspace looks like a real, busy
// CRM the moment Luke switches into it. Deterministic (no faker dependency)
// so the demo always looks the same and tests / screenshots are reproducible.
//
// Quantities (final):
//   10 organizations (mix of industries — accountancy / MSP / recruitment /
//      legal / creative / property / logistics / SaaS / architecture /
//      hospitality)
//   25 contacts (2-3 per org, all British-sounding names)
//   15 deals across stages: 2 lead, 4 qualified, 3 proposal,
//      2 negotiation, 3 won, 1 lost
//   5 quotes (mix of draft / sent / accepted / declined / viewed)
//   25 activities (emails, calls, meetings, notes, mcp writes — backdated
//      across the last 60 days so the dashboard timeline has texture)
//   12 tasks (3 overdue, 5 due this week, 4 later/done)

const NOW = () => new Date();
const DAYS = (n: number) => 1000 * 60 * 60 * 24 * n;
const past = (days: number) => new Date(Date.now() - DAYS(days));
const future = (days: number) => new Date(Date.now() + DAYS(days));
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

type SeedCounts = {
  organizations: number;
  contacts: number;
  deals: number;
  quotes: number;
  activities: number;
  tasks: number;
};

const ORG_DATA: Array<{
  name: string;
  domain: string;
  industry: string;
  employeeCount: number;
  notes: string;
}> = [
  { name: "Bellweather Recruitment", domain: "bellweather.co.uk", industry: "Recruitment", employeeCount: 18, notes: "Tech recruitment, London + Manchester. Looking to automate CV screening." },
  { name: "Northbridge Accountancy", domain: "northbridge.uk", industry: "Accountancy", employeeCount: 42, notes: "Mid-market practice, growing fast. Owner-managed." },
  { name: "Meridian MSP", domain: "meridian-msp.com", industry: "IT services", employeeCount: 26, notes: "Managed services for ~80 SME clients across the South-East." },
  { name: "Harlow & Finch Solicitors", domain: "harlowfinch.co.uk", industry: "Legal", employeeCount: 14, notes: "Commercial law, partnership of 4." },
  { name: "Silverkiln Studios", domain: "silverkiln.studio", industry: "Creative", employeeCount: 9, notes: "Brand + motion. Recently went hybrid." },
  { name: "Quayside Properties", domain: "quaysideproperties.uk", industry: "Real estate", employeeCount: 22, notes: "Commercial property in Bristol + Cardiff." },
  { name: "Brookline Logistics", domain: "brookline.uk", industry: "Logistics", employeeCount: 65, notes: "3PL for e-commerce brands. Big on warehouse efficiency." },
  { name: "Cresswell Tech", domain: "cresswelltech.io", industry: "SaaS", employeeCount: 31, notes: "Vertical SaaS for veterinary clinics. Series A." },
  { name: "Atelier 47", domain: "atelier47.co.uk", industry: "Architecture", employeeCount: 11, notes: "Boutique practice, residential + small commercial." },
  { name: "Foundry & Forge", domain: "foundryforge.co.uk", industry: "Hospitality", employeeCount: 38, notes: "Group of 4 gastropubs in the Cotswolds." },
];

const CONTACT_DATA: Array<{
  orgIndex: number;
  firstName: string;
  lastName: string;
  title: string;
  email?: string;
  phone?: string;
}> = [
  { orgIndex: 0, firstName: "Sarah", lastName: "Hwang", title: "Head of Operations", email: "sarah.hwang@bellweather.co.uk", phone: "020 7946 0011" },
  { orgIndex: 0, firstName: "Marek", lastName: "Vincenti", title: "Founder", email: "marek@bellweather.co.uk" },
  { orgIndex: 1, firstName: "Olivia", lastName: "Crowther", title: "Managing Partner", email: "olivia.crowther@northbridge.uk", phone: "0161 532 9911" },
  { orgIndex: 1, firstName: "James", lastName: "Whittington", title: "Practice Manager", email: "j.whittington@northbridge.uk" },
  { orgIndex: 1, firstName: "Tom", lastName: "Akinyele", title: "Senior Accountant", email: "tom.akinyele@northbridge.uk" },
  { orgIndex: 2, firstName: "Connor", lastName: "Rockneen", title: "CEO", email: "connor@meridian-msp.com", phone: "01273 209 884" },
  { orgIndex: 2, firstName: "Priya", lastName: "Sundaram", title: "Operations Director", email: "priya@meridian-msp.com" },
  { orgIndex: 3, firstName: "Eleanor", lastName: "Drummond", title: "Partner", email: "eleanor.drummond@harlowfinch.co.uk" },
  { orgIndex: 3, firstName: "Rashid", lastName: "Patel", title: "Senior Associate", email: "rashid.patel@harlowfinch.co.uk" },
  { orgIndex: 4, firstName: "Casey", lastName: "Brown", title: "Creative Director", email: "casey@silverkiln.studio" },
  { orgIndex: 4, firstName: "Niamh", lastName: "Doherty", title: "Studio Manager", email: "niamh@silverkiln.studio" },
  { orgIndex: 5, firstName: "Henry", lastName: "Westgarth", title: "Director", email: "h.westgarth@quaysideproperties.uk", phone: "0117 989 4500" },
  { orgIndex: 5, firstName: "Maya", lastName: "Eskandar", title: "Head of Lettings", email: "maya@quaysideproperties.uk" },
  { orgIndex: 6, firstName: "Daniel", lastName: "Okonkwo", title: "Operations Director", email: "daniel.okonkwo@brookline.uk", phone: "01708 644 220" },
  { orgIndex: 6, firstName: "Rachel", lastName: "Whitlock", title: "Warehouse Manager", email: "r.whitlock@brookline.uk" },
  { orgIndex: 6, firstName: "Bryn", lastName: "Tomlinson", title: "Finance Lead", email: "bryn@brookline.uk" },
  { orgIndex: 7, firstName: "Anya", lastName: "Petrova", title: "VP Engineering", email: "anya@cresswelltech.io" },
  { orgIndex: 7, firstName: "Theo", lastName: "Hassell", title: "Co-founder", email: "theo@cresswelltech.io" },
  { orgIndex: 7, firstName: "Jules", lastName: "Marchant", title: "Head of Customer Success", email: "jules@cresswelltech.io" },
  { orgIndex: 8, firstName: "Adam", lastName: "Quinn-Reilly", title: "Founding Architect", email: "adam@atelier47.co.uk" },
  { orgIndex: 8, firstName: "Frances", lastName: "Boateng", title: "Practice Manager", email: "frances@atelier47.co.uk" },
  { orgIndex: 9, firstName: "Maryann", lastName: "Cooper", title: "Operations Director", email: "maryann@foundryforge.co.uk", phone: "01451 832 119" },
  { orgIndex: 9, firstName: "Oscar", lastName: "Pelliter", title: "GM, Foundry Burford", email: "oscar@foundryforge.co.uk" },
  { orgIndex: 9, firstName: "Lottie", lastName: "Granger", title: "Marketing Lead", email: "lottie@foundryforge.co.uk" },
  { orgIndex: 1, firstName: "Sam", lastName: "Yoon", title: "Trainee Accountant", email: "sam.yoon@northbridge.uk" },
];

type DealSeed = {
  orgIndex: number;
  primaryContactIndex: number | null;
  name: string;
  type: "engagement" | "sale" | "project" | "retainer";
  stage: "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  valuePence: number;
  /** Days from now — negative = past, positive = future. null = no close set. */
  closeDateOffsetDays: number | null;
  /** Days ago the deal was last updated (drives "stale deal" surfaces). */
  updatedDaysAgo: number;
};

const DEAL_DATA: DealSeed[] = [
  // Won (3) — backdated 5-45 days
  { orgIndex: 1, primaryContactIndex: 2, name: "Northbridge – AP automation pilot", type: "project", stage: "won", valuePence: 1850000, closeDateOffsetDays: -7, updatedDaysAgo: 7 },
  { orgIndex: 6, primaryContactIndex: 13, name: "Brookline – warehouse pick optimisation", type: "project", stage: "won", valuePence: 2400000, closeDateOffsetDays: -28, updatedDaysAgo: 28 },
  { orgIndex: 9, primaryContactIndex: 21, name: "Foundry & Forge – booking-system rebuild", type: "project", stage: "won", valuePence: 1200000, closeDateOffsetDays: -45, updatedDaysAgo: 45 },
  // Lost (1)
  { orgIndex: 8, primaryContactIndex: 19, name: "Atelier 47 – CAD assistant rollout", type: "project", stage: "lost", valuePence: 950000, closeDateOffsetDays: -14, updatedDaysAgo: 14 },
  // Negotiation (2)
  { orgIndex: 0, primaryContactIndex: 0, name: "Bellweather – CV screening v2 expansion", type: "engagement", stage: "negotiation", valuePence: 1800000, closeDateOffsetDays: 12, updatedDaysAgo: 2 },
  { orgIndex: 2, primaryContactIndex: 5, name: "Meridian MSP – AI helpdesk triage", type: "project", stage: "negotiation", valuePence: 2200000, closeDateOffsetDays: 21, updatedDaysAgo: 5 },
  // Proposal (3)
  { orgIndex: 3, primaryContactIndex: 7, name: "Harlow & Finch – contract review automation", type: "project", stage: "proposal", valuePence: 1550000, closeDateOffsetDays: 30, updatedDaysAgo: 4 },
  { orgIndex: 5, primaryContactIndex: 11, name: "Quayside – tenant comms drafting", type: "engagement", stage: "proposal", valuePence: 800000, closeDateOffsetDays: 18, updatedDaysAgo: 1 },
  { orgIndex: 7, primaryContactIndex: 16, name: "Cresswell Tech – customer-onboarding agent", type: "project", stage: "proposal", valuePence: 1900000, closeDateOffsetDays: 42, updatedDaysAgo: 9 },
  // Qualified (4)
  { orgIndex: 4, primaryContactIndex: 9, name: "Silverkiln – pitch deck assistant", type: "engagement", stage: "qualified", valuePence: 650000, closeDateOffsetDays: 35, updatedDaysAgo: 3 },
  { orgIndex: 6, primaryContactIndex: 15, name: "Brookline – finance ops audit", type: "engagement", stage: "qualified", valuePence: 450000, closeDateOffsetDays: 28, updatedDaysAgo: 6 },
  { orgIndex: 7, primaryContactIndex: 18, name: "Cresswell – CS knowledge-base copilot", type: "retainer", stage: "qualified", valuePence: 1200000, closeDateOffsetDays: 50, updatedDaysAgo: 11 },
  { orgIndex: 9, primaryContactIndex: 23, name: "Foundry – marketing scheduling assist", type: "engagement", stage: "qualified", valuePence: 550000, closeDateOffsetDays: 40, updatedDaysAgo: 13 },
  // Lead (2)
  { orgIndex: 0, primaryContactIndex: 1, name: "Bellweather – outbound personalisation pilot", type: "engagement", stage: "lead", valuePence: 350000, closeDateOffsetDays: 60, updatedDaysAgo: 15 },
  { orgIndex: 8, primaryContactIndex: 20, name: "Atelier 47 – planning portal scraping", type: "engagement", stage: "lead", valuePence: 0, closeDateOffsetDays: null, updatedDaysAgo: 20 },
];

type QuoteSeed = {
  dealIndex: number;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";
  taxRate: string;
  validUntilOffsetDays: number;
  lineItems: Array<{ description: string; quantity: number; unitPricePence: number }>;
  sentDaysAgo?: number;
  viewedDaysAgo?: number;
  acceptedDaysAgo?: number;
};

const QUOTE_DATA: QuoteSeed[] = [
  // Accepted — Northbridge AP automation pilot
  {
    dealIndex: 0,
    status: "accepted",
    taxRate: "0.2",
    validUntilOffsetDays: -2,
    sentDaysAgo: 14,
    viewedDaysAgo: 13,
    acceptedDaysAgo: 8,
    lineItems: [
      { description: "Discovery + scoping workshop", quantity: 1, unitPricePence: 250000 },
      { description: "Pilot build (4 weeks)", quantity: 1, unitPricePence: 1200000 },
      { description: "Training + handover", quantity: 1, unitPricePence: 400000 },
    ],
  },
  // Sent (awaiting response) — Harlow & Finch
  {
    dealIndex: 6,
    status: "sent",
    taxRate: "0.2",
    validUntilOffsetDays: 21,
    sentDaysAgo: 4,
    lineItems: [
      { description: "Contract review automation — phase 1", quantity: 1, unitPricePence: 950000 },
      { description: "Integration with existing case-management system", quantity: 1, unitPricePence: 600000 },
    ],
  },
  // Viewed (not actioned) — Cresswell Tech onboarding agent
  {
    dealIndex: 8,
    status: "viewed",
    taxRate: "0.2",
    validUntilOffsetDays: 28,
    sentDaysAgo: 6,
    viewedDaysAgo: 3,
    lineItems: [
      { description: "Onboarding-agent design + build", quantity: 1, unitPricePence: 1400000 },
      { description: "Knowledge-base ingestion + tuning", quantity: 1, unitPricePence: 500000 },
    ],
  },
  // Declined — Atelier 47 CAD
  {
    dealIndex: 3,
    status: "declined",
    taxRate: "0.2",
    validUntilOffsetDays: -7,
    sentDaysAgo: 28,
    viewedDaysAgo: 27,
    lineItems: [
      { description: "CAD assistant pilot", quantity: 1, unitPricePence: 950000 },
    ],
  },
  // Draft — Quayside (haven't sent yet)
  {
    dealIndex: 7,
    status: "draft",
    taxRate: "0.2",
    validUntilOffsetDays: 30,
    lineItems: [
      { description: "Tenant comms drafting tool — discovery", quantity: 1, unitPricePence: 250000 },
      { description: "Build + deploy (3 weeks)", quantity: 1, unitPricePence: 550000 },
    ],
  },
];

type ActivitySeed = {
  type: "email" | "call" | "meeting" | "note" | "status_change" | "quote_sent" | "quote_viewed" | "quote_accepted" | "task_completed";
  source: "manual" | "granola" | "email_sync" | "system" | "mcp";
  subject: string;
  body: string;
  /** Which deal it's attached to (we use deals as subjects for simplicity). */
  dealIndex: number;
  daysAgo: number;
};

const ACTIVITY_DATA: ActivitySeed[] = [
  // Recent activity around the open deals
  { type: "email", source: "email_sync", subject: "Re: AP automation pilot — sign-off", body: "Olivia signed the SOW this morning. Project kickoff scheduled for next Monday.", dealIndex: 0, daysAgo: 8 },
  { type: "quote_accepted", source: "system", subject: "Quote Q-0001 accepted by Northbridge", body: "Olivia Crowther accepted via the public link. Auto-moved deal to Won.", dealIndex: 0, daysAgo: 8 },
  { type: "meeting", source: "granola", subject: "Discovery call with Marek (Bellweather)", body: "Discussed expansion beyond CV screening into outbound personalisation. Wants to see numbers from existing pilot before committing.", dealIndex: 4, daysAgo: 2 },
  { type: "note", source: "manual", subject: "Bellweather — internal", body: "Marek wants procurement sign-off before signing. Decision likely end of month.", dealIndex: 4, daysAgo: 2 },
  { type: "call", source: "manual", subject: "Connor (Meridian) — pricing pushback", body: "Asking if we'd reduce scope to fit £18k budget. Proposed dropping integration with Autotask.", dealIndex: 5, daysAgo: 5 },
  { type: "quote_sent", source: "system", subject: "Quote Q-0002 sent to Harlow & Finch", body: "Sent via public link to eleanor.drummond@harlowfinch.co.uk.", dealIndex: 6, daysAgo: 4 },
  { type: "email", source: "email_sync", subject: "Re: contract review automation proposal", body: "Eleanor confirmed receipt. Will discuss with partners and revert by end of week.", dealIndex: 6, daysAgo: 3 },
  { type: "meeting", source: "granola", subject: "Quayside walk-through with Henry + Maya", body: "Showed prototype tenant-comms tool. Maya excited, Henry cautious — wants a 30-day rollback clause.", dealIndex: 7, daysAgo: 1 },
  { type: "quote_viewed", source: "system", subject: "Cresswell Tech viewed quote Q-0003", body: "Anya opened the quote — 4 minutes on the pricing page.", dealIndex: 8, daysAgo: 3 },
  { type: "email", source: "email_sync", subject: "Re: onboarding agent next steps", body: "Theo (Cresswell) wants to compare against in-house build. Sending over a rough effort estimate.", dealIndex: 8, daysAgo: 9 },
  { type: "call", source: "manual", subject: "Casey (Silverkiln) — kickoff fit call", body: "Good vibe. Casey wants something small + cheap to start; bigger engagement if it works.", dealIndex: 9, daysAgo: 3 },
  { type: "note", source: "mcp", subject: "Logged via Claude — Brookline brief", body: "Daniel mentioned they're already reviewing two other AI consultancies. Need to differentiate on delivery speed.", dealIndex: 10, daysAgo: 6 },
  { type: "email", source: "email_sync", subject: "Cresswell CS copilot — info request", body: "Jules sent over their support-ticket export so we can spec the knowledge base.", dealIndex: 11, daysAgo: 11 },
  { type: "note", source: "manual", subject: "Foundry — context", body: "Lottie is the marketing lead but Maryann is the decision-maker. Loop her in before next call.", dealIndex: 12, daysAgo: 13 },
  { type: "call", source: "manual", subject: "Marek (Bellweather) — intro call", body: "First proper conversation. Interested but timeline is Q3+. Mentioned a sister company that could be a referral.", dealIndex: 13, daysAgo: 15 },
  { type: "note", source: "manual", subject: "Atelier 47 — cold", body: "Found via planning-portal-scraping enquiry on the contact form. Adam happy to chat in 2 weeks.", dealIndex: 14, daysAgo: 20 },
  // Won/lost moments
  { type: "status_change", source: "manual", subject: "Brookline → Won", body: "Daniel signed the SOW. Project starts next sprint.", dealIndex: 1, daysAgo: 28 },
  { type: "quote_accepted", source: "system", subject: "Foundry & Forge — quote accepted", body: "Maryann accepted via public link. Project kickoff Friday.", dealIndex: 2, daysAgo: 45 },
  { type: "status_change", source: "manual", subject: "Atelier 47 → Lost", body: "Adam chose an in-house intern instead. Stay in touch — they may revisit in 6 months.", dealIndex: 3, daysAgo: 14 },
  // Older background activity
  { type: "meeting", source: "granola", subject: "Northbridge — scoping workshop", body: "Walked through their accounts-payable process. Identified 3 automation candidates; scoped pilot around AP coding.", dealIndex: 0, daysAgo: 22 },
  { type: "email", source: "email_sync", subject: "Brookline — initial outreach", body: "Reached out via referral from Cresswell. Daniel replied within 4 hours; warm.", dealIndex: 1, daysAgo: 40 },
  { type: "meeting", source: "granola", subject: "Foundry & Forge — kickoff with Maryann", body: "Walked through the legacy booking system. Pain points: double-bookings + manual rotas. Clear scope.", dealIndex: 2, daysAgo: 52 },
  { type: "note", source: "mcp", subject: "Logged via Claude — Bellweather expansion notes", body: "After today's call, Bellweather wants to layer outbound on top of inbound screening. Different model, similar architecture.", dealIndex: 4, daysAgo: 2 },
  { type: "email", source: "email_sync", subject: "Quote Q-0004 declined — Atelier", body: "Adam replied: 'really appreciate this, decided to give it a go in-house first. Will be in touch.'", dealIndex: 3, daysAgo: 13 },
  { type: "call", source: "manual", subject: "Maya (Quayside) — follow-up", body: "Maya confirmed Henry happy to proceed if we add a rollback clause. Sending revised proposal.", dealIndex: 7, daysAgo: 1 },
];

type TaskSeed = {
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  /** Days from now. Negative = overdue. Null = no due date. */
  dueOffsetDays: number | null;
  /** Which deal it's attached to (or null for unlinked). */
  dealIndex: number | null;
  completedDaysAgo?: number;
};

const TASK_DATA: TaskSeed[] = [
  // Overdue (3)
  { title: "Send revised SOW to Quayside (add rollback clause)", status: "todo", dueOffsetDays: -2, dealIndex: 7 },
  { title: "Follow up Harlow & Finch on partner sign-off", description: "Chase Eleanor — quote went out 4 days ago.", status: "todo", dueOffsetDays: -1, dealIndex: 6 },
  { title: "Reply to Theo (Cresswell) re: build vs buy comparison", status: "in_progress", dueOffsetDays: -3, dealIndex: 8 },
  // Due this week (5)
  { title: "Draft scoped-down Meridian proposal (£18k variant)", status: "todo", dueOffsetDays: 1, dealIndex: 5 },
  { title: "Prep Silverkiln pitch deck — pricing options", status: "todo", dueOffsetDays: 2, dealIndex: 9 },
  { title: "Send Foundry kickoff plan", status: "todo", dueOffsetDays: 3, dealIndex: 2 },
  { title: "Bellweather — schedule procurement intro call", status: "todo", dueOffsetDays: 4, dealIndex: 4 },
  { title: "Brookline pilot — week 1 progress note", status: "in_progress", dueOffsetDays: 5, dealIndex: 1 },
  // Later (2)
  { title: "Atelier 47 — re-engagement note in 4 weeks", description: "Adam suggested revisiting in 6 months but worth a check-in sooner.", status: "todo", dueOffsetDays: 28, dealIndex: 3 },
  { title: "Cresswell knowledge-base ingest — start spec", status: "todo", dueOffsetDays: 14, dealIndex: 11 },
  // Done (2)
  { title: "Send Northbridge SOW for sign-off", status: "done", dueOffsetDays: -10, dealIndex: 0, completedDaysAgo: 8 },
  { title: "Book Quayside walk-through", status: "done", dueOffsetDays: -2, dealIndex: 7, completedDaysAgo: 1 },
];

/**
 * Seeds a workspace with a realistic-looking pipeline. Idempotent in the
 * sense that calling it twice on the same workspace would create duplicate
 * rows — caller should ensure it's only called on a fresh demo workspace.
 *
 * All inserts are scoped to `workspaceId`; `createdBy` / `ownerId` set to
 * `userId` so the seed data is "owned" by the person who triggered it.
 */
export async function seedDemoWorkspace({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}): Promise<SeedCounts> {
  // Orgs
  const orgRows = await db
    .insert(organizations)
    .values(
      ORG_DATA.map((o) => ({
        workspaceId,
        name: o.name,
        domain: o.domain,
        website: `https://${o.domain}`,
        industry: o.industry,
        employeeCount: o.employeeCount,
        notes: o.notes,
        ownerId: userId,
      })),
    )
    .returning({ id: organizations.id });

  // Contacts
  const contactRows = await db
    .insert(contacts)
    .values(
      CONTACT_DATA.map((c) => ({
        workspaceId,
        firstName: c.firstName,
        lastName: c.lastName,
        title: c.title,
        email: c.email ?? null,
        phone: c.phone ?? null,
        organizationId: orgRows[c.orgIndex].id,
        ownerId: userId,
      })),
    )
    .returning({ id: contacts.id });

  // Deals
  const dealRows = await db
    .insert(deals)
    .values(
      DEAL_DATA.map((d) => ({
        workspaceId,
        name: d.name,
        type: d.type,
        stage: d.stage,
        valuePence: d.valuePence > 0 ? d.valuePence : null,
        currency: "GBP",
        closeDate:
          d.closeDateOffsetDays === null
            ? null
            : isoDate(
                d.closeDateOffsetDays >= 0
                  ? future(d.closeDateOffsetDays)
                  : past(-d.closeDateOffsetDays),
              ),
        organizationId: orgRows[d.orgIndex].id,
        primaryContactId:
          d.primaryContactIndex !== null
            ? contactRows[d.primaryContactIndex].id
            : null,
        ownerId: userId,
        updatedAt: past(d.updatedDaysAgo),
      })),
    )
    .returning({ id: deals.id });

  // Quotes — numbers come from the workspace's atomic counter (quote_number
  // is unique per workspace now, so the fresh demo workspace starts at Q-0001).
  const quoteRows: Array<{ id: string; quoteNumber: string }> = [];
  for (const q of QUOTE_DATA) {
    const quoteNumber = await nextQuoteNumber(workspaceId);
    const deal = DEAL_DATA[q.dealIndex];
    const subtotal = q.lineItems.reduce(
      (s, li) => s + li.quantity * li.unitPricePence,
      0,
    );
    const total = Math.round(subtotal * (1 + Number(q.taxRate)));
    const [inserted] = await db
      .insert(quotes)
      .values({
        workspaceId,
        quoteNumber,
        dealId: dealRows[q.dealIndex].id,
        organizationId: orgRows[deal.orgIndex].id,
        contactId:
          deal.primaryContactIndex !== null
            ? contactRows[deal.primaryContactIndex].id
            : null,
        status: q.status,
        subtotalPence: subtotal,
        taxRate: q.taxRate,
        totalPence: total,
        currency: "GBP",
        validUntil: isoDate(
          q.validUntilOffsetDays >= 0
            ? future(q.validUntilOffsetDays)
            : past(-q.validUntilOffsetDays),
        ),
        sentAt: q.sentDaysAgo !== undefined ? past(q.sentDaysAgo) : null,
        viewedAt: q.viewedDaysAgo !== undefined ? past(q.viewedDaysAgo) : null,
        acceptedAt:
          q.acceptedDaysAgo !== undefined ? past(q.acceptedDaysAgo) : null,
        createdBy: userId,
      })
      .returning({ id: quotes.id, quoteNumber: quotes.quoteNumber });

    await db.insert(quoteLineItems).values(
      q.lineItems.map((li, i) => ({
        workspaceId,
        quoteId: inserted.id,
        description: li.description,
        quantity: String(li.quantity),
        unitPricePence: li.unitPricePence,
        totalPence: li.quantity * li.unitPricePence,
        sortOrder: i,
      })),
    );
    quoteRows.push(inserted);
  }

  // Activities — attached to deals
  await db.insert(activities).values(
    ACTIVITY_DATA.map((a) => ({
      workspaceId,
      type: a.type,
      source: a.source,
      subjectType: "deal" as const,
      subjectId: dealRows[a.dealIndex].id,
      subject: a.subject,
      body: a.body,
      occurredAt: past(a.daysAgo),
      createdBy: userId,
    })),
  );

  // Tasks
  await db.insert(tasks).values(
    TASK_DATA.map((t) => ({
      workspaceId,
      title: t.title,
      description: t.description ?? null,
      status: t.status,
      dueAt:
        t.dueOffsetDays === null
          ? null
          : t.dueOffsetDays >= 0
            ? future(t.dueOffsetDays)
            : past(-t.dueOffsetDays),
      subjectType: t.dealIndex !== null ? ("deal" as const) : null,
      subjectId: t.dealIndex !== null ? dealRows[t.dealIndex].id : null,
      assignedTo: userId,
      createdBy: userId,
      completedAt:
        t.status === "done" && t.completedDaysAgo !== undefined
          ? past(t.completedDaysAgo)
          : null,
    })),
  );

  void NOW; // silence unused — kept for clarity

  return {
    organizations: orgRows.length,
    contacts: contactRows.length,
    deals: dealRows.length,
    quotes: quoteRows.length,
    activities: ACTIVITY_DATA.length,
    tasks: TASK_DATA.length,
  };
}
