import { Users } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { CompetitorsBetsList } from '@/components/competitors-bets-list'
import { getTodayMatchesWithAllBets } from '@/lib/actions/bets'

const TZ = 'America/Fortaleza'

function matchDateLabel(matches: { match: { kickoff_at: string } }[]): string {
  const uniqueDates = [
    ...new Set(
      matches.map((m) =>
        formatInTimeZone(m.match.kickoff_at, TZ, 'dd MMM', { locale: ptBR }),
      ),
    ),
  ]
  return uniqueDates.join(' – ')
}

export async function CompetitorsBetsSection() {
  const todayMatches = await getTodayMatchesWithAllBets()

  if (todayMatches.length === 0) return null

  const dateLabel = matchDateLabel(todayMatches)
  const count = todayMatches.length

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-brand-blue" />
        <div>
          <h2 className="font-display text-lg font-bold leading-tight">
            Palpites da galera
          </h2>
          <p className="text-xs text-muted-foreground">
            {dateLabel} · {count} jogo{count > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <CompetitorsBetsList matches={todayMatches} />
    </section>
  )
}
