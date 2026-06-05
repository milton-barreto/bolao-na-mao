import type { Database } from '@/lib/supabase/types'
import type { TournamentState } from '@/lib/constants'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type Bet = Database['public']['Tables']['bets']['Row']
export type AdminLog = Database['public']['Tables']['admin_logs']['Row']
export type AppConfig = Database['public']['Tables']['app_config']['Row']
export type AllowedEmail = Database['public']['Tables']['allowed_emails']['Row']
export type TierHistory = Database['public']['Tables']['tier_history']['Row']

export type Phase = Match['phase']
export type MatchStatus = Match['status']

export type BetStatus = 'acertou_placar' | 'acertou_resultado' | 'errou' | 'pendente'

export interface MatchWithTeams extends Match {
  home_team: Team | null
  away_team: Team | null
  advancing_team?: Team | null
}

export interface BetWithMatch extends Bet {
  match: MatchWithTeams
}

export interface RankingEntry {
  user: Profile
  total_points: number
  bets_count: number
  acertou_placar_count: number
  acertou_resultado_count: number
  position: number
  isCurrentUser?: boolean
}

export type BannerType = 'info' | 'warning' | 'error'

export interface BannerConfig {
  text: string
  type: BannerType
}

export type AdminActionResult =
  | { error: string }
  | { success: true; message?: string }

export interface AdminUserEntry {
  id: string
  email: string
  name: string
  avatar_url: string | null
  is_admin: boolean
  created_at: string | null
  bets_count: number
}

export interface AllowedEmailEntry extends AllowedEmail {
  invited_by_name?: string | null
}

export interface AdminLogEntry extends AdminLog {
  admin_name?: string | null
}

export interface SyncResult {
  synced: number
  skipped: number
  errors: string[]
}

export type { TournamentState }

// Golden Ticket (Bilhete Premiado)
export type GoldenTicket = Database['public']['Tables']['golden_tickets']['Row']

export type GoldenTicketPredictions = {
  r32: Record<string, string>    // matchId (UUID) → teamId que avança
  r16: Record<number, string>    // slot 0-7 → teamId que avança das oitavas
  qf:  Record<number, string>    // slot 0-3 → teamId que avança das quartas
  sf:  Record<number, string>    // slot 0-1 → os dois finalistas
  champion: string | null        // campeão (também responsável pelos 5pts do confronto final)
}

// Palpite de mata-mata com time que avança
export interface KnockoutBetEntry {
  id: string
  user_id: string
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
  predicted_advancing_team_id: string | null
  base_points: number | null
  odd_multiplier: number | null
  total_points: number | null
  user_name: string
  user_avatar: string | null
}

// Preview do rebalanceamento de tiers
export interface RebalancingPreviewEntry {
  team_id: string
  team_name: string
  current_tier: number
  new_tier: number
  delta: number
  avg_score: number
}
