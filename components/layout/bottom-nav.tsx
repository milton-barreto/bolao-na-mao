'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Swords, Trophy, User, Sword } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/minhas-apostas', label: 'Apostas', icon: Swords },
  { href: '/mata-mata', label: 'Mata-mata', icon: Sword },
  { href: '/ranking', label: 'Ranking', icon: Trophy },
  { href: '/perfil', label: 'Perfil', icon: User },
]

function NavItemContent({
  label,
  icon: Icon,
  active,
}: {
  label: string
  icon: LucideIcon
  active: boolean
}) {
  const { pending } = useLinkStatus()
  return (
    <>
      <Icon
        className={cn(
          'h-5 w-5 transition-opacity',
          active && 'stroke-[2.5px]',
          pending && 'opacity-50',
        )}
        aria-hidden
      />
      <span className={cn('transition-opacity', pending && 'opacity-50')}>{label}</span>
      {pending && (
        <span className="absolute top-2 right-3 h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" />
      )}
    </>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="mx-auto flex max-w-[600px] items-center">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                active
                  ? 'text-brand-green'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <NavItemContent label={label} icon={Icon} active={active} />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
