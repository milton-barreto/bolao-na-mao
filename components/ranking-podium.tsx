'use client'

import Image from 'next/image'
import { Trophy } from 'lucide-react'
import type { RankingEntry } from '@/types'

interface RankingPodiumProps {
  entries: RankingEntry[]
}

const PODIUM_STYLES = {
  1: { medal: '🥇', barColor: '#FFD700', barHeight: 'h-20', borderColor: '#E6C200', textColor: '#B8860B' },
  2: { medal: '🥈', barColor: '#C0C0C0', barHeight: 'h-14', borderColor: '#A8A8A8', textColor: '#6B7280' },
  3: { medal: '🥉', barColor: '#CD7F32', barHeight: 'h-10', borderColor: '#B46A27', textColor: '#6B7280' },
} as const

const SOLO_SIZE: Record<1 | 2 | 3, number> = { 1: 72, 2: 60, 3: 56 }
const TIE_SIZE:  Record<1 | 2 | 3, number> = { 1: 56, 2: 46, 3: 42 }

function EntryAvatar({ entry, size, borderColor }: { entry: RankingEntry; size: number; borderColor: string }) {
  const pos = Math.min(entry.position, 3) as 1 | 2 | 3
  const barColor = PODIUM_STYLES[pos].barColor
  return (
    <div
      className="overflow-hidden rounded-full border-[3px]"
      style={{ width: size, height: size, borderColor }}
    >
      {entry.user.avatar_url ? (
        <Image
          src={entry.user.avatar_url}
          alt={entry.user.name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-bold"
          style={{
            backgroundColor: barColor,
            fontSize: size * 0.38,
            color: entry.position === 1 ? '#0A0A0A' : '#fff',
          }}
        >
          {entry.user.name[0]?.toUpperCase()}
        </div>
      )}
    </div>
  )
}

function PodiumSlot({ entries, position }: { entries: RankingEntry[]; position: 1 | 2 | 3 }) {
  if (entries.length === 0) return <div className="flex-1" />

  const styles  = PODIUM_STYLES[position]
  const isTied  = entries.length > 1
  const sz      = isTied ? TIE_SIZE[position] : SOLO_SIZE[position]

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span className={position === 1 ? 'text-2xl' : 'text-xl'}>{styles.medal}</span>

      {/* Avatares — lado a lado se empatados */}
      <div className="flex items-end justify-center gap-2">
        {entries.map((entry) => (
          <div key={entry.user.id} className="flex flex-col items-center gap-1">
            <EntryAvatar entry={entry} size={sz} borderColor={styles.borderColor} />
            <span
              className="truncate text-center font-semibold leading-tight"
              style={{ maxWidth: isTied ? 64 : 80, fontSize: isTied ? 11 : 13 }}
            >
              {entry.user.name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Pontos — uma vez só, centrado */}
      <span
        className="font-display font-bold"
        style={{ color: styles.textColor, fontSize: isTied ? 13 : position === 1 ? 16 : 14 }}
      >
        {entries[0].total_points.toFixed(1)} pts
      </span>

      {/* Barra do pódio */}
      <div
        className={`w-full rounded-t-lg ${styles.barHeight}`}
        style={{ backgroundColor: styles.barColor, opacity: 0.25 }}
      />
    </div>
  )
}

export function RankingPodium({ entries }: RankingPodiumProps) {
  if (entries.length === 0) return null

  const p1 = entries.filter((e) => e.position === 1)
  const p2 = entries.filter((e) => e.position === 2)
  const p3 = entries.filter((e) => e.position === 3)

  const header = (
    <h1 className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-bold">
      <Trophy className="h-5 w-5 text-brand-yellow" />
      Ranking — Bolão da Galera
    </h1>
  )

  if (p1.length >= 2) {
    return (
      <div className="w-full py-6">
        {header}
        <div className="flex flex-wrap items-end justify-center gap-4">
          {entries.map((e) => (
            <PodiumSlot
              key={e.user.id}
              entries={[e]}
              position={Math.min(e.position, 3) as 1 | 2 | 3}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-6">
      {header}
      <div className="flex items-end justify-center gap-3">
        <PodiumSlot entries={p2} position={2} />
        <PodiumSlot entries={p1} position={1} />
        <PodiumSlot entries={p3} position={3} />
      </div>
    </div>
  )
}
