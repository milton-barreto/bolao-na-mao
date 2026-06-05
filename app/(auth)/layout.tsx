import Link from 'next/link'

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 block text-center font-display text-2xl font-bold text-foreground"
        >
          Bolão na Mão ⚽
        </Link>
        {children}
      </div>
    </div>
  )
}
