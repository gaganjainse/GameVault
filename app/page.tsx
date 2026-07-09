'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Wallet,
  Users,
  ShoppingBag,
  Sparkles,
  Gift,
  Search,
  Star,
  Zap,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/lib/auth/auth-context'
import { AppLayout } from '@/components/layout'

type Game = {
  id: string
  title: string
  slug: string
  description: string | null
  cover_url: string | null
  banner_url: string | null
  price: number
  genre: string | null
  developer: string | null
  downloads_count: number
  rating_average: number
  rating_count: number
  is_featured: boolean
  download_url: string | null
}

type Review = {
  id: string
  rating: number
  title: string | null
  content: string | null
  helpful_count: number
  user_id: string
  game_id: string
  created_at: string
}

type FreePromotion = {
  id: string
  game_id: string
  start_date: string
  end_date: string
  original_price: number | null
  is_active: boolean
  games: { title: string; slug: string; cover_url: string | null; banner_url: string | null; description: string | null; genre: string | null; developer: string | null }
}

type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_creator: boolean
  followers_count: number
}

export default function LandingPage() {
  const { user } = useAuth()
  const [featuredGames, setFeaturedGames] = useState<Game[]>([])
  const [trendingGames, setTrendingGames] = useState<Game[]>([])
  const [newReleases, setNewReleases] = useState<Game[]>([])
  const [topRated, setTopRated] = useState<Game[]>([])
  const [underTen, setUnderTen] = useState<Game[]>([])
  const [freePromotion, setFreePromotion] = useState<FreePromotion | null>(null)
  const [topReview, setTopReview] = useState<(Review & { profiles: { username: string; avatar_url: string | null } | null; games: { title: string; slug: string } | null }) | null>(null)
  const [featuredCreators, setFeaturedCreators] = useState<Profile[]>([])
  const [stats, setStats] = useState({ games: 0, users: 0, listings: 0, transactions: 0 })
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const slideInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const [featured, trending, newest, rated, cheap, promo, creators, reviews, counts] = await Promise.all([
        supabase.from('games').select('*').eq('is_active', true).eq('is_featured', true).order('downloads_count', { ascending: false }).limit(5),
        supabase.from('games').select('*').eq('is_active', true).order('downloads_count', { ascending: false }).limit(10),
        supabase.from('games').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(10),
        supabase.from('games').select('*').eq('is_active', true).order('rating_average', { ascending: false }).limit(10),
        supabase.from('games').select('*').eq('is_active', true).lt('price', 10).order('downloads_count', { ascending: false }).limit(10),
        supabase.from('free_game_promotions').select('*, games(title, slug, cover_url, banner_url, description, genre, developer)').eq('is_active', true).gt('end_date', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('profiles').select('*').eq('is_creator', true).order('followers_count', { ascending: false }).limit(4),
        supabase.from('game_reviews').select('*, profiles(username, avatar_url), games(title, slug)').order('helpful_count', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('games').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ])

      // Also fetch user count and listing count
      const [usersCount, listingsCount] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ])

      setFeaturedGames(featured.data as Game[] || [])
      setTrendingGames(trending.data as Game[] || [])
      setNewReleases(newest.data as Game[] || [])
      setTopRated(rated.data as Game[] || [])
      setUnderTen(cheap.data as Game[] || [])
      setFreePromotion(promo.data as FreePromotion | null)
      setFeaturedCreators(creators.data as Profile[] || [])
      setTopReview(reviews.data as (Review & { profiles: { username: string; avatar_url: string | null } | null; games: { title: string; slug: string } | null }) | null)
      setStats({
        games: counts.count || 0,
        users: usersCount.count || 0,
        listings: listingsCount.count || 0,
        transactions: 0,
      })
      setLoading(false)
    }
    fetchData()
  }, [])

  // Auto-rotate hero carousel
  const startAutoRotate = useCallback(() => {
    if (slideInterval.current) clearInterval(slideInterval.current)
    slideInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % Math.max(featuredGames.length, 1))
    }, 6000)
  }, [featuredGames.length])

  useEffect(() => {
    if (featuredGames.length > 0) startAutoRotate()
    return () => { if (slideInterval.current) clearInterval(slideInterval.current) }
  }, [featuredGames, startAutoRotate])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    startAutoRotate()
  }

  if (loading) {
    return user ? (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse">
            <Gamepad2 className="h-12 w-12 text-primary mx-auto" />
            <p className="text-muted-foreground mt-4 text-center">Loading GameVault...</p>
          </div>
        </div>
      </AppLayout>
    ) : (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse">
          <Gamepad2 className="h-12 w-12 text-primary mx-auto" />
          <p className="text-muted-foreground mt-4 text-center">Loading GameVault...</p>
        </div>
      </div>
    )
  }

  return user ? (
    <AppLayout>
      <div className="space-y-12 pb-8">
      {/* Hero Carousel */}
      {featuredGames.length > 0 && (
        <section className="relative h-[420px] sm:h-[500px] rounded-2xl overflow-hidden">
          {featuredGames.map((game, index) => (
            <div
              key={game.id}
              className={`absolute inset-0 transition-opacity duration-700 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
            >
              {game.banner_url && (
                <Image
                  src={game.banner_url}
                  alt={game.title}
                  fill
                  priority={index === 0}
                  className="object-cover"
                  sizes="100vw"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      <Sparkles className="h-3 w-3 mr-1" /> Featured
                    </Badge>
                    {game.genre && (
                      <Badge variant="secondary">{game.genre}</Badge>
                    )}
                  </div>
                  <h1 className="font-display text-3xl sm:text-5xl font-bold mb-3 text-balance">
                    {game.title}
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base mb-4 line-clamp-2">
                    {game.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent">
                      <Link href={`/game/${game.slug}`}>
                        Get for ${game.price}
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="secondary">
                      <Link href={`/game/${game.slug}`}>
                        <Search className="h-4 w-4 mr-2" /> View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Carousel Controls */}
          <button
            onClick={() => goToSlide((currentSlide - 1 + featuredGames.length) % featuredGames.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/60 backdrop-blur hover:bg-background/80 transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => goToSlide((currentSlide + 1) % featuredGames.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/60 backdrop-blur hover:bg-background/80 transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 right-6 flex gap-2 z-10">
            {featuredGames.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/40'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Free Game Promotion */}
      {freePromotion && freePromotion.games && (
        <section className="relative rounded-2xl overflow-hidden border border-accent/30">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent" />
          <div className="relative flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8">
            <div className="relative w-full sm:w-48 h-32 rounded-xl overflow-hidden flex-shrink-0">
              {freePromotion.games.banner_url && (
                <Image
                  src={freePromotion.games.banner_url}
                  alt={freePromotion.games.title}
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                <Badge className="bg-accent/20 text-accent border-accent/30">
                  <Gift className="h-3 w-3 mr-1" /> Free This Week
                </Badge>
              </div>
              <h2 className="font-display text-2xl font-bold mb-1">{freePromotion.games.title}</h2>
              <p className="text-muted-foreground text-sm mb-3 line-clamp-1">
                {freePromotion.games.description}
              </p>
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <span className="text-lg text-muted-foreground line-through">
                  ${freePromotion.original_price}
                </span>
                <span className="text-2xl font-bold text-accent">FREE</span>
                <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/80">
                  <Link href="/free">
                    Claim Now <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
            <CountdownTimer endDate={freePromotion.end_date} />
          </div>
        </section>
      )}

      {/* Discovery Queue CTA */}
      <section>
        <Link href="/discover" className="block group">
          <Card className="relative overflow-hidden border-primary/30 hover:border-primary/50 transition-all">
            <div className="absolute inset-0 grid-pattern opacity-30" />
            <div className="absolute inset-0 radial-gradient" />
            <div className="relative flex items-center gap-6 p-6 sm:p-8">
              <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Search className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl font-bold mb-1">Start Your Discovery Queue</h2>
                <p className="text-muted-foreground text-sm">
                  We&apos;ll show you games one at a time. Wishlist what you love, skip what you don&apos;t.
                </p>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </Card>
        </Link>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Games', value: stats.games, icon: Gamepad2 },
          { label: 'Members', value: stats.users, icon: Users },
          { label: 'Active Listings', value: stats.listings, icon: ShoppingBag },
          { label: 'Tradable Vault', value: '100%', icon: Wallet, isText: true },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 flex flex-col items-center text-center">
            <stat.icon className="h-6 w-6 text-primary mb-2" />
            <span className="text-2xl font-bold font-display">
              {stat.isText ? stat.value : (stat.value as number).toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
          </Card>
        ))}
      </section>

      {/* Horizontal Shelves */}
      {trendingGames.length > 0 && (
        <GameShelf title="Trending Now" icon={TrendingUp} games={trendingGames} />
      )}
      {newReleases.length > 0 && (
        <GameShelf title="New Releases" icon={Sparkles} games={newReleases} />
      )}

      {/* Browse by Tag */}
      <section>
        <h2 className="font-display text-2xl font-bold mb-4">Browse by Tag</h2>
        <div className="flex flex-wrap gap-2">
          {['Action', 'RPG', 'Cyberpunk', 'Horror', 'Strategy', 'Puzzle', 'Racing', 'Sci-Fi', 'Co-op', 'Open World', 'Roguelike', 'Steampunk', 'Fantasy', 'Survival'].map((tag) => (
            <Link key={tag} href={`/explore?tag=${tag.toLowerCase()}`}>
              <Badge variant="secondary" className="px-4 py-2 text-sm cursor-pointer hover:bg-primary/20 hover:text-primary transition-all">
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Rated Shelf */}
      {topRated.length > 0 && (
        <GameShelf title="Top Rated" icon={Star} games={topRated} />
      )}

      {/* Under $10 Shelf */}
      {underTen.length > 0 && (
        <GameShelf title="Under $10" icon={Zap} games={underTen} />
      )}

      {/* Featured Review */}
      {topReview && topReview.games && topReview.profiles && (
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">What Players Are Saying</h2>
          <Card className="p-6 border-primary/20">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={topReview.profiles.avatar_url || ''} />
                <AvatarFallback>{topReview.profiles.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium">{topReview.profiles.username}</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < topReview.rating ? 'text-warning fill-warning' : 'text-muted'}`}
                      />
                    ))}
                  </div>
                  <Link href={`/game/${topReview.games.slug}`}>
                    <Badge variant="secondary">{topReview.games.title}</Badge>
                  </Link>
                </div>
                {topReview.title && <h3 className="font-semibold mb-1">{topReview.title}</h3>}
                <p className="text-muted-foreground text-sm line-clamp-3">{topReview.content}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>{topReview.helpful_count} found this helpful</span>
                  <span>{formatDistanceToNow(new Date(topReview.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Creator Spotlight */}
      {featuredCreators.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">Creator Spotlight</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {featuredCreators.map((creator) => (
              <Card key={creator.id} className="p-4 flex flex-col items-center text-center hover:border-primary/30 transition-all">
                <Avatar className="h-16 w-16 mb-3">
                  <AvatarImage src={creator.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {creator.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Link href={`/profile/${creator.username}`} className="font-medium hover:text-primary">
                  {creator.display_name || creator.username}
                </Link>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{creator.bio}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{creator.followers_count} followers</span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Value Proposition */}
      <section className="grid sm:grid-cols-3 gap-6">
        <Card className="p-6 border-primary/20">
          <Wallet className="h-8 w-8 text-primary mb-3" />
          <h3 className="font-display text-lg font-bold mb-2">True Ownership</h3>
          <p className="text-sm text-muted-foreground">
            Buy a game, it&apos;s yours. Sell it back to the community when you&apos;re done. Creators earn royalties on every resale.
          </p>
        </Card>
        <Card className="p-6 border-accent/20">
          <Users className="h-8 w-8 text-accent mb-3" />
          <h3 className="font-display text-lg font-bold mb-2">Social First</h3>
          <p className="text-sm text-muted-foreground">
            Follow creators, join game jams, read devlogs, and build your collection alongside a community that gets it.
          </p>
        </Card>
        <Card className="p-6 border-success/20">
          <Search className="h-8 w-8 text-success mb-3" />
          <h3 className="font-display text-lg font-bold mb-2">Discover Smarter</h3>
          <p className="text-sm text-muted-foreground">
            Tag-based browsing, curated lists, discovery queues, and reviews from real players with real playtime.
          </p>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 pt-8 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-display font-bold mb-3 flex items-center gap-2">
              <span className="text-gradient-primary">Game</span>Vault
            </h3>
            <p className="text-sm text-muted-foreground">Own, play, trade.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/marketplace" className="hover:text-foreground">Marketplace</Link></li>
              <li><Link href="/explore" className="hover:text-foreground">Browse Games</Link></li>
              <li><Link href="/discover" className="hover:text-foreground">Discovery Queue</Link></li>
              <li><Link href="/jams" className="hover:text-foreground">Game Jams</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Community</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/feed" className="hover:text-foreground">Feed</Link></li>
              <li><Link href="/creators" className="hover:text-foreground">Creators</Link></li>
              <li><Link href="/curators" className="hover:text-foreground">Curators</Link></li>
              <li><Link href="/free" className="hover:text-foreground">Free Games</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/vault" className="hover:text-foreground">My Vault</Link></li>
              <li><Link href="/orders" className="hover:text-foreground">Orders</Link></li>
              <li><Link href="/settings" className="hover:text-foreground">Settings</Link></li>
              <li><Link href="/login" className="hover:text-foreground">Sign In</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/40 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} GameVault. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for gamers, by gamers.
          </p>
        </div>
      </footer>
      </div>
    </AppLayout>
  ) : (
    <div className="space-y-12 pb-8 px-4 sm:px-6 lg:px-8 pt-6">
      {/* Hero Carousel */}
      {featuredGames.length > 0 && (
        <section className="relative h-[420px] sm:h-[500px] rounded-2xl overflow-hidden">
          {featuredGames.map((game, index) => (
            <div
              key={game.id}
              className={`absolute inset-0 transition-opacity duration-700 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
            >
              {game.banner_url && (
                <Image
                  src={game.banner_url}
                  alt={game.title}
                  fill
                  priority={index === 0}
                  className="object-cover"
                  sizes="100vw"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      <Sparkles className="h-3 w-3 mr-1" /> Featured
                    </Badge>
                    {game.genre && (
                      <Badge variant="secondary">{game.genre}</Badge>
                    )}
                  </div>
                  <h1 className="font-display text-3xl sm:text-5xl font-bold mb-3 text-balance">
                    {game.title}
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base mb-4 line-clamp-2">
                    {game.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent">
                      <Link href={`/game/${game.slug}`}>
                        Get for ${game.price}
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="secondary">
                      <Link href={`/game/${game.slug}`}>
                        <Search className="h-4 w-4 mr-2" /> View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Carousel Controls */}
          <button
            onClick={() => goToSlide((currentSlide - 1 + featuredGames.length) % featuredGames.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/60 backdrop-blur hover:bg-background/80 transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => goToSlide((currentSlide + 1) % featuredGames.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/60 backdrop-blur hover:bg-background/80 transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 right-6 flex gap-2 z-10">
            {featuredGames.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/40'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Free Game Promotion */}
      {freePromotion && freePromotion.games && (
        <section className="relative rounded-2xl overflow-hidden border border-accent/30">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent" />
          <div className="relative flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8">
            <div className="relative w-full sm:w-48 h-32 rounded-xl overflow-hidden flex-shrink-0">
              {freePromotion.games.banner_url && (
                <Image
                  src={freePromotion.games.banner_url}
                  alt={freePromotion.games.title}
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                <Badge className="bg-accent/20 text-accent border-accent/30">
                  <Gift className="h-3 w-3 mr-1" /> Free This Week
                </Badge>
              </div>
              <h2 className="font-display text-2xl font-bold mb-1">{freePromotion.games.title}</h2>
              <p className="text-muted-foreground text-sm mb-3 line-clamp-1">
                {freePromotion.games.description}
              </p>
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <span className="text-lg text-muted-foreground line-through">
                  ${freePromotion.original_price}
                </span>
                <span className="text-2xl font-bold text-accent">FREE</span>
                <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/80">
                  <Link href="/free">
                    Claim Now <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
            <CountdownTimer endDate={freePromotion.end_date} />
          </div>
        </section>
      )}

      {/* Discovery Queue CTA */}
      <section>
        <Link href="/discover" className="block group">
          <Card className="relative overflow-hidden border-primary/30 hover:border-primary/50 transition-all">
            <div className="absolute inset-0 grid-pattern opacity-30" />
            <div className="absolute inset-0 radial-gradient" />
            <div className="relative flex items-center gap-6 p-6 sm:p-8">
              <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Search className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl font-bold mb-1">Start Your Discovery Queue</h2>
                <p className="text-muted-foreground text-sm">
                  We&apos;ll show you games one at a time. Wishlist what you love, skip what you don&apos;t.
                </p>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </Card>
        </Link>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Games', value: stats.games, icon: Gamepad2 },
          { label: 'Members', value: stats.users, icon: Users },
          { label: 'Active Listings', value: stats.listings, icon: ShoppingBag },
          { label: 'Tradable Vault', value: '100%', icon: Wallet, isText: true },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 flex flex-col items-center text-center">
            <stat.icon className="h-6 w-6 text-primary mb-2" />
            <span className="text-2xl font-bold font-display">
              {stat.isText ? stat.value : (stat.value as number).toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
          </Card>
        ))}
      </section>

      {/* Horizontal Shelves */}
      {trendingGames.length > 0 && (
        <GameShelf title="Trending Now" icon={TrendingUp} games={trendingGames} />
      )}
      {newReleases.length > 0 && (
        <GameShelf title="New Releases" icon={Sparkles} games={newReleases} />
      )}

      {/* Browse by Tag */}
      <section>
        <h2 className="font-display text-2xl font-bold mb-4">Browse by Tag</h2>
        <div className="flex flex-wrap gap-2">
          {['Action', 'RPG', 'Cyberpunk', 'Horror', 'Strategy', 'Puzzle', 'Racing', 'Sci-Fi', 'Co-op', 'Open World', 'Roguelike', 'Steampunk', 'Fantasy', 'Survival'].map((tag) => (
            <Link key={tag} href={`/explore?tag=${tag.toLowerCase()}`}>
              <Badge variant="secondary" className="px-4 py-2 text-sm cursor-pointer hover:bg-primary/20 hover:text-primary transition-all">
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Rated Shelf */}
      {topRated.length > 0 && (
        <GameShelf title="Top Rated" icon={Star} games={topRated} />
      )}

      {/* Under $10 Shelf */}
      {underTen.length > 0 && (
        <GameShelf title="Under $10" icon={Zap} games={underTen} />
      )}

      {/* Featured Review */}
      {topReview && topReview.games && topReview.profiles && (
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">What Players Are Saying</h2>
          <Card className="p-6 border-primary/20">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={topReview.profiles.avatar_url || ''} />
                <AvatarFallback>{topReview.profiles.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium">{topReview.profiles.username}</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < topReview.rating ? 'text-warning fill-warning' : 'text-muted'}`}
                      />
                    ))}
                  </div>
                  <Link href={`/game/${topReview.games.slug}`}>
                    <Badge variant="secondary">{topReview.games.title}</Badge>
                  </Link>
                </div>
                {topReview.title && <h3 className="font-semibold mb-1">{topReview.title}</h3>}
                <p className="text-muted-foreground text-sm line-clamp-3">{topReview.content}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>{topReview.helpful_count} found this helpful</span>
                  <span>{formatDistanceToNow(new Date(topReview.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Creator Spotlight */}
      {featuredCreators.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">Creator Spotlight</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {featuredCreators.map((creator) => (
              <Card key={creator.id} className="p-4 flex flex-col items-center text-center hover:border-primary/30 transition-all">
                <Avatar className="h-16 w-16 mb-3">
                  <AvatarImage src={creator.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {creator.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Link href={`/profile/${creator.username}`} className="font-medium hover:text-primary">
                  {creator.display_name || creator.username}
                </Link>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{creator.bio}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{creator.followers_count} followers</span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Value Proposition */}
      <section className="grid sm:grid-cols-3 gap-6">
        <Card className="p-6 border-primary/20">
          <Wallet className="h-8 w-8 text-primary mb-3" />
          <h3 className="font-display text-lg font-bold mb-2">True Ownership</h3>
          <p className="text-sm text-muted-foreground">
            Buy a game, it&apos;s yours. Sell it back to the community when you&apos;re done. Creators earn royalties on every resale.
          </p>
        </Card>
        <Card className="p-6 border-accent/20">
          <Users className="h-8 w-8 text-accent mb-3" />
          <h3 className="font-display text-lg font-bold mb-2">Social First</h3>
          <p className="text-sm text-muted-foreground">
            Follow creators, join game jams, read devlogs, and build your collection alongside a community that gets it.
          </p>
        </Card>
        <Card className="p-6 border-success/20">
          <Search className="h-8 w-8 text-success mb-3" />
          <h3 className="font-display text-lg font-bold mb-2">Discover Smarter</h3>
          <p className="text-sm text-muted-foreground">
            Tag-based browsing, curated lists, discovery queues, and reviews from real players with real playtime.
          </p>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 pt-8 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-display font-bold mb-3 flex items-center gap-2">
              <span className="text-gradient-primary">Game</span>Vault
            </h3>
            <p className="text-sm text-muted-foreground">Own, play, trade.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/marketplace" className="hover:text-foreground">Marketplace</Link></li>
              <li><Link href="/explore" className="hover:text-foreground">Browse Games</Link></li>
              <li><Link href="/discover" className="hover:text-foreground">Discovery Queue</Link></li>
              <li><Link href="/jams" className="hover:text-foreground">Game Jams</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Community</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/feed" className="hover:text-foreground">Feed</Link></li>
              <li><Link href="/creators" className="hover:text-foreground">Creators</Link></li>
              <li><Link href="/curators" className="hover:text-foreground">Curators</Link></li>
              <li><Link href="/free" className="hover:text-foreground">Free Games</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/vault" className="hover:text-foreground">My Vault</Link></li>
              <li><Link href="/orders" className="hover:text-foreground">Orders</Link></li>
              <li><Link href="/settings" className="hover:text-foreground">Settings</Link></li>
              <li><Link href="/login" className="hover:text-foreground">Sign In</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/40 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} GameVault. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for gamers, by gamers.
          </p>
        </div>
      </footer>
    </div>
  )
}

function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = new Date(endDate).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('Expired')
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setTimeLeft(`${days}d ${hours}h ${minutes}m`)
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [endDate])

  return (
    <div className="flex flex-col items-center sm:items-end">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">Ends in</span>
      <span className="text-lg font-bold text-accent tabular-nums">{timeLeft}</span>
    </div>
  )
}

function GameShelf({ title, icon: Icon, games }: { title: string; icon: React.ElementType; games: Game[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -400 : 400
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Icon className="h-6 w-6 text-primary" />
          {title}
        </h2>
        <div className="flex gap-1">
          <button onClick={() => scroll('left')} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-all">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => scroll('right')} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-all">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="shelf-scroll">
        {games.map((game) => (
          <Link key={game.id} href={`/game/${game.slug}`} className="game-card w-64 group">
            <div className="relative h-36 overflow-hidden">
              {game.cover_url && (
                <Image
                  src={game.cover_url}
                  alt={game.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="256px"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
              {game.rating_count > 0 && (
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-xs">
                  <Star className="h-3 w-3 text-warning fill-warning" />
                  <span>{game.rating_average.toFixed(1)}</span>
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">{game.title}</h3>
              <p className="text-xs text-muted-foreground truncate">{game.developer}</p>
              <div className="flex items-center justify-between mt-2">
                <Badge variant="secondary" className="text-xs">{game.genre}</Badge>
                {game.price === 0 ? (
                  <span className="text-sm font-bold text-accent">FREE</span>
                ) : (
                  <span className="text-sm font-bold text-primary">${game.price}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
