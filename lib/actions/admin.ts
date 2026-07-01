'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TOAST } from '@/lib/constants'
import type { Json } from '@/lib/supabase/types'
import type {
  AdminActionResult,
  AdminUserEntry,
  AllowedEmailEntry,
  AdminLogEntry,
  MatchWithTeams,
  RebalancingPreviewEntry,
  SyncResult,
  TournamentState,
} from '@/types'

// =============================================================
// Helper: verifica is_admin server-side
// Lança erro padronizado se não for admin.
// =============================================================
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

async function requireAdmin(): Promise<SupabaseServerClient> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('is_admin')
  if (!data) throw new Error(TOAST.adminAccessDenied)
  return supabase
}

// Helper para pegar admin_id do usuário logado
async function getAdminId(supabase: SupabaseServerClient): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error(TOAST.adminAccessDenied)
  return user.id
}

// =============================================================
// FOOTBALL-DATA.ORG — placar do tempo regulamentar
// =============================================================
const FOOTBALL_API_BASE = 'https://api.football-data.org/v4'

interface FootballApiScore {
  winner?: string | null
  duration?: string | null
  fullTime?: { home: number | null; away: number | null }
  regularTime?: { home: number | null; away: number | null } | null
}

// Placar do TEMPO REGULAMENTAR (90' + acréscimos), nunca prorrogação/pênaltis.
// Mata-mata: usa score.regularTime; se decidido no tempo normal (REGULAR), o
// fullTime já é o placar dos 90'. Em prorrogação/pênaltis sem regularTime
// disponível retorna null/null (indeterminado). Grupos: fullTime == 90'.
function regularTimeFromScore(
  score: FootballApiScore | undefined,
  isKnockout: boolean,
): { home: number | null; away: number | null } {
  const ft = score?.fullTime
  const rt = score?.regularTime

  if (isKnockout) {
    if (rt && rt.home != null && rt.away != null) {
      return { home: rt.home, away: rt.away }
    }
    if (score?.duration === 'REGULAR' && ft) {
      return { home: ft.home ?? null, away: ft.away ?? null }
    }
    return { home: null, away: null }
  }

  return { home: ft?.home ?? null, away: ft?.away ?? null }
}

// =============================================================
// ALLOWLIST DE E-MAILS
// =============================================================

export async function adminGetAllowedEmails(): Promise<AllowedEmailEntry[]> {
  try {
    const supabase = await requireAdmin()

    const { data, error } = await supabase
      .from('allowed_emails')
      .select('email, used, invited_by, created_at, profiles!allowed_emails_invited_by_fkey(name)')
      .order('created_at', { ascending: false })

    if (error) return []

    return (data ?? []).map((row) => ({
      email: row.email,
      used: row.used,
      invited_by: row.invited_by,
      created_at: row.created_at,
      invited_by_name: (row.profiles as { name: string } | null)?.name ?? null,
    }))
  } catch {
    return []
  }
}

export async function adminAddAllowedEmail(email: string): Promise<AdminActionResult> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    const normalized = email.toLowerCase().trim()
    if (!normalized || !normalized.includes('@')) {
      return { error: 'E-mail inválido.' }
    }

    const { error } = await supabase
      .from('allowed_emails')
      .insert({ email: normalized, invited_by: adminId, used: false })

    if (error) {
      if (error.code === '23505') return { error: 'E-mail já está na lista.' }
      return { error: TOAST.genericError }
    }

    // Log
    await supabase.from('admin_logs').insert({
      action: 'add_allowed_email',
      admin_id: adminId,
      target_table: 'allowed_emails',
      target_id: normalized,
      reason: 'Adicionado via painel admin',
    })

    revalidatePath('/admin')
    return { success: true, message: TOAST.adminEmailAdded }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}

export async function adminRemoveAllowedEmail(
  email: string,
  force = false,
): Promise<AdminActionResult> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    // Verifica se já foi usado
    const { data: entry } = await supabase
      .from('allowed_emails')
      .select('used')
      .eq('email', email)
      .single()

    if (!entry) return { error: 'E-mail não encontrado.' }

    if (entry.used && !force) {
      return { error: 'E-mail já usado para cadastro — confirme a remoção.' }
    }

    const { error } = await supabase
      .from('allowed_emails')
      .delete()
      .eq('email', email)

    if (error) return { error: TOAST.genericError }

    await supabase.from('admin_logs').insert({
      action: 'remove_allowed_email',
      admin_id: adminId,
      target_table: 'allowed_emails',
      target_id: email,
      reason: force ? 'Remoção forçada (e-mail já usado)' : 'Remoção normal',
    })

    revalidatePath('/admin')
    return { success: true, message: TOAST.adminEmailRemoved }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}

