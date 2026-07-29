// Seed template definitions — pure data, no db import. Created lazily into
// a workspace's own project_templates/project_template_items rows (on
// first visit to /settings/projects, or by a one-off seed script) — these
// are NOT global fixtures and NOT a prod data migration; every workspace
// gets its own editable copy.
//
// Shape matches project_template_items exactly (kind/name/description/
// phaseName/offsetDays/sortOrder) so a caller can insert these arrays
// almost verbatim, just adding workspaceId + templateId.

export type SeedTemplateItemKind = "phase" | "milestone" | "task";

export type SeedTemplateItem = {
  kind: SeedTemplateItemKind;
  name: string;
  description: string | null;
  phaseName: string | null;
  offsetDays: number | null;
  sortOrder: number;
};

export type SeedTemplate = {
  name: string;
  description: string;
  projectType: string;
  items: SeedTemplateItem[];
};

function phase(name: string, sortOrder: number): SeedTemplateItem {
  return {
    kind: "phase",
    name,
    description: null,
    phaseName: null,
    offsetDays: null,
    sortOrder,
  };
}

function milestone(
  name: string,
  phaseName: string,
  offsetDays: number,
  sortOrder: number,
  description: string | null = null,
): SeedTemplateItem {
  return { kind: "milestone", name, description, phaseName, offsetDays, sortOrder };
}

function task(
  name: string,
  phaseName: string,
  offsetDays: number,
  sortOrder: number,
  description: string | null = null,
): SeedTemplateItem {
  return { kind: "task", name, description, phaseName, offsetDays, sortOrder };
}

// ---------------------------------------------------------------------------
// Zarco Console Implementation
// ---------------------------------------------------------------------------

const CONSOLE_PHASES = [
  "Discovery & stakeholder mapping",
  "CRM/data audit",
  "Workspace configuration",
  "Knowledge ingestion",
  "Agent configuration",
  "Integrations",
  "UAT",
  "Training",
  "Go-live",
  "Hypercare & review",
];

export const CONSOLE_IMPLEMENTATION_TEMPLATE: SeedTemplate = {
  name: "Zarco Console Implementation",
  description:
    "Standard rollout of the Zarco Console: discovery through hypercare, with the knowledge/agent/integration work sequenced so training and go-live land on real, working data.",
  projectType: "console_implementation",
  items: [
    ...CONSOLE_PHASES.map((name, i) => phase(name, i)),

    // Discovery & stakeholder mapping
    task(
      "Kickoff call — confirm scope, stakeholders, success criteria",
      "Discovery & stakeholder mapping",
      0,
      0,
    ),
    task(
      "Map stakeholders + decision-maker sign-off path",
      "Discovery & stakeholder mapping",
      2,
      1,
    ),
    milestone(
      "Discovery complete",
      "Discovery & stakeholder mapping",
      5,
      0,
      "Scope, stakeholders, and success criteria signed off.",
    ),

    // CRM/data audit
    task("Audit existing CRM/data sources for coverage + quality", "CRM/data audit", 7, 0),
    task("Identify data gaps that block agent grounding", "CRM/data audit", 9, 1),
    milestone("Data audit complete", "CRM/data audit", 10, 0),

    // Workspace configuration
    task("Provision workspace + user access", "Workspace configuration", 11, 0),
    task("Configure workspace settings, branding, roles", "Workspace configuration", 13, 1),
    milestone(
      "Workspace configured",
      "Workspace configuration",
      14,
      0,
    ),

    // Knowledge ingestion
    task("Connect knowledge sources (docs, wiki, CRM)", "Knowledge ingestion", 15, 0),
    task("Run initial ingestion pass + spot-check grounding", "Knowledge ingestion", 18, 1),
    milestone(
      "Knowledge base at working depth",
      "Knowledge ingestion",
      21,
      0,
      "Enough ingested that agents can answer real questions, not just seed data.",
    ),

    // Agent configuration
    task("Configure roster (roles, prompts, tool access)", "Agent configuration", 22, 0),
    task("Tune instincts/behaviour against real workspace data", "Agent configuration", 25, 1),
    milestone("Agent roster configured", "Agent configuration", 27, 0),

    // Integrations
    task("Connect email/calendar", "Integrations", 22, 2),
    task("Connect CRM/MCP tools + verify scoping", "Integrations", 26, 3),
    milestone("Integrations live", "Integrations", 28, 1),

    // UAT
    task("Run UAT script with customer stakeholders", "UAT", 30, 0),
    task("Triage + fix UAT findings", "UAT", 33, 1),
    milestone("UAT signed off", "UAT", 35, 0),

    // Training
    task("Run end-user training session(s)", "Training", 36, 0),
    task("Ship quick-reference guide", "Training", 37, 1),
    milestone("Team trained", "Training", 38, 0),

    // Go-live
    task("Flip workspace to production use", "Go-live", 39, 0),
    milestone("Go-live", "Go-live", 39, 0, "Customer is running on the Console day-to-day."),

    // Hypercare & review
    task("Daily check-ins during hypercare window", "Hypercare & review", 42, 0),
    task("30-day review — usage, gaps, next-phase scope", "Hypercare & review", 69, 1),
    milestone("Hypercare complete", "Hypercare & review", 70, 0),
  ],
};

