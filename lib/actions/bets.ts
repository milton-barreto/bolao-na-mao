'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Bet, BetStatus, MatchWithTeams } from '@/types'

export type SaveBetResult =
  | { success: true; bet: Bet }
  | { error: string }

export interface BetEntry {
  bet_id: string
  user_id: string
  user_name: string
  user_avatar_url: string | null
  predicted_home_score: number
  predicted_away_score: number
  base_points: number | null
  total_points: number | null
  status: BetStatus
}

export interface MyBetEntry {
  match: MatchWithTeams
  bet: Bet | null
  status: BetStatus
}

// =============================================================
// SAVE BET
// Valida deadline server-side — NUNCA confiar no client.
// =============================================================
export async function saveBet(
  matchId: string,
  predictedHome: number,
  predictedAway: number,
): Promise<SaveBetResult> {
  const supabase = await createClient()

  // Autenticação
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Faz login primeiro, mano.' }

  // Validação server-side do deadline + round_number numa única query
  const { data: match } = await supabase
    .from('matches')
    .select('deadline_at, status, round_number')
    .eq('id', matchId)
    .single()

  if (!match) return { error: 'Jogo não encontrado.' }

  const isLocked =
    match.status !== 'scheduled' ||
    (match.deadline_at !== null && new Date(match.deadline_at) < new Date())

  if (isLocked) return { error: 'Deadline passou, mano. Esse jogo tá travado.' }

  // Upsert
  const { data: bet, error: upsertError } = await supabase
    .from('bets')
    .upsert(
      {
        user_id: user.id,
        match_id: matchId,
        predicted_home_score: predictedHome,
        predicted_away_score: predictedAway,
        base_points: null,
        odd_multiplier: null,
        total_points: null,
      },
      { onConflict: 'user_id,match_id' },
    )
    .select()
    .single()

  if (upsertError || !bet) {
    console.error('saveBet:', upsertError)
    return { error: 'Não salvou. Tenta de novo.' }
  }

  if (match.round_number) {
    revalidatePath(`/grupos/rodada/${match.round_number}`)
  }
  revalidatePath('/')

  return { success: true, bet: bet as Bet }
}

// =============================================================
// GET BETS FOR MATCH
// Próprios palpites: sempre.
// Palpites alheios: só após deadline.
// =============================================================
export async function getBetsForMatch(matchId: string): Promise<BetEntry[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Verifica se o deadline já passou
  const { data: match } = await supabase
    .from('matches')
    .select('deadline_at, home_score, away_score, status')
    .eq('id', matchId)
    .single()

  if (!match) return []

  const deadlinePassed =
    match.status === 'finished' ||
    match.status === 'live' ||
    (match.deadline_at !== null && new Date(match.deadline_at) < new Date())

  // Busca bets com profile do usuário
  const { data: bets } = await supabase
    .from('bets')
    .select(
      `*, profiles:user_id (name, avatar_url)`,
    )
    .eq('match_id', matchId)
    .order('total_points', { ascending: false, nullsFirst: false })

  if (!bets) return []

  return bets
    // Se deadline não passou, só mostrar o bet do próprio usuário
    .filter((b) => deadlinePassed || b.user_id === user?.id)
    .map((b) => {
      const profile = b.profiles as { name: string; avatar_url: string | null } | null

      // Calcular BetStatus
      let status: BetStatus = 'pendente'
      if (b.base_points !== null) {
        if (b.base_points >= 2) status = 'acertou_placar'
        else if (b.base_points >= 1) status = 'acertou_resultado'
        else status = 'errou'
      }

      return {
        bet_id: b.id,
        user_id: b.user_id ?? '',
        user_name: profile?.name ?? 'Usuário',
        user_avatar_url: profile?.avatar_url ?? null,
        predicted_home_score: b.predicted_home_score,
        predicted_away_score: b.predicted_away_score,
        base_points: b.base_points ?? null,
        total_points: b.total_points ?? null,
        status,
      } satisfies BetEntry
    })
}

// =============================================================
// GET NEXT MATCHES WITH ALL BETS
// Próximos jogos (deadline passado) com palpites de todos — para
// a seção "Palpites da galera" na home.
// =============================================================
export async function getNextMatchesWithAllBets(limit = 3): Promise<
  Array<{
    match: MatchWithTeams
    bets: BetEntry[]
    deadlinePassed: boolean
  }>
