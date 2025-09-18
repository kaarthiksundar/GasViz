export default function Layout({ title, children, footer }) {
  return (
    <div>
      <header style={{ padding: '0.5rem 1rem' }}>
        {title && <h1 style={{ margin: 0 }}>{title}</h1>}
      </header>
      <main>
        {children}
      </main>
      <footer style={{ padding: '0.5rem 1rem', color: '#555' }}>
        {footer ?? null}
      </footer>
    </div>
  )
}

