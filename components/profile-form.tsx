'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { updateProfile, updateProfilePassword } from '@/lib/actions/profile'
import { logout } from '@/lib/actions/auth'
import { newPasswordSchema, type NewPasswordInput } from '@/lib/validations/auth'
import { AvatarUpload } from '@/components/avatar-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TOAST } from '@/lib/constants'
import type { Profile } from '@/types'

// Inner component — recebe profile já carregado, sem necessidade de useEffect
function ProfileDataSection({
  profile,
  refreshProfile,
}: {
  profile: Profile
  refreshProfile: () => Promise<void>
}) {
  const [name, setName] = useState(profile.name ?? '')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [savingData, startSaveData] = useTransition()

  function handleSaveData() {
    if (name.trim().length < 2) {
      toast.error('Nome muito curto, mano.')
      return
    }
    startSaveData(async () => {
      const formData = new FormData()
      formData.set('name', name.trim())
      if (avatar) formData.set('avatar', avatar)

      const result = await updateProfile(formData)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(TOAST.profileUpdated)
        setAvatar(null)
        await refreshProfile()
      }
    })
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold">Quem sou eu</h2>

      <AvatarUpload name={name} currentUrl={profile.avatar_url ?? undefined} onCropped={setAvatar} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Teu nome ou apelido"
        />
      </div>

      <Button onClick={handleSaveData} disabled={savingData} className="w-full">
        {savingData ? 'Salvando...' : 'Salvar'}
      </Button>
    </section>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

export function ProfileForm() {
  const { profile, isLoading, refreshProfile } = useUser()

  // ===== Senha =====
  const [savingPwd, startSavePwd] = useTransition()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewPasswordInput>({ resolver: zodResolver(newPasswordSchema) })

  function onChangePassword(data: NewPasswordInput) {
    startSavePwd(async () => {
      const result = await updateProfilePassword(data.password)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(TOAST.passwordUpdated)
        reset()
      }
    })
  }

  if (isLoading || !profile) {
    return <LoadingSkeleton />
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Seção 1: Dados — só monta quando profile existe */}
      <ProfileDataSection profile={profile} refreshProfile={refreshProfile} />

      {/* Seção 2: Senha */}
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Mudar senha</h2>

        <form
          onSubmit={handleSubmit(onChangePassword)}
          className="flex flex-col gap-4"
        >
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
            <Label htmlFor="confirmPassword">Confirma aí</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="digita de novo"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-danger">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={savingPwd}
            variant="outline"
            className="w-full"
          >
            {savingPwd ? 'Trocando...' : 'Trocar'}
          </Button>
        </form>
      </section>

      {/* Logout */}
      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          className="w-full text-danger hover:text-danger"
        >
          <LogOut className="h-4 w-4" /> Sair fora 👋
        </Button>
      </form>
    </div>
  )
}
