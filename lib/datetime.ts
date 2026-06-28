import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { format, isPast, differenceInMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TZ = 'America/Fortaleza'

/**
 * Converte uma data UTC para o fuso de Fortaleza (UTC-3).
 */
export function toFortaleza(date: string | Date): Date {
  return toZonedTime(date, TZ)
}

/**
 * Formata uma data no fuso de Fortaleza para exibição.
 * Ex: "15/06 às 16h"
 */
export function formatKickoff(date: string | Date): string {
  return formatInTimeZone(date, TZ, "dd/MM 'às' HH'h'", { locale: ptBR })
}

/**
 * Formata o deadline de forma humanizada.
 * Ex: "Fecha em 42 min" ou "15/06 às 15h"
 */
export function formatDeadline(deadlineUtc: string | Date): string {
  const deadlineLocal = toZonedTime(deadlineUtc, TZ)
  const nowLocal = toZonedTime(new Date(), TZ)
  const minutesLeft = differenceInMinutes(deadlineLocal, nowLocal)

  if (minutesLeft <= 0) return 'Encerrado'
  if (minutesLeft < 60) return `Fecha em ${minutesLeft} min`
  if (minutesLeft < 24 * 60) {
    const hours = Math.floor(minutesLeft / 60)
    return `Fecha em ${hours}h`
  }

  return formatInTimeZone(deadlineUtc, TZ, "dd/MM 'às' HH'h'", { locale: ptBR })
}

/**
 * Retorna true se o deadline já passou (palpite travado).
 */
export function isDeadlinePassed(deadlineUtc: string | Date): boolean {
  return isPast(new Date(deadlineUtc))
}

/**
 * Retorna true se o deadline é em menos de 10 minutos (alerta amarelo).
 */
export function isDeadlineSoon(deadlineUtc: string | Date): boolean {
  const minutesLeft = differenceInMinutes(new Date(deadlineUtc), new Date())
  return minutesLeft > 0 && minutesLeft <= 10
}

/**
 * Formata data completa para logs e telas admin.
 * Ex: "qui, 15 jun 2026 — 16:00"
 */
export function formatFull(date: string | Date): string {
  return formatInTimeZone(date, TZ, "EEE, dd MMM yyyy '—' HH:mm", { locale: ptBR })
}

export { TZ, format }
