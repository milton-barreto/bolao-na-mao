'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Pencil, Save, X, MoveHorizontal } from 'lucide-react'
import { BracketSlot } from './bracket-slot'
import { useBracket } from './use-bracket'
import { saveGoldenTicket } from '@/lib/actions/golden-ticket'
import { TICKET_EDIT_DEADLINE } from '@/lib/constants'
import { formatKickoff } from '@/lib/datetime'
import type { GoldenTicketPredictions } from '@/types'
import type { MatchWithTeams } from '@/types'

// ============================================================
// Layout — chave de DUAS PONTAS (estilo simulador da Copa)
//
//   16-avos  Oitavas Quartas Semis   FINAL   Semis Quartas Oitavas 16-avos
//   (0-7)                            🏆       (8-15)
//   lado esquerdo  →→→            centro            ←←← lado direito
//
// Colunas (0..8): 0-3 = esquerda (r32,r16,qf,sf), 4 = final/campeão,
//                 5-8 = direita (sf,qf,r16,r32 — espelhado)
// ============================================================
const SLOT_W = 140
const SLOT_H = 32
const MATCH_GAP = 8       // espaço entre os 2 times de um confronto
const COL_GAP = 32        // espaço horizontal entre colunas
const TOP_MARGIN = 28     // margem superior (espaço pros labels)
const ROW_GAP_R32 = 12    // espaço vertical entre confrontos de R32

const MATCH_HEIGHT = SLOT_H * 2 + MATCH_GAP
const BASE_SPACING = MATCH_HEIGHT + ROW_GAP_R32

// 8 confrontos de R32 por lado
const R32_PER_SIDE = 8
const N_COLS = 9
const CENTER_COL = 4

type Phase = 'r32' | 'r16' | 'qf' | 'sf' | 'final'
type Side = 'left' | 'right'

// depth: 0=r32, 1=r16, 2=qf, 3=sf
function colSpacing(depth: number): number {
  return BASE_SPACING * Math.pow(2, depth)
}
function matchCenterY(depth: number, matchIdx: number): number {
  const spacing = colSpacing(depth)
  return TOP_MARGIN + spacing / 2 + matchIdx * spacing
}
function colX(colIdx: number): number {
  return colIdx * (SLOT_W + COL_GAP)
}
// X esquerdo do slot, dado depth (0-3) e lado
function depthColX(depth: number, side: Side): number {
  return side === 'left' ? colX(depth) : colX(8 - depth)
}
function svgHeight(): number {
  return TOP_MARGIN * 2 + R32_PER_SIDE * colSpacing(0)
}
function svgWidth(): number {
  return (N_COLS - 1) * (SLOT_W + COL_GAP) + SLOT_W
}

interface TeamInfo {
  id: string
  name: string
  flagUrl: string | null
}

interface BracketSVGProps {
  r32Matches: MatchWithTeams[]
  initial: GoldenTicketPredictions | null
  readOnly?: boolean
  /** Deadline efetivo de edição (pode ser estendido para usuários específicos). */
  editDeadline?: Date
  actualResults?: {
    phase: Phase
    advancing_team_id: string
  }[]
}

