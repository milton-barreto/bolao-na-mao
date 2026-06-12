import { Users } from 'lucide-react'
import { CompetitorsBetsList } from '@/components/competitors-bets-list'
import { getTodayMatchesWithAllBets } from '@/lib/actions/bets'

export async function CompetitorsBetsSection() {
  const todayMatches = await getTodayMatchesWithAllBets()

  if (todayMatches.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-brand-blue" />
        <div>
          <h2 className="font-display text-lg font-bold leading-tight">
            Palpites da galera
          </h2>
          <p className="text-xs text-muted-foreground">
            Jogos de hoje · {todayMatches.length} jogo{todayMatches.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <CompetitorsBetsList matches={todayMatches} />
    </section>
  )
}
