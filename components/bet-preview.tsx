'use client'

import { Coins, Zap } from 'lucide-react'
import { previewPoints } from '@/lib/scoring'

interface BetPreviewProps {
  homeTier: number
  awayTier: number
  predictedHome: number | ''
  predictedAway: number | ''
}

/**
 * Preview de pontos em tempo real (§6.2 do briefing).
 * 100% client-side via previewPoints (lib/scoring.ts) — odds idênticas ao SQL.
 * Atualiza a cada keystroke; zero latência, zero custo.
 */
export function BetPreview({
  homeTier,
  awayTier,
  predictedHome,
  predictedAway,
}: BetPreviewProps) {
  // Só mostra o preview quando ambos os placares estão preenchidos
  if (predictedHome === '' || predictedAway === '') {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Preenche o placar pra ver quantos pontos vale.
      </p>
    )
  }

  const { ifExact, ifResult } = previewPoints(
    homeTier,
    awayTier,
    predictedHome,
    predictedAway,
  )

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-muted-foreground"><Coins className="h-3 w-3" /> Cravando o placar:</span>
        <span className="font-display font-bold text-success">
          {ifExact.toFixed(2).replace('.', ',')} pts
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-muted-foreground"><Zap className="h-3 w-3" /> Acertando o resultado:</span>
        <span className="font-display font-bold text-foreground">
          {ifResult.toFixed(2).replace('.', ',')} pts
        </span>
      </div>
    </div>
  )
}
