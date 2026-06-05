'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ChevronRight, Eye, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog } from '@/components/ui/alert-dialog'
import {
  adminAdvanceTournamentState,
  adminPreviewRebalancing,
  adminExecuteRebalancing,
} from '@/lib/actions/admin'
import { TOURNAMENT_STATES } from '@/lib/constants'
import type { TournamentState, RebalancingPreviewEntry } from '@/types'

interface TournamentTabProps {
  currentState: TournamentState
}

// Mapa de labels para exibição
const STATE_LABELS: Record<TournamentState, string> = {
  group: '⚽ Fase de Grupos',
  r32_open: '🔓 16-avos — aberto para bilhete',
  r32: '⚔️ 16-avos — em andamento',
  r16_open: '🔓 Oitavas — aberto para palpite',
  r16: '⚔️ Oitavas — em andamento',
  qf_open: '🔓 Quartas — aberto para palpite',
  qf: '⚔️ Quartas — em andamento',
  sf_open: '🔓 Semis — aberto para palpite',
  sf: '⚔️ Semis — em andamento',
  final_open: '🔓 Final — aberto para palpite',
  final: '🏆 Final — em andamento',
  finished: '✅ Torneio encerrado',
}

// Próximo estado possível para cada estado atual
function getNextState(current: TournamentState): TournamentState | null {
  const idx = TOURNAMENT_STATES.indexOf(current)
  if (idx === -1 || idx === TOURNAMENT_STATES.length - 1) return null
  return TOURNAMENT_STATES[idx + 1]
}

