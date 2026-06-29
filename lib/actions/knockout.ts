'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Bet, BetStatus, KnockoutBetEntry, MatchWithTeams } from '@/types'

export type SaveKnockoutBetResult =
  | { success: true; bet: Bet }
  | { error: string }

// =============================================================
// GET KNOCKOUT MATCHES
// Retorna jogos do mata-mata de uma fase específica,
// com times e palpite do usuário logado.
// =============================================================
export async function getKnockoutMatches(phase?: string): Promise<MatchWithTeams[]> {
  const supabase = await createClient()

  let query = supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*),
      advancing_team:teams!matches_advancing_team_id_fkey(*)
    `)
    .not('phase', 'eq', 'group')
    .order('kickoff_at', { ascending: true })
    .order('bracket_slot', { ascending: true, nullsFirst: false })

  if (phase) {
    query = query.eq('phase', phase)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as MatchWithTeams[]
}

// =============================================================
// SAVE KNOCKOUT BET
// Igual ao saveBet do grupo, mas inclui predicted_advancing_team_id.
// =============================================================
export async function saveKnockoutBet(
  matchId: string,
  predictedHome: number,
  predictedAway: number,
  predictedAdvancingTeamId: string,
): Promise<SaveKnockoutBetResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Faz login primeiro, mano.' }

  // Validação server-side do deadline
  const { data: match } = await supabase
    .from('matches')
    .select('deadline_at, status, phase')
    .eq('id', matchId)
    .single()

  if (!match) return { error: 'Jogo não encontrado.' }

  // Mata-mata: somente jogos que não são da fase de grupos
  if (match.phase === 'group') {
    return { error: 'Use a tela de rodadas para jogos da fase de grupos.' }
  }

  const isLocked =
    match.status !== 'scheduled' ||
    (match.deadline_at !== null && new Date(match.deadline_at) < new Date())

  if (isLocked) return { error: 'Deadline passou, mano. Esse jogo tá travado.' }

  // Valida que o time escolhido é um dos dois times do jogo
  const { data: matchTeams } = await supabase
    .from('matches')
    .select('home_team_id, away_team_id')
    .eq('id', matchId)
    .single()

  if (
    matchTeams &&
    predictedAdvancingTeamId !== matchTeams.home_team_id &&
    predictedAdvancingTeamId !== matchTeams.away_team_id
  ) {
    return { error: 'Time inválido para esse jogo.' }
  }

  // Upsert
  const { data: bet, error: upsertError } = await supabase
    .from('bets')
    .upsert(
      {
        user_id: user.id,
        match_id: matchId,
        predicted_home_score: predictedHome,
        predicted_away_score: predictedAway,
        predicted_advancing_team_id: predictedAdvancingTeamId,
        base_points: null,
        odd_multiplier: null,
        total_points: null,
      },
      { onConflict: 'user_id,match_id' },
    )
    .select()
    .single()

  if (upsertError || !bet) {
    return { error: 'Erro ao salvar. Tenta de novo.' }
  }

  revalidatePath('/mata-mata')
  revalidatePath('/minhas-apostas')
  return { success: true, bet }
}

// =============================================================
// GET KNOCKOUT BETS FOR MATCH
// Retorna palpites de todos os usuários para um jogo (pós deadline).
// =============================================================
export async function getKnockoutBetsForMatch(
  matchId: string,
): Promise<KnockoutBetEntry[]> {
  const supabase = await createClient()

  // Verifica deadline antes de expor os palpites alheios
  const { data: match } = await supabase
    .from('matches')
    .select('deadline_at')
    .eq('id', matchId)
    .single()

  if (!match?.deadline_at) return []

  const deadlinePassed = new Date(match.deadline_at) < new Date()
  if (!deadlinePassed) return []

  const { data, error } = await supabase
    .from('bets')
    .select(`
      id,
      user_id,
      match_id,
      predicted_home_score,
      predicted_away_score,
      predicted_advancing_team_id,
      base_points,
      odd_multiplier,
      total_points,
      profiles!bets_user_id_fkey(name, avatar_url)
    `)
    .eq('match_id', matchId)
    .order('total_points', { ascending: false, nullsFirst: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    user_id: row.user_id ?? '',
    match_id: row.match_id ?? '',
    predicted_home_score: row.predicted_home_score,
    predicted_away_score: row.predicted_away_score,
    predicted_advancing_team_id: row.predicted_advancing_team_id,
    base_points: row.base_points,
    odd_multiplier: row.odd_multiplier,
    total_points: row.total_points,
    user_name: (row.profiles as { name: string } | null)?.name ?? '?',
    user_avatar: (row.profiles as { avatar_url: string | null } | null)?.avatar_url ?? null,
  }))
}

// =============================================================
// GET MY KNOCKOUT BETS
// Retorna palpites de mata-mata do usuário logado.
// =============================================================
export async function getMyKnockoutBets(phase?: string): Promise<{
  match: MatchWithTeams
  bet: Bet | null
  status: BetStatus
}[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let matchQuery = supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*),
      advancing_team:teams!matches_advancing_team_id_fkey(*)
    `)
    .not('phase', 'eq', 'group')
    .order('kickoff_at', { ascending: true })

  if (phase) matchQuery = matchQuery.eq('phase', phase)

  const { data: matches } = await matchQuery
  if (!matches) return []

  // Busca bets do usuário para esses jogos
  const matchIds = matches.map((m) => m.id)
  const { data: bets } = await supabase
    .from('bets')
    .select('*')
    .eq('user_id', user.id)
    .in('match_id', matchIds)

  const betsByMatchId = new Map((bets ?? []).map((b) => [b.match_id, b]))

  return matches.map((match) => {
    const bet = betsByMatchId.get(match.id) ?? null
    let status: BetStatus = 'pendente'

    if (bet) {
      if (bet.base_points === 2) status = 'acertou_placar'
      else if (bet.base_points === 1) status = 'acertou_resultado'
      else if (bet.base_points === 0) status = 'errou'
    }

    return { match: match as MatchWithTeams, bet, status }
  })
}
