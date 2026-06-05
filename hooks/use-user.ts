'use client'

import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface UseUserResult {
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  isLoading: boolean
  /** Recarrega o profile do banco (ex: após updateProfile) */
  refreshProfile: () => Promise<void>
}

export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Recarrega só o profile do usuário atual (sem mexer no estado de auth)
  const refreshProfile = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    if (!currentUser) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single()
    setProfile(data)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let active = true

    async function loadProfile(currentUser: User | null) {
      if (!currentUser) {
        if (active) {
          setProfile(null)
          setUser(null)
          setIsLoading(false)
        }
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (active) {
        setUser(currentUser)
        setProfile(data)
        setIsLoading(false)
      }
    }

    // Carga inicial
    supabase.auth.getUser().then(({ data }) => loadProfile(data.user))

    // Reage a login/logout
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user ?? null)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    profile,
    isAdmin: profile?.is_admin ?? false,
    isLoading,
    refreshProfile,
  }
}
