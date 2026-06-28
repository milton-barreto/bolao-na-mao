export default function ManutencaoPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FFFFFF',
        padding: '2rem',
        textAlign: 'center',
        gap: '1.5rem',
      }}
    >
      <div style={{ fontSize: '4rem' }}>⚙️</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#0A0A0A',
            margin: 0,
          }}
        >
          App em manutenção
        </h1>

        <p
          style={{
            fontSize: '1rem',
            color: '#6B7280',
            margin: 0,
            maxWidth: '28rem',
            lineHeight: 1.6,
          }}
        >
          Estamos fazendo ajustes para melhorar sua experiência.
          Voltamos em breve!
        </p>
      </div>

      <div
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.5rem',
          background: '#FFD700',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#0A0A0A',
        }}
      >
        🇧🇷 Bolão na Mão — Copa 2026
      </div>
    </div>
  )
}
