// =============================================================
// Edge Function: sync-matches
// Sincroniza os jogos da Copa 2026 com a football-data.org.
// Agendada a cada 10 min via supabase/config.toml.
//
// Respeita manually_edited = true: não sobrescreve placar/status
// de jogos editados manualmente pelo admin.
// =============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

const FOOTBALL_API = 'https://api.football-data.org/v4/competitions/WC/matches'

// Mapeia status da API → status local
function mapStatus(apiStatus: string): string {
  switch (apiStatus) {
    case 'SCHEDULED':
    case 'TIMED':
      return 'scheduled'
    case 'IN_PLAY':
    case 'PAUSED':
      return 'live'
    case 'FINISHED':
      return 'finished'
    case 'POSTPONED':
      return 'postponed'
    case 'SUSPENDED':
    case 'CANCELLED':
      return 'cancelled'
    default:
      return 'scheduled'
  }
}

// Mapeia stage/group da API → fase + grupo locais
function mapPhase(stage: string): string {
  switch (stage) {
    case 'GROUP_STAGE':
      return 'group'
    case 'ROUND_OF_32':   // Copa 2026: 48 times → 16-avos de final
      return 'r32'
    case 'LAST_16':
    case 'ROUND_OF_16':
      return 'r16'
    case 'QUARTER_FINALS':
      return 'qf'
    case 'SEMI_FINALS':
      return 'sf'
    case 'FINAL':
    case 'THIRD_PLACE':
      return 'final'
    default:
      return 'group'
  }
}

function mapGroup(group: string | null): string | null {
  if (!group) return null
  const m = group.match(/GROUP_(.+)/)
  return m ? m[1] : null
}

// Time que avançou no mata-mata, a partir do vencedor reportado pela API
// (score.winner considera prorrogação e pênaltis). null em empate/DRAW.
function advancingFromScore(
  winner: string | null | undefined,
  homeTla: string,
  awayTla: string,
): string | null {
  if (winner === 'HOME_TEAM') return homeTla
  if (winner === 'AWAY_TEAM') return awayTla
  return null
}

interface ApiScore {
  winner?: string | null
  duration?: string | null
  fullTime?: { home: number | null; away: number | null }
  regularTime?: { home: number | null; away: number | null } | null
  extraTime?: { home: number | null; away: number | null } | null
  penalties?: { home: number | null; away: number | null } | null
}

// Placar do TEMPO REGULAMENTAR (90' + acréscimos) — nunca prorrogação/pênaltis.
// - Grupos: nunca há prorrogação, então fullTime == 90'.
// - Mata-mata: a football-data é inconsistente — já reportou duration='REGULAR'
//   COM gol de prorrogação (bug visto em BEL×SEN), e o fullTime pode incluir
//   prorrogação e/ou pênaltis. Ordem de confiança para recuperar os 90':
//   1) score.regularTime, quando presente (fonte direta e definitiva).
//   2) Houve prorrogação (extraTime) e SEM pênaltis: 90' = fullTime − extraTime
//      (o fullTime inclui a prorrogação; sem pênaltis a subtração é exata).
//   3) Só então, sem NENHUM sinal de prorrogação/pênaltis: fullTime é o 90'.
//   4) Caso contrário (foi além dos 90' sem dados suficientes p/ isolar):
//      indeterminado (null), para não gravar placar acumulado errado — fica
//      para correção manual/backfill.
function regularTimeScore(
  score: ApiScore | undefined,
  phase: string,
): { home: number | null; away: number | null } {
  const ft = score?.fullTime
  const rt = score?.regularTime
  const et = score?.extraTime
  const pk = score?.penalties

  if (phase === 'group') {
    return { home: ft?.home ?? null, away: ft?.away ?? null }
  }

  // 1) regularTime explícito é sempre o mais confiável para os 90'.
  if (rt && rt.home != null && rt.away != null) {
    return { home: rt.home, away: rt.away }
  }

  const hasExtra = et != null && et.home != null && et.away != null
  const hasPens = pk != null && pk.home != null && pk.away != null

  // 2) Prorrogação sem pênaltis: subtrai a prorrogação do fullTime.
  if (hasExtra && !hasPens && ft && ft.home != null && ft.away != null) {
    return { home: ft.home - et.home!, away: ft.away - et.away! }
  }

  // 3) Decidido no tempo normal (sem prorrogação nem pênaltis): fullTime = 90'.
  if (
    score?.duration === 'REGULAR' && !hasExtra && !hasPens &&
    ft && ft.home != null && ft.away != null
  ) {
    return { home: ft.home, away: ft.away }
  }

  // 4) Além dos 90' sem dados suficientes → indeterminado.
  return { home: null, away: null }
}

interface SyncResult {
  synced: number
  skipped: number
  errors: string[]
}

