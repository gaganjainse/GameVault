'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Bell,
  MessageSquare,
  Gamepad2,
  User,
  Settings,
  Wallet,
  LogOut,
  Shield,
  ShoppingBag,
  Bookmark,
  Menu,
  Home,
  Compass,
  Video,
  Radio,
  Users,
  ShoppingCart,
  Trophy,
  Gift,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function Header() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [cartCount, setCartCount] = useState(0)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnreadNotifs(count || 0)
    }
    const fetchCartCount = async () => {
      const { count } = await supabase
        .from('cart_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      setCartCount(count || 0)
    }
    fetchUnread()
    fetchCartCount()
    const interval = setInterval(() => {
      fetchUnread()
      fetchCartCount()
    }, 30000)
    return () => clearInterval(interval)
  }, [user])

  const navLinks = [
    { href: '/feed', label: 'Feed' },
    { href: '/explore', label: 'Explore' },
    { href: '/marketplace', label: 'Market' },
    { href: '/vault', label: 'Vault' },
  ]

  const mobileNavGroups = [
    {
      label: 'Main',
      items: [
        { href: '/feed', icon: Home, label: 'Home Feed' },
        { href: '/explore', icon: Compass, label: 'Explore' },
        { href: '/discover', icon: Search, label: 'Discovery Queue' },
        { href: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
        { href: '/vault', icon: Wallet, label: 'My Vault' },
      ],
    },
    {
      label: 'Discover',
      items: [
        { href: '/videos', icon: Video, label: 'Videos' },
        { href: '/livestreams', icon: Radio, label: 'Live Streams' },
        { href: '/creators', icon: Users, label: 'Creators' },
        { href: '/jams', icon: Trophy, label: 'Game Jams' },
        { href: '/curators', icon: Bookmark, label: 'Curators' },
        { href: '/free', icon: Gift, label: 'Free Games' },
        { href: '/bundles', icon: ShoppingBag, label: 'Bundles' },
      ],
    },
    {
      label: 'Personal',
      items: [
        { href: '/notifications', icon: Bell, label: 'Notifications', badge: unreadNotifs },
        { href: '/messages', icon: MessageSquare, label: 'Messages' },
        { href: '/bookmarks', icon: Bookmark, label: 'Wishlist' },
        { href: '/cart', icon: ShoppingCart, label: 'Cart', badge: cartCount },
        { href: '/orders', icon: ShoppingBag, label: 'Orders' },
        { href: '/settings', icon: Settings, label: 'Settings' },
      ],
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center px-4 lg:px-8">
        {/* Mobile Menu Button */}
        {user && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden mr-1">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-card/95 border-r border-border/40">
              <SheetHeader className="p-4 border-b border-border/40">
                <SheetTitle className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Gamepad2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-display text-xl font-bold">
                    <span className="text-gradient-primary">Game</span>
                    <span>Vault</span>
                  </span>
                </SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto h-[calc(100vh-80px)] p-4">
                {mobileNavGroups.map((group) => (
                  <div key={group.label} className="mb-6">
                    <div className="px-3 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.label}
                      </span>
                    </div>
                    <nav className="space-y-1">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSheetOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                            pathname === item.href || pathname.startsWith(item.href + '/')
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="flex-1">{item.label}</span>
                          {item.badge ? (
                            <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-primary/20 text-primary">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </nav>
                  </div>
                ))}
                {profile?.is_creator && (
                  <Link
                    href="/admin"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                  >
                    <Shield className="h-5 w-5" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
                <div className="mt-6 pt-6 border-t border-border/40">
                  <Link
                    href="/vault"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                  >
                    <Gamepad2 className="h-5 w-5" />
                    <span>My Vault</span>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-6">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Gamepad2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold hidden sm:block">
            <span className="text-gradient-primary">Game</span>
            <span>Vault</span>
          </span>
        </Link>

        {/* Search - Desktop */}
        <form className="flex-1 max-w-xl mx-4 hidden md:block" onSubmit={(e) => {
          e.preventDefault()
          const q = new FormData(e.currentTarget).get('q') as string
          if (q.trim()) router.push(`/explore?q=${encodeURIComponent(q)}`)
        }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Search games, creators, videos..."
              className="pl-10 bg-secondary/50 border-border/50 focus:border-primary/50"
            />
          </div>
        </form>

        {/* Search - Mobile Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden ml-auto"
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Navigation - Desktop */}
        <nav className="hidden lg:flex items-center gap-1 mr-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors rounded-lg',
                pathname === link.href || pathname.startsWith(link.href + '/')
                  ? 'text-foreground bg-secondary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {user ? (
            <>
              {/* Cart */}
              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link href="/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs bg-accent text-accent-foreground">
                      {cartCount > 99 ? '99+' : cartCount}
                    </Badge>
                  )}
                </Link>
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link href="/notifications">
                  <Bell className="h-5 w-5" />
                  {unreadNotifs > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs bg-destructive">
                      {unreadNotifs > 99 ? '99+' : unreadNotifs}
                    </Badge>
                  )}
                </Link>
              </Button>

              {/* Messages */}
              <Button variant="ghost" size="icon" className="relative hidden sm:flex" asChild>
                <Link href="/messages">
                  <MessageSquare className="h-5 w-5" />
                </Link>
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {profile?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium">
                      {profile?.display_name || profile?.username}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{profile?.display_name || profile?.username}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        @{profile?.username}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${profile?.username}`}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/vault">
                      <Wallet className="mr-2 h-4 w-4" />
                      My Vault
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bookmarks">
                      <Bookmark className="mr-2 h-4 w-4" />
                      Wishlist
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/cart">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Cart
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {profile?.is_creator && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-primary to-accent">
                <Link href="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="md:hidden border-t border-border/40 p-3 animate-fade-in-up">
          <form onSubmit={(e) => {
            e.preventDefault()
            const q = new FormData(e.currentTarget).get('q') as string
            if (q.trim()) {
              router.push(`/explore?q=${encodeURIComponent(q)}`)
              setMobileSearchOpen(false)
            }
          }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                name="q"
                placeholder="Search games, creators, videos..."
                className="pl-10"
                autoFocus
              />
            </div>
          </form>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      {user && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border/40 bg-background/95 backdrop-blur-lg h-14">
          <MobileBottomLink href="/feed" icon={Home} label="Feed" active={pathname === '/feed'} />
          <MobileBottomLink href="/explore" icon={Compass} label="Explore" active={pathname === '/explore' || pathname.startsWith('/discover')} />
          <MobileBottomLink href="/marketplace" icon={ShoppingBag} label="Market" active={pathname === '/marketplace' || pathname.startsWith('/bundles')} />
          <MobileBottomLink href="/vault" icon={Wallet} label="Vault" active={pathname === '/vault'} />
          <MobileBottomLink href={`/profile/${profile?.username}`} icon={User} label="Profile" active={pathname.startsWith('/profile')} />
        </nav>
      )}
    </header>
  )
}

function MobileBottomLink({ href, icon: Icon, label, active }: { href: string; icon: React.ElementType; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  )
}
