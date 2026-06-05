'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ProfileActionResult =
  | { success: true }
  | { error: string }

// =============================================================
// UPDATE PROFILE
// Atualiza nome e/ou foto de perfil.
// =============================================================
export async function updateProfile(formData: FormData): Promise<ProfileActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Não autenticado.' }

  const name = String(formData.get('name') ?? '').trim()
  const avatar = formData.get('avatar') as File | null

  if (!name || name.length < 2) {
    return { error: 'Nome muito curto. Mínimo 2 caracteres.' }
  }
  if (name.length > 40) {
    return { error: 'Nome muito longo. Máximo 40 caracteres.' }
  }

  // Atualizar nome no auth metadata (para consistência)
  await supabase.auth.updateUser({ data: { name } })

  let avatarUrl: string | undefined = undefined

  // Upload do novo avatar, se enviado
  if (avatar && avatar.size > 0) {
    const ext = avatar.type === 'image/png' ? 'png' : 'jpg'
    const path = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatar, { upsert: true, contentType: avatar.type })

    if (!uploadError) {
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      avatarUrl = pub.publicUrl
    }
    // Upload falho não bloqueia update do nome
  }

  const updatePayload: { name: string; avatar_url?: string } = { name }
  if (avatarUrl) updatePayload.avatar_url = avatarUrl

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)

  if (updateError) {
    console.error('updateProfile:', updateError)
    return { error: 'Não salvou. Tenta de novo.' }
  }

  revalidatePath('/perfil')
  revalidatePath('/')
  return { success: true }
}

// =============================================================
// UPDATE PASSWORD (perfil — usuário já logado)
// =============================================================
export async function updateProfilePassword(
  newPassword: string,
): Promise<ProfileActionResult> {
  const supabase = await createClient()

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Senha de no mínimo 6 caracteres, vai.' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    console.error('updateProfilePassword:', error)
    return { error: 'Não salvou. Tenta de novo.' }
  }

  return { success: true }
}
