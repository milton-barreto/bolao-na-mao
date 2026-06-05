'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { newPasswordSchema, type NewPasswordInput } from '@/lib/validations/auth'
import { updatePassword } from '@/lib/actions/auth'
import { TOAST } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function UpdatePasswordForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordInput>({ resolver: zodResolver(newPasswordSchema) })

  async function onSubmit(data: NewPasswordInput) {
    setLoading(true)
    const result = await updatePassword(data.password)

    if (!result || 'error' in result) {
      toast.error(result?.error ?? 'Quebrou aqui. Avisa o admin.')
      setLoading(false)
      return
    }

    toast.success(TOAST.passwordUpdated)
    router.refresh()
    router.push(result.redirectTo)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-danger">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirma a nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repete a senha"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-danger">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  )
}
