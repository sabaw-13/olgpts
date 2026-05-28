function App() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#ffffff',
        color: '#111827',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <section style={{ maxWidth: '520px' }}>
        <p
          style={{
            margin: '0 0 12px',
            color: '#6b7280',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Service Notice
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(28px, 6vw, 44px)',
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          Service temporarily unavailable
        </h1>
        <p
          style={{
            margin: '18px 0 0',
            color: '#4b5563',
            fontSize: '16px',
            lineHeight: 1.6,
          }}
        >
          Please contact the system administrator.
        </p>
      </section>
    </main>
  );
}

export default App;
