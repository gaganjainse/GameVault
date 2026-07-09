'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/utils'
import {
  Home,
  Compass,
  ShoppingBag,
  Wallet,
  Video,
  Radio,
  User,
  Settings,
  Shield,
  Bell,
  MessageSquare,
  Bookmark,
  Users,
  Gamepad2,
  Trophy,
  Gift,
  ShoppingCart,
  Search,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function Sidebar() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    if (!user) return
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnreadNotifications(count || 0)
    }
    fetchUnread()
  }, [user])

  const mainNav = [
    { href: '/feed', icon: Home, label: 'Home Feed' },
    { href: '/explore', icon: Compass, label: 'Explore' },
    { href: '/discover', icon: Search, label: 'Discovery Queue' },
    { href: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
    { href: '/vault', icon: Wallet, label: 'My Vault' },
  ]

  const discoverNav = [
    { href: '/videos', icon: Video, label: 'Videos' },
    { href: '/livestreams', icon: Radio, label: 'Live Streams' },
    { href: '/creators', icon: Users, label: 'Creators' },
    { href: '/jams', icon: Trophy, label: 'Game Jams' },
    { href: '/curators', icon: Bookmark, label: 'Curators' },
    { href: '/free', icon: Gift, label: 'Free Games' },
    { href: '/bundles', icon: ShoppingBag, label: 'Bundles' },
  ]

  const personalNav = [
    { href: '/notifications', icon: Bell, label: 'Notifications', badge: unreadNotifications },
    { href: '/messages', icon: MessageSquare, label: 'Messages' },
    { href: '/bookmarks', icon: Bookmark, label: 'Wishlist' },
    { href: '/cart', icon: ShoppingCart, label: 'Cart' },
    { href: '/orders', icon: ShoppingBag, label: 'Orders' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  if (!user) return null

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border/40 bg-card/30 p-4">
      {/* Main Navigation */}
      <nav className="space-y-1">
        {mainNav.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}
      </nav>

      <div className="my-6 border-t border-border/40" />

      {/* Discover */}
      <div className="px-3 mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Discover
        </span>
      </div>
      <nav className="space-y-1">
        {discoverNav.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}
      </nav>

      <div className="my-6 border-t border-border/40" />
      <div className="px-3 mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Personal
        </span>
      </div>
      <nav className="space-y-1">
        {personalNav.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}
      </nav>

      {/* Admin Link */}
      {profile?.is_creator && (
        <>
          <div className="my-6 border-t border-border/40" />
          <div className="px-3 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Admin
            </span>
          </div>
          <NavItem
            href="/admin"
            icon={Shield}
            label="Admin Dashboard"
            active={pathname === '/admin' || pathname.startsWith('/admin/')}
          />
        </>
      )}

      {/* Go to Vault */}
      <div className="mt-auto pt-6">
        <Link
          href="/vault"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          <Gamepad2 className="h-5 w-5" />
          <span>My Vault</span>
        </Link>
      </div>
    </aside>
  )
}

function NavItem({
  href,
  icon: Icon,
  label,
  badge,
  active,
}: {
  href: string
  icon: React.ElementType
  label: string
  badge?: number
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-primary/20 text-primary">
          {badge}
        </span>
      )}
    </Link>
  )
}
