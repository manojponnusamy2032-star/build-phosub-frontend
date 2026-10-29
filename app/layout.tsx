import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/providers'
import SiteFooter from '@/components/site-footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'Phosub — Clear phone handovers',
  description: 'A focused workspace for student phone handovers and classroom accountability.',
  generator: 'Next.js',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#F2F1ED',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
        <SiteFooter />
      </body>
    </html>
  )
}
