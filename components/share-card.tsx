import type { CSSProperties } from 'react'

interface ShareCardProps {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  homeFlagDataUrl?: string | null
  awayFlagDataUrl?: string | null
  groupName?: string | null
}

const INITIAL_BG = [
  '#1B4F72', '#1A5E20', '#7B241C', '#4A235A',
  '#17202A', '#1F618D', '#117A65', '#6E2F1A',
]

function getBg(name: string) {
  return INITIAL_BG[name.charCodeAt(0) % INITIAL_BG.length]
}

function FlagCircle({
  dataUrl,
  teamName,
}: {
  dataUrl?: string | null
  teamName: string
}) {
  const s: CSSProperties = {
    width: 60,
    height: 60,
    borderRadius: '50%',
    overflow: 'hidden',
    border: '2px solid rgba(255,255,255,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: dataUrl ? undefined : getBg(teamName),
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    fontFamily: '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
  }

  return (
    <div style={s}>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={teamName}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        teamName.charAt(0).toUpperCase()
      )}
    </div>
  )
}

export function ShareCard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  homeFlagDataUrl,
  awayFlagDataUrl,
  groupName,
}: ShareCardProps) {
  return (
    <div
      style={{
        width: 400,
        height: 500,
        background: 'linear-gradient(160deg, #0C1F3A 0%, #071C0D 52%, #0C1F3A 100%)',
        padding: '28px 28px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Pitch line texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 34px, rgba(255,255,255,0.022) 34px, rgba(255,255,255,0.022) 35px)',
          pointerEvents: 'none',
        }}
      />

      {/* Gold spotlight glow */}
      <div
        style={{
          position: 'absolute',
          top: '52%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 340,
          height: 220,
          background:
            'radial-gradient(ellipse at center, rgba(255,215,0,0.055) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Decorative circles (pitch lines) */}
      <div
        style={{
          position: 'absolute',
          bottom: -110,
          right: -110,
          width: 300,
          height: 300,
          borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.04)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -50,
          left: -50,
          width: 180,
          height: 180,
          borderRadius: '50%',
          border: '1px solid rgba(255,215,0,0.07)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Content ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Top badge */}
        <div style={{ marginBottom: 20 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '2.5px',
              color: '#FFD700',
              textTransform: 'uppercase',
              border: '1px solid rgba(255,215,0,0.38)',
              borderRadius: 100,
              padding: '5px 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ⚽ Copa do Mundo 2026
          </span>
        </div>

        {/* Middle: teams + score */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 18,
            width: '100%',
          }}
        >
          {/* Teams row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              gap: 8,
            }}
          >
            {/* Home */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                flex: 1,
              }}
            >
              <FlagCircle dataUrl={homeFlagDataUrl} teamName={homeTeam} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  color: 'rgba(255,255,255,0.9)',
                  maxWidth: 110,
                }}
              >
                {homeTeam}
              </span>
            </div>

            {/* VS */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '1px',
                flexShrink: 0,
              }}
            >
              VS
            </span>

            {/* Away */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                flex: 1,
              }}
            >
              <FlagCircle dataUrl={awayFlagDataUrl} teamName={awayTeam} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  color: 'rgba(255,255,255,0.9)',
                  maxWidth: 110,
                }}
              >
                {awayTeam}
              </span>
            </div>
          </div>

          {/* Score */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
            }}
          >
            <span
              style={{
                fontSize: 92,
                fontWeight: 800,
                color: '#FFD700',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-2px',
              }}
            >
              {homeScore}
            </span>
            <span
              style={{
                fontSize: 40,
                color: 'rgba(255,255,255,0.22)',
                fontWeight: 300,
                lineHeight: 1,
                marginTop: 6,
              }}
            >
              ×
            </span>
            <span
              style={{
                fontSize: 92,
                fontWeight: 800,
                color: '#FFD700',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-2px',
              }}
            >
              {awayScore}
            </span>
          </div>

          {/* "Meu palpite" label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 1, background: 'rgba(255,215,0,0.32)' }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '2.5px',
                color: 'rgba(255,215,0,0.72)',
                textTransform: 'uppercase',
              }}
            >
              Meu palpite
            </span>
            <div style={{ width: 36, height: 1, background: 'rgba(255,215,0,0.32)' }} />
          </div>

          {groupName && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
              Grupo {groupName}
            </span>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            width: '100%',
          }}
        >
          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 6 }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.38)',
              letterSpacing: '0.5px',
            }}
          >
            🏆 bolão na mão
          </span>
        </div>
      </div>
    </div>
  )
}
