# Chat

_Started 2026-05-26 18:12 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "Zarco CRM"
Project is currently empty (no files)
Current date is now May 26, 2026
</system-info>

<pasted_text name="Pasted text (88 lines)">
You are a senior product designer specialising in B2B SaaS dashboards. I'm building a CRM and need you to design it properly — visual system first, then the key screens as React components.

The product
Zarco CRM is a custom-built CRM for my consulting/sales business (zarco.uk). Solo for now, will grow to a small team (~5 people). The differentiator is deep Claude/AI integration — the app exposes itself as MCP tools so I can drive the whole CRM from a Claude conversation. Think "HubSpot's data model, but the UI is the cockpit not the workhorse."

Target user
A founder/operator who lives in Linear, Notion, and Cursor. Keyboard-heavy. Wants information density without feeling cramped. Hates clicking. Expects Cmd+K everywhere.

Visual direction
References: Linear (information hierarchy), Vercel dashboard (restraint), Attio (CRM domain feel), Raycast (keyboard-first), Notion (typography)
Anti-references: Salesforce, HubSpot, Pipedrive — busy, gradient-heavy, "enterprise" chrome
Palette: monochromatic neutrals with one accent. Suggest a colour that fits Zarco — confident, not corporate. Dark mode is first-class, not an afterthought.
Typography: clean sans for UI (Inter, Geist, or system), monospace for IDs and code-like fields
Density: dense but not cramped. Linear-tight, not Gmail-loose.
Borders: subtle 1px hairlines. No drop shadows except for modals/popovers.
Iconography: Lucide icons throughout
Motion: minimal, only for state changes (toast in/out, modal open/close, stage move on kanban). No decorative animation.
Tech stack (output must be compatible)
Next.js 16 (App Router, React Server Components)
React 19
Tailwind CSS v4 with CSS variables for theming
shadcn/ui base-nova preset (uses @base-ui/react under the hood, NOT Radix). Available primitives: Button, Card, Input, Label, Textarea, Select, Sheet, Dialog, DropdownMenu, Table, Form, Badge, Avatar, Separator, Tabs, Sonner (toast), Command (Cmd+K palette), InputGroup
lucide-react for icons
cn() helper combines clsx + tailwind-merge
Output format: Each screen as a self-contained React component artifact using Tailwind classes. Don't import shadcn components — inline placeholder primitives so I can see the structure. I'll wire to real shadcn after.