export function TournamentTab({ currentState: initialState }: TournamentTabProps) {
  const [state, setState] = useState<TournamentState>(initialState)
  const [isPending, startTransition] = useTransition()
  const [advanceReason, setAdvanceReason] = useState('')
  const [confirmAdvance, setConfirmAdvance] = useState(false)

  // Rebalanceamento
  const [previewData, setPreviewData] = useState<RebalancingPreviewEntry[] | null>(null)
  const [confirmRebalance, setConfirmRebalance] = useState<'post_groups' | 'post_r16' | null>(null)
  const [rebalanceReason, setRebalanceReason] = useState('')

  const nextState = getNextState(state)

  function handleAdvanceClick() {
    if (!advanceReason.trim()) {
      toast.error('Preencha a justificativa.')
      return
    }
    setConfirmAdvance(true)
  }

  function doAdvance() {
    if (!nextState) return
    startTransition(async () => {
      const res = await adminAdvanceTournamentState(nextState, advanceReason)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success(res.message ?? 'Estado atualizado.')
        setState(nextState)
        setAdvanceReason('')
        setConfirmAdvance(false)
      }
    })
  }

  function handlePreview(window: 'post_groups' | 'post_r16') {
    startTransition(async () => {
      const data = await adminPreviewRebalancing(window)
      setPreviewData(data)
    })
  }

  function handleRebalanceConfirm() {
    if (!confirmRebalance || !rebalanceReason.trim()) {
      toast.error('Preencha a justificativa.')
      return
    }
    startTransition(async () => {
      const res = await adminExecuteRebalancing(confirmRebalance, rebalanceReason)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success(res.message ?? 'Rebalanceamento concluído.')
        setConfirmRebalance(null)
        setRebalanceReason('')
        setPreviewData(null)
      }
    })
  }

  const canRebalancePostGroups =
    TOURNAMENT_STATES.indexOf(state) >= TOURNAMENT_STATES.indexOf('r32_open')
  const canRebalancePostR16 =
    TOURNAMENT_STATES.indexOf(state) >= TOURNAMENT_STATES.indexOf('r16_open')

  return (
    <div className="space-y-6 border-t border-[var(--border)] pt-6 mt-6">
      <h3 className="font-semibold text-sm">Estado do Torneio</h3>

      {/* Estado atual */}
      <div className="border border-[var(--border)] rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">
          Estado atual:{' '}
          <span className="font-bold">{STATE_LABELS[state] ?? state}</span>
        </p>

        {/* Avançar estado */}
        {nextState && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-secondary)]">
              Próximo: <strong>{STATE_LABELS[nextState]}</strong>
            </p>
            <Input
              placeholder="Justificativa *"
              value={advanceReason}
              onChange={(e) => setAdvanceReason(e.target.value)}
            />
            <Button
              onClick={handleAdvanceClick}
              disabled={isPending || !advanceReason.trim()}
              className="flex items-center gap-1"
              size="sm"
            >
              <ChevronRight className="w-4 h-4" />
              Avançar para: {STATE_LABELS[nextState]}
            </Button>
          </div>
        )}
        {!nextState && (
          <p className="text-sm text-[var(--text-secondary)]">
            O torneio está encerrado. Nenhuma ação disponível.
          </p>
        )}
      </div>

      {/* Rebalanceamento de Tiers */}
      <div className="border border-[var(--border)] rounded-lg p-4 space-y-4">
        <div>
          <h4 className="font-medium text-sm">Rebalanceamento de Tiers</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Executa o algoritmo do §5.6 do briefing. Preview mostra mudanças sem persistir.
          </p>
        </div>

        {/* Pós Grupos */}
        <div className="space-y-2">
          <p className="text-xs font-medium">Pós Fase de Grupos</p>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={!canRebalancePostGroups || isPending}
              onClick={() => handlePreview('post_groups')}
              className="flex items-center gap-1"
            >
              <Eye className="w-3 h-3" /> Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canRebalancePostGroups || isPending}
              onClick={() => {
                setPreviewData(null)
                setConfirmRebalance('post_groups')
              }}
              className="flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" /> Executar
            </Button>
          </div>
        </div>

        {/* Pós Oitavas */}
        <div className="space-y-2">
          <p className="text-xs font-medium">Pós Oitavas (R32+R16)</p>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={!canRebalancePostR16 || isPending}
              onClick={() => handlePreview('post_r16')}
              className="flex items-center gap-1"
            >
              <Eye className="w-3 h-3" /> Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canRebalancePostR16 || isPending}
              onClick={() => {
                setPreviewData(null)
                setConfirmRebalance('post_r16')
              }}
              className="flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" /> Executar
            </Button>
          </div>
        </div>

        {/* Preview results */}
        {isPending && <p className="text-xs text-[var(--text-secondary)]">Calculando...</p>}
        {previewData && (
          <div className="border border-[var(--border)] rounded p-3 max-h-60 overflow-y-auto">
            <p className="text-xs font-medium mb-2">
              Preview — {previewData.filter((r) => r.delta !== 0).length} times mudam de tier
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--text-secondary)]">
                  <th className="text-left pb-1">Time</th>
                  <th className="text-center pb-1">Tier atual</th>
                  <th className="text-center pb-1">Novo tier</th>
                  <th className="text-center pb-1">Δ</th>
                  <th className="text-right pb-1">Média</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((r) => (
                  <tr
                    key={r.team_id}
                    className={r.delta !== 0 ? 'font-semibold' : 'text-[var(--text-secondary)]'}
                  >
                    <td className="py-0.5">{r.team_name}</td>
                    <td className="text-center">T{r.current_tier}</td>
                    <td className="text-center">T{r.new_tier}</td>
                    <td className={[
                      'text-center',
                      r.delta < 0 ? 'text-green-600' : r.delta > 0 ? 'text-red-500' : '',
                    ].join(' ')}>
                      {r.delta < 0 ? '↑' : r.delta > 0 ? '↓' : '–'}
                    </td>
                    <td className="text-right">{Number(r.avg_score).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AlertDialog de confirmação de avanço */}
      <AlertDialog
        open={confirmAdvance}
        onOpenChange={setConfirmAdvance}
        title={`Avançar para: ${nextState ? STATE_LABELS[nextState] : ''}?`}
        description={
          nextState === 'r32'
            ? 'Isso vai TRAVAR todos os bilhetes premiados ainda abertos. Ação irreversível pelo app.'
            : 'Confirma o avanço do estado do torneio?'
        }
        confirmLabel="Avançar"
        destructive={nextState === 'r32'}
        onConfirm={doAdvance}
        isLoading={isPending}
      />

      {/* AlertDialog de confirmação de rebalanceamento */}
      <AlertDialog
        open={!!confirmRebalance}
        onOpenChange={(open) => !open && setConfirmRebalance(null)}
        title="Executar rebalanceamento?"
        description={
          <div className="space-y-2">
            <p>Isso vai alterar o tier de alguns times e registrar no histórico. Não dá pra desfazer pelo app.</p>
            <Input
              placeholder="Justificativa *"
              value={rebalanceReason}
              onChange={(e) => setRebalanceReason(e.target.value)}
            />
          </div>
        }
        confirmLabel="Executar"
        onConfirm={handleRebalanceConfirm}
        isLoading={isPending}
      />
    </div>
  )
}
