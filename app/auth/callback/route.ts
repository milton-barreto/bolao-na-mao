import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Route Handler obrigatório para o fluxo PKCE do Supabase Auth.
 * Troca o `code` por uma sessão e redireciona conforme o `next` (ou para a Home).
 * Usado pela recuperação de senha (resetPasswordForEmail).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Falhou — manda para o login com flag de erro
  return NextResponse.redirect(`${origin}/login?erro=callback`)
}