// =============================================================
// GESTÃO DE JOGOS
// =============================================================

export async function adminGetMatches(
  phase?: string,
  status?: string,
): Promise<MatchWithTeams[]> {
  try {
    const supabase = await requireAdmin()

    let query = supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `)
      .order('kickoff_at', { ascending: true })

    if (phase) query = query.eq('phase', phase)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) return []
    return (data ?? []) as MatchWithTeams[]
  } catch {
    return []
  }
}

export async function adminUpdateMatch(
  matchId: string,
  updates: {
    home_score?: number | null
    away_score?: number | null
    status?: string
    kickoff_at?: string
    advancing_team_id?: string | null
  },
  reason: string,
): Promise<AdminActionResult & { recalculated?: number }> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    if (!reason.trim()) return { error: 'Justificativa obrigatória.' }

    // Captura estado anterior para o log
    const { data: before } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (!before) return { error: 'Jogo não encontrado.' }

    const { error: updateError } = await supabase
      .from('matches')
      .update({ ...updates, manually_edited: true })
      .eq('id', matchId)

    if (updateError) return { error: TOAST.genericError }

    // Recalcula palpites se o jogo está finalizado
    let recalculated = 0
    const newStatus = updates.status ?? before.status
    if (newStatus === 'finished') {
      await supabase.rpc('recalc_match_bets', { p_match_id: matchId })

      // Conta quantos palpites foram recalculados
      const { count } = await supabase
        .from('bets')
        .select('id', { count: 'exact', head: true })
        .eq('match_id', matchId)
      recalculated = count ?? 0
    }

    // Registra em admin_logs
    await supabase.from('admin_logs').insert({
      action: 'update_match',
      admin_id: adminId,
      target_table: 'matches',
      target_id: matchId,
      before: before as Json, // full Match row — all fields are JSON-serialisable primitives
      after: updates as Json, // Partial<Match> update — only primitive fields
      reason,
    })

    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/minhas-apostas')
    revalidatePath('/mata-mata')
    revalidatePath('/bilhete-premiado')

    return { success: true, message: TOAST.adminMatchUpdated, recalculated }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}

export async function adminForceMatchStatus(
  matchId: string,
  status: string,
  reason: string,
): Promise<AdminActionResult> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    if (!reason.trim()) return { error: 'Justificativa obrigatória.' }

    const { data: before } = await supabase
      .from('matches')
      .select('status, external_id, phase, home_team_id, away_team_id')
      .eq('id', matchId)
      .single()

    if (status === 'cancelled') {
      // Usa a função atômica que zera palpites
      const { error } = await supabase.rpc('admin_cancel_match', {
        p_match_id: matchId,
        p_admin_id: adminId,
        p_reason: reason,
      })
      if (error) return { error: TOAST.genericError }
    } else {
      type MatchStatusUpdate = {
        status: string
        manually_edited: boolean
        home_score?: number
        away_score?: number
        advancing_team_id?: string
      }
      const update: MatchStatusUpdate = { status, manually_edited: true }
      const isKnockout = !!before?.phase && before.phase !== 'group'

      // Ao finalizar: busca o placar do TEMPO REGULAMENTAR na football-data.org
      if (status === 'finished' && before?.external_id) {
        const apiToken = process.env.FOOTBALL_DATA_TOKEN
        if (apiToken) {
          try {
            const res = await fetch(
              `${FOOTBALL_API_BASE}/matches/${before.external_id}`,
              {
                headers: { 'X-Auth-Token': apiToken },
                signal: AbortSignal.timeout(5000),
              },
            )
            if (res.ok) {
              const json = await res.json() as { score?: FootballApiScore }
              const rt = regularTimeFromScore(json.score, isKnockout)
              if (rt.home != null && rt.away != null) {
                update.home_score = rt.home
                update.away_score = rt.away
              }
              // Mata-mata: registra quem avançou (vencedor real, considera
              // prorrogação/pênaltis) para valer o ponto do avanço.
              if (isKnockout) {
                const winner = json.score?.winner
                if (winner === 'HOME_TEAM' && before.home_team_id) {
                  update.advancing_team_id = before.home_team_id
                } else if (winner === 'AWAY_TEAM' && before.away_team_id) {
                  update.advancing_team_id = before.away_team_id
                }
              }
            }
          } catch {
            // API indisponível — placar será preenchido pelo próximo sync
          }
        }
      }

      const { error } = await supabase
        .from('matches')
        .update(update)
        .eq('id', matchId)

      if (error) return { error: TOAST.genericError }

      await supabase.from('admin_logs').insert({
        action: 'force_match_status',
        admin_id: adminId,
        target_table: 'matches',
        target_id: matchId,
        before: { status: before?.status ?? null },
        after: { status, home_score: update.home_score ?? null, away_score: update.away_score ?? null },
        reason,
      })

      // Trigger trg_match_finished dispara automaticamente via Postgres.
      // Chamada explícita como fallback caso o trigger não cubra o path.
      if (status === 'finished' && update.home_score != null) {
        await supabase.rpc('recalc_match_bets', { p_match_id: matchId })
      }
    }

    revalidatePath('/')
    revalidatePath('/admin')

    const msg = status === 'cancelled' ? TOAST.adminMatchCancelled : TOAST.adminMatchUpdated
    return { success: true, message: msg }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}

// =============================================================
// GESTÃO DE TIERS
// =============================================================

export async function adminGetTeams() {
  try {
    const supabase = await requireAdmin()

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('current_tier', { ascending: true })
      .order('name', { ascending: true })

    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

export async function adminUpdateTier(
  teamId: string,
  newTier: number,
  reason: string,
): Promise<AdminActionResult> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    if (!reason.trim()) return { error: 'Justificativa obrigatória.' }
    if (newTier < 1 || newTier > 5) return { error: 'Tier deve ser entre 1 e 5.' }

    const { error } = await supabase.rpc('admin_update_team_tier', {
      p_team_id: teamId,
      p_new_tier: newTier,
      p_admin_id: adminId,
      p_reason: reason,
    })

    if (error) return { error: error.message }

    // Registra no admin_logs (a função SQL já registra em tier_history)
    await supabase.from('admin_logs').insert({
      action: 'update_tier',
      admin_id: adminId,
      target_table: 'teams',
      target_id: teamId,
      after: { new_tier: newTier },
      reason,
    })

    revalidatePath('/admin')
    return { success: true, message: TOAST.adminTierUpdated }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}

// =============================================================
// GESTÃO DA API
// =============================================================

export async function adminGetApiStatus(): Promise<{
  available: boolean
  last_sync?: string
} | null> {
  try {
    const supabase = await requireAdmin()

    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'api_status')
      .single()

    return (data?.value as { available: boolean; last_sync?: string }) ?? null
  } catch {
    return null
  }
}

export async function adminToggleApi(available: boolean): Promise<AdminActionResult> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    const { data: current } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'api_status')
      .single()

    const currentValue = (current?.value ?? {}) as Record<string, unknown>

    const { error } = await supabase
      .from('app_config')
      .update({ value: { ...currentValue, available } })
      .eq('key', 'api_status')

    if (error) return { error: TOAST.genericError }

    await supabase.from('admin_logs').insert({
      action: 'toggle_api',
      admin_id: adminId,
      target_table: 'app_config',
      target_id: 'api_status',
      after: { available },
      reason: available ? 'API reativada' : 'API desativada (modo manual)',
    })

    return { success: true, message: TOAST.adminApiToggled }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}

export async function adminTriggerSync(): Promise<AdminActionResult & { result?: SyncResult }> {
  try {
    await requireAdmin()

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-matches`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
    })

    if (!res.ok) {
      return { error: `Edge Function retornou ${res.status}` }
    }

    const result = (await res.json()) as SyncResult
    return { success: true, message: TOAST.adminSyncDone, result }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}

