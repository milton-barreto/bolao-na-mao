'use client'

import { useReducer, useEffect, useCallback, useState } from 'react'
import type { GoldenTicketPredictions } from '@/types'
import type { MatchWithTeams } from '@/types'

export type BracketAction =
  | { type: 'SET_R32'; matchId: string; teamId: string }
  | { type: 'SET_R16'; slot: number; teamId: string }
  | { type: 'SET_QF'; slot: number; teamId: string }
  | { type: 'SET_SF'; slot: number; teamId: string }
  | { type: 'SET_CHAMPION'; teamId: string }
  | { type: 'LOAD'; predictions: GoldenTicketPredictions }

function clearCascade(
  state: GoldenTicketPredictions,
  phase: 'r16' | 'qf' | 'sf' | 'champion',
  teamId: string,
): Partial<GoldenTicketPredictions> {
  const updates: Partial<GoldenTicketPredictions> = {}
  const teamInR16 = Object.values(state.r16).includes(teamId)
  const teamInQF = Object.values(state.qf).includes(teamId)
  const teamInSF = Object.values(state.sf).includes(teamId)
  const teamIsChampion = state.champion === teamId

  if (phase === 'r16' || teamInR16) {
    const r16Entries = Object.entries(state.r16) as [string, string][]
    const r16Slot = r16Entries.find(([, t]) => t === teamId)
    if (r16Slot) {
      updates.r16 = { ...state.r16 }
      delete (updates.r16 as Record<string, string>)[r16Slot[0]]
    }
  }

  if (teamInQF) {
    const qfEntries = Object.entries(state.qf) as [string, string][]
    const qfSlot = qfEntries.find(([, t]) => t === teamId)
    if (qfSlot) {
      updates.qf = { ...state.qf }
      delete (updates.qf as Record<string, string>)[qfSlot[0]]
    }
  }

  if (teamInSF) {
    const sfEntries = Object.entries(state.sf) as [string, string][]
    const sfSlot = sfEntries.find(([, t]) => t === teamId)
    if (sfSlot) {
      updates.sf = { ...state.sf }
      delete (updates.sf as Record<string, string>)[sfSlot[0]]
    }
  }

  if (teamIsChampion) {
    updates.champion = null
  }

  return updates
}

function bracketReducer(
  state: GoldenTicketPredictions,
  action: BracketAction,
): GoldenTicketPredictions {
  switch (action.type) {
    case 'LOAD':
      return action.predictions

    case 'SET_R32': {
      const prevTeamId = state.r32[action.matchId]
      const cascade = prevTeamId ? clearCascade(state, 'r16', prevTeamId) : {}
      return {
        ...state,
        ...cascade,
        r32: { ...state.r32, [action.matchId]: action.teamId },
      }
    }

    case 'SET_R16': {
      const prevTeamId = state.r16[action.slot]
      const cascade = prevTeamId ? clearCascade(state, 'qf', prevTeamId) : {}
      return {
        ...state,
        ...cascade,
        r16: { ...state.r16, [action.slot]: action.teamId },
      }
    }

    case 'SET_QF': {
      const prevTeamId = state.qf[action.slot]
      const cascade = prevTeamId ? clearCascade(state, 'sf', prevTeamId) : {}
      return {
        ...state,
        ...cascade,
        qf: { ...state.qf, [action.slot]: action.teamId },
      }
    }

    case 'SET_SF': {
      const prevTeamId = state.sf[action.slot]
      const cascade = prevTeamId ? clearCascade(state, 'champion', prevTeamId) : {}
      return {
        ...state,
        ...cascade,
        sf: { ...state.sf, [action.slot]: action.teamId },
      }
    }

    case 'SET_CHAMPION':
      return { ...state, champion: action.teamId }

    default:
      return state
  }
}

const EMPTY_PREDICTIONS: GoldenTicketPredictions = {
  r32: {},
  r16: {},
  qf: {},
  sf: {},
  champion: null,
}

interface UseBracketOptions {
  initial?: GoldenTicketPredictions | null
  r32Matches: MatchWithTeams[]
  onSave: (predictions: GoldenTicketPredictions) => Promise<{ success: true } | { error: string }>
  readOnly?: boolean
}

export function useBracket({ initial, r32Matches, onSave, readOnly = false }: UseBracketOptions) {
  const [predictions, dispatch] = useReducer(
    bracketReducer,
    initial ?? EMPTY_PREDICTIONS,
  )
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (initial) {
      dispatch({ type: 'LOAD', predictions: initial })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dispatchAndDirty = useCallback((action: BracketAction) => {
    if (!readOnly) {
      dispatch(action)
      setIsDirty(true)
    }
  }, [readOnly])

  const save = useCallback(async (): Promise<{ success: true } | { error: string }> => {
    const result = await onSave(predictions)
    if (!('error' in result)) {
      setIsDirty(false)
    }
    return result
  }, [predictions, onSave])

  const resetPredictions = useCallback((pred: GoldenTicketPredictions | null) => {
    dispatch({ type: 'LOAD', predictions: pred ?? EMPTY_PREDICTIONS })
    setIsDirty(false)
  }, [])

  const getR16Teams = useCallback(
    (r16Slot: number): { teamId: string; teamName: string; flagUrl: string | null }[] => {
      const r32Match1 = r32Matches.find((m) => m.bracket_slot === r16Slot * 2)
      const r32Match2 = r32Matches.find((m) => m.bracket_slot === r16Slot * 2 + 1)

      const teams: { teamId: string; teamName: string; flagUrl: string | null }[] = []

      const winner1 = r32Match1 ? predictions.r32[r32Match1.id] : null
      const winner2 = r32Match2 ? predictions.r32[r32Match2.id] : null

      if (winner1) {
        const t =
          r32Match1?.home_team_id === winner1 ? r32Match1.home_team : r32Match1?.away_team
        if (t) teams.push({ teamId: winner1, teamName: t.name, flagUrl: t.flag_url })
      }
      if (winner2) {
        const t =
          r32Match2?.home_team_id === winner2 ? r32Match2.home_team : r32Match2?.away_team
        if (t) teams.push({ teamId: winner2, teamName: t.name, flagUrl: t.flag_url })
      }

      return teams
    },
    [predictions.r32, r32Matches],
  )

  return { predictions, dispatch: dispatchAndDirty, getR16Teams, isDirty, save, resetPredictions }
}
