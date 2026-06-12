'use client'

import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Share2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { toPng } from 'html-to-image'
import { ShareCard } from './share-card'

interface ShareBetButtonProps {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  homeFlagUrl?: string | null
  awayFlagUrl?: string | null
  groupName?: string | null
}

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

export function ShareBetButton({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  homeFlagUrl,
  awayFlagUrl,
  groupName,
}: ShareBetButtonProps) {
  const [generating, setGenerating] = useState(false)

  async function handleShare() {
    if (generating) return
    setGenerating(true)

    try {
      // Fetch flags as base64 to avoid CORS issues inside html-to-image
      // w320 (320×213px) garante downscale a 2.7x pixel ratio — sem blur
      const hq = (url: string) => url.replace('/w40/', '/w320/')
      const [homeFlag, awayFlag] = await Promise.all([
        homeFlagUrl ? fetchAsDataUrl(hq(homeFlagUrl)) : Promise.resolve(null),
        awayFlagUrl ? fetchAsDataUrl(hq(awayFlagUrl)) : Promise.resolve(null),
      ])

      // Render card into a temporary off-screen container
      const container = document.createElement('div')
      container.style.cssText =
        'position:fixed;left:-9999px;top:-9999px;pointer-events:none;'
      document.body.appendChild(container)

      let dataUrl: string

      try {
        const root = createRoot(container)
        flushSync(() => {
          root.render(
            <ShareCard
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              homeScore={homeScore}
              awayScore={awayScore}
              homeFlagDataUrl={homeFlag}
              awayFlagDataUrl={awayFlag}
              groupName={groupName}
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

      // Share or download
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], 'palpite-copa2026.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${homeTeam} × ${awayTeam} — Copa 2026`,
        })
      } else {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = 'palpite-copa2026.png'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        toast.success('Imagem baixada! Compartilha onde quiser. 📸')
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
      title="Compartilhar palpite"
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      {generating ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Share2 className="h-3 w-3" />
      )}
      Compartilhar
    </button>
  )
}
