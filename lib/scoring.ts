import { getOdd, type MatchResult } from './odds'

export interface ScorePreview {
  /**
   * Grupos: pontos ao cravar o placar exato (2×odd).
   * Mata-mata: pontos ao cravar o placar E acertar quem avança (1 + 2×odd).
   */
  ifExact: number
  /**
   * Grupos: pontos ao acertar apenas o resultado (1×odd).
   * Mata-mata: pontos ao acertar apenas quem avança, com placar errado (1×odd).
   */
  ifResult: number
  /** Odd aplicada ao confronto */
  odd: number
}

/**
 * Calcula o preview de pontos para a UI (§5.4 ponto 4 do briefing).
 * Usado APENAS para exibição — nunca persista este valor.
 * O cálculo canônico é feito pelo SQL após o jogo finalizar.
 *
 * Mata-mata (isKnockout): placar exato + avanço = 1 fixo + 2×odd; só avanço
 * (placar errado) = 1×odd; placar exato com avanço errado = 0. Ver §5.5.
 */
export function previewPoints(
  homeTier: number,
  awayTier: number,
  predictedHome: number,
  predictedAway: number,
  isKnockout = false,
): ScorePreview {
  const result: MatchResult =
    predictedHome > predictedAway
      ? 'home_win'
      : predictedHome < predictedAway
        ? 'away_win'
        : 'draw'

  const odd = getOdd(homeTier, awayTier, result)

  if (isKnockout) {
    return {
      ifExact: parseFloat((1 + 2 * odd).toFixed(2)), // avanço (1 fixo) + placar exato (2×odd)
      ifResult: parseFloat(odd.toFixed(2)), // só quem avança, placar errado (1×odd)
      odd,
    }
  }

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