// ---------------------------------------------------------------------------
// Bespoke Software Build
// ---------------------------------------------------------------------------

const BESPOKE_PHASES = [
  "Discovery",
  "Requirements",
  "Solution design",
  "Technical spec",
  "Build",
  "Internal testing",
  "Customer testing",
  "Deployment",
  "Documentation",
  "Handover & support",
];

export const BESPOKE_SOFTWARE_BUILD_TEMPLATE: SeedTemplate = {
  name: "Bespoke Software Build",
  description:
    "Custom software delivery from discovery through handover, with an explicit internal-then-customer testing split before deployment.",
  projectType: "bespoke_build",
  items: [
    ...BESPOKE_PHASES.map((name, i) => phase(name, i)),

    // Discovery
    task("Kickoff call — problem statement + constraints", "Discovery", 0, 0),
    task("Stakeholder interviews", "Discovery", 2, 1),
    milestone("Discovery complete", "Discovery", 5, 0),

    // Requirements
    task("Draft functional requirements", "Requirements", 7, 0),
    task("Review + sign-off requirements with customer", "Requirements", 10, 1),
    milestone("Requirements signed off", "Requirements", 11, 0),

    // Solution design
    task("Draft solution architecture options", "Solution design", 13, 0),
    task("Choose approach + confirm build-vs-buy tradeoffs", "Solution design", 16, 1),
    milestone("Solution design approved", "Solution design", 17, 0),

    // Technical spec
    task("Write technical spec (data model, APIs, infra)", "Technical spec", 19, 0),
    task("Technical review + estimate", "Technical spec", 22, 1),
    milestone("Technical spec signed off", "Technical spec", 23, 0),

    // Build
    task("Build milestone 1 — core data model + backend", "Build", 25, 0),
    task("Build milestone 2 — primary user flows", "Build", 39, 1),
    task("Build milestone 3 — remaining scope + polish", "Build", 53, 2),
    milestone("Build complete", "Build", 55, 0),

    // Internal testing
    task("Internal QA pass", "Internal testing", 57, 0),
    task("Fix internal QA findings", "Internal testing", 60, 1),
    milestone("Internal testing signed off", "Internal testing", 61, 0),

    // Customer testing
    task("Hand over to customer for UAT", "Customer testing", 62, 0),
    task("Triage + fix customer-reported issues", "Customer testing", 66, 1),
    milestone("Customer UAT signed off", "Customer testing", 69, 0),

    // Deployment
    task("Prepare production environment + rollback plan", "Deployment", 70, 0),
    task("Deploy to production", "Deployment", 72, 1),
    milestone("Deployed to production", "Deployment", 72, 0),

    // Documentation
    task("Write user documentation", "Documentation", 73, 0),
    task("Write technical/handover documentation", "Documentation", 75, 1),
    milestone("Documentation complete", "Documentation", 76, 0),

    // Handover & support
    task("Handover session with customer team", "Handover & support", 77, 0),
    task("30-day post-launch support window", "Handover & support", 107, 1),
    milestone("Handover complete", "Handover & support", 108, 0),
  ],
};

export const SEED_TEMPLATES: SeedTemplate[] = [
  CONSOLE_IMPLEMENTATION_TEMPLATE,
  BESPOKE_SOFTWARE_BUILD_TEMPLATE,
];
