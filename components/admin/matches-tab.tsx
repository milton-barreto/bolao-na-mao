'use client'

import { useState } from 'react'
import { Search, Edit2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TeamFlag } from '@/components/team-flag'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { EditMatchDialog } from './edit-match-dialog'
import { adminForceMatchStatus } from '@/lib/actions/admin'
import { PHASES, MATCH_STATUS } from '@/lib/constants'
import { formatKickoff } from '@/lib/datetime'
import type { MatchWithTeams } from '@/types'

interface MatchesTabProps {
  matches: MatchWithTeams[]
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' }> = {
  scheduled: { label: 'Agendado', variant: 'outline' },
  live: { label: 'Ao vivo 🔴', variant: 'warning' },
  finished: { label: 'Finalizado', variant: 'default' },
  postponed: { label: 'Adiado', variant: 'secondary' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
}

export function MatchesTab({ matches }: MatchesTabProps) {
  const [search, setSearch] = useState('')
  const [filterPhase, setFilterPhase] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const [editMatch, setEditMatch] = useState<MatchWithTeams | null>(null)
  const [cancelTarget, setCancelTarget] = useState<MatchWithTeams | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Filtros client-side
  const filtered = matches.filter((m) => {
    if (filterPhase && m.phase !== filterPhase) return false
    if (filterStatus && m.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      const home = m.home_team?.name?.toLowerCase() ?? m.home_team_id?.toLowerCase() ?? ''
      const away = m.away_team?.name?.toLowerCase() ?? m.away_team_id?.toLowerCase() ?? ''
      if (!home.includes(q) && !away.includes(q)) return false
    }
    return true
  })

  async function handleCancelConfirm() {
    if (!cancelTarget || !cancelReason.trim()) {
      toast.error('Preencha a justificativa.')
      return
    }
    setIsCancelling(true)
    const res = await adminForceMatchStatus(cancelTarget.id, 'cancelled', cancelReason)
    setIsCancelling(false)
    if ('error' in res) {
      toast.error(res.error)
    } else {
      toast.success(res.message ?? 'Jogo cancelado.')
      setCancelTarget(null)
      setCancelReason('')
    }
  }

  const phases = Object.entries(PHASES)
  const statuses = Object.entries(MATCH_STATUS)

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-base">Gerenciar jogos</h2>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <Input
            placeholder="Buscar time..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-white"
          value={filterPhase}
          onChange={(e) => setFilterPhase(e.target.value)}
        >
          <option value="">Todas as fases</option>
          {phases.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          className="border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-white"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {statuses.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-[var(--text-secondary)]">
        {filtered.length} jogo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Lista de jogos */}
      <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-[var(--text-secondary)] py-8">
            Nenhum jogo encontrado com esses filtros.
          </p>
        )}
        {filtered.map((m) => {
          const statusInfo = STATUS_BADGE[m.status ?? 'scheduled']
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
              {/* Times */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {m.home_team && (
                  <TeamFlag flagUrl={m.home_team.flag_url} teamName={m.home_team.name} size={24} />
                )}
                <span className="text-xs font-medium truncate">
                  {m.home_team?.name ?? m.home_team_id}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">×</span>
                {m.away_team && (
                  <TeamFlag flagUrl={m.away_team.flag_url} teamName={m.away_team.name} size={24} />
                )}
                <span className="text-xs font-medium truncate">
                  {m.away_team?.name ?? m.away_team_id}
                </span>
              </div>

              {/* Info */}
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {m.home_score !== null && m.away_score !== null && (
                  <span className="text-sm font-bold">
                    {m.home_score}–{m.away_score}
                  </span>
                )}
                <span className="text-xs text-[var(--text-secondary)]">
                  {formatKickoff(m.kickoff_at)}
                </span>
                <Badge variant={statusInfo?.variant ?? 'outline'}>
                  {statusInfo?.label ?? m.status}
                </Badge>
                {m.manually_edited && (
                  <Badge variant="secondary">MANUAL</Badge>
                )}
              </div>

              {/* Ações */}
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditMatch(m)}
                  disabled={m.status === 'cancelled'}
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                {m.status !== 'cancelled' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => setCancelTarget(m)}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Dialog de edição */}
      <EditMatchDialog
        match={editMatch}
        open={!!editMatch}
        onOpenChange={(open) => !open && setEditMatch(null)}
      />

      {/* AlertDialog de cancelamento */}
      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null)
            setCancelReason('')
          }
        }}
        title="Cancelar jogo?"
        description={
          `Cancelar "${cancelTarget?.home_team?.name ?? ''} × ${cancelTarget?.away_team?.name ?? ''}" zerará todos os palpites desse jogo. Essa ação é irreversível.`
        }
        confirmLabel="Cancelar jogo"
        destructive
        onConfirm={handleCancelConfirm}
        isLoading={isCancelling}
      />

      {/* Campo de justificativa para cancelamento (dentro do Alert) */}
      {cancelTarget && (
        <div className="fixed inset-0 pointer-events-none" aria-hidden>
          {/* A justificativa fica dentro do AlertDialog — tratada via state */}
        </div>
      )}
    </div>
  )
}
