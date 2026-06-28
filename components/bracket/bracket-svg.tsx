'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Pencil, Save, X } from 'lucide-react'
import { BracketSlot } from './bracket-slot'
import { useBracket } from './use-bracket'
import { saveGoldenTicket } from '@/lib/actions/golden-ticket'
import { TICKET_EDIT_DEADLINE } from '@/lib/constants'
import type { GoldenTicketPredictions } from '@/types'
import type { MatchWithTeams } from '@/types'

// ============================================================
// Constantes de layout do SVG
// ============================================================
const SLOT_W = 148        // largura de cada slot
const SLOT_H = 32         // altura de cada slot
const MATCH_GAP = 8       // espaço entre os 2 slots de um confronto
const COL_GAP = 60        // espaço horizontal entre colunas
const TOP_MARGIN = 20     // margem superior
const ROW_GAP_R32 = 10    // espaço vertical entre confrontos R32

// Número de confrontos por fase
const MATCHES_PER_PHASE = [16, 8, 4, 2, 1] // R32, R16, QF, SF, Final
const PHASES = ['r32', 'r16', 'qf', 'sf', 'final'] as const
type Phase = (typeof PHASES)[number]

// Altura de um confronto (2 slots + gap)
const MATCH_HEIGHT = SLOT_H * 2 + MATCH_GAP

// Espaçamento vertical entre confrontos por coluna
function colSpacing(colIdx: number): number {
  return (MATCH_HEIGHT + ROW_GAP_R32) * Math.pow(2, colIdx)
}

// Y central do slot de um confronto em uma coluna
function matchCenterY(colIdx: number, matchIdx: number): number {
  const spacing = colSpacing(colIdx)
  const firstMatchCenter = TOP_MARGIN + MATCH_HEIGHT / 2 + (spacing - MATCH_HEIGHT) / 2
  return firstMatchCenter + matchIdx * spacing
}

// X esquerdo da coluna
function colX(colIdx: number): number {
  return colIdx * (SLOT_W + COL_GAP)
}

// Altura total do SVG (baseada na coluna R32 com 16 confrontos)
function svgHeight(): number {
  const spacing = colSpacing(0)
  return TOP_MARGIN * 2 + 16 * spacing
}

// Largura total do SVG (5 colunas + campeão)
const CHAMPION_COL = 5
function svgWidth(): number {
  return CHAMPION_COL * (SLOT_W + COL_GAP) + SLOT_W
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
  actualResults?: {
    phase: Phase
    advancing_team_id: string
  }[]
}

