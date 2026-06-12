// Acesso estatico - bundler so substitui process.env.NOME com literal estatico.
// process.env[variavel] dinamico retorna undefined no browser.
function check(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export const SUPABASE_URL = check(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_URL',
)

export const SUPABASE_ANON_KEY = check(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
)

export const SUPABASE_SERVICE_ROLE_KEY = check(
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
  'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
)
