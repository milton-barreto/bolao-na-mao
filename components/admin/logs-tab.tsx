'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { adminGetLogs } from '@/lib/actions/admin'
import type { AdminLogEntry } from '@/types'

interface LogsTabProps {
  logs: AdminLogEntry[]
}

const ACTION_LABELS: Record<string, string> = {
  add_allowed_email: 'Adicionou e-mail',
  remove_allowed_email: 'Removeu e-mail',
  update_match: 'Editou jogo',
  force_match_status: 'Forçou status',
  cancel_match: 'Cancelou jogo',
  update_tier: 'Atualizou tier',
  toggle_api: 'Toggle API',
  recalc_all_bets: 'Recalculou palpites',
  set_banner: 'Definiu banner',
  clear_banner: 'Removeu banner',
  remove_avatar: 'Removeu avatar',
}

export function LogsTab({ logs: initialLogs }: LogsTabProps) {
  const [logs, setLogs] = useState(initialLogs)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [offset, setOffset] = useState(initialLogs.length)
  const [hasMore, setHasMore] = useState(initialLogs.length === 20)
  const [isPending, startTransition] = useTransition()

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function loadMore() {
    startTransition(async () => {
      const more = await adminGetLogs(20, offset)
      if (more.length < 20) setHasMore(false)
      setLogs((prev) => [...prev, ...more])
      setOffset((prev) => prev + more.length)
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-base">Log de ações admin</h2>

      {logs.length === 0 && (
        <p className="text-center text-sm text-[var(--text-secondary)] py-8">
          Nenhuma ação registrada ainda.
        </p>
      )}

      <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
        {logs.map((log) => {
          const isExpanded = expanded.has(log.id)
          const hasJson = log.before || log.after

          return (
            <div key={log.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                    {log.target_table && (
                      <span className="text-xs bg-[var(--bg-surface)] px-2 py-0.5 rounded font-mono">
                        {log.target_table}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {log.admin_name ?? 'Admin'} ·{' '}
                    {log.created_at
                      ? new Date(log.created_at).toLocaleString('pt-BR', {
                          timeZone: 'America/Fortaleza',
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '–'}
                  </p>
                  {log.reason && (
                    <p className="text-xs text-[var(--text-secondary)] italic mt-0.5">
                      &ldquo;{log.reason}&rdquo;
                    </p>
                  )}
                </div>

                {hasJson && (
                  <button
                    onClick={() => toggleExpand(log.id)}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex-shrink-0"
                    aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {log.before && (
                    <div>
                      <p className="text-xs font-medium mb-1">Antes:</p>
                      <pre className="text-xs bg-red-50 border border-red-100 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(log.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.after && (
                    <div>
                      <p className="text-xs font-medium mb-1">Depois:</p>
                      <pre className="text-xs bg-green-50 border border-green-100 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(log.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button variant="outline" onClick={loadMore} disabled={isPending}>
            {isPending ? 'Carregando...' : 'Carregar mais 20'}
          </Button>
        </div>
      )}
    </div>
  )
}
