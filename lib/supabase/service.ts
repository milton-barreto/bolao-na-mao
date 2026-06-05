import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Client Supabase com service role key.
 *
 * ⚠️ SOMENTE importar em:
 *   - Server Actions ('use server')
 *   - Route Handlers (app/api/)
 *
 * Nunca importar em Client Components — expõe a service role key.
 */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
