'use client'

import { useCallback, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const MAX_SIZE = 20 * 1024 * 1024 // 20MB — output sempre < 300KB após canvas crop
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const OUTPUT_SIZE = 512

interface AvatarUploadProps {
  /** Chamado quando o usuário confirma o recorte */
  onCropped: (file: File) => void
  /** Nome para o fallback (inicial) */
  name?: string
  /** URL da foto já salva — exibida antes de qualquer upload novo */
  currentUrl?: string
}

export function AvatarUpload({ onCropped, name, currentUrl }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [open, setOpen] = useState(false)

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED.includes(file.type)) {
      toast.error('Foto precisa ser JPG, PNG, WebP ou GIF, mano.')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('Arquivo muito grande. Máximo 20MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setOpen(true)
    }
    reader.readAsDataURL(file)
    // permite re-selecionar o mesmo arquivo
    e.target.value = ''
  }

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels)
    if (!blob) {
      toast.error('Não deu pra recortar a foto. Tenta outra.')
      return
    }
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    setPreview(URL.createObjectURL(blob))
    onCropped(file)
    setOpen(false)
  }

  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative"
        aria-label="Escolher foto de perfil"
      >
        <Avatar className="h-24 w-24">
          {preview ? (
            <AvatarImage src={preview} alt="Prévia do avatar" />
          ) : currentUrl ? (
            <AvatarImage src={currentUrl} alt="Foto de perfil" />
          ) : null}
          <AvatarFallback className="text-2xl">{initial}</AvatarFallback>
        </Avatar>
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="h-6 w-6 text-white" />
        </span>
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-sm font-medium text-brand-blue hover:underline"
      >
        {preview || currentUrl ? 'Trocar foto' : 'Bora colocar uma foto'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onSelectFile}
        className="hidden"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajeita a foto</DialogTitle>
          </DialogHeader>

          <div className="relative h-64 w-full overflow-hidden rounded-xl bg-muted">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            ) : null}
          </div>

          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-[var(--primary)]"
            aria-label="Zoom"
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Recorta a imagem para um quadrado e devolve um Blob JPEG */
async function getCroppedBlob(
  imageSrc: string,
  area: Area,
): Promise<Blob | null> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = src
  })
}
