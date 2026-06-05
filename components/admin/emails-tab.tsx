'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Trash2, Plus, Mail, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertDialog } from '@/components/ui/alert-dialog'
import {
  adminAddAllowedEmail,
  adminRemoveAllowedEmail,
} from '@/lib/actions/admin'
import type { AllowedEmailEntry } from '@/types'

interface EmailsTabProps {
  emails: AllowedEmailEntry[]
}

const MAX_USERS = 20

export function EmailsTab({ emails: initialEmails }: EmailsTabProps) {
  const [emails, setEmails] = useState(initialEmails)
  const [newEmail, setNewEmail] = useState('')
  const [isPending, startTransition] = useTransition()

  // Para o AlertDialog de remoção
  const [removeTarget, setRemoveTarget] = useState<AllowedEmailEntry | null>(null)
  const [removeForce, setRemoveForce] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const usedCount = emails.filter((e) => e.used).length

  function handleAdd() {
    if (!newEmail.trim()) return
    startTransition(async () => {
      const res = await adminAddAllowedEmail(newEmail.trim())
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success(res.message ?? 'E-mail adicionado.')
        setEmails((prev) => [
          {
            email: newEmail.trim().toLowerCase(),
            used: false,
            invited_by: null,
            created_at: new Date().toISOString(),
            invited_by_name: null,
          },
          ...prev,
        ])
        setNewEmail('')
      }
    })
  }

  function handleRemoveClick(entry: AllowedEmailEntry) {
    if (entry.used) {
      setRemoveForce(true)
    } else {
      setRemoveForce(false)
    }
    setRemoveTarget(entry)
  }

  async function handleRemoveConfirm() {
    if (!removeTarget) return
    setIsRemoving(true)
    const res = await adminRemoveAllowedEmail(removeTarget.email, removeForce)
    setIsRemoving(false)

    if ('error' in res) {
      toast.error(res.error)
    } else {
      toast.success(res.message ?? 'Removido.')
      setEmails((prev) => prev.filter((e) => e.email !== removeTarget.email))
      setRemoveTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Contador de slots */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Allowlist de e-mails</h2>
        <Badge variant={usedCount >= MAX_USERS ? 'destructive' : 'secondary'}>
          {usedCount}/{MAX_USERS} slots usados
        </Badge>
      </div>

      {/* Formulário de adição */}
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="email@exemplo.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          disabled={isPending}
        />
        <Button onClick={handleAdd} disabled={isPending || !newEmail.trim()}>
          <Plus className="w-4 h-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {/* Lista */}
      <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
        {emails.length === 0 && (
          <p className="text-center text-sm text-[var(--text-secondary)] py-8">
            Nenhum e-mail na lista.
          </p>
        )}
        {emails.map((entry) => (
          <div key={entry.email} className="flex items-center gap-3 px-4 py-3">
            <Mail className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.email}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {entry.invited_by_name
                  ? `Convidado por ${entry.invited_by_name}`
                  : 'Admin'}
                {entry.created_at &&
                  ` · ${new Date(entry.created_at).toLocaleDateString('pt-BR')}`}
              </p>
            </div>
            {entry.used ? (
              <Badge variant="default" className="flex items-center gap-1 bg-green-600 text-white">
                <CheckCircle2 className="w-3 h-3" />
                Usado
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Livre
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
              onClick={() => handleRemoveClick(entry)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* AlertDialog de confirmação de remoção */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={removeForce ? 'Remover e-mail já usado?' : 'Remover e-mail?'}
        description={
          removeForce
            ? `O e-mail "${removeTarget?.email}" já foi usado para criar uma conta. Remover não apaga a conta — apenas impede novos cadastros com esse e-mail. Confirma?`
            : `Remover "${removeTarget?.email}" da allowlist? Essa pessoa não conseguirá mais criar conta.`
        }
        confirmLabel="Remover"
        destructive
        onConfirm={handleRemoveConfirm}
        isLoading={isRemoving}
      />
    </div>
  )
}
