import Image from 'next/image'
import { cn } from '@/lib/utils'

interface TeamFlagProps {
  flagUrl: string | null
  teamName: string
  size?: number
  className?: string
}

/**
 * Bandeira de um time. Usa next/image com flagcdn.com (configurado em
 * next.config.ts). Fallback: círculo com a inicial se não houver flag_url.
 */
export function TeamFlag({
  flagUrl,
  teamName,
  size = 32,
  className,
}: TeamFlagProps) {
  if (!flagUrl) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground',
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.45 }}
        aria-label={teamName}
      >
        {teamName.charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    <Image
      src={flagUrl}
      alt={`Bandeira ${teamName}`}
      width={size}
      height={Math.round(size * 0.75)}
      className={cn('rounded-sm object-cover', className)}
    />
  )
}
