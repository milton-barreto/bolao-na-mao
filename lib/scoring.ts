import { getOdd, type MatchResult } from './odds'

export interface ScorePreview {
  /** Pontos se acertar placar exato */
  ifExact: number
  /** Pontos se acertar apenas o resultado (vitória/empate) */
  ifResult: number
  /** Odd aplicada ao confronto */
  odd: number
}

/**
 * Calcula o preview de pontos para a UI (§5.4 ponto 4 do briefing).
 * Usado APENAS para exibição — nunca persista este valor.
 * O cálculo canônico é feito pelo SQL após o jogo finalizar.
 */
export function previewPoints(
  homeTier: number,
  awayTier: number,
  predictedHome: number,
  predictedAway: number,
): ScorePreview {
  const result: MatchResult =
    predictedHome > predictedAway
      ? 'home_win'
      : predictedHome < predictedAway
        ? 'away_win'
        : 'draw'

  const odd = getOdd(homeTier, awayTier, result)

  return {
    ifExact: parseFloat((2 * odd).toFixed(2)),
    ifResult: parseFloat((1 * odd).toFixed(2)),
    odd,
  }
}

/**
 * Determina o resultado de um jogo dado os placares.
 */
export function matchResult(homeScore: number, awayScore: number): MatchResult {
  if (homeScore > awayScore) return 'home_win'
  if (homeScore < awayScore) return 'away_win'
  return 'draw'
}
