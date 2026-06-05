'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'
import { useUser } from '@/hooks/use-user'

export function AdminNavLink() {
  const { isAdmin, isLoading } = useUser()

  if (isLoading || !isAdmin) return null

  return (
    <Link
      href="/admin"
      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      title="Painel Admin"
    >
      <Settings className="h-4 w-4" />
      Admin
    </Link>
  )
}