export async function adminRecalcAllBets(): Promise<AdminActionResult & { count?: number }> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    await supabase.rpc('recalc_finished_bets')

    // Conta quantos foram processados
    const { count } = await supabase
      .from('bets')
      .select('id', { count: 'exact', head: true })
      .not('total_points', 'is', null)

    await supabase.from('admin_logs').insert({
      action: 'recalc_all_bets',
      admin_id: adminId,
      target_table: 'bets',
      reason: 'Recálculo manual via painel admin',
    })

    revalidatePath('/')
    revalidatePath('/minhas-apostas')

    return { success: true, message: TOAST.adminRecalcDone, count: count ?? 0 }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}

// =============================================================
// BACKFILL: placar do tempo regulamentar no mata-mata
// Rebusca score.regularTime da football-data.org para todos os jogos
// de mata-mata já finalizados, corrige home_score/away_score (90'),
// registra quem avançou (vencedor real) e recalcula os pontos.
// Preserva jogos manually_edited e reporta os que precisam de ajuste
// manual (prorrogação/pênaltis sem regularTime disponível na API).
// =============================================================

export interface KnockoutBackfillMatch {
  match_id: string
  label: string
  reason?: string
}

export interface KnockoutBackfillResult {
  corrected: KnockoutBackfillMatch[]
  needsManual: KnockoutBackfillMatch[]
  skippedEdited: KnockoutBackfillMatch[]
  errors: string[]
}

