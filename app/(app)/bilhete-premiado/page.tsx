import { Ticket, BarChart2, Lock, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Container } from '@/components/layout/container'
import { Badge } from '@/components/ui/badge'
import { BracketSVG } from '@/components/bracket/bracket-svg'
import { getTournamentState, getGoldenTicket, getGoldenTicketPoints } from '@/lib/actions/golden-ticket'
import { getKnockoutMatches } from '@/lib/actions/knockout'
import { isTicketEditable, TICKET_EDIT_DEADLINE } from '@/lib/constants'
import { TICKET_POINTS, TICKET_CHAMPION_POINTS } from '@/lib/constants'
import { formatKickoff } from '@/lib/datetime'
import type { GoldenTicketPredictions, MatchWithTeams } from '@/types'

const MAX_TICKET_POINTS =
  TICKET_POINTS.r32 * 16 +
  TICKET_POINTS.r16 * 8 +
  TICKET_POINTS.qf * 4 +
  TICKET_POINTS.sf * 2 +
  TICKET_POINTS.final * 1 +
  TICKET_CHAMPION_POINTS

export const dynamic = 'force-dynamic'

export default async function BilhetePremiadoPage() {
  const supabase = await createClient()

  const tournamentState = await getTournamentState()

  const { data: { user } } = await supabase.auth.getUser()

  // Carrega dados em paralelo
  const [r32Matches, ticket, ticketPoints] = await Promise.all([
    getKnockoutMatches('r32'),
    user ? getGoldenTicket() : null,
    user ? getGoldenTicketPoints() : 0,
  ])

  const predictions: GoldenTicketPredictions = (ticket?.predictions as GoldenTicketPredictions) ?? {
    r32: {},
    r16: {},
    qf: {},
    sf: {},
    champion: null,
  }

  const isLocked = !tournamentState || !isTicketEditable(tournamentState)
  const lockedAt = ticket?.locked_at
  const deadlineLabel = formatKickoff(TICKET_EDIT_DEADLINE)
  const pointsPct = Math.min(100, Math.round((ticketPoints / MAX_TICKET_POINTS) * 100))
  const pointsLabel = Number.isInteger(ticketPoints) ? `${ticketPoints}` : ticketPoints.toFixed(1)

  // Resultados reais para badges (acertou/errou)
  const actualResults = await (async () => {
    const { data } = await supabase
      .from('matches')
      .select('phase, advancing_team_id')
      .not('phase', 'eq', 'group')
      .eq('status', 'finished')
      .not('advancing_team_id', 'is', null)

    type KnockoutPhase = 'r32' | 'r16' | 'qf' | 'sf' | 'final'
    return (data ?? [])
      .filter((m): m is typeof m & { advancing_team_id: string } => m.advancing_team_id !== null)
      .map((m) => ({
        phase: m.phase as KnockoutPhase,
        advancing_team_id: m.advancing_team_id,
      }))
  })()

  return (
    <Container className="py-6 pb-8">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold font-display leading-tight">
              <Ticket className="h-6 w-6 text-brand-yellow shrink-0" aria-hidden />
              Bilhete Premiado
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monta o teu chaveamento dos sonhos 🏆
            </p>
          </div>
          {isLocked ? (
            <Badge variant="travado" className="gap-1 shrink-0">
              <Lock className="h-3 w-3" aria-hidden /> Travado
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1 shrink-0">
              <Clock className="h-3 w-3" aria-hidden /> Aberto
            </Badge>
          )}
        </div>

        {/* Pontos + progresso */}
        <div className="mt-4 rounded-xl bg-muted p-3">
          <div className="flex items-end justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Seus pontos</span>
            <span className="text-xs text-muted-foreground">máx {MAX_TICKET_POINTS} pts</span>
          </div>
          <p className="font-display text-3xl font-bold leading-none mt-1">
            {pointsLabel}
            <span className="text-base font-semibold text-muted-foreground"> / {MAX_TICKET_POINTS} pts</span>
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border" aria-hidden>
            <div
              className="h-full rounded-full bg-brand-green transition-all"
              style={{ width: `${pointsPct}%` }}
            />
          </div>
        </div>

        {/* Status / deadline */}
        {isLocked ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Bilhete travado. Torce e reza. 🙏
            {lockedAt && (
              <span>(em {new Date(lockedAt).toLocaleDateString('pt-BR')})</span>
            )}
          </p>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
            Dá pra editar até <strong className="text-foreground">{deadlineLabel}</strong>
          </p>
        )}
      </div>

      {/* Tabela de pontuação */}
      <details className="mb-4 rounded-2xl border border-border bg-card group">
        <summary className="flex items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer select-none">
          <BarChart2 className="h-4 w-4 text-brand-blue" aria-hidden /> Como funciona a pontuação
        </summary>
        <div className="px-4 pb-3">
          <table className="w-full text-xs mt-1">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-1.5">Fase</th>
                <th className="text-right py-1.5">Pts/acerto</th>
                <th className="text-right py-1.5">Máx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { label: '16-avos', pts: TICKET_POINTS.r32, matches: 16 },
                { label: 'Oitavas', pts: TICKET_POINTS.r16, matches: 8 },
                { label: 'Quartas', pts: TICKET_POINTS.qf, matches: 4 },
                { label: 'Semis', pts: TICKET_POINTS.sf, matches: 2 },
                { label: 'Final', pts: TICKET_POINTS.final, matches: 1 },
                { label: 'Campeão (bônus)', pts: TICKET_CHAMPION_POINTS, matches: 1 },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="py-1.5">{row.label}</td>
                  <td className="text-right">{row.pts} pts</td>
                  <td className="text-right font-medium font-display">{row.pts * row.matches} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Bracket SVG */}
      {r32Matches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-4xl" aria-hidden>🔥</span>
          <p className="text-sm font-semibold">Os confrontos ainda não saíram do forno.</p>
          <p className="text-xs text-muted-foreground">Aguarda o admin configurar os jogos. 🙏</p>
        </div>
      ) : (
        <BracketSVG
          r32Matches={r32Matches as MatchWithTeams[]}
          initial={predictions}
          readOnly={isLocked}
          actualResults={actualResults}
        />
      )}
    </Container>
  )
}
