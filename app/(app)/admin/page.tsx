import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminTabs } from '@/components/admin/admin-tabs'
import {
  adminGetAllowedEmails,
  adminGetMatches,
  adminGetTeams,
  adminGetApiStatus,
  adminGetLogs,
  adminGetTournamentState,
} from '@/lib/actions/admin'
import type { BannerConfig, TournamentState } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()

  // Verifica is_admin server-side — redirect se não for admin
  const { data: adminCheck } = await supabase.rpc('is_admin')
  if (!adminCheck) {
    redirect('/')
  }

  // Banner atual (admin pode ler tudo via service role — mas aqui já passou pelo is_admin check)
  const { data: bannerData } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'global_banner')
    .single()

  let currentBanner: BannerConfig | null = null
  const bv = bannerData?.value
  if (bv && typeof bv === 'object' && !Array.isArray(bv)) {
    const bvObj = bv as Record<string, unknown>
    if (typeof bvObj.text === 'string' && bvObj.text) {
      currentBanner = { text: bvObj.text, type: (bvObj.type as BannerConfig['type']) ?? 'info' }
    }
  }

  // Carrega dados iniciais para todas as abas em paralelo
  const [emails, matches, teams, apiStatus, logs, tournamentStateRaw] = await Promise.all([
    adminGetAllowedEmails(),
    adminGetMatches(),
    adminGetTeams(),
    adminGetApiStatus(),
    adminGetLogs(20, 0),
    adminGetTournamentState(),
  ])

  const tournamentState = (tournamentStateRaw ?? 'group') as TournamentState

  return (
    <AdminTabs
      emails={emails}
      matches={matches}
      teams={teams}
      apiStatus={apiStatus}
      logs={logs}
      currentBanner={currentBanner}
      tournamentState={tournamentState}
    />
  )
}
