// Kanban.jsx — Deals pipeline view

const DEALS = {
  lead: [
    { id: 'D0203', name: 'Cobble Workshop', org: 'Cobble Workshop', value: 28, close: '12 Jul', days: 2, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['NB', '#7FCFE5'], hot: false },
    { id: 'D0201', name: 'Quartz brand refresh', org: 'Quartz Brands', value: 14, close: '01 Aug', days: 5, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['JW', '#FBBF24'], hot: false },
    { id: 'D0199', name: 'Hadley & Sons audit', org: 'Hadley & Sons', value: 8, close: '14 Aug', days: 3, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['RI', '#5EE07B'], hot: false },
    { id: 'D0197', name: 'Stillwater ops dash', org: 'Stillwater Mfg', value: 18, close: '21 Aug', days: 1, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['YE', '#0EA5E9'], hot: false },
  ],
  qualified: [
    { id: 'D0192', name: 'Bridgepoint studio CRM', org: 'Bridgepoint Studios', value: 36, close: '28 Jun', days: 8, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['EV', '#F97316'], hot: false },
    { id: 'D0189', name: 'Aurora discovery', org: 'Aurora Labs', value: 22, close: '05 Jul', days: 14, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['AR', '#F472B6'], hot: false, stalled: true },
    { id: 'D0186', name: 'Park Robotics intake', org: 'Park Robotics', value: 32, close: '09 Jul', days: 9, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['LP', '#A78BFA'], hot: false },
  ],
  proposal: [
    { id: 'D0177', name: 'Henley Workshop pilot', org: 'Henley Workshop', value: 62, close: '20 Jun', days: 6, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['MV', '#7FCFE5'], hot: true },
    { id: 'D0182', name: 'Mileway data ingest', org: 'Mileway Logistics', value: 41, close: '24 Jun', days: 11, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['TA', '#5EE07B'], hot: false },
    { id: 'D0175', name: 'Lovell Studio retainer', org: 'Lovell Studio', value: 21, close: '30 Jun', days: 4, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['BL', '#F472B6'], hot: false },
  ],
  negotiation: [
    { id: 'D0184', name: 'Acquire Foods v2', org: 'Acquire Foods Ltd.', value: 124, close: '14 Jun', days: 9, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['SH', '#0EA5E9'], hot: true },
    { id: 'D0151', name: 'OakRoad Capital pilot', org: 'OakRoad Capital', value: 48, close: '07 Jun', days: 21, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['MA', '#A78BFA'], hot: false, stalled: true },
  ],
  won: [
    { id: 'D0162', name: 'Northgate CRM build', org: 'Northgate Realty', value: 92, close: 'Won · 20 May', days: 0, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['TA', '#5EE07B'], hot: false, won: true },
    { id: 'D0034', name: 'Wellingford intake', org: 'Wellingford Group', value: 18, close: 'Won · 18 May', days: 0, owner: ['LZ', 'oklch(0.78 0.20 145)'], contact: ['DO', '#7FCFE5'], hot: false, won: true },
  ],
};

const COLS = [
  { id: 'lead',        label: 'Lead',        accent: 'rgba(245,241,234,0.40)' },
  { id: 'qualified',   label: 'Qualified',   accent: 'oklch(0.78 0.10 220)' },
  { id: 'proposal',    label: 'Proposal',    accent: 'oklch(0.78 0.20 145)' },
  { id: 'negotiation', label: 'Negotiation', accent: 'oklch(0.82 0.14 70)' },
  { id: 'won',         label: 'Won',         accent: 'oklch(0.78 0.18 145)' },
];

function daysChip(days) {
  if (days >= 14) return { color: 'oklch(0.78 0.20 25)', bg: 'oklch(0.70 0.20 25 / 0.10)', border: 'oklch(0.70 0.20 25 / 0.25)' };
  if (days >= 7)  return { color: 'oklch(0.86 0.14 70)', bg: 'oklch(0.82 0.14 70 / 0.10)', border: 'oklch(0.82 0.14 70 / 0.25)' };
  return { color: 'var(--ink-3)', bg: 'rgba(255,255,255,0.04)', border: 'var(--hairline)' };
}

