// Login.jsx — magic link form

function Login() {
  return (
    <div className="crm screen" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient orbs (DS pattern) */}
      <div style={{ position: 'absolute', top: -120, right: -160, width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, oklch(0.78 0.20 145 / 0.20), transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: -200, left: -180, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, oklch(0.82 0.08 220 / 0.18), transparent 65%)', filter: 'blur(70px)', pointerEvents: 'none', zIndex: 1 }} />

      {/* Card */}
      <div style={{ width: 420, position: 'relative', zIndex: 3 }}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <ZarcoMark size={48} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.025em' }}>zarco</span>
            <span className="t-eyebrow" style={{ fontSize: 9.5 }}>CRM · workspace</span>
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h2 className="t-display" style={{ fontSize: 22, lineHeight: 1.15, margin: 0, marginBottom: 6 }}>Sign in</h2>
          <p className="body-sm" style={{ margin: 0, marginBottom: 22, color: 'var(--ink-3)', fontSize: 13 }}>
            We'll email you a one-time link — no password to remember.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span className="t-label">Work email</span>
              <div className="input" style={{ height: 36, borderColor: 'oklch(0.78 0.20 145 / 0.35)', boxShadow: '0 0 0 3px oklch(0.78 0.20 145 / 0.12)' }}>
                <Icon name="mail" size={14} color="var(--ink-4)" />
                <input defaultValue="luke@zarco.uk" />
              </div>
            </label>
            <button className="btn btn-primary" style={{ height: 36, justifyContent: 'center', fontWeight: 550 }}>
              Email me a magic link <Icon name="arrow_r" size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
            <div style={{ flex: 1, borderTop: '1px solid var(--hairline)' }} />
            <span className="t-mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>OR</span>
            <div style={{ flex: 1, borderTop: '1px solid var(--hairline)' }} />
          </div>

          <button className="btn" style={{ width: '100%', height: 34, justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.23 1.24-.93 2.3-1.97 3l3.2 2.48c1.87-1.73 2.95-4.27 2.95-7.28 0-.66-.06-1.3-.18-1.91z"/><path fill="#fff" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.2-2.48c-.9.6-2.04.96-3.42.96-2.63 0-4.86-1.78-5.66-4.17H3.05v2.62A9.97 9.97 0 0 0 12 22z" opacity=".8"/><path fill="#fff" d="M6.34 13.89A5.99 5.99 0 0 1 6 12c0-.65.12-1.28.34-1.89V7.49H3.05A9.97 9.97 0 0 0 2 12c0 1.62.38 3.16 1.05 4.51l3.29-2.62z" opacity=".6"/><path fill="#fff" d="M12 6c1.47 0 2.79.5 3.83 1.5l2.85-2.85C16.95 3.07 14.69 2 12 2A9.97 9.97 0 0 0 3.05 7.49l3.29 2.62C7.14 7.72 9.37 6 12 6z" opacity=".9"/></svg>
            Continue with Google
          </button>
        </div>

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-4)' }}>
          <span>By signing in you accept the <a style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>terms</a>.</span>
          <span className="t-mono" style={{ fontSize: 10.5, letterSpacing: '0.14em' }}>ZRC-2026</span>
        </div>
      </div>
    </div>
  );
}

window.Login = Login;
