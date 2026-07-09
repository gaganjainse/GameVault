import './globals.css'
import type { Metadata } from 'next'
import { Inter, Orbitron } from 'next/font/google'
import { Providers } from '@/components/providers/auth-provider'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' })

export const metadata: Metadata = {
  metadataBase: new URL('https://gamevault.app'),
  title: {
    default: 'GameVault - Own, Play, Trade',
    template: '%s | GameVault',
  },
  description: 'The ultimate gaming network. Discover games, connect with creators, build your vault, and trade digital assets.',
  openGraph: {
    title: 'GameVault - Own, Play, Trade',
    description: 'The ultimate gaming network. Discover games, connect with creators, build your vault, and trade digital assets.',
    siteName: 'GameVault',
    type: 'website',
    images: [
      {
        url: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=1200',
        width: 1200,
        height: 630,
        alt: 'GameVault',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GameVault - Own, Play, Trade',
    description: 'The ultimate gaming network. Discover games, connect with creators, build your vault, and trade digital assets.',
    images: [
      {
        url: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=1200',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${orbitron.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster position="bottom-right" richColors />
        </Providers>
      </body>
    </html>
  )
}
