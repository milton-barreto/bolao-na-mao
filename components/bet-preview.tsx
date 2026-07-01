'use client'

import { Coins, Zap } from 'lucide-react'
import { previewPoints } from '@/lib/scoring'

interface BetPreviewProps {
  homeTier: number
  awayTier: number
  predictedHome: number | ''
  predictedAway: number | ''
  /** Mata-mata: avanço = 1 fixo + placar exato = 2×odd (somam) */
  isKnockout?: boolean
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
  isKnockout = false,
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
    isKnockout,
  )

  const exactLabel = isKnockout ? 'Cravando placar + quem passa:' : 'Cravando o placar:'
  const resultLabel = isKnockout ? 'Só acertando quem passa:' : 'Acertando o resultado:'

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-muted-foreground"><Coins className="h-3 w-3" /> {exactLabel}</span>
        <span className="font-display font-bold text-success">
          {ifExact.toFixed(2).replace('.', ',')} pts
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-muted-foreground"><Zap className="h-3 w-3" /> {resultLabel}</span>
        <span className="font-display font-bold text-foreground">
          {ifResult.toFixed(2).replace('.', ',')} pts
        </span>
      </div>
    </div>
  )
}
