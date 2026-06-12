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

export function BetsPanel({ bets, currentUserId }: BetsPanelProps) {
  const [open, setOpen] = useState(false)

  if (bets.length === 0) return null

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue/10"
      >
        <span>A galera chutou ({bets.length})</span>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {open && (
        <ul className="mt-2 flex flex-col gap-1">
          {bets.map((b) => {
            const isMe = b.user_id === currentUserId
            const initial = b.user_name.charAt(0).toUpperCase()
            return (
              <li
                key={b.bet_id}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-2 py-2 transition-colors',
                  isMe ? 'bg-brand-blue/5' : 'hover:bg-muted/60',
                )}
              >
                <Avatar isCurrentUser={isMe} className="h-7 w-7 shrink-0">
                  {b.user_avatar_url ? (
                    <AvatarImage src={b.user_avatar_url} alt={b.user_name} />
                  ) : null}
                  <AvatarFallback className="text-xs font-bold">{initial}</AvatarFallback>
                </Avatar>

                <span className="flex-1 truncate text-sm font-medium">
                  {b.user_name.split(' ')[0]}
                  {isMe && (
                    <span className="ml-1 text-xs text-muted-foreground font-normal">
                      (você)
                    </span>
                  )}
                </span>

                <span className="font-display text-sm font-bold tabular-nums">
                  {b.predicted_home_score}-{b.predicted_away_score}
                </span>

                <Badge variant={STATUS_VARIANT[b.status]} className="shrink-0 text-[10px]">
                  {STATUS_LABEL[b.status]}
                  {b.total_points !== null && b.status !== 'errou'
                    ? ` · ${b.total_points.toFixed(1)}`
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
