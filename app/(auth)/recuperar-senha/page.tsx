import { ResetForm } from '@/components/auth/reset-form'

export const metadata = { title: 'Recuperar senha — Bolão na Mão' }

export default function RecuperarSenhaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">Esqueceu a senha?</h1>
        <p className="text-sm text-muted-foreground">
          Sem stress. Manda teu e-mail que a gente resolve.
        </p>
      </div>
      <ResetForm />
    </div>
  )
}
