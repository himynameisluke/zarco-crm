// DesignSystem.jsx — one-page design system summary
// Canonical view of tokens, type, components, decisions.

function Swatch({ name, value, label, dark = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ height: 56, borderRadius: 8, background: value, border: '1px solid var(--hairline)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{name}</span>
        <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{label || value}</span>
      </div>
    </div>
  );
}

function DSDot({ color }) {
  return <span style={{ width: 8, height: 8, borderRadius: 999, background: color, boxShadow: `0 0 10px ${color}66`, flexShrink: 0 }} />;
}

function DesignSystem() {
  return (
    <div className="crm screen" style={{ width: '100%', height: '100%', overflow: 'auto', padding: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 24, paddingBottom: 28, borderBottom: '1px solid var(--hairline)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <ZarcoMark size={22} />
            <span className="t-eyebrow">§ 00 · Design System</span>
          </div>
          <h1 className="t-display" style={{ fontSize: 44, lineHeight: 1.05, margin: 0, maxWidth: 720 }}>
            Zarco CRM — <span style={{ fontStyle: 'italic', background: 'linear-gradient(180deg, oklch(0.86 0.14 85), oklch(0.78 0.22 145))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>foundations & primitives.</span>
          </h1>
          <p className="body" style={{ maxWidth: 640, marginTop: 16, color: 'var(--ink-2)' }}>
            Built on the Zarco marketing palette but tuned for product surfaces: denser grid, Inter for UI body, JetBrains Mono for data. Dark first. Lucide icons (1.5px) replace the marketing site's glyph system on operational surfaces.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>v0.1 · 2026</span>
          <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>ZRC-CRM-DS</span>
        </div>
      </div>

      {/* Decisions row */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 32 }}>
        {[
          { k: 'Accent', v: 'amber-green', detail: 'oklch(0.78 0.20 145) — inherited from Zarco brand. Confident, agricultural, not corporate. Used sparingly: primary CTAs, active nav, focus rings, key numbers.' },
          { k: 'Mode', v: 'Dark · default', detail: 'Dark is the canonical surface; light mode is a follow-up. Matches Linear / Vercel / Attio reference set and the dense-data use case.' },
          { k: 'Type', v: 'Inter · 13/1.5', detail: 'Inter at 13px for UI body, Space Grotesk for headlines + big numbers, JetBrains Mono for IDs, currency, timestamps.' },
          { k: 'Density', v: '36px rows', detail: 'Linear-tight: 36px table rows, 28px nav items, 30px controls. ~22 contacts visible on a 13" laptop. Cramped is a bug, sparse is a worse one.' },
        ].map(d => (
          <div key={d.k} className="card card-pad">
            <span className="t-eyebrow" style={{ fontSize: 9.5 }}>{d.k}</span>
            <div className="t-display" style={{ fontSize: 22, marginTop: 8, marginBottom: 10, color: 'var(--ink)' }}>{d.v}</div>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5, margin: 0 }}>{d.detail}</p>
          </div>
        ))}
      </section>

      {/* Colour */}
      <section style={{ marginTop: 40 }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 18 }}>
          <span className="t-eyebrow">§ 01 · Colour</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Deep navy canvas, layered glass surfaces, one accent.</span>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 14 }}>
          <Swatch name="bg" value="#0E1A2E" label="--bg" />
          <Swatch name="bg-2" value="#152238" label="--bg-2" />
          <Swatch name="bg-3" value="#1C2A42" label="--bg-3" />
          <Swatch name="panel" value="#11192B" label="--panel" />
          <Swatch name="amber" value="oklch(0.78 0.20 145)" label="accent" />
          <Swatch name="cyan" value="oklch(0.82 0.08 220)" label="secondary" />
          <Swatch name="warn" value="oklch(0.82 0.14 70)" label="status" />
          <Swatch name="danger" value="oklch(0.70 0.20 25)" label="destructive" />
        </div>
        <div style={{ marginTop: 18, padding: 16, border: '1px dashed var(--hairline)', borderRadius: 10, display: 'flex', gap: 28, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="t-eyebrow" style={{ fontSize: 9.5 }}>Rationale</span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>One accent. Period.</span>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, maxWidth: 760 }}>
            The amber-green carried over from zarco.uk is exactly the right energy for a CRM: it reads as "money / momentum / go" without feeling like Salesforce. Status colours (warn, danger, info) sit in the same oklch family so red + green don't fight. Solid colour appears only on primary CTAs, the active nav state, and key stage chips — everywhere else, hierarchy comes from 1px hairlines and surface lifts.
          </p>
        </div>
      </section>

      {/* Type */}
      <section style={{ marginTop: 40 }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 18 }}>
          <span className="t-eyebrow">§ 02 · Type</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Inter for UI · Space Grotesk for display · JetBrains Mono for data.</span>
        </header>
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Display · 32/1.05 · Space Grotesk 500', sample: 'Pipeline value', f: 'var(--display)', s: 32, w: 500, ls: '-0.02em' },
              { label: 'H2 · 22/1.1 · Space Grotesk 500', sample: 'Acquire Foods Ltd.', f: 'var(--display)', s: 22, w: 500, ls: '-0.015em' },
              { label: 'H3 · 16/1.3 · Inter 600', sample: 'Recent activity', f: 'var(--ui)', s: 16, w: 600, ls: '-0.01em' },
              { label: 'Body · 13/1.5 · Inter 450', sample: 'Sent proposal v2 with revised licensing tier — awaiting confirmation from procurement.', f: 'var(--ui)', s: 13, w: 450 },
              { label: 'Small · 12/1.5 · Inter 400 · ink-3', sample: 'Logged 2 hours ago via Granola', f: 'var(--ui)', s: 12, w: 400, c: 'var(--ink-3)' },
              { label: 'Eyebrow · 10.5/0.14em · DM Mono', sample: '§ 04 · NEGOTIATION', f: 'var(--code)', s: 10.5, w: 500, c: 'var(--ink-3)', tt: 'uppercase', ls: '0.14em' },
              { label: 'Data · 13 · JetBrains Mono · tabular', sample: '£ 124,500.00 · DEAL-0184 · 2026-05-24', f: 'var(--code)', s: 13, w: 400 },
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, alignItems: 'baseline' }}>
                <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{t.label}</span>
                <span style={{ fontFamily: t.f, fontSize: t.s, fontWeight: t.w, color: t.c || 'var(--ink)', letterSpacing: t.ls, textTransform: t.tt }}>
                  {t.sample}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spacing & radius */}
      <section style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card card-pad">
          <span className="t-eyebrow">§ 03 · Spacing</span>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            {[2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32].map(s => (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: s, height: 40, background: 'var(--amber-soft)', border: '1px solid oklch(0.78 0.20 145 / 0.3)', borderRadius: 2 }} />
                <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{s}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 16, lineHeight: 1.6, margin: '16px 0 0' }}>4-pt base. Cards pad 16/18. Section gutter 20–24. Page padding 24–32.</p>
        </div>
        <div className="card card-pad">
          <span className="t-eyebrow">§ 03 · Radius</span>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            {[
              { r: 4, n: 'xs · 4px', use: 'chips' },
              { r: 6, n: 'sm · 6px', use: 'controls' },
              { r: 7, n: 'md · 7px', use: 'inputs / btns' },
              { r: 10, n: 'lg · 10px', use: 'cards' },
              { r: 14, n: 'xl · 14px', use: 'modals' },
              { r: 999, n: 'full', use: 'avatars' },
            ].map(x => (
              <div key={x.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 44, height: 44, borderRadius: x.r, background: 'var(--surface-3)', border: '1px solid var(--hairline)' }} />
                <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{x.n}</span>
                <span style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{x.use}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Components */}
      <section style={{ marginTop: 40 }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 18 }}>
          <span className="t-eyebrow">§ 04 · Component recipes</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Inline placeholders — swap for shadcn primitives in production.</span>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {/* Buttons */}
          <div className="card card-pad">
            <span className="t-label">Buttons</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary"><Icon name="plus" size={13} /> New deal</button>
              <button className="btn">Secondary</button>
              <button className="btn btn-ghost">Ghost</button>
              <button className="btn btn-icon"><Icon name="more" size={14} /></button>
              <button className="btn btn-sm">Small</button>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 12, lineHeight: 1.5 }}>30px tall · 7px radius · inset-light highlight on primary. Press = no depression, only lift on hover.</p>
          </div>

          {/* Inputs */}
          <div className="card card-pad">
            <span className="t-label">Inputs</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <div className="input"><Icon name="search" size={13} color="var(--ink-4)" /><input placeholder="Search deals…" /><span className="kbd">⌘K</span></div>
              <div className="input" style={{ borderColor: 'oklch(0.78 0.20 145 / 0.4)', boxShadow: '0 0 0 3px oklch(0.78 0.20 145 / 0.15)' }}><input defaultValue="luke@zarco.uk" /></div>
              <div className="input"><Icon name="pound" size={13} color="var(--ink-4)" /><input defaultValue="124500" /><span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>GBP</span></div>
            </div>
          </div>

          {/* Chips / status */}
          <div className="card card-pad">
            <span className="t-label">Status chips</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              <span className="chip --ok"><span className="dot --ok"></span>Won</span>
              <span className="chip --info"><span className="dot --info"></span>Proposal</span>
              <span className="chip --warn"><span className="dot --warn"></span>Stalled</span>
              <span className="chip --danger"><span className="dot --danger"></span>Lost</span>
              <span className="chip --mute">Draft</span>
              <span className="chip --solid">v2.0</span>
              <span className="chip"><Icon name="zap" size={11} color="var(--amber)" />MCP</span>
            </div>
          </div>
        </div>
      </section>

      {/* Locked answers */}
      <section style={{ marginTop: 40, marginBottom: 12 }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 18 }}>
          <span className="t-eyebrow">§ 05 · Decisions you asked me to make</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>One line each, no hedging.</span>
        </header>
        <div className="card">
          {[
            ['Accent colour', 'amber-green oklch(0.78 0.20 145)', 'Already yours. Reads as money + go without feeling enterprise.'],
            ['Logo', 'lowercase "zarco" wordmark + hollow ring mark (favicon)', 'No mark redesign needed. The ring is already distinctive; it works at 20px.'],
            ['Sidebar', 'icon + label, always visible (collapsible to 48px)', 'You said keyboard-heavy, but labels are still faster to scan than icons-only at this app width.'],
            ['Lists', 'tables for desktop, card-stack fallback below 768px', 'Density is the whole point. Click-to-edit a row inline; double-click opens the slide-over.'],
            ['Kanban card', 'name · value (big) · org · primary contact avatar · days-in-stage chip · close date', 'Days-in-stage chip: 0–6d grey, 7–13d amber, 14d+ red. Click card = slide-over detail.'],
            ['Dark mode', 'Dark default, light as a future preference', 'Your reference set is dark-first. Don\'t fragment energy on a light mode for v1.'],
            ['Money', '£ + thousands abbreviation in tables (£124k), full pennies in line items (£124,500.00)', 'Use the abbreviation only when ≥ 4 figures and column is dense.'],
            ['Dates', 'Relative on timelines ("3d ago"), absolute on form fields (24 May 2026)', 'Hover relative dates for absolute tooltip. ISO format reserved for technical surfaces (MCP logs).'],
          ].map((row, i, arr) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px 280px 1fr', gap: 20, padding: '12px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--hairline)' : 'none', alignItems: 'baseline' }}>
              <span className="t-eyebrow" style={{ fontSize: 9.5 }}>{row[0]}</span>
              <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{row[1]}</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{row[2]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

window.DesignSystem = DesignSystem;
