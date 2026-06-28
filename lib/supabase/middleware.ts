import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env'
import type { Database } from './types'

/** Rotas acessíveis sem sessão */
const PUBLIC_ROUTES = [
  '/login',
  '/cadastro',
  '/recuperar-senha',
  '/atualizar-senha',
  '/auth/callback',
  '/manutencao',
]

/** Rotas onde um usuário JÁ logado não deveria ficar (manda pra Home) */
const AUTH_ONLY_ROUTES = ['/login', '/cadastro']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
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

  // 3) Modo manutenção → só admin passa
  if (!pathname.startsWith('/manutencao')) {
    const { data: config } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()

    const isInMaintenance = config?.value === true

    if (isInMaintenance) {
      let isAdmin = false
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        isAdmin = profile?.is_admin ?? false
      }
      if (!isAdmin) {
        return redirectPreservingCookies(request, supabaseResponse, '/manutencao')
      }
    }
  }

  // 4) Rota /admin → só is_admin
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
