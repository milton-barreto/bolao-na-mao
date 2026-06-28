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

  // 3) Buscar manually_edited dos jogos existentes + IDs de times válidos
  const [existingRes, teamsRes] = await Promise.all([
    supabase.from('matches').select('external_id, manually_edited'),
    supabase.from('teams').select('id'),
  ])

  const editedSet = new Set(
    (existingRes.data ?? [])
      .filter((m) => m.manually_edited === true)
      .map((m) => m.external_id),
  )

  const validTeamIds = new Set((teamsRes.data ?? []).map((t) => t.id))

  // 4) Upsert jogo a jogo
  for (const m of apiMatches) {
    try {
      const extId = String((m as { id: number }).id)
      const homeTeam = (m as { homeTeam?: { tla?: string } }).homeTeam
      const awayTeam = (m as { awayTeam?: { tla?: string } }).awayTeam
      const score = (m as {
        score?: { fullTime?: { home: number | null; away: number | null } }
      }).score

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

      const isEdited = editedSet.has(extId)

      // Jogo editado manualmente → pula completamente (fase, placar e status protegidos)
      if (isEdited) {
        result.skipped++
        continue
      }

      const base: Record<string, unknown> = {
        external_id: extId,
        home_team_id: homeTeam.tla,
        away_team_id: awayTeam.tla,
        phase: mapPhase((m as { stage: string }).stage),
        group_name: mapGroup((m as { group: string | null }).group),
        round_number: (m as { matchday: number | null }).matchday ?? null,
        kickoff_at: (m as { utcDate: string }).utcDate,
        status: mapStatus((m as { status: string }).status),
        home_score: score?.fullTime?.home ?? null,
        away_score: score?.fullTime?.away ?? null,
        last_synced_at: new Date().toISOString(),
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
