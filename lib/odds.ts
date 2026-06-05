/**
 * Tabela de odds constante (§4.2 do briefing).
 * Esta tabela é a ÚNICA fonte de verdade para odds.
 * As funções SQL calculate_odd() implementam a mesma lógica.
 * Nunca altere um lado sem alterar o outro.
 */
export const ODDS_TABLE: Record<string, { better: number; draw: number; worse: number }> = {
  '1v1': { better: 1.50, draw: 1.40, worse: 1.50 },
  '1v2': { better: 1.20, draw: 1.70, worse: 1.80 },
  '1v3': { better: 1.10, draw: 2.10, worse: 2.30 },
  '1v4': { better: 1.05, draw: 2.50, worse: 2.80 },
  '1v5': { better: 1.00, draw: 3.00, worse: 3.50 },
  '2v2': { better: 1.50, draw: 1.40, worse: 1.50 },
  '2v3': { better: 1.20, draw: 1.70, worse: 1.80 },
  '2v4': { better: 1.10, draw: 2.10, worse: 2.30 },
  '2v5': { better: 1.05, draw: 2.50, worse: 2.80 },
  '3v3': { better: 1.50, draw: 1.40, worse: 1.50 },
  '3v4': { better: 1.20, draw: 1.70, worse: 1.80 },
  '3v5': { better: 1.10, draw: 2.10, worse: 2.30 },
  '4v4': { better: 1.50, draw: 1.40, worse: 1.50 },
  '4v5': { better: 1.20, draw: 1.70, worse: 1.80 },
  '5v5': { better: 1.50, draw: 1.40, worse: 1.50 },
}

export type MatchResult = 'home_win' | 'away_win' | 'draw'

/**
 * Retorna a odd do confronto dado os tiers e o resultado.
 * Usado apenas para PREVIEW na UI — cálculo canônico é o SQL.
 *
 * @param homeTier tier do time da casa (1–5)
 * @param awayTier tier do time visitante (1–5)
 * @param result resultado do jogo
 */
export function getOdd(homeTier: number, awayTier: number, result: MatchResult): number {
  const [lo, hi] = homeTier <= awayTier
    ? [homeTier, awayTier]
    : [awayTier, homeTier]

  const key = `${lo}v${hi}`
  const row = ODDS_TABLE[key]
  if (!row) return 1.0

  if (result === 'draw') return row.draw

  const homeIsWorse = homeTier > awayTier
  const homeIsWinner = result === 'home_win'

  if (homeIsWorse && homeIsWinner) return row.worse
  if (!homeIsWorse && homeIsWinner) return row.better
  if (!homeIsWorse && !homeIsWinner) return row.worse
  return row.better
}