Deno.serve(async () => {
  const result: SyncResult = { synced: 0, skipped: 0, errors: [] }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const apiToken = Deno.env.get('FOOTBALL_DATA_TOKEN')

  const supabase = createClient(supabaseUrl, serviceKey)

  // 1) Modo manual? Se api_status.available = false, retorna sem fazer fetch.
  const { data: cfg } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'api_status')
    .single()

  const apiStatus = (cfg?.value ?? {}) as { available?: boolean }
  if (apiStatus.available === false) {
    return Response.json({
      ...result,
      skipped: -1,
      errors: ['Modo manual ativo (api_status.available = false)'],
    })
  }

  if (!apiToken) {
    return Response.json(
      { ...result, errors: ['FOOTBALL_DATA_TOKEN não configurado'] },
      { status: 500 },
    )
  }

  // 2) Buscar fixtures
  let apiMatches: Array<Record<string, unknown>> = []
  try {
    const res = await fetch(FOOTBALL_API, {
      headers: { 'X-Auth-Token': apiToken },
    })
    if (!res.ok) {
      return Response.json(
        { ...result, errors: [`API retornou ${res.status}`] },
        { status: 502 },
      )
    }
    const json = await res.json()
    apiMatches = json.matches ?? []
  } catch (e) {
    return Response.json(
      { ...result, errors: [`Fetch falhou: ${String(e)}`] },
      { status: 502 },
    )
  }

  // 3) Buscar estado dos jogos existentes (manually_edited + fase local)
  //    + IDs de times válidos
  const [existingRes, teamsRes] = await Promise.all([
    supabase
      .from('matches')
      .select('external_id, manually_edited, phase, home_score, away_score, advancing_team_id'),
    supabase.from('teams').select('id'),
  ])

  const existingMap = new Map(
    (existingRes.data ?? []).map((m) => [
      m.external_id,
      {
        edited: m.manually_edited === true,
        phase: m.phase as string | null,
        homeScore: m.home_score as number | null,
        awayScore: m.away_score as number | null,
        advancingTeamId: m.advancing_team_id as string | null,
      },
    ]),
  )

  const validTeamIds = new Set((teamsRes.data ?? []).map((t) => t.id))

  // 4) Upsert jogo a jogo
  for (const m of apiMatches) {
    try {
      const extId = String((m as { id: number }).id)
      const homeTeam = (m as { homeTeam?: { tla?: string } }).homeTeam
      const awayTeam = (m as { awayTeam?: { tla?: string } }).awayTeam
      const score = (m as { score?: ApiScore }).score

      // Sem TLA dos dois times (jogo TBD do mata-mata) → pula
      if (!homeTeam?.tla || !awayTeam?.tla) {
        result.skipped++
        continue
      }

      // Times não cadastrados no bolão (ex: Curaçao, qualificatórias) → pula
      if (!validTeamIds.has(homeTeam.tla) || !validTeamIds.has(awayTeam.tla)) {
        result.skipped++
        continue
      }

      const existing = existingMap.get(extId)
      const apiStatus = mapStatus((m as { status: string }).status)
      const apiPhase = mapPhase((m as { stage: string }).stage)
      const now = new Date().toISOString()

      // Jogo editado manualmente: PRESERVA as edições do admin (placar e
      // avanço não são sobrescritos). Só progride o estado (scheduled → live
      // → finished) e, se algum campo ainda estiver vazio, preenche a partir
      // da API (sem clobber). Placar sempre no tempo regulamentar (90').
      if (existing?.edited) {
        if (apiStatus !== 'finished' && apiStatus !== 'live') {
          result.skipped++
          continue
        }

        const update: Record<string, unknown> = {
          status: apiStatus,
          last_synced_at: now,
        }

        // Só preenche placar/avanço se ainda não houver valor manual salvo.
        const rt = regularTimeScore(score, existing.phase ?? 'group')
        if (existing.homeScore == null && rt.home != null) update.home_score = rt.home
        if (existing.awayScore == null && rt.away != null) update.away_score = rt.away

        if (
          apiStatus === 'finished' &&
          existing.phase && existing.phase !== 'group' &&
          existing.advancingTeamId == null
        ) {
          const adv = advancingFromScore(score?.winner, homeTeam.tla, awayTeam.tla)
          if (adv) update.advancing_team_id = adv
        }

        const { error } = await supabase
          .from('matches')
          .update(update)
          .eq('external_id', extId)

        if (error) result.errors.push(`${extId}: ${error.message}`)
        else result.synced++
        continue
      }

      // Placar sempre no tempo regulamentar (90'), nunca prorrogação/pênaltis.
      const rt = regularTimeScore(score, apiPhase)

      const base: Record<string, unknown> = {
        external_id: extId,
        home_team_id: homeTeam.tla,
        away_team_id: awayTeam.tla,
        phase: apiPhase,
        group_name: mapGroup((m as { group: string | null }).group),
        round_number: (m as { matchday: number | null }).matchday ?? null,
        kickoff_at: (m as { utcDate: string }).utcDate,
        status: apiStatus,
        home_score: rt.home,
        away_score: rt.away,
        last_synced_at: now,
      }

      // Mata-mata finalizado: registra quem avançou também no fluxo normal.
      if (apiStatus === 'finished' && apiPhase !== 'group') {
        const adv = advancingFromScore(score?.winner, homeTeam.tla, awayTeam.tla)
        if (adv) base.advancing_team_id = adv
      }

      const { error } = await supabase
        .from('matches')
        .upsert(base, { onConflict: 'external_id' })

      if (error) {
        result.errors.push(`${extId}: ${error.message}`)
      } else {
        result.synced++
      }
    } catch (e) {
      result.errors.push(String(e))
    }
  }

  // 5) Atualizar last_sync no app_config
  await supabase
    .from('app_config')
    .update({
      value: { ...apiStatus, available: true, last_sync: new Date().toISOString() },
    })
    .eq('key', 'api_status')

  return Response.json(result)
})
