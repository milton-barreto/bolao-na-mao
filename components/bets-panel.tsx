'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BetEntry } from '@/lib/actions/bets'
import type { BetStatus } from '@/types'

const STATUS_LABEL: Record<BetStatus, string> = {
  acertou_placar: 'Cravou',
  acertou_resultado: 'Resultado',
  errou: 'Errou',
  pendente: 'Pendente',
}

const STATUS_VARIANT: Record<
  BetStatus,
  'acertou_placar' | 'acertou_resultado' | 'errou' | 'travado'
> = {
  acertou_placar: 'acertou_placar',
  acertou_resultado: 'acertou_resultado',
  errou: 'errou',
  pendente: 'travado',
}

interface BetsPanelProps {
  bets: BetEntry[]
  currentUserId?: string
}

/**
 * Seção colapsável "Ver palpites do bolão" — só renderizada após o deadline.
 * Mostra os palpites de todos com avatar, nome, placar e status.
 */
export function BetsPanel({ bets, currentUserId }: BetsPanelProps) {
  const [open, setOpen] = useState(false)

  if (bets.length === 0) return null

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-medium text-brand-blue"
      >
        <span>Ver palpites do bolão ({bets.length})</span>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {open && (
        <ul className="mt-3 flex flex-col gap-2">
          {bets.map((b) => {
            const isMe = b.user_id === currentUserId
            const initial = b.user_name.charAt(0).toUpperCase()
            return (
              <li
                key={b.bet_id}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-2 py-1.5',
                  isMe && 'bg-muted',
                )}
              >
                <Avatar isCurrentUser={isMe} className="h-7 w-7">
                  {b.user_avatar_url ? (
                    <AvatarImage src={b.user_avatar_url} alt={b.user_name} />
                  ) : null}
                  <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                </Avatar>

                <span className="flex-1 truncate text-sm">
                  {b.user_name}
                  {isMe && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (você)
                    </span>
                  )}
                </span>

                <span className="font-display text-sm font-bold tabular-nums">
                  {b.predicted_home_score} - {b.predicted_away_score}
                </span>

                <Badge variant={STATUS_VARIANT[b.status]} className="shrink-0">
                  {STATUS_LABEL[b.status]}
                  {b.total_points !== null && b.status !== 'errou'
                    ? ` · ${b.total_points.toFixed(2).replace('.', ',')}`
                    : ''}
                </Badge>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
