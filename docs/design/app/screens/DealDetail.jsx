// DealDetail.jsx — deal detail page (Acquire Foods Ltd · v2 implementation)

function StageStepper({ current = 'negotiation' }) {
  const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won'];
  const labels = { lead: 'Lead', qualified: 'Qualified', proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won' };
  const idx = stages.indexOf(current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 30, padding: 2, background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 7 }}>
      {stages.map((s, i) => {
        const past = i < idx, here = i === idx;
        const bg = here ? 'oklch(0.78 0.20 145 / 0.15)' : past ? 'transparent' : 'transparent';
        const fg = here ? 'oklch(0.88 0.20 145)' : past ? 'var(--ink-2)' : 'var(--ink-4)';
        return (
          <React.Fragment key={s}>
            <button style={{
              height: 24, padding: '0 12px', borderRadius: 5, fontSize: 12, fontWeight: 500,
              background: bg, color: fg, display: 'inline-flex', alignItems: 'center', gap: 5,
              border: here ? '1px solid oklch(0.78 0.20 145 / 0.30)' : '1px solid transparent',
            }}>
              {past && <Icon name="check" size={10} />}
              {labels[s]}
            </button>
            {i < stages.length - 1 && <span style={{ width: 6, height: 1, background: past ? 'oklch(0.78 0.20 145 / 0.5)' : 'var(--hairline)' }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Composer() {
  return (
    <div className="card" style={{ padding: 0 }}>
      {/* Type switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px', borderBottom: '1px solid var(--hairline)' }}>
        {[
          ['note', 'Note', 'note', true],
          ['call', 'Call', 'phone', false],
          ['meeting', 'Meeting', 'calendar', false],
          ['email', 'Email logged', 'mail', false],
        ].map(([id, label, icon, active]) => (
          <button key={id} className="btn btn-sm" style={{
            background: active ? 'var(--surface-4)' : 'transparent',
            color: active ? 'var(--ink)' : 'var(--ink-3)',
            border: 'none', fontWeight: active ? 500 : 400,
          }}>
            <Icon name={icon} size={12} />{label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>⌘ENTER</span>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <textarea
          placeholder="Add a note for Acquire Foods Ltd. Mention @MaryAnn or link #DEAL-0184…"
          style={{ width: '100%', minHeight: 56, background: 'transparent', border: 0, outline: 0, resize: 'none', color: 'var(--ink-2)', fontSize: 13, fontFamily: 'var(--ui)', lineHeight: 1.5 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <button className="btn btn-ghost btn-icon btn-sm"><Icon name="user" size={13} /></button>
          <button className="btn btn-ghost btn-icon btn-sm"><Icon name="link" size={13} /></button>
          <button className="btn btn-ghost btn-icon btn-sm"><Icon name="upload" size={13} /></button>
          <button className="btn btn-ghost btn-icon btn-sm"><Icon name="sparkle" size={13} color="var(--amber)" /></button>
          <div style={{ flex: 1 }} />
          <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>Markdown ⌘ supports</span>
          <button className="btn btn-primary btn-sm">Log note</button>
        </div>
      </div>
    </div>
  );
}

function TimelineEvent({ date, items }) {
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span className="t-eyebrow" style={{ fontSize: 9.5 }}>{date}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
      </div>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map((it, i) => <TimelineItem key={i} {...it} />)}
      </ul>
    </section>
  );
}

function TimelineItem({ type, who, what, body, when, meta, source }) {
  const cfg = {
    email:   { icon: 'mail',     color: 'oklch(0.78 0.10 220)' },
    call:    { icon: 'phone',    color: 'oklch(0.82 0.14 70)' },
    meeting: { icon: 'calendar', color: 'oklch(0.78 0.20 145)' },
    note:    { icon: 'note',     color: 'var(--ink-3)' },
    status:  { icon: 'arrow_r',  color: 'oklch(0.78 0.20 145)' },
    quote:   { icon: 'quote',    color: 'oklch(0.78 0.10 220)' },
    mcp:     { icon: 'zap',      color: 'var(--amber)' },
    task:    { icon: 'check',    color: 'oklch(0.85 0.18 145)' },
  }[type] || { icon: 'circle', color: 'var(--ink-3)' };

  return (
    <li style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 22, flexShrink: 0 }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--surface-3)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, flexShrink: 0, zIndex: 2 }}>
          <Icon name={cfg.icon} size={11} />
        </span>
        <div style={{ flex: 1, width: 1, background: 'var(--hairline)', marginTop: 4, marginBottom: -10 }} />
      </div>
      <div style={{ flex: 1, paddingBottom: 4, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>
            <b style={{ fontWeight: 550 }}>{who}</b> <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>{what}</span>
          </span>
          <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', marginLeft: 'auto', flexShrink: 0 }}>{when}</span>
        </div>
        {body && (
          <div style={{
            marginTop: 8, padding: '10px 12px', background: 'var(--surface-2)',
            border: '1px solid var(--hairline)', borderRadius: 7,
            fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55,
          }}>
            {body}
          </div>
        )}
        {meta && <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>{meta}</div>}
        {source && <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 4, display: 'inline-block' }}>via {source}</span>}
      </div>
    </li>
  );
}

function DealDetail() {
  return (
    <div className="crm" data-screen-label="Deal Detail" style={{ width: '100%', height: '100%', display: 'flex' }}>
      <Sidebar active="deals" />
      <main className="screen" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar
          crumbs={[
            { icon: 'kanban', label: 'Deals' },
            { label: 'Acquire Foods Ltd · v2 implementation' },
          ]}
          actions={
            <>
              <button className="btn"><Icon name="quote" size={13} />New quote</button>
              <button className="btn"><Icon name="more" size={13} /></button>
            </>
          }
        />

        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          {/* Main column */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 32px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <span style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(14, 165, 233, 0.12)', border: '1px solid rgba(14, 165, 233, 0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0EA5E9', fontWeight: 600, fontSize: 15, fontFamily: 'var(--display)' }}>AF</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 12 }}>
                    <span>Acquire Foods Ltd.</span>
                    <Icon name="chev_r" size={11} color="var(--ink-4)" />
                    <span className="t-mono" style={{ fontSize: 11 }}>DEAL-0184</span>
                  </div>
                  <h1 className="t-display" style={{ fontSize: 24, margin: '4px 0 0', lineHeight: 1.15, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                    v2 implementation · pilot to production
                  </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="chip"><span className="dot --amber"></span>Engagement</span>
                  <span className="chip">P1 · High intent</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <StageStepper current="negotiation" />
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                  <span className="t-mono" style={{ color: 'oklch(0.86 0.14 70)' }}>9 days</span> in negotiation
                </span>
              </div>
            </div>

            {/* Composer */}
            <Composer />

            {/* Timeline */}
            <div style={{ marginTop: 6 }}>
              <TimelineEvent date="TODAY · 26 MAY 2026" items={[
                { type: 'email', who: 'Sarah Hwang', what: 'opened your proposal v2.0', when: '11m',
                  body: <><span style={{ color: 'var(--ink-3)' }}>Tracking pixel · 2nd open · 4m on pricing tab, 2m on terms tab.</span></>,
                  meta: <span className="chip --info"><Icon name="external" size={10} />Proposal v2.0.pdf</span>, source: 'Postmark' },
                { type: 'mcp', who: 'Claude', what: 'drafted a follow-up email', when: '14m',
                  body: <span><span style={{ color: 'var(--ink-3)' }}>Draft saved to outbox · subject:</span> "Quick thought on procurement timing — Acquire Foods × Zarco"</span>,
                  meta: <><span className="chip --solid">Awaiting review</span><span className="chip" style={{ fontFamily: 'var(--code)' }}>via mcp.zarco.uk</span></>, source: 'claude.ai' },
                { type: 'status', who: 'You', what: 'moved deal Proposal → Negotiation', when: '1h' },
              ]} />

              <TimelineEvent date="YESTERDAY · 25 MAY" items={[
                { type: 'meeting', who: 'Granola', what: 'captured a 42-minute call', when: '14:30',
                  body: <span><span style={{ color: 'var(--ink-3)' }}>Summary:</span> Sarah confirmed procurement is the only blocker. Asked for line-item breakdown by phase and a 2026-Q3 start option. Mentioned Priya is the budget owner — loop her in.</span>,
                  meta: <><span className="chip">Sarah Hwang</span><span className="chip">Priya Suresh</span><span className="chip --mute"><Icon name="task" size={10} />2 follow-ups</span></>, source: 'Granola' },
                { type: 'note', who: 'You', what: 'added a private note', when: '15:10',
                  body: 'Worth flagging: Sarah hinted internally they\'re comparing us against one other vendor (likely Mintwave). Lean into "working systems, not slide decks" in the next touch.' },
              ]} />

              <TimelineEvent date="22 MAY" items={[
                { type: 'quote', who: 'You', what: 'sent quote QTE-0061 for £124,500.00', when: '11:42',
                  meta: <><span className="chip --info">Quote sent</span><span className="chip --mute">Valid until 21 Jun</span><span className="chip --mute" style={{ fontFamily: 'var(--code)' }}>QTE-0061</span></> },
                { type: 'email', who: 'Sarah Hwang', what: 'replied to "Implementation plan v2"', when: '09:28',
                  body: <><span style={{ color: 'var(--ink-3)' }}>"Looks great. Send us the formal proposal and I'll route it through procurement this week."</span></>, source: 'Outlook' },
              ]} />
            </div>
          </div>

          {/* Right sidebar */}
          <aside style={{ width: 320, flexShrink: 0, borderLeft: '1px solid var(--hairline)', background: 'var(--panel)', overflowY: 'auto' }}>
            {/* Value block */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--hairline)' }}>
              <span className="t-label">Deal value</span>
              <div className="t-num" style={{ fontSize: 28, color: 'var(--ink)', marginTop: 4, lineHeight: 1.1 }}>£124,500<span style={{ color: 'var(--ink-3)' }}>.00</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11.5, color: 'var(--ink-3)' }}>
                <Icon name="trending_up" size={11} color="oklch(0.85 0.18 145)" />
                <span>Weighted £74.7k · 60% probability</span>
              </div>

              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span className="t-label">Close date</span>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>14 Jun 2026 <span style={{ color: 'var(--ink-4)' }}>· 19d</span></div>
                </div>
                <div>
                  <span className="t-label">Owner</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span className="avatar" style={{ width: 16, height: 16, fontSize: 9, background: 'oklch(0.78 0.20 145 / 0.20)', borderColor: 'oklch(0.78 0.20 145 / 0.35)', color: 'oklch(0.86 0.20 145)' }}>LZ</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Luke Zarco</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Org */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)' }}>
              <span className="t-label">Organization</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <span style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(14, 165, 233, 0.12)', border: '1px solid rgba(14, 165, 233, 0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0EA5E9', fontWeight: 600, fontSize: 12, fontFamily: 'var(--display)' }}>AF</span>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>Acquire Foods Ltd.</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="globe" size={10} /> acquirefoods.com · 280 ppl
                  </div>
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="t-label">Contacts <span style={{ color: 'var(--ink-4)' }}>· 3</span></span>
                <button className="btn btn-ghost btn-sm btn-icon"><Icon name="plus" size={12} /></button>
              </div>
              {[
                ['Sarah Hwang', 'VP Operations · Primary', 'SH', 'oklch(0.78 0.20 145)', true],
                ['Priya Suresh', 'Director, RevOps', 'PS', '#F472B6', false],
                ['Anand Mehta', 'Procurement', 'AM', '#FBBF24', false],
              ].map(([n, role, init, c, primary], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--hairline)' : 'none' }}>
                  <span className="avatar" style={{ background: c + '22', borderColor: c + '55', color: c }}>{init}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }} className="truncate">{n}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)' }} className="truncate">{role}</div>
                  </div>
                  {primary && <span className="chip --mute" style={{ height: 18, padding: '0 5px', fontSize: 10 }}>★</span>}
                </div>
              ))}
            </div>

            {/* Quotes */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="t-label">Quotes <span style={{ color: 'var(--ink-4)' }}>· 2</span></span>
                <button className="btn btn-ghost btn-sm btn-icon"><Icon name="plus" size={12} /></button>
              </div>
              {[
                ['QTE-0061', 'v2 · 22 May', '£124,500.00', 'sent'],
                ['QTE-0048', 'v1 · 04 May', '£98,000.00', 'declined'],
              ].map(([id, when, value, st], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < 1 ? '1px solid var(--hairline)' : 'none' }}>
                  <Icon name="quote" size={13} color="var(--ink-4)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--code)' }}>{id}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{when}</div>
                  </div>
                  <span className="t-mono" style={{ fontSize: 12, color: 'var(--ink)' }}>{value}</span>
                  <span className={`chip ${st === 'sent' ? '--info' : '--danger'}`} style={{ height: 18, fontSize: 10, padding: '0 5px' }}>{st}</span>
                </div>
              ))}
            </div>

            {/* Projects */}
            <div style={{ padding: '16px 20px' }}>
              <span className="t-label">Projects <span style={{ color: 'var(--ink-4)' }}>· 0</span></span>
              <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>No project yet — created automatically when this deal closes Won.</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

window.DealDetail = DealDetail;
