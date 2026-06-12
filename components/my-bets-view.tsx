'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, ChevronDown, Search, Users, Loader2 } from 'lucide-react'
import { TierBadge, Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TeamFlag } from '@/components/team-flag'
import { EditBetDialog } from '@/components/edit-bet-dialog'
import { ShareBetButton } from '@/components/share-bet-button'
import { BetsPanel } from '@/components/bets-panel'
import { formatKickoff, isDeadlinePassed } from '@/lib/datetime'
import { previewPoints } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import { getBetsForMatch, type BetEntry, type MyBetEntry } from '@/lib/actions/bets'
import type { BetStatus } from '@/types'

type Tab = number | 'extrato'
type Filter = 'todos' | 'acertei' | 'errei' | 'pendentes'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'acertei', label: 'Acertei' },
  { key: 'errei', label: 'Errei' },
  { key: 'pendentes', label: 'Pendentes' },
]

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

function LazyBetsPanel({
  matchId,
  currentUserId,
  matchTiers,
}: {
  matchId: string
  currentUserId?: string
  matchTiers?: { home: number; away: number }
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [bets, setBets] = useState<BetEntry[]>([])

  async function load() {
    if (state !== 'idle') return
    setState('loading')
    const data = await getBetsForMatch(matchId)
    setBets(data)
    setState('done')
  }

  if (state === 'done') {
    return (
      <div className="border-t border-border pt-1">
        <BetsPanel bets={bets} currentUserId={currentUserId} matchTiers={matchTiers} defaultOpen />
      </div>
    )
  }

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={load}
        disabled={state === 'loading'}
        className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue/10 disabled:opacity-60"
      >
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          A galera chutou
        </span>
        {state === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : null}
      </button>
    </div>
  )
}

function matchesFilter(status: BetStatus, hasBet: boolean, filter: Filter): boolean {
  if (filter === 'todos') return true
  if (filter === 'acertei')
    return status === 'acertou_placar' || status === 'acertou_resultado'
  if (filter === 'errei') return status === 'errou'
  if (filter === 'pendentes') return status === 'pendente' || !hasBet
  return true
}

