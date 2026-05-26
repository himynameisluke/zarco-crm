// Dashboard.jsx — Home page

function KPI({ label, value, sub, trend, big = false }) {
  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 96 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-label" style={{ fontSize: 11 }}>{label}</span>
        {trend && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--code)', fontSize: 10.5, color: trend.startsWith('+') ? 'oklch(0.85 0.18 145)' : 'oklch(0.80 0.20 25)' }}>
            <Icon name={trend.startsWith('+') ? 'arrow_ul' : 'arrow_dr'} size={11} /> {trend}
          </span>
        )}
      </div>
      <div className="t-num" style={{ fontSize: big ? 32 : 26, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
      {sub && <span style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'var(--code)' }}>{sub}</span>}
    </div>
  );
}

function StageBar() {
  // Value-weighted bar across pipeline stages.
  const stages = [
    { id: 'lead',        label: 'Lead',        value: 38, count: 14, color: 'rgba(245,241,234,0.30)' },
    { id: 'qualified',   label: 'Qualified',   value: 62, count: 11, color: 'oklch(0.78 0.10 220)' },
    { id: 'proposal',    label: 'Proposal',    value: 124, count: 9, color: 'oklch(0.78 0.20 145)' },
    { id: 'negotiation', label: 'Negotiation', value: 86, count: 5, color: 'oklch(0.82 0.14 70)' },
    { id: 'won',         label: 'Won',         value: 42, count: 8, color: 'oklch(0.78 0.18 145)' },
  ];
  const total = stages.reduce((s, x) => s + x.value, 0);
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="t-label" style={{ fontSize: 12, color: 'var(--ink-2)' }}>Pipeline by stage</span>
        <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>Q2 · OPEN DEALS</span>
      </div>
      <div className="t-num" style={{ fontSize: 32, lineHeight: 1.1, marginTop: 6, color: 'var(--ink)' }}>£{total}k <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--code)', marginLeft: 6 }}>· 47 deals</span></div>

      <div style={{ display: 'flex', gap: 3, marginTop: 18, height: 8, borderRadius: 4, overflow: 'hidden' }}>
        {stages.map(s => (
          <div key={s.id} style={{ flex: s.value, background: s.color }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 14 }}>
        {stages.map(s => (
          <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--hairline)', background: 'var(--surface-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{s.label}</span>
            </div>
            <div className="t-num" style={{ fontSize: 15, color: 'var(--ink)' }}>£{s.value}k</div>
            <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{s.count} deals</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ data, color = 'oklch(0.78 0.20 145)', height = 48 }) {
  const w = 280, h = height;
  const max = Math.max(...data), min = Math.min(...data);
  const xs = (i) => (i / (data.length - 1)) * w;
  const ys = (v) => h - ((v - min) / (max - min || 1)) * (h - 8) - 4;
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`).join(' ');
  const area = path + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <defs>
        <linearGradient id="splg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#splg)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={xs(data.length - 1)} cy={ys(data[data.length - 1])} r="3" fill={color} />
    </svg>
  );
}

function ActivityRow({ type, who, what, target, when, body }) {
  const config = {
    email:   { icon: 'mail', color: 'oklch(0.78 0.10 220)' },
    call:    { icon: 'phone', color: 'oklch(0.82 0.14 70)' },
    meeting: { icon: 'calendar', color: 'oklch(0.78 0.20 145)' },
    note:    { icon: 'note', color: 'var(--ink-3)' },
    status:  { icon: 'arrow_r', color: 'oklch(0.78 0.20 145)' },
    mcp:     { icon: 'zap', color: 'var(--amber)' },
    quote:   { icon: 'quote', color: 'oklch(0.78 0.10 220)' },
  }[type] || { icon: 'circle', color: 'var(--ink-3)' };
  return (
    <li style={{ display: 'flex', gap: 12, padding: '10px 4px', borderBottom: '1px solid var(--hairline)' }}>
      <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: config.color }}>
        <Icon name={config.icon} size={12} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
          <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{who}</span> {what} <a style={{ color: 'var(--ink)', textDecoration: 'underline', textDecorationColor: 'var(--hairline-2)', textUnderlineOffset: 3 }}>{target}</a>
        </div>
        {body && <p className="truncate" style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>{body}</p>}
      </div>
      <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-4)', flexShrink: 0, marginTop: 2 }}>{when}</span>
    </li>
  );
}

function Dashboard() {
  return (
    <div className="crm" data-screen-label="Dashboard" style={{ width: '100%', height: '100%', display: 'flex' }}>
      <Sidebar active="home" />
      <main className="screen" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar crumbs={[{ icon: 'home', label: 'Home' }]} actions={
          <>
            <button className="btn"><Icon name="filter" size={13} />Filter</button>
            <button className="btn btn-primary"><Icon name="plus" size={13} />New deal</button>
          </>
        } />
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px' }}>
          {/* Greeting */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h1 className="t-display" style={{ fontSize: 26, margin: 0, color: 'var(--ink)' }}>
                Good afternoon, Luke.
              </h1>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '4px 0 0' }}>
                3 deals moved stage overnight · 1 quote was viewed · <span style={{ color: 'oklch(0.86 0.20 145)' }}>Acquire Foods opened your proposal twice.</span>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="chip"><span className="dot --amber"></span>MCP · 8 calls today</span>
              <span className="chip --mute">Tue · 26 May</span>
            </div>
          </div>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
            <KPI label="Pipeline value" value="£352k" sub="47 open deals" trend="+12.4%" big />
            <KPI label="Weighted forecast" value="£186k" sub="Q2 ends 30 Jun" trend="+4.1%" big />
            <KPI label="Win rate · 90d" value="42%" sub="14 won · 19 lost" trend="−2.8%" big />
            <KPI label="Closed this month" value="£64.2k" sub="5 deals · target £80k" trend="+18%" big />
          </div>

          {/* Main grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
            <StageBar />

            {/* Forecast trend */}
            <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span className="t-label" style={{ fontSize: 12, color: 'var(--ink-2)' }}>Weighted forecast · 12 weeks</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--ink)' }}>12w</button>
                  <button className="btn btn-ghost btn-sm">QTD</button>
                  <button className="btn btn-ghost btn-sm">YTD</button>
                </div>
              </div>
              <div className="t-num" style={{ fontSize: 32, color: 'var(--ink)', marginTop: 6 }}>£186<span style={{ color: 'var(--ink-3)' }}>k</span></div>
              <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>+£21k vs prior period</span>
              <div style={{ marginTop: 10, flex: 1, minHeight: 80 }}>
                <Sparkline data={[120, 130, 128, 138, 148, 142, 155, 160, 168, 165, 178, 186]} height={92} />
              </div>
            </div>
          </div>

          {/* Bottom row: activity, tasks, ai */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 16 }}>
            {/* Activity */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 10px' }}>
                <span className="t-label" style={{ fontSize: 12, color: 'var(--ink-2)' }}>Recent activity</span>
                <a style={{ fontSize: 11.5, color: 'var(--ink-3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>All <Icon name="chev_r" size={11} /></a>
              </header>
              <ul style={{ padding: '0 18px 8px', flex: 1 }}>
                <ActivityRow type="email" who="Sarah Hwang" what="opened your proposal" target="Acquire Foods · v2.0" when="11m" body="Opened twice — 4m on pricing page, 2m on terms." />
                <ActivityRow type="status" who="You" what="moved" target="Henley Workshop → Negotiation" when="1h" />
                <ActivityRow type="mcp" who="Claude (MCP)" what="logged 3 emails to" target="Northgate Realty" when="2h" body="3 messages from inbox. Linked to deal DEAL-0142." />
                <ActivityRow type="meeting" who="Granola" what="captured a call with" target="Marek Vincenti" when="3h" body="Discussed scoping, next call Mon — wants pilot pricing." />
                <ActivityRow type="quote" who="Tom Akinyele" what="accepted quote" target="QTE-0034 · £18,400" when="Yesterday" />
                <ActivityRow type="note" who="You" what="added a note to" target="OakRoad Capital" when="Yesterday" body="They're waiting on board approval — re-engage Tue 2 Jun." />
              </ul>
            </div>

            {/* Tasks */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 10px' }}>
                <span className="t-label" style={{ fontSize: 12, color: 'var(--ink-2)' }}>Today <span style={{ color: 'var(--ink-4)', marginLeft: 4 }}>· 4</span></span>
                <button className="btn-ghost btn btn-sm"><Icon name="plus" size={12} />Add</button>
              </header>
              <ul style={{ padding: '0 14px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { t: 'Follow up Acquire Foods on procurement Q', d: 'DEAL-0184', due: 'today · 4pm', flag: 'amber' },
                  { t: 'Send revised SOW to Henley Workshop', d: 'DEAL-0177', due: 'today', flag: 'amber' },
                  { t: 'Draft week 1 progress note · Northgate', d: 'PROJ-0021', due: 'today', flag: null },
                  { t: 'Reply to MaryAnn re: pilot timing', d: 'CON-0421', due: 'today', flag: null },
                ].map((x, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 4px', borderRadius: 5 }}>
                    <span className="cb" style={{ marginTop: 2 }}></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>{x.t}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{x.d}</span>
                        <span className="t-mono" style={{ fontSize: 10, color: x.flag === 'amber' ? 'oklch(0.86 0.14 70)' : 'var(--ink-4)' }}>· {x.due}</span>
                      </div>
                    </div>
                  </li>
                ))}
                <li style={{ marginTop: 8, padding: '0 4px' }}>
                  <span className="t-eyebrow" style={{ fontSize: 9.5 }}>Overdue · 2</span>
                </li>
                {[
                  { t: 'Chase OakRoad on board approval', d: 'DEAL-0151', due: '2d', flag: 'danger' },
                  { t: 'Send Acme renewal terms', d: 'DEAL-0089', due: '5d', flag: 'danger' },
                ].map((x, i) => (
                  <li key={'o' + i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 4px' }}>
                    <span className="cb" style={{ marginTop: 2, borderColor: 'oklch(0.70 0.20 25 / 0.5)' }}></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{x.t}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{x.d}</span>
                        <span className="t-mono" style={{ fontSize: 10, color: 'oklch(0.80 0.20 25)' }}>· overdue {x.due}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Claude / MCP card */}
            <div className="card" style={{ background: 'linear-gradient(180deg, oklch(0.78 0.20 145 / 0.05), transparent)', borderColor: 'oklch(0.78 0.20 145 / 0.20)' }}>
              <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="zap" size={13} color="var(--amber)" />
                  <span className="t-label" style={{ fontSize: 12, color: 'var(--ink)' }}>From Claude</span>
                </div>
                <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>VIA MCP</span>
              </header>
              <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
                  <span style={{ color: 'var(--ink)' }}>3 deals haven't moved in 11+ days.</span> Want me to draft re-engagement emails for OakRoad, Acme, and Bridgepoint? I'll match their last conversation tone.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm">Draft them</button>
                  <button className="btn btn-sm">Show deals</button>
                  <button className="btn btn-ghost btn-sm">Dismiss</button>
                </div>
                <hr style={{ margin: '4px 0', borderColor: 'var(--hairline)' }} />
                <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5, margin: 0 }}>
                  <Icon name="sparkle" size={11} color="var(--amber)" style={{ display: 'inline-block', verticalAlign: -1, marginRight: 4 }} />
                  Acquire Foods has opened your proposal 4 times in 6 days but hasn't replied. Likely waiting on internal sign-off.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                  <Icon name="command_line" size={12} color="var(--ink-4)" />
                  <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>claude.ai · cursor · 1 more</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

window.Dashboard = Dashboard;
