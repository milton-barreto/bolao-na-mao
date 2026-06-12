import type { CSSProperties } from 'react'
import type { RankingEntry } from '@/types'

// ── cores ──────────────────────────────────────────────────────
const GOLD   = '#FFD700'
const SILVER = '#C0C0C0'
const BRONZE = '#CD7F32'

const MEDAL_COLOR:  Record<1|2|3, string> = { 1: GOLD,  2: SILVER, 3: BRONZE }
const MEDAL_EMOJI:  Record<1|2|3, string> = { 1: '🥇', 2: '🥈',  3: '🥉'  }
const SOLO_SZ:      Record<1|2|3, number> = { 1: 64,   2: 52,    3: 48    }
const TIE_SZ:       Record<1|2|3, number> = { 1: 50,   2: 40,    3: 36    }
const BAR_H:        Record<1|2|3, number> = { 1: 72,   2: 50,    3: 36    }

const FALLBACK_BG = ['#1B4F72','#1A5E20','#7B241C','#4A235A','#17202A','#1F618D','#117A65','#6E2F1A']
function fbBg(name: string) { return FALLBACK_BG[name.charCodeAt(0) % FALLBACK_BG.length] }

// ── Avatar ─────────────────────────────────────────────────────
function Av({ dataUrl, name, size, border }: { dataUrl: string | null; name: string; size: number; border: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      border: `2.5px solid ${border}`, background: fbBg(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: size * 0.38, fontWeight: 700, color: '#fff' }}>
          {name[0]?.toUpperCase()}
        </span>
      )}
    </div>
  )
}

// ── PodiumSlot ─────────────────────────────────────────────────
function PodiumSlot({
  entries, dataUrls, pos,
}: {
  entries: RankingEntry[]
  dataUrls: (string | null)[]
  pos: 1 | 2 | 3
}) {
  if (entries.length === 0) return <div style={{ flex: 1 }} />

  const color  = MEDAL_COLOR[pos]
  const isTied = entries.length > 1
  const sz     = isTied ? TIE_SZ[pos] : SOLO_SZ[pos]
  const barH   = BAR_H[pos]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: pos === 1 ? 24 : 20 }}>{MEDAL_EMOJI[pos]}</span>

      {/* Avatares lado a lado se empatados */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', justifyContent: 'center' }}>
        {entries.map((entry, i) => (
          <div key={entry.user.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <Av dataUrl={dataUrls[i] ?? null} name={entry.user.name} size={sz} border={color} />
            <span style={{
              fontSize: isTied ? 10 : pos === 1 ? 12 : 11, fontWeight: 700,
              color: 'rgba(255,255,255,0.9)', textAlign: 'center',
              maxWidth: isTied ? 62 : 80,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {entry.user.name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Pontos — uma vez só, centrado */}
      <span style={{ fontSize: pos === 1 ? 14 : 12, fontWeight: 800, color }}>
        {entries[0].total_points.toFixed(1)} pts
      </span>

      {/* Barra */}
      <div style={{
        width: '100%', height: barH, borderRadius: '6px 6px 0 0',
        background: color, opacity: 0.25,
      }} />
    </div>
  )
}

// ── Card principal ─────────────────────────────────────────────
interface RankingShareCardProps {
  entries: RankingEntry[]
  avatarDataUrls: Record<string, string | null>
  currentUserId?: string
  dateLabel: string
}

export function RankingShareCard({ entries, avatarDataUrls, currentUserId, dateLabel }: RankingShareCardProps) {
  const podium = entries.filter((e) => e.position <= 3)
  const list   = entries.filter((e) => e.position  > 3)

  const p1 = podium.filter((e) => e.position === 1)
  const p2 = podium.filter((e) => e.position === 2)
  const p3 = podium.filter((e) => e.position === 3)

  const card: CSSProperties = {
    width: 400,
    background: 'linear-gradient(160deg, #0C1F3A 0%, #071C0D 52%, #0C1F3A 100%)',
    padding: '22px 20px 18px',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  }

  return (
    <div style={card}>
      {/* Pitch line texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 34px, rgba(255,255,255,0.02) 34px, rgba(255,255,255,0.02) 35px)',
      }} />
      {/* Decorative circle */}
      <div style={{
        position: 'absolute', bottom: -80, right: -80,
        width: 240, height: 240, borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,0.04)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', color: GOLD,
            textTransform: 'uppercase', border: '1px solid rgba(255,215,0,0.38)',
            borderRadius: 100, padding: '5px 14px',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            ⚽ Copa do Mundo 2026
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 18 }}>🏆</span>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>
              Ranking — Bolão da Galera
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
            {dateLabel}
          </span>
        </div>

        {/* Pódio */}
        {(p1.length > 0 || p2.length > 0 || p3.length > 0) && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 14,
            padding: '14px 10px 0', marginBottom: 10,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
              <PodiumSlot entries={p2} dataUrls={p2.map((e) => avatarDataUrls[e.user.id] ?? null)} pos={2} />
              <PodiumSlot entries={p1} dataUrls={p1.map((e) => avatarDataUrls[e.user.id] ?? null)} pos={1} />
              <PodiumSlot entries={p3} dataUrls={p3.map((e) => avatarDataUrls[e.user.id] ?? null)} pos={3} />
            </div>
          </div>
        )}

        {/* Lista */}
        {list.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {list.map((entry, idx) => {
              const isCurrent = entry.user.id === currentUserId
              const first     = entry.user.name.split(' ')[0]
              const dataUrl   = avatarDataUrls[entry.user.id] ?? null
              const isLast    = idx === list.length - 1

              const row: CSSProperties = {
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px',
                borderRadius: 9,
                background: isCurrent ? 'rgba(255,215,0,0.08)' : 'transparent',
                border: isCurrent ? '1px solid rgba(255,215,0,0.2)' : '1px solid transparent',
                borderBottom: !isCurrent && !isLast ? '1px solid rgba(255,255,255,0.05)' : undefined,
              }

              return (
                <div key={entry.user.id} style={row}>
                  <span style={{
                    width: 22, textAlign: 'center', flexShrink: 0,
                    fontSize: 11, fontWeight: 700,
                    color: isCurrent ? GOLD : 'rgba(255,255,255,0.35)',
                  }}>
                    {entry.position}.
                  </span>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    border: `2px solid ${isCurrent ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    background: fbBg(entry.user.name),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {dataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={dataUrl} alt={first} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
                        {entry.user.name[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span style={{
                    flex: 1, fontSize: 12, fontWeight: isCurrent ? 700 : 600,
                    color: isCurrent ? GOLD : 'rgba(255,255,255,0.85)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {first}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 800, flexShrink: 0,
                    color: isCurrent ? GOLD : 'rgba(255,255,255,0.6)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {entry.total_points.toFixed(1)} pts
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px' }}>
            🏆 bolão na mão
          </span>
        </div>
      </div>
    </div>
  )
}
