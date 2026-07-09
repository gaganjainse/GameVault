'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { AppLayout } from '@/components/layout'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Gift,
  Clock,
  Star,
  ArrowRight,
  Check,
  Home,
  ChevronRight,
  Sparkles,
  Download,
} from 'lucide-react'
import { Game } from '@/lib/types/database'

interface FreePromotion {
  id: string
  game_id: string
  start_date: string
  end_date: string
  original_price: number | null
  is_active: boolean
  created_at: string
  games: Game
}

interface PastPromotion extends FreePromotion {}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  expired: boolean
}

function getTimeRemaining(endDate: string): TimeRemaining {
  const now = Date.now()
  const end = new Date(endDate).getTime()
  const diff = end - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, expired: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes, expired: false }
}

export default function FreeGamesPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [activePromo, setActivePromo] = useState<FreePromotion | null>(null)
  const [pastPromos, setPastPromos] = useState<PastPromotion[]>([])
  const [allFreeGames, setAllFreeGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [owned, setOwned] = useState(false)
  const [checkingOwnership, setCheckingOwnership] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    expired: false,
  })

  // Fetch active and past promotions
  const fetchPromotions = useCallback(async () => {
    setLoading(true)

    const nowIso = new Date().toISOString()

    // Active promotion: is_active = true AND end_date > now
    const { data: activeData, error: activeError } = await supabase
      .from('free_game_promotions')
      .select('*, games(*)')
      .eq('is_active', true)
      .gt('end_date', nowIso)
      .order('end_date', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (activeError) {
      toast.error('Failed to load free game promotion.')
      console.error(activeError)
    } else if (activeData) {
      setActivePromo(activeData as FreePromotion)
    } else {
      setActivePromo(null)
    }

    // Past promotions: end_date < now, ordered most recent first
    const { data: pastData, error: pastError } = await supabase
      .from('free_game_promotions')
      .select('*, games(*)')
      .lt('end_date', nowIso)
      .order('end_date', { ascending: false })
      .limit(12)

    if (pastError) {
      console.error(pastError)
    } else if (pastData) {
      setPastPromos(pastData as PastPromotion[])
    }

    // All free games (price = 0) — not tied to the promotion system
    const { data: freeGamesData, error: freeGamesError } = await supabase
      .from('games')
      .select('*')
      .eq('price', 0)
      .eq('is_active', true)
      .order('downloads_count', { ascending: false })

    if (freeGamesError) {
      console.error(freeGamesError)
    } else if (freeGamesData) {
      setAllFreeGames(freeGamesData as Game[])
    }

    setLoading(false)
  }, [])

  // Check ownership of the active promo game
  const checkOwnership = useCallback(async () => {
    if (!user || !activePromo) {
      setOwned(false)
      setCheckingOwnership(false)
      return
    }

    const { data, error } = await supabase
      .from('owned_assets')
      .select('id')
      .eq('user_id', user.id)
      .eq('game_id', activePromo.game_id)
      .maybeSingle()

    if (error) {
      console.error(error)
    }

    setOwned(!!data)
    setCheckingOwnership(false)
  }, [user, activePromo])

  useEffect(() => {
    fetchPromotions()
  }, [fetchPromotions])

  useEffect(() => {
    checkOwnership()
  }, [checkOwnership])

  // Countdown timer — update every minute
  useEffect(() => {
    if (!activePromo) return

    const update = () => {
      setTimeRemaining(getTimeRemaining(activePromo.end_date))
    }

    update()
    const interval = setInterval(update, 60_000)

    return () => clearInterval(interval)
  }, [activePromo])

  // Claim the free game
  const handleClaim = async () => {
    if (!user) {
      toast.info('Sign in to claim your free game.')
      router.push('/login')
      return
    }

    if (!activePromo) return

    setClaiming(true)

    try {
      // Double-check ownership before claiming
      const { data: existing } = await supabase
        .from('owned_assets')
        .select('id')
        .eq('user_id', user.id)
        .eq('game_id', activePromo.game_id)
        .maybeSingle()

      if (existing) {
        setOwned(true)
        toast.info('You already own this game.')
        setClaiming(false)
        return
      }

      const gameId = activePromo.game_id
      const slug = activePromo.games.slug.toUpperCase()
      const assetId = `GV-${slug}-${Date.now().toString(36).toUpperCase()}`

      // Create order with total_amount 0
      const { error: orderError } = await supabase.from('orders').insert({
        buyer_id: user.id,
        game_id: gameId,
        order_type: 'free_promotion',
        status: 'completed',
        total_amount: 0,
        platform_fee: 0,
        royalty_amount: 0,
        seller_amount: 0,
      })

      if (orderError) {
        toast.error('Failed to create order. Please try again.')
        console.error(orderError)
        setClaiming(false)
        return
      }

      // Create owned asset with purchase_price 0
      const { error: assetError } = await supabase.from('owned_assets').insert({
        user_id: user.id,
        game_id: gameId,
        asset_id: assetId,
        purchase_price: 0,
        purchase_date: new Date().toISOString(),
      })

      if (assetError) {
        toast.error('Failed to add game to your vault.')
        console.error(assetError)
        setClaiming(false)
        return
      }

      setOwned(true)
      toast.success(`${activePromo.games.title} added to your vault — enjoy!`)
    } catch (err) {
      toast.error('Something went wrong while claiming.')
      console.error(err)
    } finally {
      setClaiming(false)
    }
  }

  const originalPrice = activePromo?.original_price ?? activePromo?.games.price ?? 0

  // Free games (price = 0) that aren't already shown via the promotion hero/archive
  const promoGameIds = new Set<string>()
  if (activePromo) promoGameIds.add(activePromo.game_id)
  pastPromos.forEach((p) => promoGameIds.add(p.game_id))
  const visibleFreeGames = allFreeGames.filter((g) => !promoGameIds.has(g.id))

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground flex items-center gap-1">
            <Home className="h-3 w-3" /> Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground flex items-center gap-1">
            <Gift className="h-3 w-3" /> Free Games
          </span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-accent/15 border border-accent/30 neon-glow-accent">
            <Gift className="h-7 w-7 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display flex items-center gap-2">
              Free Games
              <Sparkles className="h-6 w-6 text-accent" />
            </h1>
            <p className="text-muted-foreground">Claim free games every week — yours to keep forever.</p>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="space-y-8">
            {/* Hero skeleton */}
            <Card className="bg-card/50 border-border/50 overflow-hidden">
              <Skeleton className="h-64 md:h-80 w-full" />
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-6 w-40" />
                </div>
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-3 pt-2">
                  <Skeleton className="h-12 w-40" />
                  <Skeleton className="h-12 w-32" />
                </div>
              </CardContent>
            </Card>

            {/* Archive skeleton */}
            <div>
              <Skeleton className="h-7 w-48 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="game-card overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-9 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* All Free Games skeleton */}
            <div>
              <Skeleton className="h-7 w-40 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="game-card overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-9 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : !activePromo ? (
          /* No active promotion */
          <Card className="bg-card/50 border-border/50 p-16 text-center">
            <div className="inline-flex p-4 rounded-xl bg-accent/10 border border-accent/20 mb-4">
              <Gift className="h-12 w-12 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Free Game Right Now</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              There&apos;s no active free game promotion at the moment. Check back soon — we give away games regularly!
            </p>
            <Button asChild className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <Link href="/marketplace">
                Browse Marketplace <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-12">
            {/* Hero — Current Free Game */}
            <Card className="relative overflow-hidden border-accent/30 bg-card/60 animate-fade-in-up">
              {/* Banner image */}
              <div className="relative h-64 md:h-80 w-full">
                {activePromo.games.banner_url ? (
                  <Image
                    src={activePromo.games.banner_url}
                    alt={activePromo.games.title}
                    fill
                    priority
                    className="object-cover"
                    sizes="100vw"
                  />
                ) : activePromo.games.cover_url ? (
                  <Image
                    src={activePromo.games.cover_url}
                    alt={activePromo.games.title}
                    fill
                    priority
                    className="object-cover"
                    sizes="100vw"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent" />

                {/* FREE badge */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <Badge className="text-lg font-extrabold px-4 py-1.5 bg-accent text-accent-foreground neon-glow-accent">
                    <Gift className="h-4 w-4 mr-1.5" /> FREE
                  </Badge>
                  {activePromo.games.genre && (
                    <Badge variant="outline" className="bg-background/70 backdrop-blur">
                      {activePromo.games.genre}
                    </Badge>
                  )}
                </div>

                {/* Countdown overlay */}
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-background/80 backdrop-blur border border-border/60">
                  <Clock className="h-4 w-4 text-accent" />
                  <div className="flex items-center gap-2 text-sm">
                    {!timeRemaining.expired ? (
                      <>
                        {timeRemaining.days > 0 && (
                          <span className="font-mono font-semibold">
                            {timeRemaining.days}
                            <span className="text-muted-foreground text-xs ml-0.5">d</span>
                          </span>
                        )}
                        <span className="font-mono font-semibold">
                          {String(timeRemaining.hours).padStart(2, '0')}
                          <span className="text-muted-foreground text-xs ml-0.5">h</span>
                        </span>
                        <span className="font-mono font-semibold">
                          {String(timeRemaining.minutes).padStart(2, '0')}
                          <span className="text-muted-foreground text-xs ml-0.5">m</span>
                        </span>
                      </>
                    ) : (
                      <span className="text-destructive font-semibold">Expired</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Body */}
              <CardContent className="p-6 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left — title & description */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl md:text-4xl font-bold font-display">
                        {activePromo.games.title}
                      </h2>
                      {activePromo.games.rating_count > 0 && (
                        <Badge variant="outline" className="text-warning border-warning/50">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          {activePromo.games.rating_average.toFixed(1)}
                        </Badge>
                      )}
                    </div>

                    {activePromo.games.developer && (
                      <p className="text-muted-foreground">
                        by{' '}
                        <span className="text-foreground font-medium">{activePromo.games.developer}</span>
                        {activePromo.games.publisher && activePromo.games.publisher !== activePromo.games.developer && (
                          <> · {activePromo.games.publisher}</>
                        )}
                      </p>
                    )}

                    <p className="text-muted-foreground leading-relaxed line-clamp-4">
                      {activePromo.games.description || 'No description available for this game.'}
                    </p>

                    {/* Price display */}
                    <div className="flex items-center gap-3">
                      {originalPrice > 0 && (
                        <span className="text-xl text-muted-foreground line-through">
                          ${originalPrice.toFixed(2)}
                        </span>
                      )}
                      <span className="text-3xl font-display font-extrabold text-accent">FREE</span>
                      {originalPrice > 0 && (
                        <Badge variant="outline" className="border-accent/50 text-accent">
                          100% OFF
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Right — claim card */}
                  <div className="lg:col-span-1">
                    <div className="rounded-xl border border-border/60 bg-secondary/40 p-5 space-y-4 h-full flex flex-col">
                      <div className="text-center">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                          Limited Time Offer
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-accent" />
                          {!timeRemaining.expired ? (
                            <span>
                              {timeRemaining.days > 0 && `${timeRemaining.days}d `}
                              {String(timeRemaining.hours).padStart(2, '0')}h{' '}
                              {String(timeRemaining.minutes).padStart(2, '0')}m remaining
                            </span>
                          ) : (
                            <span className="text-destructive">This offer has expired</span>
                          )}
                        </div>
                      </div>

                      {owned ? (
                        <div className="space-y-3">
                          <Badge className="w-full justify-center py-2.5 text-sm bg-success/20 text-success">
                            <Check className="h-4 w-4 mr-2" /> Owned
                          </Badge>
                          <Button asChild variant="outline" className="w-full">
                            <Link href="/vault">
                              View in Vault <ArrowRight className="h-4 w-4 ml-2" />
                            </Link>
                          </Button>
                        </div>
                      ) : checkingOwnership ? (
                        <Skeleton className="h-12 w-full" />
                      ) : (
                        activePromo.games.download_url && !claiming && !timeRemaining.expired ? (
                          <Button asChild className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 text-lg py-6">
                            <a
                              href={activePromo.games.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={handleClaim}
                            >
                              <Gift className="h-5 w-5 mr-2" />
                              Claim Now
                            </a>
                          </Button>
                        ) : (
                          <Button
                            className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 text-lg py-6"
                            onClick={handleClaim}
                            disabled={claiming || timeRemaining.expired}
                          >
                            <Gift className="h-5 w-5 mr-2" />
                            {claiming ? 'Claiming...' : timeRemaining.expired ? 'Expired' : 'Claim Now'}
                          </Button>
                        )
                      )}

                      {!user && !owned && !checkingOwnership && (
                        <p className="text-xs text-center text-muted-foreground">
                          <Link href="/login" className="text-accent hover:underline">Sign in</Link> to claim this free game.
                        </p>
                      )}

                      <div className="space-y-2 text-xs text-muted-foreground pt-2 border-t border-border/40">
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-accent" />
                          <span>Yours to keep forever</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-accent" />
                          <span>Added to your vault instantly</span>
                        </div>
                        {activePromo.games.is_resellable && (
                          <div className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-accent" />
                            <span>Resellable on the secondary market</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Past Free Games Archive */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold font-display flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Past Free Games
                </h2>
                <span className="text-sm text-muted-foreground">{pastPromos.length} giveaways</span>
              </div>

              {pastPromos.length === 0 ? (
                <Card className="bg-card/50 border-border/50 p-12 text-center">
                  <Gift className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No past giveaways yet</h3>
                  <p className="text-muted-foreground">Past free game promotions will appear here.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {pastPromos.map((promo) => (
                    <PastPromoCard key={promo.id} promo={promo} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Free Games — every free game on the platform, not just promoted ones */}
        {!loading && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold font-display flex items-center gap-2">
                <Download className="h-5 w-5 text-accent" />
                All Free Games
              </h2>
              <span className="text-sm text-muted-foreground">{visibleFreeGames.length} free games</span>
            </div>

            {visibleFreeGames.length === 0 ? (
              <Card className="bg-card/50 border-border/50 p-12 text-center">
                <Gift className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No free games available</h3>
                <p className="text-muted-foreground">Free games will appear here as they&apos;re added to the platform.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visibleFreeGames.map((game) => (
                  <FreeGameCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function PastPromoCard({ promo }: { promo: PastPromotion }) {
  const game = promo.games

  return (
    <Link href={`/game/${game.slug}`} className="group">
      <Card className="game-card overflow-hidden h-full flex flex-col">
        {/* Cover image */}
        <div className="relative aspect-video overflow-hidden">
          {game.cover_url ? (
            <Image
              src={game.cover_url}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full bg-secondary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Expired badge */}
          <Badge variant="outline" className="absolute top-3 left-3 bg-background/70 backdrop-blur text-muted-foreground border-border/60">
            <Clock className="h-3 w-3 mr-1" /> Expired
          </Badge>

          {/* Original price */}
          {promo.original_price != null && promo.original_price > 0 && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/70 backdrop-blur">
              <span className="text-xs text-muted-foreground line-through">${promo.original_price.toFixed(2)}</span>
              <span className="text-xs font-bold text-accent">FREE</span>
            </div>
          )}
        </div>

        <CardContent className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold line-clamp-1 group-hover:text-accent transition-colors">{game.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{game.developer}</p>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            {game.genre && <Badge variant="secondary" className="text-xs">{game.genre}</Badge>}
            {game.rating_count > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-warning fill-warning" />
                {game.rating_average.toFixed(1)}
              </span>
            )}
          </div>

          <Button variant="outline" size="sm" className="mt-auto w-full">
            View Game <ArrowRight className="h-3.5 w-3.5 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}

function FreeGameCard({ game }: { game: Game }) {
  const downloadUrl = game.download_url

  return (
    <Card className="game-card group overflow-hidden h-full flex flex-col">
      {/* Cover image */}
      <div className="relative aspect-video overflow-hidden">
        {game.cover_url ? (
          <Image
            src={game.cover_url}
            alt={game.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full bg-secondary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">
          <Gift className="h-3 w-3 mr-1" /> FREE
        </Badge>
      </div>

      <CardContent className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold line-clamp-1">{game.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{game.developer}</p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          {game.genre && <Badge variant="secondary" className="text-xs">{game.genre}</Badge>}
          {game.rating_count > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-warning fill-warning" />
              {game.rating_average.toFixed(1)}
            </span>
          )}
        </div>

        {downloadUrl ? (
          <Button asChild size="sm" className="mt-auto w-full bg-accent hover:opacity-90 text-accent-foreground">
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-3.5 w-3.5 mr-2" /> Download Free
            </a>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="mt-auto w-full">
            <Link href={`/game/${game.slug}`}>
              <Gift className="h-3.5 w-3.5 mr-2" /> Play Now <ArrowRight className="h-3.5 w-3.5 ml-2" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
