'use client'

import Link from 'next/link'
import { useUser } from '@/hooks/use-user'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export function UserAvatar() {
  const { profile, isLoading } = useUser()

  if (isLoading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
  }

  if (!profile) return null

  const initial = profile.name?.trim()?.[0]?.toUpperCase() ?? '?'

  return (
    <Link href="/perfil" aria-label="Meu perfil">
      <Avatar isCurrentUser className="h-8 w-8">
        {profile.avatar_url ? (
          <AvatarImage src={profile.avatar_url} alt={profile.name} />
        ) : null}
        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
      </Avatar>
    </Link>
  )
}
