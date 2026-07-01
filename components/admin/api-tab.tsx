'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Power, RotateCcw, CheckCircle2, XCircle, Bell, BellOff, Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog } from '@/components/ui/alert-dialog'
import {
  adminToggleApi,
  adminTriggerSync,
  adminRecalcAllBets,
  adminBackfillKnockoutRegularTime,
  adminSetBanner,
  adminClearBanner,
  type KnockoutBackfillResult,
} from '@/lib/actions/admin'
import type { BannerConfig, SyncResult, TournamentState } from '@/types'
import { TournamentTab } from './tournament-tab'

interface ApiTabProps {
  apiStatus: { available: boolean; last_sync?: string } | null
  currentBanner?: BannerConfig | null
  tournamentState?: TournamentState
}

export function ApiTab({ apiStatus: initialStatus, currentBanner, tournamentState = 'group' }: ApiTabProps) {
  const [status, setStatus] = useState(initialStatus)
  const [isPending, startTransition] = useTransition()
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
  const [recalcCount, setRecalcCount] = useState<number | null>(null)
  const [backfillResult, setBackfillResult] = useState<KnockoutBackfillResult | null>(null)

  // Banner
  const [bannerText, setBannerText] = useState(currentBanner?.text ?? '')
  const [bannerType, setBannerType] = useState<BannerConfig['type']>(currentBanner?.type ?? 'info')
  const [bannerActive, setBannerActive] = useState(!!currentBanner?.text)

  // Confirmações
  const [confirmToggle, setConfirmToggle] = useState(false)
  const [confirmRecalc, setConfirmRecalc] = useState(false)

  function handleToggleClick() {
    if (status?.available) {
      // Desligar → precisa de confirmação
      setConfirmToggle(true)
    } else {
      // Ligar → direto
      doToggle(true)
    }
  }

  function doToggle(available: boolean) {
    startTransition(async () => {
      const res = await adminToggleApi(available)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success(res.message ?? 'Status atualizado.')
        setStatus((prev) => ({ ...prev, available }))
        setConfirmToggle(false)
      }
    })
  }

  function handleSync() {
    startTransition(async () => {
      const res = await adminTriggerSync()
      if ('error' in res) {
        toast.error(res.error)
      } else {
        const r = (res as { result?: SyncResult }).result
        setLastSyncResult(r ?? null)
        toast.success(
          r
            ? `Sync: ${r.synced} sincronizados, ${r.skipped} pulados, ${r.errors.length} erros.`
            : res.message ?? 'Sync concluído.',
        )
        // Atualiza last_sync
        setStatus((prev) => ({
          ...prev,
          available: prev?.available ?? true,
          last_sync: new Date().toISOString(),
        }))
      }
    })
  }

  function handleBackfillKnockout() {
    startTransition(async () => {
      const res = await adminBackfillKnockoutRegularTime()
      if ('error' in res) {
        toast.error(res.error)
      } else {
        const r = (res as { result?: KnockoutBackfillResult }).result ?? null
        setBackfillResult(r)
        toast.success(
          r
            ? `${r.corrected.length} corrigidos · ${r.needsManual.length} p/ revisão manual`
            : res.message ?? 'Correção concluída.',
        )
      }
    })
  }

  function handleRecalcAll() {
    startTransition(async () => {
      const res = await adminRecalcAllBets()
      if ('error' in res) {
        toast.error(res.error)
      } else {
        const count = (res as { count?: number }).count
        setRecalcCount(count ?? 0)
        toast.success(
          count !== undefined
            ? `${count} palpites recalculados.`
            : res.message ?? 'Recalculado.',
        )
        setConfirmRecalc(false)
      }
    })
  }

  const lastSync = status?.last_sync
    ? new Date(status.last_sync).toLocaleString('pt-BR', {
        timeZone: 'America/Fortaleza',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-base">Controle da API</h2>

      {/* Status atual */}
      <div className="border border-[var(--border)] rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          {status?.available ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium text-sm">
              {status?.available ? 'API ativa (modo automático)' : 'Modo manual (API desligada)'}
            </p>
            {lastSync && (
              <p className="text-xs text-[var(--text-secondary)]">
                Último sync: {lastSync} (Fortaleza)
              </p>
            )}
          </div>
        </div>

        {/* Toggle */}
        <Button
          variant={status?.available ? 'outline' : 'default'}
          onClick={handleToggleClick}
          disabled={isPending}
          className="flex items-center gap-2"
        >
          <Power className="w-4 h-4" />
          {status?.available ? 'Desligar API (modo manual)' : 'Ligar API (modo automático)'}
        </Button>
      </div>

      {/* Sincronizar agora */}
      <div className="border border-[var(--border)] rounded-lg p-4 space-y-3">
        <div>
          <p className="font-medium text-sm">Sincronizar agora</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Chama a Edge Function sync-matches imediatamente. Só funciona com API ativa.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={isPending || !status?.available}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
          Sincronizar agora
        </Button>

        {lastSyncResult && (
          <div className="text-xs space-y-1 bg-[var(--bg-surface)] rounded p-3">
            <p>✅ Sincronizados: <strong>{lastSyncResult.synced}</strong></p>
            <p>⏭️ Pulados: <strong>{lastSyncResult.skipped}</strong></p>
            {lastSyncResult.errors.length > 0 && (
              <div>
                <p className="text-red-500">❌ Erros ({lastSyncResult.errors.length}):</p>
                {lastSyncResult.errors.map((e, i) => (
                  <p key={i} className="text-red-400 font-mono text-xs">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recalcular todos os palpites */}
      <div className="border border-[var(--border)] rounded-lg p-4 space-y-3">
        <div>
          <p className="font-medium text-sm">Recalcular todos os palpites</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Roda recalc_finished_bets() para todos os jogos finalizados.
            Use se os pontos estiverem inconsistentes.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setConfirmRecalc(true)}
          disabled={isPending}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Recalcular todos
        </Button>
        {recalcCount !== null && (
          <p className="text-xs text-green-600">
            ✅ {recalcCount} palpites recalculados com sucesso.
          </p>
        )}
      </div>

      {/* Corrigir placares do mata-mata (tempo regulamentar) */}
      <div className="border border-[var(--border)] rounded-lg p-4 space-y-3">
        <div>
          <p className="font-medium text-sm flex items-center gap-2">
            <Swords className="w-4 h-4" />
            Corrigir placares do mata-mata
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Rebusca o placar do <strong>tempo regulamentar (90&apos;)</strong> na API para
            todos os jogos de mata-mata finalizados, registra quem avançou e recalcula os
            pontos. Ignora prorrogação e pênaltis. Preserva jogos editados à mão.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleBackfillKnockout}
          disabled={isPending || !status?.available}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
          Corrigir placares do mata-mata
        </Button>
        {!status?.available && (
          <p className="text-xs text-[var(--text-secondary)]">
            A API está desligada. Ligue-a para rebuscar os placares, ou ajuste cada jogo na aba Jogos.
          </p>
        )}

        {backfillResult && (
          <div className="text-xs space-y-2 bg-[var(--bg-surface)] rounded p-3">
            <p>✅ Corrigidos: <strong>{backfillResult.corrected.length}</strong></p>
            {backfillResult.corrected.length > 0 && (
              <ul className="ml-4 list-disc space-y-0.5 text-[var(--text-secondary)]">
                {backfillResult.corrected.map((m) => (
                  <li key={m.match_id}>{m.label}</li>
                ))}
              </ul>
            )}

            {backfillResult.needsManual.length > 0 && (
              <div>
                <p className="text-yellow-700">
                  ⚠️ Ajustar manualmente na aba Jogos ({backfillResult.needsManual.length}):
                </p>
                <ul className="ml-4 list-disc space-y-0.5 text-yellow-700">
                  {backfillResult.needsManual.map((m) => (
                    <li key={m.match_id}>{m.label} — {m.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {backfillResult.skippedEdited.length > 0 && (
              <div>
                <p className="text-[var(--text-secondary)]">
                  ✋ Editados à mão (preservados) ({backfillResult.skippedEdited.length}):
                </p>
                <ul className="ml-4 list-disc space-y-0.5 text-[var(--text-secondary)]">
                  {backfillResult.skippedEdited.map((m) => (
                    <li key={m.match_id}>{m.label}</li>
                  ))}
                </ul>
              </div>
            )}

            {backfillResult.errors.length > 0 && (
              <div>
                <p className="text-red-500">❌ Erros ({backfillResult.errors.length}):</p>
                {backfillResult.errors.map((e, i) => (
                  <p key={i} className="text-red-400 font-mono text-xs">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Banner global */}
      <div className="border border-[var(--border)] rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          {bannerActive ? (
            <Bell className="w-4 h-4 text-yellow-600" />
          ) : (
            <BellOff className="w-4 h-4 text-[var(--text-secondary)]" />
          )}
          <p className="font-medium text-sm">Banner global</p>
          {bannerActive && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
              Ativo
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Exibido para todos os usuários no topo do app. Use com moderação.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Texto do banner..."
            value={bannerText}
            onChange={(e) => setBannerText(e.target.value)}
            className="flex-1"
          />
          <select
            className="border border-[var(--border)] rounded-md px-2 py-2 text-sm bg-white"
            value={bannerType}
            onChange={(e) => setBannerType(e.target.value as BannerConfig['type'])}
          >
            <option value="info">ℹ️ Info</option>
            <option value="warning">⚠️ Aviso</option>
            <option value="error">❌ Urgente</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              startTransition(async () => {
                if (!bannerText.trim()) return
                const res = await adminSetBanner(bannerText.trim(), bannerType)
                if ('error' in res) toast.error(res.error)
                else {
                  toast.success(res.message ?? 'Banner publicado.')
                  setBannerActive(true)
                }
              })
            }}
            disabled={isPending || !bannerText.trim()}
            size="sm"
          >
            Publicar banner
          </Button>
          {bannerActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                startTransition(async () => {
                  const res = await adminClearBanner()
                  if ('error' in res) toast.error(res.error)
                  else {
                    toast.success(res.message ?? 'Banner removido.')
                    setBannerActive(false)
                    setBannerText('')
                  }
                })
              }}
              disabled={isPending}
            >
              Remover banner
            </Button>
          )}
        </div>
      </div>

      {/* Confirmações */}
      <AlertDialog
        open={confirmToggle}
        onOpenChange={setConfirmToggle}
        title="Desligar a API?"
        description="Com a API desligada, nenhum sync automático acontece. Os placares precisarão ser editados manualmente. Tem certeza?"
        confirmLabel="Desligar"
        destructive
        onConfirm={() => doToggle(false)}
        isLoading={isPending}
      />

      <AlertDialog
        open={confirmRecalc}
        onOpenChange={setConfirmRecalc}
        title="Recalcular todos os palpites?"
        description="Isso vai rodar o recálculo de pontos para todos os jogos finalizados. Pode levar alguns segundos. Continua?"
        confirmLabel="Recalcular"
        onConfirm={handleRecalcAll}
        isLoading={isPending}
      />

      {/* Seção de Torneio */}
      <TournamentTab currentState={tournamentState} />
    </div>
  )
}
