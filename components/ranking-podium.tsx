'use client'

import Image from 'next/image'
import { Trophy } from 'lucide-react'
import type { RankingEntry } from '@/types'

interface RankingPodiumProps {
  entries: RankingEntry[]
}

const PODIUM_STYLES = {
  1: {
    medal: '🥇',
    label: 'MITO 🏆',
    barColor: '#FFD700',
    barHeight: 'h-20',
    avatarSize: 72,
    borderColor: '#E6C200',
    textColor: '#B8860B',
  },
  2: {
    medal: '🥈',
    label: 'Pódio',
    barColor: '#C0C0C0',
    barHeight: 'h-14',
    avatarSize: 60,
    borderColor: '#A8A8A8',
    textColor: '#6B7280',
  },
  3: {
    medal: '🥉',
    label: 'Pódio',
    barColor: '#CD7F32',
    barHeight: 'h-10',
    avatarSize: 56,
    borderColor: '#B46A27',
    textColor: '#6B7280',
  },
} as const

function PodiumCard({
  entry,
  isPrimary,
}: {
  entry: RankingEntry
  isPrimary: boolean
}) {
  const pos = entry.position as keyof typeof PODIUM_STYLES
  const styles = PODIUM_STYLES[pos] ?? PODIUM_STYLES[3]

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span className="text-2xl">{styles.medal}</span>

      {/* Avatar */}
      <div
        className="overflow-hidden rounded-full border-[3px]"
        style={{
          width: styles.avatarSize,
          height: styles.avatarSize,
          borderColor: styles.borderColor,
        }}
      >
        {entry.user.avatar_url ? (
          <Image
            src={entry.user.avatar_url}
            alt={entry.user.name}
            width={styles.avatarSize}
            height={styles.avatarSize}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center font-bold text-white"
            style={{
              backgroundColor: styles.barColor,
              fontSize: isPrimary ? 28 : 22,
              color: entry.position === 1 ? '#0A0A0A' : '#fff',
            }}
          >
            {entry.user.name[0]?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Nome */}
      <span className="max-w-[80px] truncate text-center text-sm font-semibold leading-tight">
        {entry.user.name.split(' ')[0]}
      </span>

      {/* Pontos */}
      <span className="font-display text-base font-bold" style={{ color: styles.textColor }}>
        {entry.total_points.toFixed(1)} pts
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

  const firstPlace = entries.filter((e) => e.position === 1)
  const secondPlace = entries.filter((e) => e.position === 2)
  const thirdPlace = entries.filter((e) => e.position === 3)

  return (
    <div className="w-full py-6">
      <h1 className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-bold">
        <Trophy className="h-5 w-5 text-brand-yellow" />
        Ranking — Bolão da Galera
      </h1>

      {firstPlace.length >= 2 ? (
        /* Empate no top 1 */
        <div className="flex items-end justify-center gap-4 flex-wrap">
          {firstPlace.map((e) => (
            <PodiumCard key={e.user.id} entry={e} isPrimary />
          ))}
        </div>
      ) : (
        /* Layout 2º | 1º | 3º com barras de altura diferente */
        <div className="flex items-end justify-center gap-3">
          {secondPlace[0] ? (
            <PodiumCard entry={secondPlace[0]} isPrimary={false} />
          ) : (
            <div className="flex-1" />
          )}

          {firstPlace[0] && (
            <PodiumCard entry={firstPlace[0]} isPrimary />
          )}

          {thirdPlace[0] ? (
            <PodiumCard entry={thirdPlace[0]} isPrimary={false} />
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}
    </div>
  )
}
