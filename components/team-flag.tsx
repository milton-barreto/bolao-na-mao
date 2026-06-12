import Image from 'next/image'
import { cn } from '@/lib/utils'

interface TeamFlagProps {
  flagUrl: string | null
  teamName: string
  size?: number
  className?: string
}

// flagcdn.com armazena w40 no banco — upgrade para w160 para qualidade retina
function hqFlagUrl(url: string): string {
  return url.replace('/w40/', '/w160/')
}

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
          'inline-flex shrink-0 items-center justify-center rounded-sm bg-muted font-semibold text-muted-foreground',
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
    <span
      className={cn('relative inline-block shrink-0 overflow-hidden rounded-sm', className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={hqFlagUrl(flagUrl)}
        alt={`Bandeira ${teamName}`}
        fill
        sizes={`${size * 3}px`}
        className="object-cover"
      />
    </span>
  )
}
