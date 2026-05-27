import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Māngere Restoration Map',
  description:
    'Community-driven environmental restoration mapping platform for Māngere, Auckland, New Zealand.',
  keywords: ['restoration', 'Māngere', 'Auckland', 'environment', 'community', 'planting', 'conservation'],
  authors: [{ name: 'Māngere Restoration Community' }],
  openGraph: {
    title: 'Māngere Restoration Map',
    description: 'Track and contribute to environmental restoration across Māngere, Auckland.',
    type: 'website',
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌿</text></svg>",
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="bg-black text-white antialiased" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="bottom-right"
          containerClassName="react-hot-toast-container"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#111',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '0.875rem',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#000' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#000' },
            },
          }}
        />
      </body>
    </html>
  )
}
