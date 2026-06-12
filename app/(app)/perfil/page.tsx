import { LogOut } from 'lucide-react'
import { Container } from '@/components/layout/container'
import { ProfileForm } from '@/components/profile-form'
import { ExtratoView } from '@/components/extrato-view'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/actions/auth'
import { getMyBets, type MyBetEntry } from '@/lib/actions/bets'

export const metadata = { title: 'Perfil — Bolão na Mão' }

export default async function PerfilPage() {
  const allBets = await getMyBets('group')

  const rounds: Record<number, MyBetEntry[]> = {}
  for (const entry of allBets) {
    const r = entry.match.round_number ?? 1
    if (!rounds[r]) rounds[r] = []
    rounds[r].push(entry)
  }

  return (
    <Container className="py-6">
      <header className="mb-4">
        <h1 className="font-display text-2xl font-bold">Meu Perfil</h1>
      </header>
      <div className="flex flex-col gap-6">
        <ProfileForm />

        {Object.keys(rounds).length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-bold">Balanço</h2>
            <ExtratoView rounds={rounds} />
          </section>
        )}

        <form action={logout}>
          <Button type="submit" variant="ghost" className="w-full text-danger hover:text-danger">
            <LogOut className="h-4 w-4" /> Sair fora 👋
          </Button>
        </form>
      </div>
    </Container>
  )
}
