import { Ticket, BarChart2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BracketSVG } from '@/components/bracket/bracket-svg'
import { getTournamentState, getGoldenTicket, getGoldenTicketPoints } from '@/lib/actions/golden-ticket'
import { getKnockoutMatches } from '@/lib/actions/knockout'
import { isTicketEditable } from '@/lib/constants'
import { TICKET_POINTS, TICKET_CHAMPION_POINTS } from '@/lib/constants'
import type { GoldenTicketPredictions, MatchWithTeams } from '@/types'

export const dynamic = 'force-dynamic'

export default async function BilhetePremiadoPage() {
  const supabase = await createClient()

  // Verificar se é admin — se não for, mostra manutenção para usuários normais
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center gap-3 container py-12 text-center">
        <Ticket className="h-10 w-10 text-muted-foreground/50" />
        <h1 className="text-xl font-bold">Bilhete Premiado</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Estamos preparando tudo pra você! 🔧 Volta em breve.
        </p>
      </div>
    )
  }

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
    <div className="container py-4 pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-bold font-display">
          <Ticket className="h-5 w-5" />
          Bilhete Premiado
        </h1>
        {isLocked ? (
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Bilhete travado. Torce e reza. 🙏
            {lockedAt && (
              <span className="ml-1 text-xs">
                (travado em {new Date(lockedAt).toLocaleDateString('pt-BR')})
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Monta o teu chaveamento dos sonhos 🏆 — clica em <strong>Alterar Bilhete</strong> para editar e depois <strong>Salvar</strong>.
          </p>
        )}
      </div>

      {/* Pontuação do bilhete */}
      {ticketPoints > 0 && (
        <div className="rounded-xl border border-[var(--primary)] bg-amber-50 p-4 mb-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">Seus pontos no bilhete</p>
          <p className="text-3xl font-bold font-display text-[var(--primary-fg)]">
            {ticketPoints.toFixed(1)} pts
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            dá pra chegar em {16 + 16 + 20 + 10 + 5 + 10} pts
          </p>
        </div>
      )}

      {/* Tabela de pontuação */}
      <details className="mb-4 border border-[var(--border)] rounded-lg">
        <summary className="flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer">
          <BarChart2 className="h-4 w-4" /> Como funciona isso aqui
        </summary>
        <div className="px-4 pb-3">
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="text-[var(--text-secondary)] border-b border-[var(--border)]">
                <th className="text-left py-1">Fase</th>
                <th className="text-right py-1">Pts/acerto</th>
                <th className="text-right py-1">Máx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {[
                { label: '16-avos', pts: TICKET_POINTS.r32, matches: 16 },
                { label: 'Oitavas', pts: TICKET_POINTS.r16, matches: 8 },
                { label: 'Quartas', pts: TICKET_POINTS.qf, matches: 4 },
                { label: 'Semis', pts: TICKET_POINTS.sf, matches: 2 },
                { label: 'Final', pts: TICKET_POINTS.final, matches: 1 },
                { label: 'Campeão (bônus)', pts: TICKET_CHAMPION_POINTS, matches: 1 },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="py-1">{row.label}</td>
                  <td className="text-right">{row.pts} pts</td>
                  <td className="text-right font-medium">{row.pts * row.matches} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Bracket SVG */}
      {r32Matches.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">
          <p>Os confrontos ainda não saíram do forno. 🔥</p>
          <p className="text-xs mt-1">Aguarda o admin configurar os jogos. 🙏</p>
        </div>
      ) : (
        <BracketSVG
          r32Matches={r32Matches as MatchWithTeams[]}
          initial={predictions}
          readOnly={isLocked}
          actualResults={actualResults}
        />
      )}
    </div>
  )
}
