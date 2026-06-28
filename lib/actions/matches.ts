'use server'

import { createClient } from '@/lib/supabase/server'
import type { MatchWithTeams } from '@/types'

/**
 * Próximos jogos com deadline > now() que o usuário logado ainda não apostou.
 * Usado na Home. Limita a `limit` (default 5).
 */
export async function getUpcomingMatches(limit = 5): Promise<MatchWithTeams[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // IDs dos jogos que o usuário já apostou
  let bettedMatchIds: string[] = []
  if (user) {
    const { data: bets } = await supabase
      .from('bets')
      .select('match_id')
      .eq('user_id', user.id)
    bettedMatchIds = (bets ?? [])
      .map((b) => b.match_id)
      .filter(Boolean) as string[]
  }

  let query = supabase
    .from('matches')
    .select(
      `*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)`,
    )
    .eq('phase', 'group')
    .gt('deadline_at', new Date().toISOString())
    .in('status', ['scheduled', 'live'])
    .order('kickoff_at', { ascending: true })
    .limit(limit)

  if (bettedMatchIds.length > 0) {
    query = query.not('id', 'in', `(${bettedMatchIds.map((id) => `"${id}"`).join(',')})`)
  }

  const { data, error } = await query
  if (error) {
    console.error('getUpcomingMatches:', error)
    return []
  }
  return (data ?? []) as MatchWithTeams[]
}

/**
 * Todos os jogos de uma rodada da fase de grupos,
 * ordenados por horário. Inclui times completos.
 */
export async function getMatchesByRound(round: number): Promise<MatchWithTeams[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('matches')
    .select(
      `*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)`,
    )
    .eq('phase', 'group')
    .eq('round_number', round)
    .order('kickoff_at', { ascending: true })

  if (error) {
    console.error('getMatchesByRound:', error)
    return []
  }
  return (data ?? []) as MatchWithTeams[]
}

/**
 * Um jogo completo com seus times.
 * Usado pelo saveBet para validar o deadline server-side.
 */
export async function getMatchById(
  matchId: string,
): Promise<MatchWithTeams | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('matches')
    .select(
      `*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)`,
    )
    .eq('id', matchId)
    .single()

  if (error) return null
  return data as MatchWithTeams
}
