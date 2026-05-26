// Icons.jsx — Lucide-style monoline icons (1.5 stroke, 18px default)
// Inline SVG so we never depend on a CDN; named for the brief's "lucide-react throughout".

const ICONS = {
  // nav
  home:        'M3 11.5 12 4l9 7.5M5 10v10h14V10',
  contacts:    'M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  building:    'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16 M16 21h4V11h-4 M9 9h2 M9 13h2 M9 17h2',
  deals:       'M3 7h18 M3 12h18 M3 17h18',
  kanban:      'M5 4v16 M12 4v10 M19 4v7',
  activity:    'M22 12h-4l-3 9L9 3l-3 9H2',
  task:        'M3 5h6 M3 12h12 M3 19h18 M11 5l2 2 4-4',
  quote:       'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 13h6 M9 17h4',
  inbox:       'M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z',
  campaign:    'M3 11l18-8v18l-18-8z M3 11v4',
  settings:    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
  plug:        'M9 2v6 M15 2v6 M5 8h14v3a7 7 0 0 1-14 0z M12 22v-7',

  // ui
  search:      'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M21 21l-4.35-4.35',
  cmd:         'M15 6V3a3 3 0 1 1 3 3h-3z M9 6V3a3 3 0 0 0-3 3h3z M9 18v3a3 3 0 0 1-3-3h3z M15 18v3a3 3 0 0 0 3-3h-3z M6 9H3a3 3 0 0 1 3-3v3z M18 9h3a3 3 0 0 0-3-3v3z M6 15H3a3 3 0 0 0 3 3v-3z M18 15h3a3 3 0 0 1-3 3v-3z M6 9h12v6H6z',
  bell:        'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0',
  plus:        'M12 5v14 M5 12h14',
  minus:       'M5 12h14',
  chev_r:      'M9 6l6 6-6 6',
  chev_l:      'M15 6l-6 6 6 6',
  chev_d:      'M6 9l6 6 6-6',
  chev_u:      'M6 15l6-6 6 6',
  chevs_lr:    'M7 7l-4 5 4 5 M17 7l4 5-4 5',
  caret_d:     'M6 9l6 6 6-6',
  more:        'M5 12h.01 M12 12h.01 M19 12h.01',
  more_v:      'M12 5h.01 M12 12h.01 M12 19h.01',
  filter:      'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  sort:        'M3 6h13 M3 12h9 M3 18h5 M17 8l4-4 4 4 M21 4v14',
  arrow_r:     'M5 12h14 M13 5l7 7-7 7',
  arrow_ul:    'M17 17 7 7 M17 7H7v10',
  arrow_dr:    'M7 7l10 10 M7 17h10V7',
  external:    'M15 3h6v6 M10 14L21 3 M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6',
  link:        'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  copy:        'M9 9h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z M5 15H4a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1',
  check:       'M20 6 9 17l-5-5',
  x:           'M18 6 6 18 M6 6l12 12',
  circle:      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  circle_x:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M15 9l-6 6 M9 9l6 6',
  star:        'M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z',
  flame:       'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',

  // data
  mail:        'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 6 12 13 2 6',
  phone:       'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
  calendar:    'M3 5h18v16H3z M3 9h18 M8 3v4 M16 3v4',
  clock:       'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  note:        'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  doc:         'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
  globe:       'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z',
  pound:       'M18 7c0-2.21-1.79-4-4-4-2 0-3.5 1-4 3 0 0-0.5 2 0 5 0.5 3-1 6-3 6h11 M5 13h9',
  trending_up: 'M22 7l-9.5 9.5-5-5L1 18 M16 7h6v6',
  graph:       'M3 3v18h18 M7 14l3-3 4 4 5-7',

  // utility
  drag:        'M9 6h.01 M9 12h.01 M9 18h.01 M15 6h.01 M15 12h.01 M15 18h.01',
  send:        'M22 2 11 13 M22 2 15 22l-4-9-9-4z',
  zap:         'M13 2 3 14h9l-1 8 10-12h-9z',
  user:        'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  logout:      'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  download:    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  upload:      'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
  trash:       'M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M10 11v6 M14 11v6',
  edit:        'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  lightning:   'M13 2 3 14h9l-1 8 10-12h-9z',
  layers:      'M12 2 2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
  sparkle:     'M12 2 14 9l7 2-7 2-2 7-2-7-7-2 7-2z M19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z',
  command_line:'M3 5h18v14H3z M7 9l3 3-3 3 M13 15h4',
};

function Icon({ name, size = 16, stroke = 1.5, color = 'currentColor', style }) {
  const d = ICONS[name];
  if (!d) return <span style={{ width: size, height: size, display: 'inline-block', opacity: 0.3, ...style }}>·</span>;
  // Some icons have multiple subpaths separated by ' M '. Render each as its own <path>.
  const paths = d.split(/(?= M )/).map(s => s.trim());
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} aria-hidden="true">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

window.Icon = Icon;
