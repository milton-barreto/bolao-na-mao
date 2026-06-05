import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/layout/bottom-nav'
import { TopNav } from '@/components/layout/top-nav'
import { GlobalBanner } from '@/components/global-banner'
import type { BannerConfig } from '@/types'

async function getBanner(): Promise<BannerConfig | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'global_banner')
      .single()

    const val = data?.value
    if (!val || val === null || typeof val !== 'object' || Array.isArray(val)) return null
    const v = val as Record<string, unknown>
    if (typeof v.text !== 'string' || !v.text) return null
    return { text: v.text, type: (v.type as BannerConfig['type']) ?? 'info' }
  } catch {
    return null
  }
}

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const banner = await getBanner()

  return (
    <>
      <TopNav />
      {banner && <GlobalBanner config={banner} />}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <BottomNav />
    </>
  )
}
