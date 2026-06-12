'use client'

import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Share2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { toPng } from 'html-to-image'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { RankingShareCard } from './ranking-share-card'
import type { RankingEntry } from '@/types'

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

interface ShareRankingButtonProps {
  entries: RankingEntry[]
  currentUserId?: string
}

export function ShareRankingButton({ entries, currentUserId }: ShareRankingButtonProps) {
  const [generating, setGenerating] = useState(false)

  async function handleShare() {
    if (generating) return
    setGenerating(true)

    try {
      // Fetch avatars as base64 (CORS-safe, same as flags in bet card)
      const avatarDataUrls: Record<string, string | null> = {}
      await Promise.all(
        entries.map(async (e) => {
          avatarDataUrls[e.user.id] = e.user.avatar_url
            ? await fetchAsDataUrl(e.user.avatar_url)
            : null
        }),
      )

      const dateLabel = formatInTimeZone(new Date(), 'America/Fortaleza', "dd 'de' MMM yyyy", {
        locale: ptBR,
      })

      const container = document.createElement('div')
      container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;pointer-events:none;'
      document.body.appendChild(container)

      let dataUrl: string

      try {
        const root = createRoot(container)
        flushSync(() => {
          root.render(
            <RankingShareCard
              entries={entries}
              avatarDataUrls={avatarDataUrls}
              currentUserId={currentUserId}
              dateLabel={dateLabel}
            />,
          )
        })

        await document.fonts.ready

        const cardEl = container.firstElementChild as HTMLElement
        dataUrl = await toPng(cardEl, { pixelRatio: 2.7, quality: 1 })

        root.unmount()
      } finally {
        document.body.removeChild(container)
      }

      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], 'ranking-copa2026.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Ranking — Copa 2026 · Bolão na Mão',
        })
      } else {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = 'ranking-copa2026.png'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        toast.success('Ranking baixado! Compartilha onde quiser. 📸')
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        toast.error('Não consegui gerar a imagem. Tenta de novo.')
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={generating}
      title="Compartilhar ranking"
      className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      {generating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Share2 className="h-3.5 w-3.5" />
      )}
      Compartilhar
    </button>
  )
}
