'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TeamFlag } from '@/components/team-flag'
import { TIER_LABELS } from '@/lib/constants'
import { adminUpdateTier } from '@/lib/actions/admin'
import type { Team } from '@/types'

interface TiersTabProps {
  teams: Team[]
}

interface TierEdit {
  teamId: string
  newTier: number
  reason: string
}

export function TiersTab({ teams }: TiersTabProps) {
  const [editing, setEditing] = useState<TierEdit | null>(null)
  const [localTeams, setLocalTeams] = useState(teams)
  const [isPending, startTransition] = useTransition()

  const tiers = [1, 2, 3, 4, 5]

  function handleEdit(team: Team) {
    setEditing({ teamId: team.id, newTier: team.current_tier, reason: '' })
  }

  function handleSave(team: Team) {
    if (!editing || !editing.reason.trim()) {
      toast.error('Justificativa obrigatória.')
      return
    }
    startTransition(async () => {
      const res = await adminUpdateTier(editing.teamId, editing.newTier, editing.reason)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success(res.message ?? 'Tier atualizado.')
        setLocalTeams((prev) =>
          prev.map((t) =>
            t.id === editing.teamId ? { ...t, current_tier: editing.newTier } : t
          )
        )
        setEditing(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-base">Gerenciar tiers</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Tier afeta a odd dos palpites futuros. Mudar o tier não reconsidera palpites já
        feitos — apenas os novos (após o kickoff) usam o tier novo.
      </p>

      {tiers.map((tier) => {
        const tierTeams = localTeams.filter((t) => t.current_tier === tier)
        if (tierTeams.length === 0) return null

        return (
          <div key={tier}>
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--primary-fg)]">
                T{tier}
              </span>
              {TIER_LABELS[tier]}
              <span className="text-[var(--text-secondary)] text-xs">
                ({tierTeams.length} times)
              </span>
            </h3>

            <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
              {tierTeams.map((team) => {
                const isEditing = editing?.teamId === team.id

                return (
                  <div key={team.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <TeamFlag flagUrl={team.flag_url} teamName={team.name} size={24} />
                    <span className="flex-1 text-sm font-medium min-w-0 truncate">
                      {team.name}
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          className="border border-[var(--border)] rounded-md px-2 py-1 text-sm bg-white"
                          value={editing.newTier}
                          onChange={(e) =>
                            setEditing({ ...editing, newTier: parseInt(e.target.value, 10) })
                          }
                        >
                          {tiers.map((t) => (
                            <option key={t} value={t}>
                              T{t} — {TIER_LABELS[t]}
                            </option>
                          ))}
                        </select>
                        <Input
                          className="w-48 text-sm"
                          placeholder="Justificativa *"
                          value={editing.reason}
                          onChange={(e) =>
                            setEditing({ ...editing, reason: e.target.value })
                          }
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSave(team)}
                          disabled={isPending || !editing.reason.trim()}
                        >
                          {isPending ? '...' : 'Salvar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(null)}
                          disabled={isPending}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(team)}
                      >
                        Alterar tier
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
