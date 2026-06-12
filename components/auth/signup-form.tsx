'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import {
  emailSchema,
  type EmailInput,
  signupStep2Schema,
  type SignupStep2Input,
} from '@/lib/validations/auth'
import { signup } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { TOAST } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AvatarUpload } from '@/components/avatar-upload'

export function SignupForm() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  // ===== Passo 1: e-mail + allowlist =====
  const step1 = useForm<EmailInput>({ resolver: zodResolver(emailSchema) })

  async function onStep1(data: EmailInput) {
    setLoading(true)
    const supabase = createClient()
    const { data: status, error } = await supabase.rpc('check_signup_eligibility', {
      p_email: data.email,
    })
    setLoading(false)

    if (error) {
      toast.error(TOAST.genericError)
      return
    }
    if (status === 'already_registered') {
      toast.error('Você já tem uma conta! Clica em "Já tem conta?" pra entrar.')
      return
    }
    if (status !== 'allowed') {
      toast.error(TOAST.emailNotAllowed)
      return
    }
    setEmail(data.email)
    setStep(2)
  }

  // ===== Passo 2: nome + senha + foto =====
  const step2 = useForm<SignupStep2Input>({
    resolver: zodResolver(signupStep2Schema),
  })

  async function onStep2(data: SignupStep2Input) {
    setLoading(true)
    const formData = new FormData()
    formData.set('email', email)
    formData.set('name', data.name)
    formData.set('password', data.password)
    if (avatar) formData.set('avatar', avatar)

    const result = await signup(formData)

    if (!result || 'error' in result) {
      if (result?.error === 'already_registered') {
        toast.error('Você já tem uma conta! Clica em "Já tem conta?" pra entrar.')
        setStep(1)
      } else {
        toast.error(result?.error ?? TOAST.genericError)
      }
      setLoading(false)
      return
    }

    // Sucesso — navega no cliente
    toast.success(TOAST.accountCreated)
    router.refresh()
    router.push(result.redirectTo)
  }

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator step={step} />

      {step === 1 ? (
        <form
          onSubmit={step1.handleSubmit(onStep1)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Qual seu e-mail?</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              {...step1.register('email')}
            />
            {step1.formState.errors.email && (
              <p className="text-sm text-danger">
                {step1.formState.errors.email.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Só quem tá na lista do admin consegue entrar.
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Verificando...' : 'Continuar'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/login" className="text-brand-blue hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      ) : (
        <form
          onSubmit={step2.handleSubmit(onStep2)}
          className="flex flex-col gap-4"
        >
          <AvatarUpload
            name={step2.watch('name')}
            onCropped={(file) => setAvatar(file)}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Como te chamam?</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Seu nome ou apelido"
              {...step2.register('name')}
            />
            {step2.formState.errors.name && (
              <p className="text-sm text-danger">
                {step2.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              {...step2.register('password')}
            />
            {step2.formState.errors.password && (
              <p className="text-sm text-danger">
                {step2.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirma a senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repete a senha"
              {...step2.register('confirmPassword')}
            />
            {step2.formState.errors.confirmPassword && (
              <p className="text-sm text-danger">
                {step2.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Criando conta...' : 'Criar conta'}
          </Button>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-center text-sm text-muted-foreground hover:underline"
          >
            ← Voltar
          </button>
        </form>
      )}
    </div>
  )
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Dot active={step >= 1} done={step > 1} label="1" />
      <div className="h-0.5 w-8 bg-border" />
      <Dot active={step >= 2} done={false} label="2" />
    </div>
  )
}

function Dot({
  active,
  done,
  label,
}: {
  active: boolean
  done: boolean
  label: string
}) {
  return (
    <div
      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {done ? <Check className="h-4 w-4" /> : label}
    </div>
  )
}