function DealCard({ d, dragging = false, highlight = false }) {
  const chip = daysChip(d.days);
  return (
    <div style={{
      background: highlight ? 'oklch(0.78 0.20 145 / 0.06)' : 'var(--panel)',
      border: `1px solid ${highlight ? 'oklch(0.78 0.20 145 / 0.30)' : 'var(--hairline)'}`,
      borderRadius: 8,
      padding: '11px 12px',
      display: 'flex', flexDirection: 'column', gap: 8,
      cursor: 'grab',
      boxShadow: dragging ? '0 12px 32px -8px rgba(0,0,0,0.6), 0 0 0 1px oklch(0.78 0.20 145 / 0.40)' : 'none',
      transform: dragging ? 'rotate(-1deg)' : 'none',
      position: 'relative',
    }}>
      {/* row 1: id + flags */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="t-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{d.id}</span>
        {d.hot && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'oklch(0.86 0.14 70)' }}><Icon name="flame" size={11} />hot</span>}
        {d.stalled && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'oklch(0.80 0.20 25)' }}>stalled</span>}
        {d.won && <span className="chip --ok" style={{ height: 16, fontSize: 9.5, padding: '0 5px' }}><Icon name="check" size={9} /></span>}
        <div style={{ flex: 1 }} />
        <Icon name="more" size={12} color="var(--ink-4)" />
      </div>

      {/* title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }}>{d.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }} className="truncate">{d.org}</div>
      </div>

      {/* value */}
      <div className="t-num" style={{ fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.02em' }}>£{d.value}k</div>

      {/* footer: contact + close + days */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6, borderTop: '1px solid var(--hairline)' }}>
        <span className="avatar" style={{ width: 18, height: 18, fontSize: 9, background: d.contact[1] + '22', borderColor: d.contact[1] + '55', color: d.contact[1] }}>{d.contact[0]}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="calendar" size={10} color="var(--ink-4)" /> {d.close}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{
          fontFamily: 'var(--code)', fontSize: 10,
          padding: '2px 6px', borderRadius: 3,
          background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`,
        }} title={`${d.days} days in stage`}>{d.days}d</span>
      </div>
    </div>
  );
}

function Column({ col, deals, ghost = false }) {
  const total = deals.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ width: 268, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 8px', borderBottom: '1px solid var(--hairline)' }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: col.accent }} />
        <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>{col.label}</span>
        <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{deals.length}</span>
        <div style={{ flex: 1 }} />
        <span className="t-num" style={{ fontSize: 13, color: 'var(--ink-2)' }}>£{total}k</span>
        <button className="btn btn-ghost btn-icon btn-sm"><Icon name="plus" size={12} /></button>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', paddingRight: 2 }}>
        {deals.map((d, i) => (
          <DealCard key={d.id} d={d} highlight={col.id === 'negotiation' && d.id === 'D0184'} />
        ))}
        {ghost && (
          <div style={{ height: 92, borderRadius: 8, border: '1.5px dashed oklch(0.78 0.20 145 / 0.4)', background: 'oklch(0.78 0.20 145 / 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'oklch(0.86 0.20 145)', fontSize: 12 }}>
            Drop here
          </div>
        )}
        <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', color: 'var(--ink-4)', padding: '6px 8px' }}>
          <Icon name="plus" size={11} /> Add deal
        </button>
      </div>
    </div>
  );
}

function Kanban() {
  return (
    <div className="crm" data-screen-label="Kanban" style={{ width: '100%', height: '100%', display: 'flex' }}>
      <Sidebar active="deals" />
      <main className="screen" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar
          crumbs={[{ icon: 'kanban', label: 'Deals' }]}
          tabs={[
            { id: 'k', label: 'Pipeline', icon: 'kanban', active: true },
            { id: 'l', label: 'List', icon: 'deals' },
            { id: 'f', label: 'Forecast', icon: 'graph' },
          ]}
          actions={
            <>
              <button className="btn"><Icon name="filter" size={13} />Filter</button>
              <button className="btn btn-primary"><Icon name="plus" size={13} />New deal</button>
            </>
          }
        />

        {/* Sub-toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--hairline)' }}>
          <span className="chip">Owner: <b style={{ color: 'var(--ink)', fontWeight: 500, marginLeft: 4 }}>Me</b><Icon name="x" size={11} color="var(--ink-4)" style={{ marginLeft: 2 }} /></span>
          <span className="chip">Close: <b style={{ color: 'var(--ink)', fontWeight: 500, marginLeft: 4 }}>This quarter</b><Icon name="x" size={11} color="var(--ink-4)" style={{ marginLeft: 2 }} /></span>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--ink-4)' }}><Icon name="plus" size={11} />Add filter</button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
            <span className="t-mono" style={{ color: 'var(--ink-2)' }}>47</span> deals · <span className="t-num" style={{ color: 'var(--ink)' }}>£352k</span> pipeline · <span className="t-num" style={{ color: 'oklch(0.86 0.18 145)' }}>£186k</span> weighted
          </span>
          <span style={{ width: 1, height: 16, background: 'var(--hairline)' }} />
          <button className="btn btn-ghost btn-sm"><Icon name="sort" size={12} />Value</button>
          <button className="btn btn-ghost btn-sm"><Icon name="layers" size={12} />Group</button>
        </div>

        {/* Board */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 16px 24px' }}>
          <div style={{ display: 'flex', gap: 14, height: '100%' }}>
            {COLS.map(c => (
              <Column key={c.id} col={c} deals={DEALS[c.id]} ghost={c.id === 'won'} />
            ))}
          </div>
        </div>

        {/* Footer key */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px', borderTop: '1px solid var(--hairline)', fontSize: 11, color: 'var(--ink-4)' }}>
          <span className="t-eyebrow" style={{ fontSize: 9.5 }}>Days-in-stage</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontFamily: 'var(--code)', fontSize: 9.5, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'var(--ink-3)', border: '1px solid var(--hairline)' }}>0–6d</span>
            <span style={{ fontFamily: 'var(--code)', fontSize: 9.5, padding: '1px 5px', borderRadius: 3, background: 'oklch(0.82 0.14 70 / 0.10)', color: 'oklch(0.86 0.14 70)', border: '1px solid oklch(0.82 0.14 70 / 0.25)' }}>7–13d</span>
            <span style={{ fontFamily: 'var(--code)', fontSize: 9.5, padding: '1px 5px', borderRadius: 3, background: 'oklch(0.70 0.20 25 / 0.10)', color: 'oklch(0.80 0.20 25)', border: '1px solid oklch(0.70 0.20 25 / 0.25)' }}>14d+</span>
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="flame" size={11} color="oklch(0.86 0.14 70)" /> Hot — opened proposal twice in 7d</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 14 }}><Icon name="zap" size={11} color="var(--amber)" /> Claude is watching this board</span>
        </div>
      </main>
    </div>
  );
}

window.Kanban = Kanban;
