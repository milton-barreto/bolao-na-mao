import { createClient } from '@/lib/supabase/server'
import { BracketSVG } from '@/components/bracket/bracket-svg'
import { getTournamentState, getGoldenTicket, getGoldenTicketPoints } from '@/lib/actions/golden-ticket'
import { getKnockoutMatches } from '@/lib/actions/knockout'
import { isTicketEditable } from '@/lib/constants'
import { TICKET_POINTS, TICKET_CHAMPION_POINTS } from '@/lib/constants'
import type { GoldenTicketPredictions, MatchWithTeams } from '@/types'

export const dynamic = 'force-dynamic'

export default async function BilhetePremiadoPage() {
  const tournamentState = await getTournamentState()

  // Mostrar aviso se ainda fase de grupos
  if (tournamentState === 'group') {
    return (
      <div className="container py-12 text-center space-y-3">
        <span className="text-4xl">🎟️</span>
        <h1 className="text-xl font-bold">Bilhete Premiado</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Disponível quando o sorteio dos 16-avos for definido (fim da fase de grupos).
        </p>
      </div>
    )
  }

  const supabase = await createClient()
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

  const isLocked = !isTicketEditable(tournamentState as any)
  const lockedAt = ticket?.locked_at

  // Resultados reais para badges (acertou/errou)
  const actualResults = await (async () => {
    const { data } = await supabase
      .from('matches')
      .select('phase, advancing_team_id')
      .not('phase', 'eq', 'group')
      .eq('status', 'finished')
      .not('advancing_team_id', 'is', null)

    return (data ?? []).map((m) => ({
      phase: m.phase as 'r32' | 'r16' | 'qf' | 'sf' | 'final',
      advancing_team_id: m.advancing_team_id!,
    }))
  })()

  return (
    <div className="container py-4 pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold font-display">🎟️ Bilhete Premiado</h1>
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
            Monta o teu chaveamento dos sonhos 🏆 — salva automaticamente a cada clique.
          </p>
        )}
      </div>

      {/* Pontuação do bilhete */}
      {ticketPoints > 0 && (
        <div className="rounded-xl border border-[var(--primary)] bg-amber-50 p-4 mb-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">Pontos do bilhete</p>
          <p className="text-3xl font-bold font-display text-[var(--primary-fg)]">
            {ticketPoints.toFixed(1)} pts
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Máximo possível: {16 + 16 + 20 + 10 + 5 + 10} pts
          </p>
        </div>
      )}

      {/* Tabela de pontuação */}
      <details className="mb-4 border border-[var(--border)] rounded-lg">
        <summary className="px-4 py-2 text-sm font-medium cursor-pointer">
          📊 Como funciona a pontuação
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
          <p>Os confrontos dos 16-avos ainda não foram definidos.</p>
          <p className="text-xs mt-1">O admin precisa semear os jogos de mata-mata.</p>
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
