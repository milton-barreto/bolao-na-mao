'use client'

import { useState } from 'react'
import { Mail, Calendar, BarChart3, Wifi, FileText } from 'lucide-react'
import { EmailsTab } from './emails-tab'
import { MatchesTab } from './matches-tab'
import { TiersTab } from './tiers-tab'
import { ApiTab } from './api-tab'
import { LogsTab } from './logs-tab'
import type {
  AllowedEmailEntry,
  AdminLogEntry,
  BannerConfig,
  MatchWithTeams,
  Team,
  TournamentState,
} from '@/types'

interface AdminTabsProps {
  emails: AllowedEmailEntry[]
  matches: MatchWithTeams[]
  teams: Team[]
  apiStatus: { available: boolean; last_sync?: string } | null
  logs: AdminLogEntry[]
  currentBanner?: BannerConfig | null
  tournamentState?: TournamentState
}

const TABS = [
  { id: 'emails', label: 'E-mails', Icon: Mail },
  { id: 'jogos', label: 'Jogos', Icon: Calendar },
  { id: 'tiers', label: 'Tiers', Icon: BarChart3 },
  { id: 'api', label: 'API', Icon: Wifi },
  { id: 'logs', label: 'Logs', Icon: FileText },
] as const

type TabId = (typeof TABS)[number]['id']

export function AdminTabs({
  emails,
  matches,
  teams,
  apiStatus,
  logs,
  currentBanner,
  tournamentState,
}: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('emails')

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-white sticky top-0 z-10">
        <div className="container">
          <h1 className="text-lg font-bold py-3 text-[var(--text-primary)]">
            🔧 Painel Admin
          </h1>
          {/* Abas — scroll horizontal no mobile */}
          <div className="flex overflow-x-auto gap-0 -mb-px pb-0">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === id
                    ? 'border-[var(--primary)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="container py-6">
        {activeTab === 'emails' && <EmailsTab emails={emails} />}
        {activeTab === 'jogos' && <MatchesTab matches={matches} />}
        {activeTab === 'tiers' && <TiersTab teams={teams} />}
        {activeTab === 'api' && <ApiTab apiStatus={apiStatus} currentBanner={currentBanner} tournamentState={tournamentState} />}
        {activeTab === 'logs' && <LogsTab logs={logs} />}
      </div>
    </div>
  )
}
