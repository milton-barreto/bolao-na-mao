'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { resetSchema, type ResetInput } from '@/lib/validations/auth'
import { requestPasswordReset } from '@/lib/actions/auth'
import { TOAST } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ResetForm() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetInput>({ resolver: zodResolver(resetSchema) })

  async function onSubmit(data: ResetInput) {
    setLoading(true)
    const result = await requestPasswordReset(data.email)
    setLoading(false)

    if (result && 'error' in result) {
      toast.error(result.error)
      return
    }
    setSent(true)
    toast.success(TOAST.passwordResetSent)
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-base">
          Se esse e-mail tá cadastrado, mandamos um link de recuperação. 📬
        </p>
        <p className="text-sm text-muted-foreground">
          Dá uma olhada na caixa de entrada (e no spam também).
        </p>
        <Link href="/login" className="text-sm text-brand-blue hover:underline">
          Voltar pro login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail da conta</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-danger">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Mandando...' : 'Mandar link'}
      </Button>

      <Link
        href="/login"
        className="text-center text-sm text-muted-foreground hover:underline"
      >
        ← Voltar pro login
      </Link>
    </form>
  )
}
