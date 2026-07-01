export const PHASES = {
  group: 'Fase de Grupos',
  r32: '16-avos de Final',
  r16: 'Oitavas de Final',
  qf: 'Quartas de Final',
  sf: 'Semifinal',
  final: 'Final',
} as const

export type Phase = keyof typeof PHASES

export const MATCH_STATUS = {
  scheduled: 'Agendado',
  live: 'Ao vivo',
  finished: 'Finalizado',
  postponed: 'Adiado',
  cancelled: 'Cancelado',
} as const

export type MatchStatus = keyof typeof MATCH_STATUS

export const TIER_LABELS: Record<number, string> = {
  1: 'Favoritas',
  2: 'Fortes',
  3: 'Não vão ser fáceis',
  4: 'Sentido de campanha',
  5: 'Vieram para apanhar',
}

/**
 * Pontuação do Bilhete Premiado (§5.7 do briefing — total máximo 77pts)
 * Confirmado pelo usuário: qf = 5pts (não 2pts como estava antes).
 */
export const TICKET_POINTS: Record<Phase, number> = {
  group: 0,
  r32: 1,    // 1pt × 16 confrontos = até 16pts
  r16: 2,    // 2pts × 8 confrontos = até 16pts
  qf: 5,     // 5pts × 4 confrontos = até 20pts ← corrigido de 2 para 5
  sf: 5,     // 5pts × 2 confrontos = até 10pts
  final: 5,  // 5pts pelo confronto da final
}
export const TICKET_CHAMPION_POINTS = 10  // 10pts pelo campeão correto

/**
 * Estados do torneio — progressão unidirecional.
 * '_open' = fase disponível para palpite no bilhete/mata-mata.
 * Sem sufixo = fase em andamento (palpites por jogo individualmente com deadline).
 */
export const TOURNAMENT_STATES = [
  'group',
  'r32_open', 'r32',
  'r16_open', 'r16',
  'qf_open',  'qf',
  'sf_open',  'sf',
  'final_open', 'final',
  'finished',
] as const

export type TournamentState = (typeof TOURNAMENT_STATES)[number]

/** Verificadores de estado do torneio */
export function isKnockoutPhase(state: TournamentState): boolean {
  return state !== 'group'
}

// Deadline para preencher/alterar o bilhete: liberado para TODOS até 01/07/2026
// às 21:00 (Fortaleza = UTC-3 = 02/07 00:00 UTC). Após isso trava automaticamente.
export const TICKET_EDIT_DEADLINE = new Date('2026-07-02T00:00:00.000Z')

// Exceções de deadline por usuário (nome). Vazio: todos usam o deadline padrão.
// Match por inclusão (case-insensitive) para cobrir nome com sobrenome.
const TICKET_EDIT_DEADLINE_OVERRIDES: { match: string; deadline: Date }[] = []

/** Retorna o deadline de edição do bilhete para um dado nome de usuário. */
export function getTicketEditDeadline(userName?: string | null): Date {
  const name = userName?.trim().toLowerCase()
  if (name) {
    const override = TICKET_EDIT_DEADLINE_OVERRIDES.find((o) => name.includes(o.match))
    if (override) return override.deadline
  }
  return TICKET_EDIT_DEADLINE
}

export function isTicketEditable(_state: TournamentState): boolean {
  return new Date() < TICKET_EDIT_DEADLINE
}

export function isPhaseAvailable(state: TournamentState, phase: string): boolean {
  const phaseMap: Record<string, TournamentState[]> = {
    r32: ['r32_open', 'r32', 'r16_open', 'r16', 'qf_open', 'qf', 'sf_open', 'sf', 'final_open', 'final', 'finished'],
    r16: ['r16_open', 'r16', 'qf_open', 'qf', 'sf_open', 'sf', 'final_open', 'final', 'finished'],
    qf:  ['qf_open', 'qf', 'sf_open', 'sf', 'final_open', 'final', 'finished'],
    sf:  ['sf_open', 'sf', 'final_open', 'final', 'finished'],
    final: ['final_open', 'final', 'finished'],
  }
  return (phaseMap[phase] ?? []).includes(state)
}

/** Grupos da Copa 2026 */
export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const

/** Toast messages (§6.5 do briefing) */
export const TOAST = {
  betSaved: 'Salvou! Agora reza. 🙏',
  betError: 'Quebrou aqui. Avisa o admin se persistir.',
  noInternet: 'Caiu a internet, ó. Tenta de novo.',
  loginError: 'Senha errada, mano. Tenta de novo.',
  emailNotAllowed: 'Tu não tá na lista, brother. Pede o admin pra liberar.',
  deadlineSoon: 'Ó o relógio! Falta menos de 10 minutos pro jogo.',
  betExact: 'MITOU! Acertou na mosca. 🎯',
  betResult: 'Foi por pouco, mas tá valendo!',
  betWrong: 'Vish, deu ruim. Bora pro próximo.',
  // Auth
  accountCreated: 'Salvou! Agora reza. 🙏',
  passwordResetSent: 'Mandamos o link no teu e-mail. Dá uma olhada lá.',
  passwordUpdated: 'Senha trocada! Bora pra cima.',
  logoutDone: 'Saiu fora. Até a próxima!',
  genericError: 'Quebrou aqui. Avisa o admin se persistir.',
  // Perfil
  profileUpdated: 'Salvo! Ficou ótimo. 😎',
  // Palpite
  betLocked: 'Deadline passou, mano. Esse jogo tá travado.',
  // Admin
  adminMatchUpdated: 'Placar atualizado e palpites recalculados! 🎯',
  adminMatchCancelled: 'Jogo cancelado. Palpites zerados.',
  adminTierUpdated: 'Tier atualizado! Histórico registrado.',
  adminEmailAdded: 'E-mail na lista! Pode chegar.',
  adminEmailRemoved: 'E-mail removido da lista.',
  adminApiToggled: 'Status da API mudou!',
  adminSyncDone: 'Sincronizou tudo! ✅',
  adminRecalcDone: 'Palpites recalculados! 🔄',
  adminBannerSet: 'Banner publicado pra galera! 📢',
  adminBannerCleared: 'Banner removido.',
  adminAvatarRemoved: 'Foto removida.',
  adminAccessDenied: 'Você não tem acesso a isso. 🚫',
} as const
