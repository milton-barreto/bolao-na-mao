import { Info, AlertTriangle, XCircle } from 'lucide-react'
import type { BannerConfig } from '@/types'

interface GlobalBannerProps {
  config: BannerConfig | null
}

const BANNER_STYLES: Record<
  BannerConfig['type'],
  { bg: string; border: string; text: string; Icon: typeof Info }
> = {
  info: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#1D4ED8',
    Icon: Info,
  },
  warning: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#92400E',
    Icon: AlertTriangle,
  },
  error: {
    bg: '#FEF2F2',
    border: '#FECACA',
    text: '#991B1B',
    Icon: XCircle,
  },
}

export function GlobalBanner({ config }: GlobalBannerProps) {
  if (!config || !config.text) return null

  const style = BANNER_STYLES[config.type] ?? BANNER_STYLES.info
  const { Icon } = style

  return (
    <div
      className="w-full px-4 py-2 flex items-center gap-2 text-sm font-medium border-b"
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.text,
      }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{config.text}</span>
    </div>
  )
}
