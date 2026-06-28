'use client'

import Image from 'next/image'
import { Check, X } from 'lucide-react'

type SlotStatus = 'selected' | 'winner' | 'loser' | 'empty' | 'placeholder'

interface BracketSlotProps {
  teamId?: string | null
  teamName?: string | null
  flagUrl?: string | null
  status?: SlotStatus
  onClick?: () => void
  readOnly?: boolean
  isPlaceholder?: boolean
}

const STATUS_STYLES: Record<SlotStatus, string> = {
  selected: 'bg-brand-yellow text-primary-foreground border-brand-yellow font-semibold shadow-sm',
  winner: 'bg-green-50 text-green-800 border-green-400 font-semibold',
  loser: 'bg-red-50 text-red-700 border-red-300 line-through opacity-60',
  empty: 'bg-card text-muted-foreground border-border hover:border-brand-yellow hover:bg-muted',
  placeholder: 'bg-muted text-muted-foreground border-dashed border-border',
}

export function BracketSlot({
  teamId,
  teamName,
  flagUrl,
  status = 'empty',
  onClick,
  readOnly = false,
  isPlaceholder = false,
}: BracketSlotProps) {
  const resolvedStatus: SlotStatus = isPlaceholder
    ? 'placeholder'
    : teamId
    ? status
    : 'empty'

  const isClickable = !readOnly && !isPlaceholder && !!onClick

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      title={teamName ?? undefined}
      aria-label={teamName ?? 'Confronto a definir'}
      className={[
        'flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs transition-all',
        'w-full h-full flex-shrink-0 text-left overflow-hidden',
        STATUS_STYLES[resolvedStatus],
        isClickable ? 'cursor-pointer' : 'cursor-default',
      ].join(' ')}
    >
      {/* Bandeira */}
      {flagUrl && teamId ? (
        <Image
          src={flagUrl}
          alt={teamName ?? ''}
          width={20}
          height={14}
          className="rounded-sm object-cover flex-shrink-0"
        />
      ) : (
        <span className="w-5 h-3.5 rounded-sm bg-[var(--border)] flex-shrink-0" />
      )}

      {/* Nome */}
      <span className="flex-1 truncate leading-none font-display font-semibold tracking-tight">
        {isPlaceholder
          ? '?'
          : teamName
          ? teamName.split(' ').slice(0, 2).join(' ')  // max 2 words
          : '—'}
      </span>

      {/* Badge de resultado */}
      {resolvedStatus === 'winner' && (
        <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
      )}
      {resolvedStatus === 'loser' && (
        <X className="w-3 h-3 text-red-500 flex-shrink-0" />
      )}
    </button>
  )
}
