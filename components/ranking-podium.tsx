'use client'

import Image from 'next/image'
import type { RankingEntry } from '@/types'

interface RankingPodiumProps {
  entries: RankingEntry[]
}

function podiumColor(pos: number) {
  if (pos === 1) return { bg: '#FFD700', border: '#E6C200', label: '🥇', text: 'MITO 🏆' }
  if (pos === 2) return { bg: '#C0C0C0', border: '#A8A8A8', label: '🥈', text: 'Pódio 🥈' }
  return { bg: '#CD7F32', border: '#B46A27', label: '🥉', text: 'Pódio 🥉' }
}

function PodiumCard({
  entry,
  size,
}: {
  entry: RankingEntry
  size: 'lg' | 'sm'
}) {
  const { label, text } = podiumColor(entry.position)
  const avatarSize = size === 'lg' ? 72 : 56

  return (
    <div
      className={`flex flex-col items-center gap-2 ${size === 'lg' ? 'scale-110 z-10' : ''}`}
    >
      {/* Medalha */}
      <span className="text-2xl">{label}</span>

      {/* Avatar */}
      <div
        className="rounded-full overflow-hidden border-4"
        style={{
          width: avatarSize,
          height: avatarSize,
          borderColor: podiumColor(entry.position).border,
        }}
      >
        {entry.user.avatar_url ? (
          <Image
            src={entry.user.avatar_url}
            alt={entry.user.name}
            width={avatarSize}
            height={avatarSize}
            className="object-cover w-full h-full"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-bold"
            style={{
              backgroundColor: podiumColor(entry.position).bg,
              fontSize: size === 'lg' ? 28 : 22,
            }}
          >
            {entry.user.name[0]?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Nome */}
      <span className="text-sm font-semibold text-center leading-tight max-w-20 truncate">
        {entry.user.name.split(' ')[0]}
      </span>

      {/* Pontos */}
      <span
        className="text-lg font-bold font-display"
        style={{ color: podiumColor(entry.position).bg === '#FFD700' ? '#B8860B' : '#4B5563' }}
      >
        {entry.total_points.toFixed(1)} pts
      </span>

      {/* Badge de posição */}
      <span
        className="text-xs font-medium px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: podiumColor(entry.position).bg,
          color: entry.position === 1 ? '#0A0A0A' : '#fff',
        }}
      >
        {text}
      </span>
    </div>
  )
}

export function RankingPodium({ entries }: RankingPodiumProps) {
  if (entries.length === 0) return null

  // Detectar empate no top 1 (posição 1 para mais de um)
  const firstPlace = entries.filter((e) => e.position === 1)
  const secondPlace = entries.filter((e) => e.position === 2)
  const thirdPlace = entries.filter((e) => e.position === 3)

  // Layout: 2º | 1º | 3º (ou empate no 1º lado a lado)
  return (
    <div className="w-full py-8">
      {/* Título */}
      <h1 className="text-2xl font-bold font-display text-center mb-8">
        🏆 Ranking — Bolão da Galera
      </h1>

      {firstPlace.length >= 2 ? (
        /* Empate no top 1: todos lado a lado */
        <div className="flex items-end justify-center gap-6 flex-wrap">
          {firstPlace.map((e) => (
            <PodiumCard key={e.user.id} entry={e} size="lg" />
          ))}
        </div>
      ) : (
        /* Layout clássico: 2º | 1º | 3º */
        <div className="flex items-end justify-center gap-6">
          {/* 2º lugar */}
          {secondPlace[0] ? (
            <PodiumCard entry={secondPlace[0]} size="sm" />
          ) : (
            <div className="w-20" />
          )}

          {/* 1º lugar (maior) */}
          {firstPlace[0] && <PodiumCard entry={firstPlace[0]} size="lg" />}

          {/* 3º lugar */}
          {thirdPlace[0] ? (
            <PodiumCard entry={thirdPlace[0]} size="sm" />
          ) : (
            <div className="w-20" />
          )}
        </div>
      )}
    </div>
  )
}
