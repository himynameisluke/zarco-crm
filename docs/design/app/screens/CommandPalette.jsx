// CommandPalette.jsx — Cmd+K overlay shown on top of a faded shell

function PaletteRow({ icon, label, hint, kbd, group, active, mono = false, accent }) {
  return (
    <li style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 14px',
      background: active ? 'var(--hover-strong)' : 'transparent',
      borderLeft: active ? '2px solid var(--amber)' : '2px solid transparent',
    }}>
      <span style={{ width: 22, height: 22, borderRadius: 5, background: active ? 'oklch(0.78 0.20 145 / 0.15)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? 'var(--amber)' : 'var(--ink-3)', flexShrink: 0 }}>
        <Icon name={icon} size={12} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 13, color: active ? 'var(--ink)' : 'var(--ink-2)', fontFamily: mono ? 'var(--code)' : 'var(--ui)' }}>
          {label}
        </span>
        {hint && <span style={{ fontSize: 11, color: 'var(--ink-4)' }} className="truncate">{hint}</span>}
      </div>
      {accent && <span className="chip --ok" style={{ height: 18, padding: '0 6px', fontSize: 10 }}>{accent}</span>}
      {kbd && <span className="kbd">{kbd}</span>}
    </li>
  );
}

function PaletteGroup({ label, children, action }) {
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 4px' }}>
        <span className="t-eyebrow" style={{ fontSize: 9.5 }}>{label}</span>
        {action && <span style={{ fontSize: 10.5, color: 'var(--ink-4)' }} className="t-mono">{action}</span>}
      </div>
      <ul>{children}</ul>
    </div>
  );
}

function FadedBg() {
  // Faintly visible CRM background, dim and slightly blurred — the "host" page.
  return (
    <div className="crm" style={{ position: 'absolute', inset: 0, filter: 'blur(2px)', opacity: 0.4, pointerEvents: 'none' }}>
      <div style={{ width: '100%', height: '100%', display: 'flex' }}>
        <Sidebar active="home" />
        <main className="screen" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar crumbs={[{ icon: 'home', label: 'Home' }]} />
          <div style={{ padding: 20, flex: 1 }}>
            <div className="t-display" style={{ fontSize: 24 }}>Good afternoon, Luke.</div>
          </div>
        </main>
      </div>
    </div>
  );
}

function CommandPalette() {
  return (
    <div className="crm" data-screen-label="Command Palette" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg)' }}>
      <FadedBg />
      {/* Dim overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8, 14, 26, 0.75)', backdropFilter: 'blur(4px)', zIndex: 5 }} />

      {/* Palette */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 96, zIndex: 6 }}>
        <div style={{
          width: 640,
          background: 'var(--panel)',
          border: '1px solid var(--hairline-2)',
          borderRadius: 12,
          boxShadow: '0 32px 80px -16px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px -8px oklch(0.78 0.20 145 / 0.10)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: 600,
        }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--hairline)' }}>
            <Icon name="search" size={15} color="var(--ink-3)" />
            <input
              defaultValue="acquire"
              autoFocus
              style={{ flex: 1, background: 'transparent', border: 0, outline: 0, fontSize: 15, fontFamily: 'var(--ui)', color: 'var(--ink)', letterSpacing: '-0.005em' }}
              placeholder="Type a command, search, or ask Claude…"
            />
            <span className="chip --mute" style={{ height: 20, padding: '0 6px', fontSize: 10.5 }}>esc</span>
          </div>

          {/* Scope tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', borderBottom: '1px solid var(--hairline)' }}>
            {[
              ['All', null, true],
              ['Deals', 12, false],
              ['Contacts', 5, false],
              ['Orgs', 2, false],
              ['Quotes', 1, false],
              ['Actions', 8, false],
            ].map(([label, count, active]) => (
              <button key={label} className="btn-sm btn" style={{
                height: 22, padding: '0 8px', borderRadius: 5, border: 'none',
                background: active ? 'var(--surface-4)' : 'transparent',
                color: active ? 'var(--ink)' : 'var(--ink-3)',
              }}>
                {label}{count !== null && <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginLeft: 2 }}>{count}</span>}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>Filter ⌘F</span>
          </div>

          {/* Results */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <PaletteGroup label="Deals · 3 matches">
              <PaletteRow icon="kanban" label="Acquire Foods Ltd · v2 implementation" hint="DEAL-0184 · Negotiation · £124,500 · close 14 Jun" active accent="Open" />
              <PaletteRow icon="kanban" label="Acquire Foods · pilot renewal" hint="DEAL-0089 · Won · £42,000 · closed 14 Feb" />
              <PaletteRow icon="kanban" label="Acquire Foods · data audit" hint="DEAL-0044 · Lost · £18,000 · 9 Nov 2025" />
            </PaletteGroup>

            <PaletteGroup label="Contacts · 2 matches">
              <PaletteRow icon="contacts" label="Sarah Hwang" hint="VP Operations · Acquire Foods · sarah.hwang@acquirefoods.com" />
              <PaletteRow icon="contacts" label="Priya Suresh" hint="Director, RevOps · Acquire Foods · 4 deals" />
            </PaletteGroup>

            <PaletteGroup label="Actions">
              <PaletteRow icon="plus"    label="New deal for Acquire Foods Ltd."   kbd="C D" />
              <PaletteRow icon="quote"   label="Draft quote → Acquire Foods · v2 implementation"  kbd="C Q" />
              <PaletteRow icon="mail"    label="Compose email to Sarah Hwang"      kbd="C M" />
              <PaletteRow icon="task"    label="New task on DEAL-0184"             kbd="C T" />
            </PaletteGroup>

            <PaletteGroup label="Ask Claude" action="MCP">
              <PaletteRow icon="zap"  label='"Summarise activity on Acquire Foods this week"'  mono accent="Claude" />
              <PaletteRow icon="zap"  label='"Draft a follow-up to Sarah and link it to the deal"' mono />
            </PaletteGroup>

            <PaletteGroup label="Recent">
              <PaletteRow icon="building" label="Henley Workshop"   hint="Last visited 11m ago" />
              <PaletteRow icon="kanban"   label="OakRoad Capital pilot" hint="DEAL-0151 · viewed 2h ago" />
              <PaletteRow icon="quote"    label="QTE-0061 · Acquire Foods v2.0" hint="Sent 4d ago · £124,500" mono />
            </PaletteGroup>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 14px', borderTop: '1px solid var(--hairline)', background: 'var(--surface-2)', fontSize: 10.5, color: 'var(--ink-4)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span className="kbd">↑↓</span> Navigate</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span className="kbd">↵</span> Select</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span className="kbd">⌘↵</span> In new pane</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span className="kbd">⌘.</span> Ask Claude</span>
            <div style={{ flex: 1 }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="zap" size={10} color="var(--amber)" /> mcp.zarco.uk · 1 client
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.CommandPalette = CommandPalette;
