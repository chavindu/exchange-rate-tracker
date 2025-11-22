import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Exchange Rate Dashboard — Sampath Bank',
  description: 'Track TTBUY exchange rates from Sampath Bank',
  icons: {
    icon: [
      { url: '/img/sampath-logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/img/sampath-logo.png', type: 'image/png' },
    ],
    shortcut: '/img/sampath-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

