'use client'

import { useEffect, useState } from 'react'
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  ShoppingBag,
  ArrowRight,
  Star,
  ChevronRight,
  Home,
  Package,
  Check,
  Wallet,
} from 'lucide-react'

interface CreatorProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  is_creator: boolean
  is_verified: boolean
}

interface BundleGame {
  id: string
  title: string
  slug: string
  cover_url: string | null
  price: number
  developer: string | null
  genre: string | null
  rating_average: number
  rating_count: number
  downloads_count: number
  is_resellable: boolean
}

interface BundleWithGames {
  id: string
  title: string
  slug: string
  description: string | null
  price: number
  cover_url: string | null
  creator_id: string
  is_active: boolean
  created_at: string
  profiles: CreatorProfile | null
  bundle_games: {
    id: string
    games: BundleGame
  }[]
}

export default function BundlesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [bundles, setBundles] = useState<BundleWithGames[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)

  useEffect(() => {
    fetchBundles()
  }, [])

  const fetchBundles = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bundles')
        .select(
          `
          id, title, slug, description, price, cover_url, creator_id, is_active, created_at,
          profiles:creator_id (
            id, username, display_name, avatar_url, is_creator, is_verified
          ),
          bundle_games (
            id,
            games:game_id (
              id, title, slug, cover_url, price, developer, genre,
              rating_average, rating_count, downloads_count, is_resellable
            )
          )
        `
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setBundles((data as unknown as BundleWithGames[]) || [])
    } catch {
      toast.error('Failed to load bundles. Please try again.')
      setBundles([])
    } finally {
      setLoading(false)
    }
  }

  const handleGetBundle = async (bundle: BundleWithGames) => {
    if (authLoading) return

    if (!user) {
      toast.info('Please sign in to purchase this bundle.')
      router.push('/login')
      return
    }

    const games = bundle.bundle_games.map((bg) => bg.games).filter(Boolean)
    if (games.length === 0) {
      toast.error('This bundle has no games available.')
      return
    }

    setPurchasingId(bundle.id)

    try {
      // Check which games the user already owns
      const gameIds = games.map((g) => g.id)
      const { data: existingAssets, error: ownedError } = await supabase
        .from('owned_assets')
        .select('game_id')
        .eq('user_id', user.id)
        .in('game_id', gameIds)

      if (ownedError) throw ownedError

      const ownedGameIds = new Set((existingAssets || []).map((a) => a.game_id))
      const gamesToOwn = games.filter((g) => !ownedGameIds.has(g.id))

      // Create one order for the bundle
      const bundlePrice = Number(bundle.price)
      const platformFee = bundlePrice * 0.1
      const { error: orderError } = await supabase.from('orders').insert({
        buyer_id: user.id,
        seller_id: bundle.creator_id,
        listing_id: null,
        game_id: null,
        order_type: 'bundle',
        status: 'completed',
        total_amount: bundlePrice,
        platform_fee: platformFee,
        royalty_amount: 0,
        seller_amount: bundlePrice - platformFee,
        completed_at: new Date().toISOString(),
      })

      if (orderError) throw orderError

      // Create owned_assets for games not already owned
      if (gamesToOwn.length > 0) {
        const assetInserts = gamesToOwn.map((game) => ({
          user_id: user.id,
          game_id: game.id,
          asset_id: crypto.randomUUID(),
          purchase_price: 0, // Included in bundle — no individual charge
          is_installed: false,
          is_listed: false,
          play_time_hours: 0,
        }))

        const { error: assetError } = await supabase
          .from('owned_assets')
          .insert(assetInserts)

        if (assetError) throw assetError
      }

      const alreadyOwnedCount = games.length - gamesToOwn.length
      const successMsg =
        alreadyOwnedCount > 0
          ? `Bundle purchased! ${gamesToOwn.length} new game${
              gamesToOwn.length !== 1 ? 's' : ''
            } added to your vault (${alreadyOwnedCount} already owned).`
          : `Bundle purchased! ${gamesToOwn.length} game${
              gamesToOwn.length !== 1 ? 's' : ''
            } added to your vault.`

      toast.success(successMsg)
      router.push('/vault')
    } catch {
      toast.error('Failed to purchase bundle. Please try again.')
    } finally {
      setPurchasingId(null)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Bundles</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Game Bundles</h1>
              <p className="text-muted-foreground">
                Grab curated collections of games at unbeatable prices
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="vault-card overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : bundles.length === 0 ? (
          /* Empty state */
          <Card className="bg-card/50 border-border/50 p-12 text-center max-w-lg mx-auto">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6 mx-auto">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No bundles available</h2>
            <p className="text-muted-foreground mb-8">
              There are no active game bundles right now. Check back later for
              great deals on curated game collections!
            </p>
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Link href="/marketplace">
                Browse Marketplace
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </Card>
        ) : (
          /* Bundles grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bundles.map((bundle) => (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                onPurchase={handleGetBundle}
                isPurchasing={purchasingId === bundle.id}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function BundleCard({
  bundle,
  onPurchase,
  isPurchasing,
}: {
  bundle: BundleWithGames
  onPurchase: (bundle: BundleWithGames) => void
  isPurchasing: boolean
}) {
  const games = bundle.bundle_games.map((bg) => bg.games).filter(Boolean)
  const individualTotal = games.reduce((sum, g) => sum + Number(g.price), 0)
  const bundlePrice = Number(bundle.price)
  const savings =
    individualTotal > 0
      ? Math.round(((individualTotal - bundlePrice) / individualTotal) * 100)
      : 0
  const creator = bundle.profiles

  return (
    <Card className="vault-card overflow-hidden flex flex-col">
      {/* Cover image */}
      <div className="relative h-48 sm:h-56 overflow-hidden">
        <Image
          src={
            bundle.cover_url ||
            'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg'
          }
          alt={bundle.title}
          fill
          className="object-cover transition-transform duration-300 hover:scale-105"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Savings badge */}
        {savings > 0 && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-success text-success-foreground text-base font-bold px-3 py-1 shadow-lg">
              {savings}% OFF
            </Badge>
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-lg">
            {bundle.title}
          </h2>
          {creator && (
            <Link
              href={`/profile/${creator.username}`}
              className="text-sm text-white/80 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>by {creator.display_name || creator.username}</span>
              {creator.is_verified && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </Link>
          )}
        </div>
      </div>

      <CardContent className="p-5 flex-1 flex flex-col">
        {/* Description */}
        {bundle.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {bundle.description}
          </p>
        )}

        {/* Game count + included games */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {games.length} game{games.length !== 1 ? 's' : ''} included
            </span>
          </div>

          {/* Game thumbnails list */}
          {games.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {games.slice(0, 6).map((game) => (
                <Link
                  key={game.id}
                  href={`/game/${game.slug}`}
                  className="group relative"
                  title={game.title}
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted border border-border/50">
                    <Image
                      src={
                        game.cover_url ||
                        'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg'
                      }
                      alt={game.title}
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-110"
                      sizes="56px"
                    />
                  </div>
                </Link>
              ))}
              {games.length > 6 && (
                <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground font-medium">
                  +{games.length - 6}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Price comparison */}
        <div className="bg-muted/30 rounded-lg p-4 mb-4 border border-border/30">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Individual price
              </p>
              <p className="text-lg text-muted-foreground line-through">
                ${individualTotal.toFixed(2)}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground mb-1" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Bundle price</p>
              <p className="text-3xl font-bold text-primary">
                ${bundlePrice.toFixed(2)}
              </p>
            </div>
          </div>
          {savings > 0 && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30">
              <Wallet className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">
                You save ${(individualTotal - bundlePrice).toFixed(2)} ({savings}%)
              </span>
            </div>
          )}
        </div>

        {/* Included games list with prices */}
        {games.length > 0 && (
          <div className="mb-4 space-y-2 max-h-32 overflow-y-auto pr-1">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/game/${game.slug}`}
                className="flex items-center gap-3 group"
              >
                <div className="relative w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={
                      game.cover_url ||
                      'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg'
                    }
                    alt={game.title}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {game.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {game.genre && <span>{game.genre}</span>}
                    {game.rating_count > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 text-warning fill-warning" />
                        {Number(game.rating_average).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground line-through flex-shrink-0">
                  ${Number(game.price).toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Get Bundle button */}
        <div className="mt-auto pt-2">
          <Button
            onClick={() => onPurchase(bundle)}
            disabled={isPurchasing}
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            {isPurchasing ? (
              <>
                <span className="animate-pulse">Processing...</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Get Bundle
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
            <Check className="h-3 w-3" />
            Instant delivery to your vault
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