interface BackfillMatchRow {
  id: string
  external_id: string | null
  phase: string | null
  manually_edited: boolean | null
  home_team_id: string | null
  away_team_id: string | null
  home_score: number | null
  away_score: number | null
  advancing_team_id: string | null
  home_team: { name: string } | { name: string }[] | null
  away_team: { name: string } | { name: string }[] | null
}

function relTeamName(t: BackfillMatchRow['home_team']): string {
  if (Array.isArray(t)) return t[0]?.name ?? '?'
  return t?.name ?? '?'
}

export async function adminBackfillKnockoutRegularTime(): Promise<
  AdminActionResult & { result?: KnockoutBackfillResult }
> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    const apiToken = process.env.FOOTBALL_DATA_TOKEN
    if (!apiToken) {
      return {
        error:
          'FOOTBALL_DATA_TOKEN não configurado. Ajuste os placares manualmente na aba Jogos.',
      }
    }

    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id, external_id, phase, manually_edited,
        home_team_id, away_team_id, home_score, away_score, advancing_team_id,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .not('phase', 'eq', 'group')
      .eq('status', 'finished')

    if (matchesError) return { error: TOAST.genericError }

    const matches = (matchesData ?? []) as unknown as BackfillMatchRow[]

    const result: KnockoutBackfillResult = {
      corrected: [],
      needsManual: [],
      skippedEdited: [],
      errors: [],
    }

    if (matches.length === 0) {
      return {
        success: true,
        message: 'Nenhum jogo de mata-mata finalizado para corrigir.',
        result,
      }
    }

    // 1 request: lista completa da competição (cada jogo traz score.regularTime)
    let apiMatches: Array<Record<string, unknown>> = []
    try {
      const res = await fetch(`${FOOTBALL_API_BASE}/competitions/WC/matches`, {
        headers: { 'X-Auth-Token': apiToken },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        return { error: `A API retornou ${res.status}. Tente de novo ou ajuste manualmente.` }
      }
      const json = (await res.json()) as { matches?: Array<Record<string, unknown>> }
      apiMatches = json.matches ?? []
    } catch (e) {
      return { error: `Falha ao consultar a API: ${String(e)}. Ajuste manualmente.` }
    }

    const apiById = new Map(
      apiMatches.map((m) => [String((m as { id: number }).id), m]),
    )

    for (const m of matches) {
      const label = `${relTeamName(m.home_team)} × ${relTeamName(m.away_team)}`

      // Preserva edições manuais do admin
      if (m.manually_edited === true) {
        result.skippedEdited.push({ match_id: m.id, label })
        continue
      }

      const apiMatch = m.external_id ? apiById.get(m.external_id) : undefined
      if (!apiMatch) {
        result.needsManual.push({ match_id: m.id, label, reason: 'Jogo não encontrado na API' })
        continue
      }

      const score = (apiMatch as { score?: FootballApiScore }).score
      const rt = regularTimeFromScore(score, true)

      if (rt.home == null || rt.away == null) {
        result.needsManual.push({
          match_id: m.id,
          label,
          reason: "Prorrogação/pênaltis sem placar dos 90' na API",
        })
        continue
      }

      const upd: { home_score: number; away_score: number; advancing_team_id?: string } = {
        home_score: rt.home,
        away_score: rt.away,
      }

      const winner = score?.winner
      if (winner === 'HOME_TEAM' && m.home_team_id) upd.advancing_team_id = m.home_team_id
      else if (winner === 'AWAY_TEAM' && m.away_team_id) upd.advancing_team_id = m.away_team_id

      const { error: updErr } = await supabase.from('matches').update(upd).eq('id', m.id)
      if (updErr) {
        result.errors.push(`${label}: ${updErr.message}`)
        continue
      }

      const { error: recalcErr } = await supabase.rpc('recalc_match_bets', { p_match_id: m.id })
      if (recalcErr) {
        result.errors.push(`${label} (recálculo): ${recalcErr.message}`)
        continue
      }

      result.corrected.push({
        match_id: m.id,
        label: `${relTeamName(m.home_team)} ${rt.home}–${rt.away} ${relTeamName(m.away_team)}`,
      })
    }

    await supabase.from('admin_logs').insert({
      action: 'backfill_knockout_regular_time',
      admin_id: adminId,
      target_table: 'matches',
      reason: `Placar do tempo regulamentar (mata-mata): ${result.corrected.length} corrigidos, ${result.needsManual.length} p/ revisão manual, ${result.skippedEdited.length} editados preservados`,
    })

    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/mata-mata')
    revalidatePath('/minhas-apostas')

    return {
      success: true,
      message: `${result.corrected.length} jogos corrigidos.`,
      result,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}

// =============================================================
// GESTÃO DE USUÁRIOS
// =============================================================

export async function adminGetUsers(): Promise<AdminUserEntry[]> {
  try {
    await requireAdmin()

    // Service client para acessar auth.users (não disponível via anon key)
    const service = createServiceClient()
    const { data: authData, error: authError } = await service.auth.admin.listUsers()
    if (authError) return []

    // Busca profiles e contagem de bets
    const { data: profiles } = await service
      .from('profiles')
      .select('id, name, avatar_url, is_admin, created_at')

    const { data: betCounts } = await service
      .from('bets')
      .select('user_id')

    const betCountMap = new Map<string, number>()
    for (const b of betCounts ?? []) {
      if (b.user_id) {
        betCountMap.set(b.user_id, (betCountMap.get(b.user_id) ?? 0) + 1)
      }
    }

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p])
    )

    return authData.users.map((u) => {
      const p = profileMap.get(u.id)
      return {
        id: u.id,
        email: u.email ?? '',
        name: p?.name ?? u.email ?? '',
        avatar_url: p?.avatar_url ?? null,
        is_admin: p?.is_admin ?? false,
        created_at: p?.created_at ?? u.created_at,
        bets_count: betCountMap.get(u.id) ?? 0,
      }
    })
  } catch {
    return []
  }
}