> {
  const supabase = await createClient()
  const now = new Date()

  // Jogos cuja deadline já passou, mais próximos do kickoff
  const { data: matches } = await supabase
    .from('matches')
    .select(
      `*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)`,
    )
    .eq('phase', 'group')
    .not('status', 'eq', 'cancelled')
    .lt('deadline_at', now.toISOString())
    .order('kickoff_at', { ascending: false })
    .limit(limit)

  if (!matches?.length) return []

  const typedMatches = (matches as MatchWithTeams[]).reverse()

  const results = await Promise.all(
    typedMatches.map(async (match) => {
      const deadlinePassed =
        match.status === 'live' ||
        match.status === 'finished' ||
        (match.deadline_at !== null && new Date(match.deadline_at) < now)
      const bets = deadlinePassed ? await getBetsForMatch(match.id) : []
      return { match, bets, deadlinePassed }
    }),
  )

  return results
}

// =============================================================
// GET TODAY MATCHES WITH ALL BETS
// Todos os jogos de hoje (fuso Fortaleza UTC-3) com palpites
// revelados — para a seção "Palpites da galera" na home.
// =============================================================
export async function getTodayMatchesWithAllBets(): Promise<
  Array<{
    match: MatchWithTeams
    bets: BetEntry[]
    deadlinePassed: boolean
  }>
> {
  const supabase = await createClient()
  const now = new Date()

  // Limites do "hoje" em America/Fortaleza (UTC-3, sem DST)
  const fortalezaMs = now.getTime() - 3 * 60 * 60 * 1000
  const ftz = new Date(fortalezaMs)
  const y = ftz.getUTCFullYear()
  const mo = ftz.getUTCMonth()
  const d = ftz.getUTCDate()
  // Meia-noite Fortaleza = 03:00 UTC; recua 3h para incluir jogos do dia anterior
  // que começaram até 23h59 (kickoff às 23h ainda aparece nas 3h seguintes do dia)
  const startUtc = new Date(Date.UTC(y, mo, d, 0, 0, 0, 0))
  const endUtc = new Date(Date.UTC(y, mo, d + 1, 3, 0, 0, 0))

  const { data: matches } = await supabase
    .from('matches')
    .select(
      `*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)`,
    )
    .not('status', 'eq', 'cancelled')
    .gte('kickoff_at', startUtc.toISOString())
    .lt('kickoff_at', endUtc.toISOString())
    .order('kickoff_at', { ascending: true })

  if (!matches?.length) return []

  const results = await Promise.all(
    (matches as MatchWithTeams[]).map(async (match) => {
      const deadlinePassed =
        match.status === 'live' ||
        match.status === 'finished' ||
        (match.deadline_at !== null && new Date(match.deadline_at) < now)
      const bets = deadlinePassed ? await getBetsForMatch(match.id) : []
      return { match, bets, deadlinePassed }
    }),
  )

  return results
}

// =============================================================
// GET MY BETS
// Todos os palpites do usuário logado, com o match completo.
// Filtro opcional por fase e rodada.
// =============================================================
export async function getMyBets(
  phase?: string,
  round?: number,
): Promise<MyBetEntry[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // Busca jogos da fase/rodada solicitada
  let matchQuery = supabase
    .from('matches')
    .select(
      `*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)`,
    )
    .order('kickoff_at', { ascending: true })

  if (phase) matchQuery = matchQuery.eq('phase', phase)
  if (round !== undefined) matchQuery = matchQuery.eq('round_number', round)

  const { data: matches } = await matchQuery
  if (!matches?.length) return []

  // Busca bets do usuário nesses jogos
  const matchIds = matches.map((m) => m.id)
  const { data: bets } = await supabase
    .from('bets')
    .select('*')
    .eq('user_id', user.id)
    .in('match_id', matchIds)

  const betByMatchId = new Map((bets ?? []).map((b) => [b.match_id, b]))

  return matches.map((match) => {
    const bet = (betByMatchId.get(match.id) ?? null) as Bet | null

    let status: BetStatus = 'pendente'
    if (bet?.base_points !== null && bet?.base_points !== undefined) {
      if (bet.base_points >= 2) status = 'acertou_placar'
      else if (bet.base_points >= 1) status = 'acertou_resultado'
      else status = 'errou'
    }

    return {
      match: match as MatchWithTeams,
      bet,
      status,
    }
  })
}
