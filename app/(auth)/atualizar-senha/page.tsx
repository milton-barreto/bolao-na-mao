import { UpdatePasswordForm } from '@/components/auth/update-password-form'

export const metadata = { title: 'Nova senha — Bolão na Mão' }

export default function AtualizarSenhaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">Define a nova senha</h1>
        <p className="text-sm text-muted-foreground">
          Escolhe uma que tu não esqueça dessa vez. 😅
        </p>
      </div>
      <UpdatePasswordForm />
    </div>
  )
}
