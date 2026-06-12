import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  // Serwist requer webpack — desabilitar no dev com Turbopack
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  // O serwist injeta uma config de webpack (usada no build de produção via
  // `next build --webpack`). No dev usamos Turbopack, então declaramos um
  // turbopack config vazio para sinalizar que a presença do webpack config é
  // intencional e silenciar o erro. Ver: https://serwist.pages.dev/docs/next
  turbopack: {},
  images: {
    remotePatterns: [
      {
        // Bandeiras dos times — flagcdn.com (w40 → w160 para qualidade em retina)
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
      {
        // Avatares dos usuários — Supabase Storage
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default withSerwist(nextConfig)