export async function adminRemoveAvatar(userId: string): Promise<AdminActionResult> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId)

    if (error) return { error: TOAST.genericError }

    await supabase.from('admin_logs').insert({
      action: 'remove_avatar',
      admin_id: adminId,
      target_table: 'profiles',
      target_id: userId,
      reason: 'Avatar removido pelo admin',
    })

    revalidatePath('/admin')
    return { success: true, message: TOAST.adminAvatarRemoved }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}

// =============================================================
// LOGS
// =============================================================

export async function adminGetLogs(
  limit = 20,
  offset = 0,
): Promise<AdminLogEntry[]> {
  try {
    const supabase = await requireAdmin()

    const { data, error } = await supabase
      .from('admin_logs')
      .select('*, profiles!admin_logs_admin_id_fkey(name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return []

    return (data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      admin_id: row.admin_id,
      target_table: row.target_table,
      target_id: row.target_id,
      before: row.before,
      after: row.after,
      reason: row.reason,
      created_at: row.created_at,
      admin_name: (row.profiles as { name: string } | null)?.name ?? null,
    }))
  } catch {
    return []
  }
}

// =============================================================
// BANNER GLOBAL
// =============================================================

export async function adminSetBanner(
  text: string,
  type: 'info' | 'warning' | 'error',
): Promise<AdminActionResult> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    const { error } = await supabase
      .from('app_config')
      .update({ value: { text, type } })
      .eq('key', 'global_banner')

    if (error) return { error: TOAST.genericError }

    await supabase.from('admin_logs').insert({
      action: 'set_banner',
      admin_id: adminId,
      target_table: 'app_config',
      target_id: 'global_banner',
      after: { text, type },
      reason: 'Banner definido via painel admin',
    })

    revalidatePath('/', 'layout')
    return { success: true, message: TOAST.adminBannerSet }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}