Data model (so you know what to display)
Organizations: name, domain, website, industry, employee count, notes, owner. Has many contacts, deals.
Contacts: first/last name, email, phone, title, LinkedIn, notes, organization (optional FK). Has many activities.
Deals: name, type (engagement/sale/project/retainer), stage (lead/qualified/proposal/negotiation/won/lost), value (stored in pence, displayed as £), expected close date, organization, primary contact. Has many activities, projects, quotes.
Projects: post-sale delivery tracking. Belongs to a deal. Status (not_started/in_progress/on_hold/completed), dates.
Activities: polymorphic timeline — type (email/call/meeting/note/status_change/task_completed/quote_*), subject (entity it's attached to), source (manual/granola/email_sync/system/mcp), body, occurred_at. Attached to any of: contact / organization / deal / project.
Tasks: title, description, status (todo/in_progress/done), due date, assignee, optionally linked to any entity.
Quotes: quote number, status (draft/sent/viewed/accepted/declined/expired), line items, subtotal/tax/total in pence, valid_until, public_token for client view.
Email campaigns + sends: outbound mailers with templates, delivery tracking.
Screens to design
Design each of these. Mark which ones to prioritise as v1.

Auth + shell
Login — magic-link form. Single card, centered. Branded with Zarco logo.
App shell — left sidebar nav, top bar with user menu + Cmd+K trigger, main content area. Mobile: sidebar collapses into a sheet behind a hamburger.
Dashboard
Home — at-a-glance: deals by stage (mini kanban or value-weighted bar), recent activity timeline, tasks due today, pipeline value summary. The default page after sign-in.
Contacts
List — table with search, sort, filter (by org, by owner), bulk-select for actions. Density: ~40 rows visible without scrolling on a 13" laptop. Inline quick-edit on hover? Or click-to-edit a row.
Detail — sidebar with contact info, main area with activity timeline grouped by date, related deals, tasks, files, quick "log activity" composer at top.
Create/Edit — modal or slide-over sheet rather than full page. Form fields with sensible defaults.
Organizations
List — similar to contacts but with logo/favicon, employee count, deal pipeline value, last-activity timestamp.
Detail — overview card, contacts list, deals list, activity timeline. Same composer pattern.
Deals
Pipeline view (kanban) — columns per stage with drag-drop. Each card: name, org, value, primary contact avatar, days-in-stage, expected close. Column totals at top.
List view — table alternative for power users. Toggle between kanban and list.
Detail — stage indicator (changeable), value/close/org/contact in a sidebar, activity timeline, quotes section, projects section.
Create/Edit — slide-over sheet with smart defaults (e.g. if creating from an org page, prefill that org).
Activities (global timeline)
Global activity feed — unified timeline across the whole CRM. Filter by type, source, entity. Each activity rendered differently based on type (emails show preview, calls show transcript snippet, notes show body, status changes show before→after).
Tasks
List — sectioned by Due today / Overdue / This week / Later / Done. Inline checkbox to complete. Quick-add at top.
Quotes
List — table by status (Draft/Sent/Viewed/Accepted/Declined/Expired), value totals.
Builder — editable line items table, live total calculation, preview of the public PDF on the right.
Public client view — what the client sees via the magic link. Logo, line items, accept/decline buttons, no Zarco UI chrome.
Settings
Profile — basic account info.
Integrations — connect Outlook, Resend, Granola, MCP clients. Each as a card with status + actions.
Team — invite teammates, manage roles (post-MVP but design the empty state).
API & MCP — show MCP server URL, registered Claude clients, revoke tokens, see recent MCP tool calls.
Cross-cutting patterns to design
Cmd+K command palette — navigate, create entities, jump to recent. The keyboard nerve centre.
Activity composer — appears on every entity detail page. One unified composer with type switcher (note / call / meeting / email logged manually).
Empty states — every list page needs one. Icon, headline, single CTA.
Loading states — skeletons that match the final layout, not generic spinners.
Toasts — bottom-right, auto-dismiss after 4s, can stack.
Confirmation dialogs — for destructive actions. Two buttons only, destructive in danger colour.
Specific design decisions I need from you
The accent colour. Pick one. Justify it.
The logo treatment. Just the word "Zarco" in the sidebar? An actual mark? Suggest options.
Sidebar density. Icons + labels always, or icons only with labels on hover/expand?
Tables vs. cards for list views. Defaults to tables for desktop density. Mobile fallback?
The kanban card. What lives on it. What requires a click-through. Specifically how a "days in stage" indicator works.
Dark mode default or follow system? I'd lean dark default — most of my reference apps default dark.
Money display. Always £ with no decimals for thousands+? Different for line items where pence matter?
Date display. Relative ("3 days ago") for timeline, absolute (DD MMM YYYY) for fields. Confirm or push back.
What to deliver
Give me (a) a one-page design system summary (colour tokens, typography scale, spacing, key component recipes) then (b) the highest-leverage screens as React artifacts in this order: app shell → dashboard → contacts list → deal detail → kanban → command palette. We can iterate on the rest after.

Don't ask permission, just design. Where you have to choose, choose decisively and add a one-line rationale.
</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Hi-fi design">
Create a high-fidelity, polished design. Follow the instructions about design in your system prompt, particularly the 'How to do design work' section. Use the design_canvas starter component, or make a full-bleed prototype and offer options via Tweaks.
</attached-skill>

<attached-skill name="Interactive prototype">
Create a fully interactive prototype with realistic state management and transitions. Use React useState/useEffect for dynamic behavior. Include hover states, click interactions, form validation, animated transitions, and multi-step navigation flows. It should feel like a real working app, not a static mockup.
</attached-skill>

<attached-skill name="Zarco Design System (design system)">
[Design System] This project uses the **Zarco Design System** design system. This is a binding choice for visual style — every visual must follow it. Don't invent colors, type, spacing, or components not grounded here.

Scope: the design system is a visual style reference only. Its guide may describe example products, brands, or people that are unrelated to the user and unrelated to the subject of this conversation. Never treat anything in the design system as a fact about the user, their work, or the topic they asked about.

    Explore it to find what you need:
    - Always copy out the fonts and colors you need
    - For prototypes and designs, always copy out any relevant components
    - If the design system contains existing mocks of products, and you were asked to design or prototype something similar, copy and fork those mocks to start your design. This helps you make high-quality designs.

    Explore it quickly to find relevant UI kits (e.g. mocks of existing products you can copy and fork)

Full system at `/projects/019df9c0-ec67-73ca-a15b-e578baa34339/`. Its guide is reproduced below so you don't need to fetch it:

<design-system-guide>
# Zarco Design System

> *AI implementation studio for UK SMEs.*

## Company

**Zarco** is a UK-based AI implementation consultancy. The positioning line, repeated across the site, is **"AI systems that make UK SMEs more profitable."** They design and build internal tools, workflow automations, LLM-native applications, and customer-facing web platforms (booking systems, portals) — turning AI from buzzword into business infrastructure.

The brand's stated personality is **"working systems, not slide decks"** — implementation-led, commercially focused, lean. Premium agency feel without the strategy-deck baggage.

## Source

This design system was extracted from the live marketing website (refreshed for the 2026 deep-navy direction):

- **Site:** [zarco.uk](https://zarco.uk/)
- **Repo:** [himynameisluke/zarco-website](https://github.com/himynameisluke/zarco-website) — `main` branch
- **Pages read:** `index.html`, `services.html`, `contact.html`, `case-cv-screening.html`
- **Styles:** `styles.css` (master), `service-page.css` (service/case-study layouts)
- **Behaviour:** `app.js`, `service-page.js`
- **Favicon:** `favicon.svg` — a hollow ring stroked with a green→teal linear gradient (`#5EE07B → #7FCFE5`). This is now the canonical brand mark.

There is **one product / surface**: the marketing website.

## File index

| File | What's in it |
|---|---|
| `README.md` | You are here — overview, content rules, visual foundations, iconography |
| `colors_and_type.css` | All CSS custom properties: colors, type stacks, type scale, radii, shadows, spacing tokens |
| `SKILL.md` | Skill manifest (cross-compatible with Agent Skills) |
| `assets/` | Brand mark SVG, noise-grain SVG (used as full-page texture) |
| `preview/` | Design-system preview cards (registered — visible in the Design System tab) |
| `ui_kits/website/` | UI kit recreating Zarco's marketing website — components + interactive index |

---

## CONTENT FUNDAMENTALS

The Zarco voice is **understated, confident, British, and deliberately anti-hype**. It reads like a thoughtful senior consultant who has done the work — not a startup pitch and not enterprise consulting jargon.

### Tone & attitude

- **Plain, declarative, honest.** No marketing fluff. No "transform your business with AI." Sentences are short and load-bearing.
- **Anti-strategy-deck.** Explicit: *"We build the systems. Not just the strategy."* / *"Working systems, not slide decks."* / *"Not 60-page strategy decks."* The brand defines itself against management-consultancy theatre.
- **Commercial, not technical.** Always frames AI in terms of time saved, cost reduced, revenue unlocked. *"If a system can't earn its keep, it doesn't ship."*
- **Honest about limits.** *"If AI isn't the right solution for a particular problem, we'll say so."*
- **Confident without bragging.** State what was done, the metric, move on.

### Voice & grammar

- **"We" for Zarco, "you/your" for the reader.** First-person plural. No "I" anywhere on the site.
- **British English.** *organise, summarise, customise, prioritisation, behaviour, optimise.* Currency is `£`.
- **Sentence case for everything below H1.** Headings, buttons, eyebrows-as-words are all sentence case. Mono eyebrows and labels are UPPERCASE with wide tracking.
- **Em-dashes used liberally** — for asides, qualifications, and rhythm. They're a real voice tic of this brand.
- **Periods on full sentences** in marketing copy, even short ones (*"more profitable."* *"the right hire."* *"like this?"*). Adds gravity.
- **Italic emphasis for the punchline** of every headline, set in amber. The pattern is: setup in cream, payoff in italic-amber. (*"Real systems, **built for real businesses.***"*)
- **No emoji. None. Anywhere.** The brand never uses them.
- **Numbers as numerals when they're stats.** `8×`, `2.4k`, `97%`, `+38%`, `12d`. Spelled out only in flowing prose ("two recent systems").

### Vocabulary — words Zarco uses

Implementation, system, workflow, ship, build, leverage, operational, commercially, lean, practical, friction, bottleneck, momentum, audit trail, real-world, end-to-end, in-house, SME, discovery call.

### Vocabulary — words Zarco avoids

Transform, revolutionary, cutting-edge, leverage synergies, journey, unlock the power of, AI-powered (used sparingly), supercharge, game-changer, "powered by AI," disrupt.

### Examples

**Headlines (cream + italic-amber payoff):**
- *"AI systems that make UK SMEs **more profitable.**"*
- *"Working systems, **not slide decks.**"*
- *"Real systems, **built for real businesses.**"*
- *"Five steps **from problem to live.**"*
- *"Ready to turn AI into **operational advantage?**"*
- *"Want something **like this?**"*

**Body copy:**
> Zarco helps UK SMEs design and implement AI systems that save time, reduce manual work and improve how the business operates.

> This isn't about replacing people — it's about removing the low-value, time-consuming tasks that stop your team from doing the work that actually matters.

> 30 minutes. No pitch, no pressure. Just a straight conversation about your business and where AI could create real value.

**Section eyebrows** (always mono, uppercase, prefixed with `§ NN ·` or `◦`):
`§ 03 · WHAT WE BUILD` · `§ 04 · SELECTED WORK` · `§ 05 · PROCESS` · `§ 06 · WHY ZARCO` · `§ 07 · CAPABILITIES` · `§ 08 · ENGAGE`

**Stamp / footer line:** `30 MINS · NO OBLIGATION · UK-BASED` · `BUILT FOR UK SMES ◦ ZRC-2026` · `© 2026 ZARCO LTD · LONDON, UK`

---

## VISUAL FOUNDATIONS

The visual identity is **dark, premium, editorial**. Think a tech-forward consultancy magazine — not a SaaS landing page. It feels closer to *Linear / Vercel / Rauno-style portfolio sites* than to typical agency work, with a serif-feeling sans (Space Grotesk) carrying the headlines.

### Palette

A deep-navy canvas with a green-teal accent gradient on the brand mark, and a warm amber-green oklch accent on type and UI affordances.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0E1A2E` | Page background — deep navy |
| `--bg-2` | `#152238` | Raised surfaces, scrolled nav |
| `--bg-3` | `#1C2A42` | Deepest surfaces |
| `--ink` | `#F5F1EA` | Primary text — warm off-white, never pure white |
| `--ink-2` | `rgba(245,241,234,0.85)` | Body / secondary text |
| `--ink-3` | `rgba(245,241,234,0.60)` | Meta, eyebrows, captions |
| `--ink-4` | `rgba(245,241,234,0.38)` | Placeholder, faintest |
| `--amber` | `oklch(0.78 0.20 145)` | Italic-headline payoff, eyebrow dots, CTAs |
| `--amber-soft` | `oklch(0.78 0.20 145 / 0.16)` | Tag backgrounds, glow halos |
| `--accent-tint` | `oklch(0.78 0.20 145 / 0.06)` | Very low-opacity washes |
| `--cyan` | `oklch(0.82 0.08 220)` | Secondary accent, ambient gradients |
| `--line` | `rgba(255,255,255,0.10)` | Default 1px dividers |
| `--line-strong` | `rgba(255,255,255,0.18)` | Borders on hover, emphasised dividers |

Layered glass surfaces (cards, hovers, ghost buttons) use a four-step opacity scale:

| Token | Opacity | Use |
|---|---|---|
| `--surface-1` | 1.5% white | Faintest card wash |
| `--surface-2` | 2.5% white | Default card background |
| `--surface-3` | 4% white | Ghost button |
| `--surface-4` | 6% white | Hover lift |

Decorative blooms (hero orbs, final-CTA radials) live in `--bloom-warm` (`oklch(0.82 0.13 75)`) and `--bloom-cool` (`oklch(0.82 0.08 220)`). The italic headline gradient runs `--headline-grad-1` (`oklch(0.86 0.14 85)`) at the top into `--headline-grad-2` (`oklch(0.78 0.22 145)`) at the bottom — only used on the **italic emphasis word** in headlines.

### Type

- **One family does almost everything: Space Grotesk** (300 / 400 / 500 / 600 / 700). It's set as both `--serif` and `--sans` in the source — the 'serif' label is semantic, not literal. It's used at 400 weight, italic, with tight tracking (`-0.02em`) for all display headings.
- **DM Mono** (400 / 500) for eyebrows, labels, captions, numbers, breadcrumbs, footer legal. Always uppercase with `letter-spacing: 0.14–0.18em`.
- Body copy is **weight 400** (refreshed from 300 — heavier, easier to read on the deeper navy).
- Display sizes scale with `clamp()`: hero up to **88px** (refreshed down from 116), sections up to 60px, card titles up to 28px.
- A small **2px × 56px amber rule** (`.hero-rule`) sits above the hero headline as an editorial accent.
- `font-feature-settings: "ss01", "cv11"` is enabled globally.
- **Italic** is reserved for the highlighted word in every headline; never used in body copy.

### Spacing & layout

- `.shell` is `max-width: 1320px` with `32px` horizontal padding.
- Section vertical rhythm: `padding: 140px 0` desktop, `96px 0` under 900px.
- Hero is `min-height: 100vh` with `padding-top: clamp(90px, 11vh, 130px)`.
- The site uses generous negative space — sections are large because the headlines are large.

### Backgrounds & textures

The page is layered: a base deep-navy, **two soft radial-gradient orbs** (top-right amber, mid-left cyan, both at very low opacity / heavily blurred) for ambient warmth, and a **fixed full-page noise/grain SVG** with `mix-blend-mode: overlay` and `opacity: 0.6` that gives every screen a subtle film texture. This is critical to the brand feel.

The hero adds a **88×88 grid mask** (`linear-gradient` lines clipped by a radial mask) creating a soft dot-grid that fades to the edges, plus a **mouse-tracked flare** that lerps toward the cursor (raf-driven, easing factor 0.08).

No full-bleed photography. No hand illustrations. No stock imagery. The brand uses **synthetic visual elements built in CSS**: node graphs, calendar grids, score bars, mini-dashboards, marquee text. Every "image" on the site is HTML+CSS.

### Animation

- **Easing is consistently `cubic-bezier(.2,.7,.2,1)`** — a deliberate ease-out for confident, settled motion. Never bouncy, never elastic.
- **Reveal-on-scroll**: `opacity 0 → 1` and `translateY(24px → 0)` over `0.9s`, with `transition-delay` 50/150/250/350/450ms cascading via `.reveal-1`…`.reveal-5`.
- **Marquee** scrolls horizontally at `50s linear infinite`, with mask-gradient edges that fade into the bg.
- **Pulse animation** on diagram dots: `scale(1) → scale(1.6)` at `2.4s ease-in-out infinite`.
- Buttons: hover `transform: translateY(-1px)`, transitions on `.25s ease`.
- Nav pills: hover `translateY(-2px)`, glow halo via `::after` blurred radial gradient, `.35s` cubic-bezier.

### Hover states

- **Buttons** — slight lift (`-1px`), shadow grows + amber-soft glow added.
- **Cards** — `translateY(-3 to -4px)`, `border-color: var(--line)` → `var(--line-strong)`, background lightens.
- **Service-grid items (`.tech-item`)** — content shifts right (`padding-left: 28px → 36px`), color `--ink-2 → --ink`, the `↗` arrow goes amber and translates `(2px, -2px)`.
- **Process steps** — top border animates from `width: 0 → 100%` in amber over 0.5s.
- **Nav links** — pill background appears + glow halo via `::after` (radial amber-soft gradient, blurred).

### Press / focus states

- Inputs: `border-color: var(--amber)`, `box-shadow: 0 0 0 3px var(--amber-soft)` (3px focus ring).
- No "press" depression on buttons — they only lift, never push.

### Borders & corners

| Element | Radius |
|---|---|
| Buttons, pills, tags, nav | `999px` (fully rounded) |
| Cards, surfaces, frames | `22px` |
| Final-CTA & form blocks | `24–28px` |
| Inputs, small chips | `10px` |
| Mini-grid cells, score bars | `2–6px` |

Borders are **always 1px**, always cool transparent white (`rgba(255,255,255,0.07–0.14)`), never a solid colour. Border-color is the primary affordance for hierarchy — solid surfaces are extremely rare.

### Shadows & glow

- **Inset highlight on dark buttons** — `0 1px 0 rgba(255,255,255,0.6) inset` simulates a top edge of light. This is the signature button treatment.
- **Amber glow** on important hover targets — `0 0 30px -4px var(--amber-soft)`.
- **Big drop shadow** on the floating nav — `0 24px 70px -28px rgba(0,0,0,0.85)`.
- Cards do not use shadows — they use border colour shifts.

### Capsules vs gradients

- **Pills / tags / buttons / nav** are always **fully-rounded capsules** (`border-radius: 999px`), with either an inset highlight (primary) or a subtle backdrop-blur ghost (secondary).
- Backgrounds use **soft, low-opacity radial gradients** for ambient warmth — never sharp or directional gradients. The only directional gradient is the headline italic gradient (top → bottom).

### Transparency & blur

- The floating nav uses `backdrop-filter: blur(22px) saturate(170%)` over `rgba(14, 20, 27, 0.55)` — full glassmorphism but heavily desaturated to feel premium, not iOS.
- Subtle `backdrop-filter: blur(8px)` on ghost buttons.
- Form fields use `rgba(255,255,255,0.04)` with `1px` strong line.

### Cards — the canonical look

```
border: 1px solid var(--line);
background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012));
border-radius: 22px;
padding: 36px 32px 32px;
```
Plus an `::after` overlay that adds a subtle top-down highlight gradient inside the card. On hover, `translateY(-4px)` + border + background brighten.

### Layout rules / fixed elements

- The **nav** is `position: fixed` and full-width — transparent at the top, then on scroll becomes a glassy navy bar (`backdrop-filter: blur(22px) saturate(170%)` over `var(--nav-bg-scrolled)`) with a bottom hairline. The wordmark sits left (28px Space Grotesk, with the ring mark at 22px), links push right via `margin-left: auto`, primary CTA on the far right. Active link is amber with a 1.5px underline.
- The **services sub-nav** on `services.html` is `position: fixed; top: 68px` and acts as a tab strip.
- Body uses `overflow-x: hidden` to contain the off-canvas hero orb.
- `body::before` carries the noise overlay (`position: fixed; inset: 0; pointer-events: none; z-index: 1`); content runs at `z-index: 2`.

### Imagery vibe

There **is no real imagery** in the brand. All "imagery" is constructed: dot-grids, diagrams, calendar mockups, score bars, mini-windows, marquee text. If photography were ever introduced, it should be **cool, dark, blue-grey, film-grain, low-saturation** — to match the bg-2 / cyan ambient palette. Never warm, never bright, never lifestyle.

---

## ICONOGRAPHY

The brand is **deliberately icon-free**. There is **no icon font, no SVG icon set, no Lucide / Heroicons / Phosphor library** loaded anywhere in the codebase. Iconography is replaced almost entirely by **typographic glyphs** rendered in DM Mono.

### The glyph system

| Glyph | Where it's used |
|---|---|
| `↗` | All primary CTAs, link arrows, "external/forward" affordance — always at the end of a button, always in a `<span class="arrow">` so it can animate to `translate(2px, -2px)` on hover |
| `→` | Process / flow arrows ("Trigger → Enrich → Decide"), secondary "explore" buttons (rendered at `opacity: 0.6`) |
| `◦` | Open-circle bullet — used in eyebrows ("`◦ § 08 · ENGAGE`"), trust-list items, why-points ("`◦ Commercially focused`"), legal stamp ("`UK SMEs ◦ ZRC-2026`"). The brand's most distinctive glyph. |
| `§` | Section marker — every section eyebrow opens with `§ NN ·` (e.g. `§ 03 · What we build`). Acts as a chapter mark. |
| `·` | Mid-dot separator in meta lines ("`Recruitment · 2025`", "`30 mins · No obligation · UK-based`") |
| `▸` | Right-pointing solid triangle — used in screenshot/badge tags ("`▸ AI screening`") |
| `▮` | Vertical bar — used inside fake "AI thinking" status text |
| `↘` `←` | Occasionally for direction in diagrams |
| `✦` | Four-pointed star — used as separator in the marquee, always coloured amber |
| `✓` | Form success indicator inside the success state circle |
| `↗` (small) | Footer link affordance |

### Decorative dots

The pulsing **6×6px circle dot** is the brand's most repeated visual primitive:

- Inside the eyebrow (`.eyebrow::before`) — solid amber, with a 12px box-shadow glow.
- Inside diagram nodes (`.node .dot`) — pulsing on a 2.4s loop.
- Inside trust-items, build-card visuals, viz-nodes (`.nd`) — 10px solid amber with amber-soft box-shadow halo.

### The mark — the hollow ring

The brand mark is a **hollow circle stroked with a green→teal linear gradient** (`#5EE07B → #7FCFE5` at 135°). This is the actual `favicon.svg` shipped in the repo, and it's the closest thing to a logo on the site. We've exported it as `assets/zarco-mark.svg` / `assets/zarco-wordmark.svg` / `assets/favicon.svg`, and reproduced it as a CSS utility class in `colors_and_type.css`:

```html
<span class="zk-ring" style="--size: 32px"></span>
<!-- variants -->
<span class="zk-ring zk-ring--glow" style="--size: 56px"></span>
<span class="zk-ring zk-ring--thin"></span>
<span class="zk-ring zk-ring--thick"></span>
```

The CSS class uses a `mask: radial-gradient(...)` so the centre is **transparent** — the ring sits on any background and shows whatever's behind it through the hole. Sizing is by `--size`; stroke weight is `--thickness` (a fraction of size, default 18%).

In the nav the mark sits at 22px next to a 28px Space Grotesk wordmark with `letter-spacing: -0.025em`. The two colours (`#5EE07B`, `#7FCFE5`) are the only **literal hex** values in the brand — everything else uses tokens.

### When to add icons

If a future surface genuinely needs icons (e.g. settings panels, file types, form-field affordances), use **Lucide** at `1.5px` stroke weight, monoline, no fills, sized 16–18px, coloured `var(--ink-3)` by default and `var(--amber)` for active state. **Flag any addition** — the current brand has gone to deliberate lengths to avoid them, and substituting icons changes the mood significantly.

### Emoji

**Never used.** Anywhere. Even in microcopy, casual contexts, or success states. The brand voice is too British and too understated for emoji.

### Unicode chars used as bullets/separators

Yes, extensively — see the glyph table above. The `◦`, `§`, `·`, `▸`, `↗`, `→`, `✦`, `✓`, `▮` set is effectively the brand's "icon system."

</design-system-guide>

CSS tokens: the guide may describe tokens in prose, but the exact `--*` names are defined in the design system's stylesheet(s) (`/projects/019df9c0-ec67-73ca-a15b-e578baa34339/colors_and_type.css`, `/projects/019df9c0-ec67-73ca-a15b-e578baa34339/preview/card.css`, `/projects/019df9c0-ec67-73ca-a15b-e578baa34339/slides/slides.css`, `/projects/019df9c0-ec67-73ca-a15b-e578baa34339/ui_kits/website/styles.css`). The 59 custom properties it defines are:

--accent-tint, --amber, --amber-soft, --bg, --bg-2, --bg-3, --bloom-cool, --bloom-warm, --cyan, --frame-cmp, --frame-cv, --fs-body, --fs-body-lg, --fs-body-sm, --fs-card, --fs-display, --fs-eyebrow, --fs-label, --fs-section, --fs-section-sm, --headline-grad-1, --headline-grad-2, --hero-pad-bot, --hero-pad-top, --ink, --ink-2, --ink-3, --ink-4, --line, --line-strong, --mobile-nav-bg, --mono, --nav-bg, --nav-bg-scrolled, --r-2xl, --r-lg, --r-md, --r-pill, --r-sm, --r-xl, --ring-grad-1, --ring-grad-2, --sans, --section-pad, --serif, --shadow-btn, --shadow-drop, --shadow-glow, --shadow-inset-hi, --shadow-nav, --shadow-ring, --shell-max, --shell-pad, --size, --surface-1, --surface-2, --surface-3, --surface-4, --thickness

Only use `var(--*)` names from that list. Never guess a token name — an unresolved `var()` silently falls back to the browser default.

For assets and UI kits beyond the guide: `read_file("/projects/019df9c0-ec67-73ca-a15b-e578baa34339/<path>")` and `copy_files` to bring them into the current project.
</attached-skill>

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: update_todos]_

_[tool: copy_files]_

_[tool: copy_starter_component]_

_[tool: grep]_

_[tool: write_file]_

Now let me build. I'll keep components in separate JSX files and assemble in `index.html`.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: done]_

_[tool: update_todos]_

_[tool: fork_verifier_agent]_

Designed. Seven artboards on one canvas — drag to pan, scroll to zoom, click any artboard's label to focus it fullscreen.

**Foundations** — one-page design system, lockdown decisions (accent, mode, money, dates, sidebar, etc.) at the bottom.
**Auth** — Login.
**Core** — Dashboard, Contacts list, Deal detail (Acquire Foods v2), Pipeline kanban.
**Patterns** — Command palette.

A few opinionated calls I made without checking back:

- **Inter for UI, Space Grotesk for display, JetBrains Mono for data.** Zarco DS uses Space Grotesk for everything, but for dense CRM tables Inter is more readable at 12–13px. Space Grotesk shows up wherever a number is the point (KPIs, deal values, headlines). DM Mono is too wide for table columns.
- **Lucide-style monoline icons** in the product (1.5px stroke). The DS deliberately avoids icons on the marketing site, but the brief is unambiguous and operational surfaces need them.
- **One accent, used like a precious resource** — primary CTA, active nav item, focus ring, key numbers, that's it. Status colours sit in the same oklch family so they don't fight.
- **Days-in-stage chip** uses 0–6d grey, 7–13d amber, 14d+ red. Legend in the kanban footer.
- **Claude/MCP shows up as a first-class surface**, not a setting: dashboard suggestion card, timeline entries with their own icon, ⌘K "Ask Claude" group, sidebar nav item. That's the whole differentiator.

Next obvious things if you want to keep going: tasks list, quotes builder, public client quote view, settings/integrations, mobile sheet for the sidebar, light mode token pass.