export function BracketSVG({
  r32Matches,
  initial,
  readOnly = false,
  editDeadline = TICKET_EDIT_DEADLINE,
  actualResults = [],
}: BracketSVGProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const isBeforeDeadline = new Date() < editDeadline
  const effectiveReadOnly = readOnly || !isEditing

  const handleSaveAction = useCallback(
    async (predictions: GoldenTicketPredictions) => saveGoldenTicket(predictions),
    [],
  )

  const { predictions, dispatch, isDirty, save, resetPredictions } = useBracket({
    initial,
    r32Matches,
    onSave: handleSaveAction,
    readOnly: effectiveReadOnly,
  })

  const handleSaveClick = async () => {
    setIsSaving(true)
    const result = await save()
    setIsSaving(false)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Bilhete salvo! Agora reza. 🙏')
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    resetPredictions(initial)
    setIsEditing(false)
  }

  // ---- Mapa bracket_slot → match ----
  const matchBySlot = new Map<number, MatchWithTeams>()
  for (const m of r32Matches) {
    if (m.bracket_slot != null) matchBySlot.set(m.bracket_slot, m)
  }

  function resolveTeam(teamId: string | null | undefined): TeamInfo | null {
    if (!teamId) return null
    for (const m of r32Matches) {
      if (m.home_team?.id === teamId)
        return { id: teamId, name: m.home_team.name, flagUrl: m.home_team.flag_url }
      if (m.away_team?.id === teamId)
        return { id: teamId, name: m.away_team.name, flagUrl: m.away_team.flag_url }
    }
    return null
  }

  function getActualResult(phase: Phase): string[] {
    return actualResults.filter((r) => r.phase === phase).map((r) => r.advancing_team_id)
  }
  function slotStatus(
    phase: Phase,
    predictedTeamId: string | null,
  ): 'selected' | 'winner' | 'loser' | 'empty' {
    if (!predictedTeamId) return 'empty'
    const actual = getActualResult(phase)
    if (actual.length === 0) return 'selected'
    if (actual.includes(predictedTeamId)) return 'winner'
    return 'loser'
  }

  const H = svgHeight()
  const W = svgWidth()
  const LINE_COLOR = '#E5E7EB'

  // ============================================================
  // Descritor genérico de um slot (1 time dentro de um confronto)
  // ============================================================
  interface SlotDesc {
    key: string
    x: number
    y: number
    team: TeamInfo | null
    phase: Phase
    isSelected: boolean
    isPlaceholder: boolean
    onClick?: () => void
  }

  function buildSideSlots(side: Side): SlotDesc[] {
    const slots: SlotDesc[] = []

    // ---------- DEPTH 0: R32 (8 confrontos) ----------
    for (let i = 0; i < R32_PER_SIDE; i++) {
      const globalSlot = side === 'left' ? i : R32_PER_SIDE + i
      const match = matchBySlot.get(globalSlot)
      const cy = matchCenterY(0, i)
      const x = depthColX(0, side)
      const winner = match ? predictions.r32[match.id] ?? null : null

      ;(['home', 'away'] as const).forEach((sideTeam) => {
        const isUpper = sideTeam === 'home'
        const t = match ? (isUpper ? match.home_team : match.away_team) : null
        const team: TeamInfo | null = t
          ? { id: t.id, name: t.name, flagUrl: t.flag_url }
          : null
        const y = isUpper ? cy - SLOT_H - MATCH_GAP / 2 : cy + MATCH_GAP / 2
        const isSelected = !!team?.id && winner === team.id
        slots.push({
          key: `r32-${side}-${i}-${sideTeam}`,
          x,
          y,
          team,
          phase: 'r32',
          isSelected,
          isPlaceholder: !team,
          onClick:
            team && match && !effectiveReadOnly
              ? () => dispatch({ type: 'SET_R32', matchId: match.id, teamId: team.id })
              : undefined,
        })
      })
    }

    // ---------- DEPTHS 1-3: r16 / qf / sf ----------
    const depthConfig: {
      depth: number
      phase: Phase
      count: number
      slotBase: number // slot global do 1º confronto desse lado
      prevPhase: 'r32' | 'r16' | 'qf'
    }[] = [
      { depth: 1, phase: 'r16', count: 4, slotBase: side === 'left' ? 0 : 4, prevPhase: 'r32' },
      { depth: 2, phase: 'qf', count: 2, slotBase: side === 'left' ? 0 : 2, prevPhase: 'r16' },
      { depth: 3, phase: 'sf', count: 1, slotBase: side === 'left' ? 0 : 1, prevPhase: 'qf' },
    ]

    for (const cfg of depthConfig) {
      for (let i = 0; i < cfg.count; i++) {
        const globalSlot = cfg.slotBase + i
        const cy = matchCenterY(cfg.depth, i)
        const x = depthColX(cfg.depth, side)
        const chosen =
          cfg.phase === 'r16'
            ? predictions.r16[globalSlot]
            : cfg.phase === 'qf'
              ? predictions.qf[globalSlot]
              : predictions.sf[globalSlot]

        ;[0, 1].forEach((pair) => {
          const isUpper = pair === 0
          const y = isUpper ? cy - SLOT_H - MATCH_GAP / 2 : cy + MATCH_GAP / 2

          // time disponível = vencedor do confronto anterior que alimenta esse slot
          const feederGlobalSlot = globalSlot * 2 + pair
          let availableTeamId: string | null = null
          if (cfg.prevPhase === 'r32') {
            const fm = matchBySlot.get(feederGlobalSlot)
            availableTeamId = fm ? predictions.r32[fm.id] ?? null : null
          } else if (cfg.prevPhase === 'r16') {
            availableTeamId = predictions.r16[feederGlobalSlot] ?? null
          } else {
            availableTeamId = predictions.qf[feederGlobalSlot] ?? null
          }

          const team = resolveTeam(availableTeamId)
          const isSelected = !!availableTeamId && chosen === availableTeamId

          slots.push({
            key: `${cfg.phase}-${side}-${i}-${pair}`,
            x,
            y,
            team,
            phase: cfg.phase,
            isSelected,
            isPlaceholder: !team,
            onClick:
              team && !effectiveReadOnly
                ? () => {
                    if (cfg.phase === 'r16')
                      dispatch({ type: 'SET_R16', slot: globalSlot, teamId: team.id })
                    else if (cfg.phase === 'qf')
                      dispatch({ type: 'SET_QF', slot: globalSlot, teamId: team.id })
                    else dispatch({ type: 'SET_SF', slot: globalSlot, teamId: team.id })
                  }
                : undefined,
          })
        })
      }
    }

    return slots
  }

  // ---------- FINAL (centro): os 2 finalistas ----------
  function buildFinalSlots(): SlotDesc[] {
    const cy = H / 2
    const x = colX(CENTER_COL)
    const finalist0 = predictions.sf[0] ?? null // esquerda
    const finalist1 = predictions.sf[1] ?? null // direita
    const champion = predictions.champion

    return [finalist0, finalist1].map((teamId, idx) => {
      const isUpper = idx === 0
      const y = isUpper ? cy - SLOT_H - MATCH_GAP / 2 : cy + MATCH_GAP / 2
      const team = resolveTeam(teamId)
      const isSelected = !!teamId && champion === teamId
      return {
        key: `final-${idx}`,
        x,
        y,
        team,
        phase: 'final' as Phase,
        isSelected,
        isPlaceholder: !team,
        onClick:
          team && !effectiveReadOnly
            ? () => dispatch({ type: 'SET_CHAMPION', teamId: team.id })
            : undefined,
      }
    })
  }

  const allSlots = [...buildSideSlots('left'), ...buildSideSlots('right'), ...buildFinalSlots()]

  // ============================================================
  // Linhas de conexão entre confrontos (por lado e profundidade)
  // ============================================================
  function buildConnectors(): ReactNode[] {
    const lines: ReactNode[] = []
    const sides: Side[] = ['left', 'right']

    for (const side of sides) {
      // depth 0→1, 1→2, 2→3
      for (let depth = 0; depth < 3; depth++) {
        const childCount = R32_PER_SIDE / Math.pow(2, depth)
        for (let i = 0; i < childCount; i++) {
          const cyc = matchCenterY(depth, i)
          let xChildEdge: number
          let xParentEdge: number
          if (side === 'left') {
            xChildEdge = depthColX(depth, side) + SLOT_W
            xParentEdge = depthColX(depth + 1, side)
          } else {
            xChildEdge = depthColX(depth, side)
            xParentEdge = depthColX(depth + 1, side) + SLOT_W
          }
          const midX = (xChildEdge + xParentEdge) / 2

          lines.push(
            <polyline
              key={`ln-${side}-${depth}-${i}`}
              points={`${xChildEdge},${cyc} ${midX},${cyc}`}
              stroke={LINE_COLOR}
              strokeWidth={1.5}
              fill="none"
            />,
          )

          if (i % 2 === 0) {
            const cyc2 = matchCenterY(depth, i + 1)
            const cyp = matchCenterY(depth + 1, Math.floor(i / 2))
            lines.push(
              <polyline
                key={`lv-${side}-${depth}-${i}`}
                points={`${midX},${cyc} ${midX},${cyc2}`}
                stroke={LINE_COLOR}
                strokeWidth={1.5}
                fill="none"
              />,
              <polyline
                key={`lp-${side}-${depth}-${i}`}
                points={`${midX},${cyp} ${xParentEdge},${cyp}`}
                stroke={LINE_COLOR}
                strokeWidth={1.5}
                fill="none"
              />,
            )
          }
        }
      }

      // SF → Final (centro)
      const sfCy = matchCenterY(3, 0)
      const finalCy = side === 'left' ? H / 2 - SLOT_H / 2 - MATCH_GAP / 2 : H / 2 + SLOT_H / 2 + MATCH_GAP / 2
      let xSfEdge: number
      let xFinalEdge: number
      if (side === 'left') {
        xSfEdge = depthColX(3, side) + SLOT_W
        xFinalEdge = colX(CENTER_COL)
      } else {
        xSfEdge = depthColX(3, side)
        xFinalEdge = colX(CENTER_COL) + SLOT_W
      }
      const midX = (xSfEdge + xFinalEdge) / 2
      lines.push(
        <polyline
          key={`sf-final-${side}`}
          points={`${xSfEdge},${sfCy} ${midX},${sfCy} ${midX},${finalCy} ${xFinalEdge},${finalCy}`}
          stroke={LINE_COLOR}
          strokeWidth={1.5}
          fill="none"
        />,
      )
    }

    return lines
  }

  // ---------- Campeão (troféu acima da final) ----------
  const championTeam = resolveTeam(predictions.champion)
  const championStatus = slotStatus('final', predictions.champion)

  // Labels das colunas
  const COL_LABELS: { col: number; label: string }[] = [
    { col: 0, label: '16-avos' },
    { col: 1, label: 'Oitavas' },
    { col: 2, label: 'Quartas' },
    { col: 3, label: 'Semis' },
    { col: 4, label: 'Final' },
    { col: 5, label: 'Semis' },
    { col: 6, label: 'Quartas' },
    { col: 7, label: 'Oitavas' },
    { col: 8, label: '16-avos' },
  ]

  return (
    <div>
      {/* Dica de scroll (só mobile) */}
      <p className="sm:hidden mb-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <MoveHorizontal className="h-3.5 w-3.5" aria-hidden />
        Arraste para os lados pra ver o chaveamento todo
      </p>

      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div style={{ minWidth: W }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
            {/* Linhas de conexão (atrás) */}
            {buildConnectors()}

            {/* Slots (times) */}
            {allSlots.map((s) => (
              <foreignObject key={s.key} x={s.x} y={s.y} width={SLOT_W} height={SLOT_H}>
                <BracketSlot
                  teamId={s.team?.id}
                  teamName={s.team?.name}
                  flagUrl={s.team?.flagUrl}
                  status={
                    s.isPlaceholder
                      ? 'placeholder'
                      : s.isSelected
                        ? slotStatus(s.phase, s.team?.id ?? null)
                        : 'empty'
                  }
                  isPlaceholder={s.isPlaceholder}
                  readOnly={effectiveReadOnly}
                  onClick={s.onClick}
                />
              </foreignObject>
            ))}

            {/* Campeão — troféu + time, centro acima da final */}
            <foreignObject x={colX(CENTER_COL)} y={H / 2 - 118} width={SLOT_W} height={64}>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">🏆</span>
                <BracketSlot
                  teamId={championTeam?.id}
                  teamName={championTeam?.name ?? 'Campeão'}
                  flagUrl={championTeam?.flagUrl}
                  status={predictions.champion ? championStatus : 'placeholder'}
                  isPlaceholder={!predictions.champion}
                  readOnly
                />
              </div>
            </foreignObject>

            {/* Labels */}
            {COL_LABELS.map((l) => (
              <text
                key={`label-${l.col}`}
                x={colX(l.col) + SLOT_W / 2}
                y={TOP_MARGIN / 2}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="#9CA3AF"
                fontFamily="Inter, sans-serif"
              >
                {l.label}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* Botões Alterar / Salvar */}
      <div className="flex justify-center mt-4">
        {isBeforeDeadline && !readOnly ? (
          !isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-brand-yellow bg-brand-yellow text-primary-foreground font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity"
            >
              <Pencil className="h-4 w-4" />
              Alterar Bilhete
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={isSaving || !isDirty}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-green text-white font-semibold text-sm shadow-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Salvando...' : 'Salvar Bilhete'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
            </div>
          )
        ) : !isBeforeDeadline ? (
          <p className="text-sm text-muted-foreground text-center">
            Prazo encerrado em {formatKickoff(editDeadline)}. Torce e reza. 🙏
          </p>
        ) : null}
      </div>
    </div>
  )
}