export async function adminClearBanner(): Promise<AdminActionResult> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    const { error } = await supabase
      .from('app_config')
      .update({ value: null })
      .eq('key', 'global_banner')

    if (error) return { error: TOAST.genericError }

    await supabase.from('admin_logs').insert({
      action: 'clear_banner',
      admin_id: adminId,
      target_table: 'app_config',
      target_id: 'global_banner',
      reason: 'Banner removido via painel admin',
    })

    revalidatePath('/', 'layout')
    return { success: true, message: TOAST.adminBannerCleared }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}

// =============================================================
// ESTADO DO TORNEIO
// =============================================================

export async function adminGetTournamentState(): Promise<TournamentState | null> {
  try {
    const supabase = await requireAdmin()

    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'tournament_state')
      .single()

    if (!data?.value) return 'group'
    const raw = data.value
    if (typeof raw === 'string') return raw as TournamentState
    // JSONB string: extract text
    return (String(raw).replace(/^"|"$/g, '') as TournamentState) ?? 'group'
  } catch {
    return null
  }
}

export async function adminAdvanceTournamentState(
  newState: TournamentState,
  reason: string,
): Promise<AdminActionResult> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    if (!reason.trim()) return { error: 'Justificativa obrigatória.' }

    // Atualiza o estado
    const { error } = await supabase
      .from('app_config')
      .update({ value: newState })
      .eq('key', 'tournament_state')

    if (error) return { error: TOAST.genericError }

    // Nota: não faz auto-lock aqui. Os bilhetes são protegidos pelo TICKET_EDIT_DEADLINE
    // que verifica se new Date() >= deadline no saveGoldenTicket(). O lock_all_golden_tickets()
    // pode ser chamado manualmente via cron ou admin se necessário após deadline passar.

    await supabase.from('admin_logs').insert({
      action: 'advance_tournament_state',
      admin_id: adminId,
      target_table: 'app_config',
      target_id: 'tournament_state',
      after: { new_state: newState },
      reason,
    })

    revalidatePath('/', 'layout')
    revalidatePath('/mata-mata')
    revalidatePath('/bilhete-premiado')
    revalidatePath('/admin')

    return { success: true, message: `Torneio avançado para: ${newState}` }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}

// =============================================================
// REBALANCEAMENTO DE TIERS
// =============================================================

export async function adminPreviewRebalancing(
  window: 'post_groups' | 'post_r16',
): Promise<RebalancingPreviewEntry[]> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    const { data, error } = await supabase.rpc('admin_trigger_rebalancing', {
      p_window: window,
      p_admin_id: adminId,
      p_reason: 'preview dry-run',
      p_dry_run: true,
    })

    if (error) return []

    interface RebalancingRow {
      out_team_id: string
      out_team_name: string
      out_current_tier: number
      out_new_tier: number
      out_delta: number
      out_avg_score: number
    }
    return (data ?? []).map((row: RebalancingRow) => ({
      team_id: row.out_team_id,
      team_name: row.out_team_name,
      current_tier: row.out_current_tier,
      new_tier: row.out_new_tier,
      delta: row.out_delta,
      avg_score: row.out_avg_score,
    }))
  } catch {
    return []
  }
}

export async function adminExecuteRebalancing(
  window: 'post_groups' | 'post_r16',
  reason: string,
): Promise<AdminActionResult & { count?: number }> {
  try {
    const supabase = await requireAdmin()
    const adminId = await getAdminId(supabase)

    if (!reason.trim()) return { error: 'Justificativa obrigatória.' }

    const { data, error } = await supabase.rpc('admin_trigger_rebalancing', {
      p_window: window,
      p_admin_id: adminId,
      p_reason: reason,
      p_dry_run: false,
    })

    if (error) return { error: error.message }

    const changed = (data ?? []).filter((r: { out_delta: number }) => r.out_delta !== 0).length
    revalidatePath('/admin')
    revalidatePath('/')

    return {
      success: true,
      message: `Rebalanceamento concluído. ${changed} times tiveram tier alterado.`,
      count: changed,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : TOAST.genericError }
  }
}
