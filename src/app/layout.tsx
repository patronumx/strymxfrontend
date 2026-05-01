import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/context/ThemeContext'
import { OverlayConfigProvider } from '@/context/OverlayConfigContext'

export const metadata: Metadata = {
  title: 'STRYMX | Production Environment',
  description: 'PUBG Mobile Web-Based Live Results & Broadcast Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="text-slate-100 min-h-screen bg-transparent" suppressHydrationWarning>
        <ThemeProvider>
          <OverlayConfigProvider>
            {children}
          </OverlayConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

