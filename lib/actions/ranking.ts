'use server'

import { createClient } from '@/lib/supabase/server'
import type { RankingEntry } from '@/types'

/**
 * Retorna o ranking completo ordenado por pontos.
 * Empates → mesma posição (dense rank).
 * Jogos cancelados são excluídos da soma.
 *
 * Quem invocar deve passar o userId do usuário logado para
 * que o campo isCurrentUser seja preenchido.
 */
export async function getRanking(currentUserId?: string): Promise<RankingEntry[]> {
  const supabase = await createClient()

  // Query todos os profiles com JOIN em bets (excluindo jogos cancelados)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, is_admin, created_at')
    .order('name')

  if (profilesError || !profiles) return []

  // Busca bets de jogos não-cancelados
  const { data: bets, error: betsError } = await supabase
    .from('bets')
    .select('user_id, total_points, base_points, match_id, matches!bets_match_id_fkey(status)')

  if (betsError) return []

  // Agrega por usuário
  const userMap = new Map<string, {
    total_points: number
    bets_count: number
    acertou_placar_count: number
    acertou_resultado_count: number
  }>()

  for (const p of profiles) {
    userMap.set(p.id, {
      total_points: 0,
      bets_count: 0,
      acertou_placar_count: 0,
      acertou_resultado_count: 0,
    })
  }

  for (const bet of bets ?? []) {
    if (!bet.user_id) continue
    // Excluir palpites de jogos cancelados da contagem de bets_count
    // total_points já é 0 para cancelados (função admin_cancel_match zera)
    // mas não queremos contar como "palpite" no totalizador
    const matchStatus = (bet.matches as { status: string | null } | null)?.status
    const isCancelled = matchStatus === 'cancelled'

    const entry = userMap.get(bet.user_id)
    if (!entry) continue

    if (!isCancelled) {
      entry.bets_count++
    }

    if (bet.total_points) {
      entry.total_points += bet.total_points
    }
    if (bet.base_points === 2) {
      entry.acertou_placar_count++
    } else if (bet.base_points === 1) {
      entry.acertou_resultado_count++
    }
  }

  // Monta lista e ordena por pontos DESC, depois nome ASC (desempate de exibição)
  const ranked = profiles.map((p) => {
    const stats = userMap.get(p.id) ?? {
      total_points: 0,
      bets_count: 0,
      acertou_placar_count: 0,
      acertou_resultado_count: 0,
    }
    return {
      user: p,
      ...stats,
      position: 0,
      isCurrentUser: p.id === currentUserId,
    }
  })

  ranked.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    return a.user.name.localeCompare(b.user.name, 'pt-BR')
  })

  // Adiciona pontos do Bilhete Premiado (golden ticket)
  // Chamadas paralelas por usuário (máx 20 — custo negligível)
  const ticketPointsResults = await Promise.all(
    profiles.map(async (p) => {
      try {
        const { data } = await supabase.rpc('calculate_golden_ticket_points', { p_user_id: p.id })
        return { userId: p.id, pts: (data as number) ?? 0 }
      } catch {
        return { userId: p.id, pts: 0 }
      }
    })
  )
  const ticketPointsMap = new Map(ticketPointsResults.map((r) => [r.userId, r.pts]))

  // Soma pontos do bilhete ao total
  for (const entry of ranked) {
    const tp = ticketPointsMap.get(entry.user.id) ?? 0
    entry.total_points = entry.total_points + tp
  }

  // Re-ordena após somar bilhete (pode mudar posições)
  ranked.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    return a.user.name.localeCompare(b.user.name, 'pt-BR')
  })

  // Dense rank: mesmo pontos = mesma posição
  let pos = 1
  for (let i = 0; i < ranked.length; i++) {
    if (i > 0 && ranked[i].total_points < ranked[i - 1].total_points) {
      pos = i + 1
    }
    ranked[i].position = pos
  }

  return ranked
}