function ExtratoView({ rounds }: { rounds: Record<number, MyBetEntry[]> }) {
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b)
  const [openRounds, setOpenRounds] = useState<Set<number>>(new Set(roundNumbers))

  function toggle(r: number) {
    setOpenRounds((prev) => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r)
      else next.add(r)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {roundNumbers.map((roundNum) => {
        const entries = (rounds[roundNum] ?? []).filter((e) => e.bet)
        const finished = entries.filter((e) => e.status !== 'pendente')
        const roundTotal = finished.reduce((s, e) => s + (e.bet?.total_points ?? 0), 0)
        const isOpen = openRounds.has(roundNum)

        return (
          <div key={roundNum} className="rounded-2xl border border-border overflow-hidden">
            {/* Cabeçalho colapsável */}
            <button
              type="button"
              onClick={() => toggle(roundNum)}
              className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180',
                  )}
                />
                <span className="text-sm font-semibold">Rodada {roundNum}</span>
                <span className="text-xs text-muted-foreground">
                  {entries.length} palpite{entries.length !== 1 ? 's' : ''}
                </span>
              </div>
              {finished.length > 0 && (
                <span
                  className={cn(
                    'font-display text-sm font-bold',
                    roundTotal > 0 ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  {roundTotal > 0 ? '+' : ''}
                  {roundTotal.toFixed(2).replace('.', ',')}
                </span>
              )}
            </button>

            {/* Lista colapsável */}
            {isOpen && (
              <div className="border-t border-border px-3 pb-3 pt-2">
                {entries.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    Nenhum palpite nessa rodada.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {entries.map(({ match, bet, status }) => {
                      const home = match.home_team
                      const away = match.away_team
                      const isFinished = match.status === 'finished'

                      return (
                        <li
                          key={match.id}
                          className={cn(
                            'flex items-center gap-2 rounded-xl px-3 py-2',
                            isFinished ? 'bg-muted' : 'bg-muted/40',
                          )}
                        >
                          {/* Times */}
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <TeamFlag flagUrl={home?.flag_url ?? null} teamName={home?.name ?? '?'} size={18} />
                            <span className="text-[11px] font-semibold">
                              {home?.name?.slice(0, 3).toUpperCase()}
                            </span>
                            <span className="font-display text-xs font-bold">
                              {isFinished ? `${match.home_score ?? 0}-${match.away_score ?? 0}` : '×'}
                            </span>
                            <span className="text-[11px] font-semibold">
                              {away?.name?.slice(0, 3).toUpperCase()}
                            </span>
                            <TeamFlag flagUrl={away?.flag_url ?? null} teamName={away?.name ?? '?'} size={18} />
                          </div>

                          {/* Meu chute */}
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {bet!.predicted_home_score}-{bet!.predicted_away_score}
                          </span>

                          {/* Status + pontos */}
                          <div className="flex shrink-0 flex-col items-end gap-0.5">
                            <Badge variant={STATUS_VARIANT[status]} className="px-1.5 py-0 text-[9px]">
                              {STATUS_LABEL[status]}
                            </Badge>
                            {bet!.total_points !== null && status !== 'errou' && (
                              <span className="font-display text-[10px] font-bold text-success">
                                +{bet!.total_points.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function MyBetsView({
  rounds,
  currentUserId,
}: {
  rounds: Record<number, MyBetEntry[]>
  currentUserId?: string
}) {
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b)
  const firstRound = roundNumbers[0] ?? 1
  const [activeTab, setActiveTab] = useState<Tab>(firstRound)
  const [filter, setFilter] = useState<Filter>('todos')

  const activeRound = typeof activeTab === 'number' ? activeTab : firstRound

  const entries = rounds[activeRound] ?? []
  const filtered = entries.filter((e) => matchesFilter(e.status, !!e.bet, filter))

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs: rodadas dinâmicas + Extrato — scroll horizontal */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 scrollbar-none">
        <div className="flex w-max gap-2">
          {roundNumbers.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setActiveTab(r)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                activeTab === r
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              Rodada {r}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActiveTab('extrato')}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              activeTab === 'extrato'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            Balanço
          </button>
        </div>
      </div>

      {/* Extrato */}
      {activeTab === 'extrato' && <ExtratoView rounds={rounds} />}

      {/* Filtros de status — só nas abas de rodada */}
      {activeTab !== 'extrato' && (
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                filter === f.key
                  ? 'bg-brand-blue text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Lista — só nas abas de rodada */}
      {activeTab !== 'extrato' && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Nada aqui com esse filtro. 🤷
          </p>
        </div>
      )}
      {activeTab !== 'extrato' && filtered.length > 0 && (
        <ul className="flex flex-col gap-3">
          {filtered.map(({ match, bet, status }) => {
            const home = match.home_team
            const away = match.away_team
            const isOpen =
              match.status === 'scheduled' &&
              !(match.deadline_at && isDeadlinePassed(match.deadline_at))
            const isFinished = match.status === 'finished'
            const homeTier =
              match.home_tier_at_kickoff ?? home?.current_tier ?? 3
            const awayTier =
              match.away_tier_at_kickoff ?? away?.current_tier ?? 3

            const preview =
              bet && !isFinished
                ? previewPoints(
                    homeTier,
                    awayTier,
                    bet.predicted_home_score,
                    bet.predicted_away_score,
                  )
                : null

            return (
              <li
                key={match.id}
                className={cn(
                  'flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-shadow',
                  isOpen && 'border-brand-blue/30 shadow-sm',
                )}
              >
                {/* Cabeçalho: grupo + status do jogo */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">
                    {match.group_name ? `Grupo ${match.group_name}` : 'Fase de grupos'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isOpen && (
                      <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-semibold text-brand-blue">
                        ABERTO
                      </span>
                    )}
                    {isFinished && match.home_score !== null && (
                      <span className="font-display text-xs font-bold text-foreground">
                        {match.home_score} - {match.away_score}
                      </span>
                    )}
                  </div>
                </div>

                {/* Times */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-1 items-center gap-2">
                    <TeamFlag
                      flagUrl={home?.flag_url ?? null}
                      teamName={home?.name ?? '?'}
                      size={24}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold leading-tight">
                        {home?.name}
                      </span>
                      <TierBadge tier={homeTier as 1 | 2 | 3 | 4 | 5} />
                    </div>
                  </div>

                  <span className="shrink-0 font-display text-lg text-muted-foreground">
                    ×
                  </span>

                  <div className="flex flex-1 items-center justify-end gap-2 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold leading-tight">
                        {away?.name}
                      </span>
                      <TierBadge tier={awayTier as 1 | 2 | 3 | 4 | 5} />
                    </div>
                    <TeamFlag
                      flagUrl={away?.flag_url ?? null}
                      teamName={away?.name ?? '?'}
                      size={24}
                    />
                  </div>
                </div>

                {/* Palpite + status */}
                {bet ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Seu chute</span>
                      <span className="font-display text-base font-bold">
                        {bet.predicted_home_score}-{bet.predicted_away_score}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isFinished ? (
                        <Badge variant={STATUS_VARIANT[status]}>
                          {STATUS_LABEL[status]}
                          {bet.total_points !== null && status !== 'errou'
                            ? ` · ${bet.total_points.toFixed(2).replace('.', ',')}`
                            : ''}
                        </Badge>
                      ) : preview ? (
                        <span className="text-xs text-muted-foreground">
                          até{' '}
                          <span className="font-semibold text-success">
                            {preview.ifExact.toFixed(2).replace('.', ',')} pts
                          </span>
                        </span>
                      ) : (
                        <Badge variant="travado">Pendente</Badge>
                      )}
                    </div>
                  </div>
                ) : isOpen ? (
                  <div className="rounded-xl border border-dashed border-brand-blue/40 px-3 py-2.5 text-center">
                    <Button asChild size="sm" variant="outline" className="border-brand-blue text-brand-blue hover:bg-brand-blue/10">
                      <Link href={`/grupos/rodada/${match.round_number ?? 1}`}>
                        Palpitar!
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                    Sem palpite 😬
                  </div>
                )}

                {/* Rodapé: data + ações */}
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {formatKickoff(match.kickoff_at)}
                  </span>
                  {bet && (
                    <div className="flex items-center gap-1">
                      {isOpen && (
                        <EditBetDialog match={match} currentBet={bet} />
                      )}
                      <ShareBetButton
                        homeTeam={home?.name ?? '?'}
                        awayTeam={away?.name ?? '?'}
                        homeScore={bet.predicted_home_score}
                        awayScore={bet.predicted_away_score}
                        homeFlagUrl={home?.flag_url}
                        awayFlagUrl={away?.flag_url}
                        groupName={match.group_name}
                      />
                    </div>
                  )}
                </div>

                {/* Palpites da galera — carregados sob demanda após deadline */}
                {!isOpen && (
                  <LazyBetsPanel
                    matchId={match.id}
                    currentUserId={currentUserId}
                    matchTiers={{ home: homeTier, away: awayTier }}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
