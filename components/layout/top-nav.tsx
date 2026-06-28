import Link from 'next/link'
import { Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/layout/user-avatar'
import { AdminNavLink } from '@/components/layout/admin-nav-link'

interface TopNavProps {
  className?: string
}

export function TopNav({ className }: TopNavProps) {
  return (
    <header
      className={cn(
        'hidden md:flex sticky top-0 z-50 border-b border-border bg-background',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[600px] items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="font-display text-lg font-bold text-foreground"
        >
          Bolão na Mão
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/minhas-apostas"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Apostas
          </Link>
          <Link
            href="/mata-mata"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Mata-mata
          </Link>
          <Link
            href="/bilhete-premiado"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Ticket className="h-4 w-4" />
            Bilhete Premiado
          </Link>
          <AdminNavLink />
          <UserAvatar />
        </nav>
      </div>
    </header>
  )
}
