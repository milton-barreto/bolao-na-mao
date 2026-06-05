import { Container } from '@/components/layout/container'
import { ProfileForm } from '@/components/profile-form'

export const metadata = { title: 'Perfil — Bolão na Mão' }

export default function PerfilPage() {
  return (
    <Container className="py-6">
      <header className="mb-4">
        <h1 className="font-display text-2xl font-bold">Meu Perfil</h1>
      </header>
      <ProfileForm />
    </Container>
  )
}
