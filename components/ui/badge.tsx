import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input text-foreground',
        success: 'bg-success text-white',
        warning: 'bg-warning text-black',
        /* Tiers (§7.3 — cor por tier) */
        tier1: 'bg-tier-1 text-white',
        tier2: 'bg-tier-2 text-white',
        tier3: 'bg-tier-3 text-black',
        tier4: 'bg-tier-4 text-white',
        tier5: 'bg-tier-5 text-white',
        /* Status do palpite */
        acertou_placar: 'bg-success text-white',
        acertou_resultado: 'bg-warning text-black',
        errou: 'bg-danger text-white',
        travado: 'bg-muted text-muted-foreground border border-input',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

const TIER_VARIANTS = {
  1: 'tier1',
  2: 'tier2',
  3: 'tier3',
  4: 'tier4',
  5: 'tier5',
} as const

function TierBadge({ tier }: { tier: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <Badge variant={TIER_VARIANTS[tier]}>
      T{tier}
    </Badge>
  )
}

export { Badge, TierBadge, badgeVariants }
