// Shell.jsx — Sidebar + Top Bar shared across all in-app screens

function ZarcoMark({ size = 18 }) {
  // Inline SVG ring — green→teal gradient stroke (matches favicon).
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="zmg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5EE07B" />
          <stop offset="1" stopColor="#7FCFE5" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12" fill="none" stroke="url(#zmg)" strokeWidth="3" />
    </svg>
  );
}

function Sidebar({ active = 'home', counts = {} }) {
  const NAV = [
    { id: 'home', label: 'Home', icon: 'home', kbd: 'G H' },
    { id: 'inbox', label: 'Inbox', icon: 'inbox', count: counts.inbox },
  ];
  const WORK = [
    { id: 'contacts', label: 'Contacts', icon: 'contacts', count: counts.contacts ?? '1.2k' },
    { id: 'orgs', label: 'Organizations', icon: 'building', count: counts.orgs ?? 184 },
    { id: 'deals', label: 'Deals', icon: 'kanban', count: counts.deals ?? 47 },
    { id: 'projects', label: 'Projects', icon: 'layers', count: counts.projects ?? 12 },
    { id: 'activity', label: 'Activity', icon: 'activity' },
    { id: 'tasks', label: 'Tasks', icon: 'task', count: counts.tasks ?? 8 },
    { id: 'quotes', label: 'Quotes', icon: 'quote', count: counts.quotes ?? 6 },
    { id: 'campaigns', label: 'Campaigns', icon: 'campaign' },
  ];
  const SETTINGS = [
    { id: 'mcp', label: 'API & MCP', icon: 'plug' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const Item = ({ it }) => (
    <li className={`nav-item ${active === it.id ? '--active' : ''}`}>
      <Icon name={it.icon} size={15} className="ni-ico" />
      <span className="grow truncate">{it.label}</span>
      {it.count !== undefined && <span className="ni-count">{it.count}</span>}
    </li>
  );

  return (
    <aside style={{
      width: 232, flexShrink: 0, height: '100%',
      background: 'var(--panel-2)',
      borderRight: '1px solid var(--hairline)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Brand + workspace switcher */}
      <div style={{ padding: '14px 14px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <ZarcoMark size={20} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 14.5, fontWeight: 500, letterSpacing: '-0.02em' }}>zarco</span>
          <span style={{ fontFamily: 'var(--code)', fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--ink-4)' }}>ZRC · UK</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Icon name="chevs_lr" size={13} color="var(--ink-4)" />
        </div>
      </div>

      {/* Search / cmd-k trigger */}
      <div style={{ padding: '0 12px 10px' }}>
        <button className="input" style={{ justifyContent: 'flex-start', height: 28, padding: '0 8px', cursor: 'pointer' }}>
          <Icon name="search" size={13} color="var(--ink-4)" />
          <span style={{ color: 'var(--ink-4)', fontSize: 12.5, flex: 1, textAlign: 'left' }}>Jump to…</span>
          <span className="kbd">⌘K</span>
        </button>
      </div>

      {/* Nav groups */}
      <nav style={{ padding: '4px 8px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {NAV.map(it => <Item key={it.id} it={it} />)}
        </ul>

        <div>
          <div style={{ padding: '6px 12px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="t-eyebrow" style={{ fontSize: 9.5 }}>Workspace</span>
            <Icon name="plus" size={12} color="var(--ink-4)" />
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {WORK.map(it => <Item key={it.id} it={it} />)}
          </ul>
        </div>

        <div>
          <div style={{ padding: '6px 12px 4px' }}>
            <span className="t-eyebrow" style={{ fontSize: 9.5 }}>Pinned views</span>
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <li className="nav-item"><span className="dot" style={{ background: 'oklch(0.78 0.20 145)' }}></span><span className="grow truncate">In negotiation</span><span className="ni-count">5</span></li>
            <li className="nav-item"><span className="dot" style={{ background: 'oklch(0.82 0.14 70)' }}></span><span className="grow truncate">No activity 14d</span><span className="ni-count">11</span></li>
            <li className="nav-item"><span className="dot" style={{ background: 'oklch(0.78 0.10 220)' }}></span><span className="grow truncate">UK SMEs</span><span className="ni-count">38</span></li>
          </ul>
        </div>
      </nav>

      {/* Bottom: settings + user */}
      <div style={{ borderTop: '1px solid var(--hairline)', padding: '8px' }}>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {SETTINGS.map(it => <Item key={it.id} it={it} />)}
        </ul>
        <div style={{ marginTop: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 9, borderRadius: 6, background: 'var(--hover)' }}>
          <span className="avatar" style={{ background: 'oklch(0.78 0.20 145 / 0.20)', borderColor: 'oklch(0.78 0.20 145 / 0.35)', color: 'oklch(0.86 0.20 145)' }}>LZ</span>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }} className="truncate">Luke Zarco</span>
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }} className="truncate">luke@zarco.uk</span>
          </div>
          <Icon name="more_v" size={13} color="var(--ink-4)" />
        </div>
      </div>
    </aside>
  );
}

function TopBar({ crumbs = [], actions = null, tabs = null }) {
  return (
    <header style={{
      height: 48, flexShrink: 0,
      borderBottom: '1px solid var(--hairline)',
      background: 'rgba(14,26,46,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 14,
    }}>
      {/* Crumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chev_r" size={12} color="var(--ink-4)" />}
            <span style={{ color: i === crumbs.length - 1 ? 'var(--ink)' : 'var(--ink-3)', fontWeight: i === crumbs.length - 1 ? 500 : 400, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {c.icon && <Icon name={c.icon} size={13} color="var(--ink-3)" />}
              {c.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Tabs (optional, for list/board toggles etc.) */}
      {tabs && (
        <div style={{ marginLeft: 14, display: 'flex', alignItems: 'center', gap: 2, background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 7, padding: 2, height: 28 }}>
          {tabs.map(t => (
            <button key={t.id} className="btn-sm" style={{
              height: 22, padding: '0 10px', borderRadius: 5,
              background: t.active ? 'var(--surface-4)' : 'transparent',
              color: t.active ? 'var(--ink)' : 'var(--ink-3)',
              border: 'none',
              fontWeight: t.active ? 500 : 400,
            }}>
              {t.icon && <Icon name={t.icon} size={12} />}
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Right cluster */}
      {actions}
      <button className="btn btn-ghost btn-icon" title="Notifications"><Icon name="bell" size={15} /></button>
      <button className="btn btn-ghost btn-icon" title="Updates">
        <span style={{ position: 'relative' }}>
          <Icon name="sparkle" size={15} color="var(--amber)" />
        </span>
      </button>
    </header>
  );
}

Object.assign(window, { Sidebar, TopBar, ZarcoMark });
