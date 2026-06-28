import { redirect } from 'next/navigation'

// A aba de Ranking foi removida — o conteúdo agora vive no topo da home.
// Mantém a rota viva (deep-link de push, links antigos) redirecionando pra lá.
export default function RankingPage() {
  redirect('/')
}
