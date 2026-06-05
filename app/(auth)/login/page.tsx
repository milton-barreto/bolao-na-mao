import { LoginForm } from '@/components/auth/login-form'

export const metadata = { title: 'Entrar — Bolão na Mão' }

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">Bora pra cima!</h1>
        <p className="text-sm text-muted-foreground">
          Entra pra palpitar e zoar a galera.
        </p>
      </div>
      <LoginForm />
    </div>
  )
}
