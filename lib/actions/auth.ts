'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { TOAST } from '@/lib/constants'

export type ActionResult =
  | { error: string }
  | { success: true; redirectTo: string }
  | undefined

/** Origin atual (para montar o redirectTo do e-mail de recuperação) */
async function getOrigin(): Promise<string> {
  const h = await headers()
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    h.get('origin') ??
    `https://${h.get('host')}`
  )
}

// =============================================================
// LOGIN
// Retorna { success, redirectTo } em vez de chamar redirect() —
// evita o "An unexpected response" quando chamado imperativamente
// de um Client Component (não via <form action>).
// =============================================================
export async function login(
  email: string,
  password: string,
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: TOAST.loginError }
  }

  return { success: true, redirectTo: '/' }
}

// =============================================================
// SIGNUP
// Mesma lógica: retorna { success } e deixa o client redirecionar.
// =============================================================
export async function signup(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const avatar = formData.get('avatar') as File | null

  if (!email || !password || !name) {
    return { error: TOAST.genericError }
  }

  const supabase = await createClient()

  // 1) Verifica allowlist via RPC (SECURITY DEFINER)
  const { data: allowed, error: rpcError } = await supabase.rpc(
    'check_email_allowed',
    { p_email: email },
  )
  if (rpcError) return { error: TOAST.genericError }
  if (!allowed) return { error: TOAST.emailNotAllowed }

  // 2) Cria o usuário (trigger handle_new_user cria o profile com o name)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (signUpError || !signUpData.user) {
    return { error: signUpError?.message ?? TOAST.genericError }
  }

  const userId = signUpData.user.id

  // 3) Upload do avatar (se enviado) e atualização do profile
  if (avatar && avatar.size > 0) {
    const ext = avatar.type === 'image/png' ? 'png' : 'jpg'
    const path = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatar, { upsert: true, contentType: avatar.type })

    if (!uploadError) {
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase
        .from('profiles')
        .update({ avatar_url: pub.publicUrl })
        .eq('id', userId)
    }
    // Falha no upload não bloqueia o cadastro — avatar é opcional
  }

  // 4) Marca o e-mail como usado na allowlist
  await supabase
    .from('allowed_emails')
    .update({ used: true })
    .eq('email', email.toLowerCase())

  return { success: true, redirectTo: '/' }
}

// =============================================================
// LOGOUT
// Aqui o redirect() é seguro — logout é chamado via <form action>
// (não via await imperativo), então o Next.js entrega o redirect OK.
// =============================================================
export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// =============================================================
// RECUPERAÇÃO DE SENHA
// =============================================================
export async function requestPasswordReset(
  email: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const origin = await getOrigin()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/atualizar-senha`,
  })

  // Não revelar se o e-mail existe — sempre retorna sucesso
  if (error) return { error: TOAST.genericError }
  return undefined
}

// =============================================================
// ATUALIZAR SENHA (pós recovery)
// =============================================================
export async function updatePassword(
  newPassword: string,
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: TOAST.genericError }

  return { success: true, redirectTo: '/' }
}
