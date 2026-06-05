import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'

/** Rotas acessíveis sem sessão */
const PUBLIC_ROUTES = [
  '/login',
  '/cadastro',
  '/recuperar-senha',
  '/atualizar-senha',
  '/auth/callback',
]

/** Rotas onde um usuário JÁ logado não deveria ficar (manda pra Home) */
const AUTH_ONLY_ROUTES = ['/login', '/cadastro']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANTE: não adicionar lógica entre createServerClient e getUser
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))

  // 1) Sem sessão em rota protegida → manda pro login
  if (!user && !isPublic) {
    return redirectPreservingCookies(request, supabaseResponse, '/login')
  }

  // 2) Logado tentando acessar /login ou /cadastro → manda pra Home
  if (user && AUTH_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    return redirectPreservingCookies(request, supabaseResponse, '/')
  }

  // 3) Rota /admin → só is_admin
  if (user && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return redirectPreservingCookies(request, supabaseResponse, '/')
    }
  }

  return supabaseResponse
}

/**
 * Cria um redirect copiando os cookies de sessão já setados,
 * para não perder o refresh do token (padrão oficial @supabase/ssr).
 */
function redirectPreservingCookies(
  request: NextRequest,
  current: NextResponse,
  to: string,
): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = to
  url.search = ''
  const redirect = NextResponse.redirect(url)
  current.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value)
  })
  return redirect
}