export function BracketSVG({
  r32Matches,
  initial,
  readOnly = false,
  actualResults = [],
}: BracketSVGProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const isBeforeDeadline = new Date() < TICKET_EDIT_DEADLINE
  // Slots são clicáveis somente no modo de edição
  const effectiveReadOnly = readOnly || !isEditing

  const handleSaveAction = useCallback(
    async (predictions: GoldenTicketPredictions) => {
      return await saveGoldenTicket(predictions)
    },
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

  // Helpers para extrair info de time a partir de matchWithTeams
  function getTeamInfo(
    match: MatchWithTeams,
    side: 'home' | 'away',
  ): TeamInfo | null {
    const t = side === 'home' ? match.home_team : match.away_team
    if (!t) return null
    return { id: t.id, name: t.name, flagUrl: t.flag_url }
  }

  // Resolve info de time a partir do teamId buscando nos r32Matches
  function resolveTeam(teamId: string | null): TeamInfo | null {
    if (!teamId) return null
    for (const m of r32Matches) {
      if (m.home_team?.id === teamId)
        return { id: teamId, name: m.home_team.name, flagUrl: m.home_team.flag_url }
      if (m.away_team?.id === teamId)
        return { id: teamId, name: m.away_team.name, flagUrl: m.away_team.flag_url }
    }
    return null
  }

  // Resultado real de uma fase
  function getActualResult(phase: Phase): string[] {
    return actualResults
      .filter((r) => r.phase === phase)
      .map((r) => r.advancing_team_id)
  }

  // Status de um slot
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

  return (
    <div>
      <div className="overflow-x-auto pb-4">
        <div style={{ minWidth: W }}>
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ display: 'block' }}
          >
            {/* ============================================================
                LINHAS DE CONEXÃO (desenhadas antes dos slots, ficam atrás)
            ============================================================ */}
            {PHASES.slice(0, 4).map((phase, colIdx) => {
              const nextCol = colIdx + 1
              const matchCount = MATCHES_PER_PHASE[colIdx]

              return Array.from({ length: matchCount }, (_, matchIdx) => {
                const cy = matchCenterY(colIdx, matchIdx)
                const x1 = colX(colIdx) + SLOT_W
                const x2 = colX(nextCol)
                const parentMatchIdx = Math.floor(matchIdx / 2)
                const parentCY = matchCenterY(nextCol, parentMatchIdx)
                const midX = x1 + (x2 - x1) / 2

                return (
                  <g key={`line-${phase}-${matchIdx}`}>
                    <polyline
                      points={`${x1},${cy} ${midX},${cy}`}
                      stroke={LINE_COLOR}
                      strokeWidth={1.5}
                      fill="none"
                    />
                    {matchIdx % 2 === 0 && (
                      <>
                        <polyline
                          points={`${midX},${cy} ${midX},${matchCenterY(colIdx, matchIdx + 1)}`}
                          stroke={LINE_COLOR}
                          strokeWidth={1.5}
                          fill="none"
                        />
                        <polyline
                          points={`${midX},${parentCY} ${x2},${parentCY}`}
                          stroke={LINE_COLOR}
                          strokeWidth={1.5}
                          fill="none"
                        />
                      </>
                    )}
                  </g>
                )
              })
            })}

            {/* ============================================================
                SLOTS — R32 (col 0): cada partida gera 2 slots (home + away)
                FIX: flatMap para criar home+away do MESMO jogo no mesmo par visual
            ============================================================ */}
            {r32Matches
              .slice()
              .sort((a, b) => (a.bracket_slot ?? 99) - (b.bracket_slot ?? 99))
              .flatMap((match, matchIdx) => {
                const cy = matchCenterY(0, matchIdx)
                const x = colX(0)
                const winner = predictions.r32[match.id] ?? null

                return (['home', 'away'] as const).map((side) => {
                  const isUpper = side === 'home'
                  const team = getTeamInfo(match, side)
                  const y = isUpper
                    ? cy - SLOT_H - MATCH_GAP / 2
                    : cy + MATCH_GAP / 2
                  const isSelected = !!team?.id && winner === team.id

                  return (
                    <foreignObject
                      key={`r32-${match.id}-${side}`}
                      x={x}
                      y={y}
                      width={SLOT_W}
                      height={SLOT_H}
                    >
                      <BracketSlot
                        teamId={team?.id}
                        teamName={team?.name}
                        flagUrl={team?.flagUrl}
                        status={isSelected ? slotStatus('r32', team?.id ?? null) : 'empty'}
                        readOnly={effectiveReadOnly}
                        onClick={
                          team && !effectiveReadOnly
                            ? () => dispatch({ type: 'SET_R32', matchId: match.id, teamId: team.id })
                            : undefined
                        }
                      />
                    </foreignObject>
                  )
                })
              })}

            {/* ============================================================
                SLOTS — R16 (col 1): vencedores dos pares de R32
            ============================================================ */}
            {Array.from({ length: 8 }, (_, r16Slot) => {
              const cy = matchCenterY(1, r16Slot)
              const x = colX(1)

              const r32Match1 = r32Matches.find((m) => m.bracket_slot === r16Slot * 2)
              const r32Match2 = r32Matches.find((m) => m.bracket_slot === r16Slot * 2 + 1)
              const winner1TeamId = r32Match1 ? predictions.r32[r32Match1.id] : null
              const winner2TeamId = r32Match2 ? predictions.r32[r32Match2.id] : null
              const r16Winner = predictions.r16[r16Slot] ?? null

              return [0, 1].map((slotPair) => {
                const isUpper = slotPair === 0
                const y = isUpper
                  ? cy - SLOT_H - MATCH_GAP / 2
                  : cy + MATCH_GAP / 2
                const availableTeamId = isUpper ? winner1TeamId : winner2TeamId
                const resolvedTeam = resolveTeam(availableTeamId)
                const isSelected = r16Winner === availableTeamId && !!availableTeamId

                return (
                  <foreignObject
                    key={`r16-${r16Slot}-${slotPair}`}
                    x={x}
                    y={y}
                    width={SLOT_W}
                    height={SLOT_H}
                  >
                    <BracketSlot
                      teamId={resolvedTeam?.id}
                      teamName={resolvedTeam?.name}
                      flagUrl={resolvedTeam?.flagUrl}
                      status={isSelected ? slotStatus('r16', resolvedTeam?.id ?? null) : resolvedTeam ? 'empty' : 'placeholder'}
                      isPlaceholder={!resolvedTeam}
                      readOnly={effectiveReadOnly}
                      onClick={
                        resolvedTeam && !effectiveReadOnly
                          ? () => dispatch({ type: 'SET_R16', slot: r16Slot, teamId: resolvedTeam.id })
                          : undefined
                      }
                    />
                  </foreignObject>
                )
              })
            })}

            {/* ============================================================
                SLOTS — QF (col 2)
            ============================================================ */}
            {Array.from({ length: 4 }, (_, qfSlot) => {
              const cy = matchCenterY(2, qfSlot)
              const x = colX(2)
              const r16Slot1 = qfSlot * 2
              const r16Slot2 = qfSlot * 2 + 1
              const winner1 = predictions.r16[r16Slot1] ?? null
              const winner2 = predictions.r16[r16Slot2] ?? null
              const qfWinner = predictions.qf[qfSlot] ?? null

              return [0, 1].map((slotPair) => {
                const isUpper = slotPair === 0
                const y = isUpper ? cy - SLOT_H - MATCH_GAP / 2 : cy + MATCH_GAP / 2
                const availableTeamId = isUpper ? winner1 : winner2
                const resolvedTeam = resolveTeam(availableTeamId)
                const isSelected = qfWinner === availableTeamId && !!availableTeamId

                return (
                  <foreignObject key={`qf-${qfSlot}-${slotPair}`} x={x} y={y} width={SLOT_W} height={SLOT_H}>
                    <BracketSlot
                      teamId={resolvedTeam?.id}
                      teamName={resolvedTeam?.name}
                      flagUrl={resolvedTeam?.flagUrl}
                      status={isSelected ? slotStatus('qf', resolvedTeam?.id ?? null) : resolvedTeam ? 'empty' : 'placeholder'}
                      isPlaceholder={!resolvedTeam}
                      readOnly={effectiveReadOnly}
                      onClick={
                        resolvedTeam && !effectiveReadOnly
                          ? () => dispatch({ type: 'SET_QF', slot: qfSlot, teamId: resolvedTeam.id })
                          : undefined
                      }
                    />
                  </foreignObject>
                )
              })
            })}

            {/* ============================================================
                SLOTS — SF (col 3)
            ============================================================ */}
            {Array.from({ length: 2 }, (_, sfSlot) => {
              const cy = matchCenterY(3, sfSlot)
              const x = colX(3)
              const qfSlot1 = sfSlot * 2
              const qfSlot2 = sfSlot * 2 + 1
              const winner1 = predictions.qf[qfSlot1] ?? null
              const winner2 = predictions.qf[qfSlot2] ?? null
              const sfWinner = predictions.sf[sfSlot] ?? null

              return [0, 1].map((slotPair) => {
                const isUpper = slotPair === 0
                const y = isUpper ? cy - SLOT_H - MATCH_GAP / 2 : cy + MATCH_GAP / 2
                const availableTeamId = isUpper ? winner1 : winner2
                const resolvedTeam = resolveTeam(availableTeamId)
                const isSelected = sfWinner === availableTeamId && !!availableTeamId

                return (
                  <foreignObject key={`sf-${sfSlot}-${slotPair}`} x={x} y={y} width={SLOT_W} height={SLOT_H}>
                    <BracketSlot
                      teamId={resolvedTeam?.id}
                      teamName={resolvedTeam?.name}
                      flagUrl={resolvedTeam?.flagUrl}
                      status={isSelected ? slotStatus('sf', resolvedTeam?.id ?? null) : resolvedTeam ? 'empty' : 'placeholder'}
                      isPlaceholder={!resolvedTeam}
                      readOnly={effectiveReadOnly}
                      onClick={
                        resolvedTeam && !effectiveReadOnly
                          ? () => dispatch({ type: 'SET_SF', slot: sfSlot, teamId: resolvedTeam.id })
                          : undefined
                      }
                    />
                  </foreignObject>
                )
              })
            })}

            {/* ============================================================
                SLOTS — Final (col 4): os dois finalistas
            ============================================================ */}
            {(() => {
              const cy = matchCenterY(4, 0)
              const x = colX(4)
              const finalist1 = predictions.sf[0] ?? null
              const finalist2 = predictions.sf[1] ?? null
              const champion = predictions.champion

              return [finalist1, finalist2].map((teamId, idx) => {
                const isUpper = idx === 0
                const y = isUpper ? cy - SLOT_H - MATCH_GAP / 2 : cy + MATCH_GAP / 2
                const resolvedTeam = resolveTeam(teamId)
                const isSelected = champion === teamId && !!teamId

                return (
                  <foreignObject key={`final-${idx}`} x={x} y={y} width={SLOT_W} height={SLOT_H}>
                    <BracketSlot
                      teamId={resolvedTeam?.id}
                      teamName={resolvedTeam?.name}
                      flagUrl={resolvedTeam?.flagUrl}
                      status={isSelected ? slotStatus('final', champion) : resolvedTeam ? 'empty' : 'placeholder'}
                      isPlaceholder={!resolvedTeam}
                      readOnly={effectiveReadOnly}
                      onClick={
                        resolvedTeam && !effectiveReadOnly
                          ? () => dispatch({ type: 'SET_CHAMPION', teamId: resolvedTeam.id })
                          : undefined
                      }
                    />
                  </foreignObject>
                )
              })
            })()}

            {/* ============================================================
                CAMPEÃO (col 5): troféu + time campeão
            ============================================================ */}
            {(() => {
              const cy = H / 2
              const x = colX(CHAMPION_COL)
              const champion = predictions.champion
              const resolvedTeam = resolveTeam(champion)
              const championStatus = slotStatus('final', champion)

              return (
                <foreignObject x={x} y={cy - 40} width={SLOT_W} height={80}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">🏆</span>
                    <BracketSlot
                      teamId={resolvedTeam?.id}
                      teamName={resolvedTeam?.name ?? 'Campeão'}
                      flagUrl={resolvedTeam?.flagUrl}
                      status={champion ? championStatus : 'placeholder'}
                      isPlaceholder={!champion}
                      readOnly
                    />
                  </div>
                </foreignObject>
              )
            })()}

            {/* Labels das colunas */}
            {['16-avos', 'Oitavas', 'Quartas', 'Semis', 'Final', '🏆'].map(
              (label, idx) => (
                <text
                  key={label}
                  x={colX(idx) + SLOT_W / 2}
                  y={TOP_MARGIN / 2}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#9CA3AF"
                  fontFamily="Inter, sans-serif"
                >
                  {label}
                </text>
              ),
            )}
          </svg>
        </div>
      </div>

      {/* ============================================================
          BOTÕES ALTERAR / SALVAR
      ============================================================ */}
      <div className="flex justify-center mt-4">
        {isBeforeDeadline && !readOnly ? (
          !isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-lg border border-[var(--primary)] text-[var(--primary-fg)] bg-[var(--primary)] font-semibold text-sm hover:opacity-90 transition-opacity"
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
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Salvando...' : 'Salvar Bilhete'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-surface)] transition-colors"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
            </div>
          )
        ) : !isBeforeDeadline ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Prazo encerrado em 29/06 às 03:00. Torce e reza. 🙏
          </p>
        ) : null}
      </div>
    </div>
  )
}
