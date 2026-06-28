'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Json } from '@/lib/supabase/types'
import type { GoldenTicket, GoldenTicketPredictions } from '@/types'
import type { TournamentState } from '@/lib/constants'
import { TICKET_EDIT_DEADLINE } from '@/lib/constants'

// =============================================================
// GET GOLDEN TICKET
// Retorna o bilhete do usuário logado ou null se não criado ainda.
// =============================================================
export async function getGoldenTicket(): Promise<GoldenTicket | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('golden_tickets')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return data ?? null
}

// =============================================================
// SAVE GOLDEN TICKET
// Upsert das predictions do bilhete.
// Só funciona se locked_at IS NULL.
// =============================================================
export async function saveGoldenTicket(
  predictions: GoldenTicketPredictions,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Faz login primeiro.' }

  // Verifica deadline temporal
  if (new Date() >= TICKET_EDIT_DEADLINE) {
    return { error: 'Prazo encerrado. O bilhete está travado. 🙏' }
  }

  // Upsert
  const { error } = await supabase
    .from('golden_tickets')
    .upsert(
      {
        user_id: user.id,
        predictions: predictions as Json, // GoldenTicketPredictions is a plain JSON-serialisable object
      },
      { onConflict: 'user_id' },
    )

  if (error) return { error: 'Erro ao salvar o bilhete. Tenta de novo.' }

  revalidatePath('/bilhete-premiado')
  return { success: true }
}

// =============================================================
// GET GOLDEN TICKET POINTS
// Chama a função SQL calculate_golden_ticket_points.
// =============================================================
export async function getGoldenTicketPoints(userId?: string): Promise<number> {
  const supabase = await createClient()

  let targetUserId = userId
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return 0
    targetUserId = user.id
  }

  const { data, error } = await supabase.rpc('calculate_golden_ticket_points', {
    p_user_id: targetUserId,
  })

  if (error) return 0
  return (data as number) ?? 0
}

// =============================================================
// ADMIN: GET ALL GOLDEN TICKETS
// Retorna todos os bilhetes para o admin visualizar.
// =============================================================
export async function adminGetAllGoldenTickets(): Promise<
  (GoldenTicket & { user_name: string })[]
> {
  const supabase = await createClient()

  // Verifica is_admin
  const { data: isAdm } = await supabase.rpc('is_admin')
  if (!isAdm) return []

  const service = createServiceClient()
  const { data, error } = await service
    .from('golden_tickets')
    .select('*, profiles!golden_tickets_user_id_fkey(name)')
    .order('updated_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    ...row,
    user_name: (row.profiles as { name: string } | null)?.name ?? '?',
  }))
}

// =============================================================
// GET TOURNAMENT STATE
// Lê o tournament_state do app_config.
// Retorna 'group' como padrão se não encontrado.
// =============================================================
export async function getTournamentState(): Promise<TournamentState> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'tournament_state')
    .single()

  if (!data?.value) return 'group'

  // value é JSONB string — extrair o texto
  const val = data.value
  if (typeof val === 'string') return val as TournamentState
  // Se for JSON string (e.g., '"group"'), extrai sem aspas
  if (typeof val === 'object' && val !== null) return 'group'
  return String(val).replace(/^"|"$/g, '') as TournamentState
}
