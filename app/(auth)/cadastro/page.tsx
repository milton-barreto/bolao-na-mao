import { SignupForm } from '@/components/auth/signup-form'

export const metadata = { title: 'Criar conta — Bolão na Mão' }

export default function CadastroPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">Cria tua conta</h1>
        <p className="text-sm text-muted-foreground">
          É rapidinho. Bora nessa.
        </p>
      </div>
      <SignupForm />
    </div>
  )
}
