// ContactsList.jsx — dense table view

const CONTACT_ROWS = [
  ['Sarah Hwang', 'VP Operations', 'Acquire Foods', '#0EA5', 'sarah.hwang@acquirefoods.com', '+44 20 7946', '3', '11m', true,  ['DEAL-0184']],
  ['Marek Vincenti', 'CTO', 'Henley Workshop', '#7FCFE5', 'marek@henleyworkshop.uk', '+44 1865', '5', '3h', true, ['DEAL-0177', 'DEAL-0162']],
  ['Tom Akinyele', 'CFO', 'Northgate Realty', '#5EE07B', 'tom@northgate.uk', '+44 113', '8', 'Yesterday', false, ['DEAL-0142']],
  ['MaryAnn Begum', 'Head of Sales', 'OakRoad Capital', '#A78BFA', 'maryann@oakroad.capital', '—', '2', '2d', true, ['DEAL-0151']],
  ['Erin Velasquez',  'Founder', 'Bridgepoint Studios', '#F97316', 'erin@bridgept.co', '+44 7700', '6', '4d', false, ['DEAL-0089']],
  ['Daniel O\'Connor', 'COO', 'Wellingford Group', '#7FCFE5', 'daniel@wellingford.co.uk', '+44 1223', '1', '4d', true, []],
  ['Priya Suresh', 'Director, RevOps', 'Acquire Foods', '#0EA5', 'priya.suresh@acquirefoods.com', '+44 20 7946', '4', '6d', false, ['DEAL-0184']],
  ['Will Hartley', 'Procurement', 'Henley Workshop', '#7FCFE5', 'will@henleyworkshop.uk', '+44 1865', '2', '6d', true, []],
  ['Anika Reddy', 'Head of Engineering', 'Aurora Labs', '#F472B6', 'anika@aurora.dev', '—', '0', '1w', false, []],
  ['Hugo Salvatore', 'Partner', 'Salvatore & Hughes', '#FBBF24', 'hugo@salvhughes.co.uk', '+44 20 3829', '11', '1w', true, ['DEAL-0067', 'DEAL-0044']],
  ['Lena Park',  'CEO', 'Park Robotics', '#A78BFA', 'lena@parkrobotics.io', '—', '3', '2w', true, ['DEAL-0099']],
  ['Tariq Aslan', 'Head of Data', 'Mileway Logistics', '#5EE07B', 'tariq@mileway.co.uk', '+44 1604', '5', '2w', false, ['DEAL-0078']],
  ['Sophie Bellamy', 'Founder', 'Bellamy & Co', '#F97316', 'sophie@bellamy.co', '+44 7700', '1', '2w', false, []],
  ['Jamal Whittle', 'CMO', 'Quartz Brands', '#FBBF24', 'jamal@quartzbrands.uk', '—', '2', '3w', false, ['DEAL-0058']],
  ['Beatrix Lovell', 'Co-founder', 'Lovell Studio', '#F472B6', 'bea@lovellstudio.uk', '+44 7700', '7', '3w', true, ['DEAL-0103']],
  ['Rohan Iyer', 'CTO', 'Hadley & Sons', '#5EE07B', 'rohan@hadleysons.co.uk', '—', '0', '4w', false, []],
  ['Cara Donegan', 'VP Marketing', 'Northgate Realty', '#5EE07B', 'cara@northgate.uk', '+44 113', '3', '6w', false, []],
  ['Yusuf Erkin', 'Head of Ops', 'Stillwater Mfg', '#0EA5', 'yusuf@stillwater.com', '—', '1', '8w', false, []],
];

