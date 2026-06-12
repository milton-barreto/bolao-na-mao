'use server'

import { unstable_cache } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env'
import type { Database } from '@/lib/supabase/types'
import type { RankingEntry } from '@/types'

type CachedRankingEntry = Omit<RankingEntry, 'isCurrentUser'>

function createClient() {
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

async function computeRanking(): Promise<CachedRankingEntry[]> {
  const supabase = createClient()

  // 1. Fonte de verdade: todos os usuários registrados no auth
  //    (garante que quem não tem linha em `profiles` também apareça)
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 200 })
  const authUsers = authData?.users ?? []
  if (authUsers.length === 0) return []

  // 2. Profiles: nome, avatar e metadados (podem estar incompletos para alguns)
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, is_admin, created_at, last_rank')

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]))

  // 3. Constrói lista unificada de usuários
  const allUsers = authUsers.map((u) => {
    const profile = profileMap.get(u.id)
    return {
      id: u.id,
      name: profile?.name ?? u.email?.split('@')[0] ?? 'Usuário',
      avatar_url: profile?.avatar_url ?? null,
      is_admin: profile?.is_admin ?? false,
      created_at: profile?.created_at ?? (u.created_at as string | null) ?? null,
      last_rank: profile?.last_rank ?? null,
    }
  })

  // 4. Bets de jogos não-cancelados
  const { data: bets, error: betsError } = await supabase
    .from('bets')
    .select('user_id, total_points, base_points, match_id, matches!bets_match_id_fkey(status)')

  if (betsError) return []

  // 5. Agrega pontos por usuário
  const statsMap = new Map<string, {
    total_points: number
    bets_count: number
    acertou_placar_count: number
    acertou_resultado_count: number
  }>()

  for (const u of allUsers) {
    statsMap.set(u.id, { total_points: 0, bets_count: 0, acertou_placar_count: 0, acertou_resultado_count: 0 })
  }

  for (const bet of bets ?? []) {
    if (!bet.user_id) continue
    const matchStatus = (bet.matches as { status: string | null } | null)?.status
    const isCancelled = matchStatus === 'cancelled'
    const entry = statsMap.get(bet.user_id)
    if (!entry) continue

    if (!isCancelled) entry.bets_count++
    if (bet.total_points) entry.total_points += bet.total_points
    if (bet.base_points === 2) entry.acertou_placar_count++
    else if (bet.base_points === 1) entry.acertou_resultado_count++
  }

  // 6. Monta e ordena
  const ranked = allUsers.map((u) => {
    const stats = statsMap.get(u.id) ?? { total_points: 0, bets_count: 0, acertou_placar_count: 0, acertou_resultado_count: 0 }
    return { user: u, ...stats, position: 0 }
  })

  ranked.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    return a.user.name.localeCompare(b.user.name, 'pt-BR')
  })

  // 7. Pontos do Bilhete Premiado
  const ticketResults = await Promise.all(
    allUsers.map(async (u) => {
      try {
        const { data } = await supabase.rpc('calculate_golden_ticket_points', { p_user_id: u.id })
        return { userId: u.id, pts: (data as number) ?? 0 }
      } catch {
        return { userId: u.id, pts: 0 }
      }
    }),
  )
  const ticketMap = new Map(ticketResults.map((r) => [r.userId, r.pts]))
  for (const entry of ranked) {
    entry.total_points += ticketMap.get(entry.user.id) ?? 0
  }

  // 8. Re-ordena após bilhete
  ranked.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    return a.user.name.localeCompare(b.user.name, 'pt-BR')
  })

  // 9. Dense rank: empate = mesma posição, próximo grupo +1 (não pula)
  let pos = 1
  for (let i = 0; i < ranked.length; i++) {
    if (i > 0 && ranked[i].total_points < ranked[i - 1].total_points) pos++
    ranked[i].position = pos
  }

  return ranked
}

const getCachedRanking = unstable_cache(computeRanking, ['ranking'], {
  revalidate: 60,
  tags: ['ranking'],
})

export async function getRanking(currentUserId?: string): Promise<RankingEntry[]> {
  const raw = await getCachedRanking()
  return raw.map((e) => ({ ...e, isCurrentUser: e.user.id === currentUserId }))
}