function ContactsList() {
  return (
    <div className="crm" data-screen-label="Contacts" style={{ width: '100%', height: '100%', display: 'flex' }}>
      <Sidebar active="contacts" />
      <main className="screen" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar
          crumbs={[{ icon: 'contacts', label: 'Contacts' }]}
          tabs={[
            { id: 'all', label: 'All · 1.2k', icon: 'contacts', active: true },
            { id: 'mine', label: 'Mine · 184' },
            { id: 'recent', label: 'Recent · 38' },
          ]}
          actions={
            <>
              <button className="btn"><Icon name="download" size={13} />Export</button>
              <button className="btn btn-primary"><Icon name="plus" size={13} />New contact</button>
            </>
          }
        />

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--hairline)' }}>
          <div className="input" style={{ width: 280 }}>
            <Icon name="search" size={13} color="var(--ink-4)" />
            <input placeholder="Search 1,247 contacts…" />
          </div>
          <button className="btn"><Icon name="filter" size={13} />Filter</button>
          <span className="chip">Organization is <span style={{ color: 'var(--ink)', marginLeft: 4, fontWeight: 500 }}>Henley Workshop</span><Icon name="x" size={11} color="var(--ink-4)" style={{ marginLeft: 2 }} /></span>
          <span className="chip">Owner is <span style={{ color: 'var(--ink)', marginLeft: 4, fontWeight: 500 }}>Me</span><Icon name="x" size={11} color="var(--ink-4)" style={{ marginLeft: 2 }} /></span>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--ink-4)' }}><Icon name="plus" size={11} />Add filter</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm"><Icon name="sort" size={12} />Last activity</button>
          <button className="btn btn-ghost btn-sm"><Icon name="layers" size={12} />Columns</button>
        </div>

        {/* Selection bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'oklch(0.78 0.20 145 / 0.06)', borderBottom: '1px solid oklch(0.78 0.20 145 / 0.20)' }}>
          <span className="cb --on" style={{ marginRight: 4 }}><Icon name="check" size={10} /></span>
          <span style={{ fontSize: 12, color: 'var(--ink)' }}><b style={{ fontWeight: 600 }}>3</b> selected</span>
          <span style={{ width: 1, height: 14, background: 'var(--hairline)' }} />
          <button className="btn btn-sm btn-ghost"><Icon name="mail" size={12} />Email</button>
          <button className="btn btn-sm btn-ghost"><Icon name="campaign" size={12} />Add to campaign</button>
          <button className="btn btn-sm btn-ghost"><Icon name="task" size={12} />Create task</button>
          <button className="btn btn-sm btn-ghost"><Icon name="edit" size={12} />Bulk edit</button>
          <button className="btn btn-sm btn-ghost" style={{ color: 'oklch(0.80 0.20 25)' }}><Icon name="trash" size={12} />Delete</button>
          <div style={{ flex: 1 }} />
          <button className="btn-ghost btn btn-sm">Clear</button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 32 }}><span className="cb --on" style={{ background: 'transparent', color: 'transparent', borderColor: 'var(--ink-4)' }}><Icon name="minus" size={10} color="var(--ink-2)" /></span></th>
                <th style={{ width: 240 }}>Name</th>
                <th style={{ width: 170 }}>Title</th>
                <th style={{ width: 200 }}>Organization</th>
                <th style={{ width: 260 }}>Email</th>
                <th style={{ width: 130 }}>Phone</th>
                <th style={{ width: 100 }}>Deals</th>
                <th style={{ width: 90, textAlign: 'right' }}>Last activity</th>
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {CONTACT_ROWS.map((r, i) => {
                const [name, title, org, orgColor, email, phone, activities, last, selected, deals] = r;
                const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('');
                return (
                  <tr key={i} className={selected && i < 3 ? '--sel' : ''}>
                    <td><span className={`cb ${selected && i < 3 ? '--on' : ''}`}>{selected && i < 3 && <Icon name="check" size={10} />}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="avatar" style={{ background: orgColor + '22', borderColor: orgColor + '55', color: orgColor }}>{initials}</span>
                        <span style={{ color: 'var(--ink)', fontWeight: 450 }}>{name}</span>
                      </div>
                    </td>
                    <td>{title}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 5, height: 5, borderRadius: 999, background: orgColor }} />
                        <span style={{ color: 'var(--ink-2)' }}>{org}</span>
                      </div>
                    </td>
                    <td className="t-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{email}</td>
                    <td className="t-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{phone}</td>
                    <td>
                      {deals.length === 0 ? <span style={{ color: 'var(--ink-4)' }}>—</span> : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="chip --mute" style={{ fontFamily: 'var(--code)', fontSize: 10.5 }}>{deals[0]}</span>
                          {deals.length > 1 && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>+{deals.length - 1}</span>}
                        </div>
                      )}
                    </td>
                    <td className="t-mono" style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--ink-3)' }}>{last}</td>
                    <td><Icon name="more" size={13} color="var(--ink-4)" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 16px', borderTop: '1px solid var(--hairline)', fontSize: 11.5, color: 'var(--ink-3)' }}>
          <span>Showing 1–18 of 1,247</span>
          <span style={{ width: 1, height: 12, background: 'var(--hairline)' }} />
          <span className="t-mono" style={{ fontSize: 10.5 }}>3 SELECTED · £218k pipeline</span>
          <div style={{ flex: 1 }} />
          <button className="btn-ghost btn btn-sm"><Icon name="chev_l" size={11} /></button>
          <span className="t-mono" style={{ fontSize: 10.5 }}>PAGE 1 / 69</span>
          <button className="btn-ghost btn btn-sm"><Icon name="chev_r" size={11} /></button>
        </div>
      </main>
    </div>
  );
}

window.ContactsList = ContactsList;
