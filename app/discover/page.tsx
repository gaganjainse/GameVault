'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AppLayout } from '@/components/layout'
import {
  Search,
  Heart,
  X,
  Check,
  ChevronRight,
  Sparkles,
  Star,
  Gamepad2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'
import type { Game } from '@/lib/types/database'

const QUEUE_SIZE = 20

type QueueStatus = 'pending' | 'wishlisted' | 'not_interested' | 'viewed' | 'purchased'

interface QueueResult {
  game: Game
  status: QueueStatus
}

export default function DiscoverPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [queue, setQueue] = useState<Game[]>([])
  const [results, setResults] = useState<QueueResult[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [completed, setCompleted] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [authLoading, user, router])

  const fetchQueue = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setCompleted(false)
    setCurrentIndex(0)
    setResults([])

    try {
      // Gather game ids the user has already interacted with.
      const [ownedRes, wishlistRes, queueRes] = await Promise.all([
        supabase.from('owned_assets').select('game_id').eq('user_id', user.id),
        supabase.from('wishlist').select('game_id').eq('user_id', user.id),
        supabase
          .from('discovery_queue_items')
          .select('game_id, status')
          .eq('user_id', user.id)
          .neq('status', 'pending'),
      ])

      if (ownedRes.error) throw ownedRes.error
      if (wishlistRes.error) throw wishlistRes.error
      if (queueRes.error) throw queueRes.error

      const excludeIds = new Set<string>()
      ownedRes.data?.forEach((r) => r.game_id && excludeIds.add(r.game_id))
      wishlistRes.data?.forEach((r) => r.game_id && excludeIds.add(r.game_id))
      queueRes.data?.forEach((r) => r.game_id && excludeIds.add(r.game_id))

      // Fetch active games ordered by rating, excluding interacted ones.
      let query = supabase
        .from('games')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('rating_average', { ascending: false })
        .order('downloads_count', { ascending: false })
        .limit(QUEUE_SIZE * 2) // over-fetch to allow for exclusions

      if (excludeIds.size > 0) {
        query = query.not('id', 'in', `(${Array.from(excludeIds).join(',')})`)
      }

      const { data: games, error } = await query
      if (error) throw error

      const picked = (games as Game[]).slice(0, QUEUE_SIZE)

      if (picked.length === 0) {
        toast.info('No new games to discover right now. Check back later!')
        setQueue([])
        setCompleted(true)
        return
      }

      setQueue(picked)

      // Seed pending discovery_queue_items so this queue session is recorded.
      const rows = picked.map((g) => ({
        user_id: user.id,
        game_id: g.id,
        status: 'pending' as QueueStatus,
      }))

      // Upsert in case a (user, game) row already exists from a prior session.
      const { error: seedError } = await supabase
        .from('discovery_queue_items')
        .upsert(rows, { onConflict: 'user_id,game_id' })

      if (seedError) {
        // Non-fatal: the queue still works without pre-seeding.
        console.warn('Could not seed discovery queue items:', seedError.message)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load your discovery queue'
      toast.error(message)
      setQueue([])
      setCompleted(true)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchQueue()
    }
  }, [user, fetchQueue])

  const recordAction = async (game: Game, status: QueueStatus) => {
    if (!user) return
    const { error } = await supabase
      .from('discovery_queue_items')
      .upsert(
        {
          user_id: user.id,
          game_id: game.id,
          status,
          acted_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,game_id' }
      )
    if (error) throw error
  }

  const advance = () => {
    setResults((prev) => [...prev])
    setCurrentIndex((prev) => {
      const next = prev + 1
      if (next >= queue.length) {
        setCompleted(true)
        return prev
      }
      return next
    })
  }

  const handleAction = async (status: QueueStatus) => {
    if (acting || loading || completed) return
    const game = queue[currentIndex]
    if (!game) return

    setActing(true)
    try {
      if (status === 'wishlisted') {
        // Insert into wishlist (ignore duplicate conflicts).
        const { error: wishError } = await supabase
          .from('wishlist')
          .upsert(
            { user_id: user!.id, game_id: game.id },
            { onConflict: 'user_id,game_id' }
          )
        if (wishError) throw wishError
        toast.success(`Added "${game.title}" to your wishlist`)
      } else if (status === 'not_interested') {
        toast(`Marked "${game.title}" as not interested`)
      } else {
        toast(`Moved on from "${game.title}"`)
      }

      await recordAction(game, status)
      setResults((prev) => [...prev, { game, status }])
      advance()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    } finally {
      setActing(false)
    }
  }

  const handleSkipAll = async () => {
    if (acting || loading || completed) return
    if (!user) return
    const remaining = queue.slice(currentIndex)
    if (remaining.length === 0) return

    setActing(true)
    try {
      const rows = remaining.map((g) => ({
        user_id: user.id,
        game_id: g.id,
        status: 'viewed' as QueueStatus,
        acted_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('discovery_queue_items')
        .upsert(rows, { onConflict: 'user_id,game_id' })
      if (error) throw error

      setResults((prev) => [
        ...prev,
        ...remaining.map((g) => ({ game: g, status: 'viewed' as QueueStatus })),
      ])
      setCompleted(true)
      toast.info(`Skipped ${remaining.length} remaining games`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not skip all games'
      toast.error(message)
    } finally {
      setActing(false)
    }
  }

  const startNewQueue = () => {
    fetchQueue()
  }

  // ---- Derived values ----
  const currentGame = queue[currentIndex]
  const progress = queue.length > 0 ? (currentIndex / queue.length) * 100 : 0
  const wishlistedCount = results.filter((r) => r.status === 'wishlisted').length
  const skippedCount = results.filter(
    (r) => r.status === 'not_interested' || r.status === 'viewed'
  ).length

  const formatPrice = (price: number) =>
    price === 0 ? 'Free to Play' : `$${price.toFixed(2)}`

  const renderStars = (rating: number) => {
    const rounded = Math.round(rating)
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i < rounded
            ? 'fill-warning text-warning'
            : 'fill-none text-muted-foreground/40'
        }`}
      />
    ))
  }

  // ---- Loading state ----
  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold gradient-text">Discovery Queue</h1>
              <p className="text-sm text-muted-foreground">
                Finding games you might love...
              </p>
            </div>
          </div>
          <div className="game-card overflow-hidden">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="space-y-4 p-6">
              <Skeleton className="h-7 w-2/3" />
              <div className="flex gap-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ---- Completion / summary screen ----
  if (completed) {
    return (
      <AppLayout>
        <div className="mx-auto flex max-w-2xl flex-col items-center pt-10 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 radial-gradient blur-2xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20 neon-glow">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
          </div>

          <h1 className="mb-2 text-3xl font-bold gradient-text">
            Queue Complete!
          </h1>
          <p className="mb-8 max-w-md text-muted-foreground">
            You&apos;ve made it through your discovery queue. Here&apos;s how it
            went down.
          </p>

          <div className="mb-8 grid w-full grid-cols-2 gap-4">
            <Card className="game-card">
              <CardContent className="flex flex-col items-center p-6">
                <Heart className="mb-2 h-8 w-8 text-accent" />
                <span className="text-3xl font-bold text-foreground">
                  {wishlistedCount}
                </span>
                <span className="text-sm text-muted-foreground">Wishlisted</span>
              </CardContent>
            </Card>
            <Card className="game-card">
              <CardContent className="flex flex-col items-center p-6">
                <X className="mb-2 h-8 w-8 text-muted-foreground" />
                <span className="text-3xl font-bold text-foreground">
                  {skippedCount}
                </span>
                <span className="text-sm text-muted-foreground">Skipped</span>
              </CardContent>
            </Card>
          </div>

          {queue.length === 0 ? (
            <p className="mb-8 max-w-sm text-sm text-muted-foreground">
              No new games to discover right now. You&apos;ve seen everything
              available — try again later as the catalog grows!
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/vault">
              <Button size="lg" className="gap-2">
                <Heart className="h-4 w-4" />
                View Wishlist
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={startNewQueue}
              disabled={acting}
            >
              <RotateCcw className="h-4 w-4" />
              Start New Queue
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ---- No current game fallback (shouldn't usually hit) ----
  if (!currentGame) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl pt-20 text-center">
          <Gamepad2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-2 text-2xl font-bold">No games in your queue</h1>
          <p className="mb-6 text-muted-foreground">
            We couldn&apos;t build a discovery queue right now.
          </p>
          <Button onClick={startNewQueue} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </AppLayout>
    )
  }

  const excerpt =
    currentGame.description && currentGame.description.length > 240
      ? `${currentGame.description.slice(0, 240).trim()}…`
      : currentGame.description

  // ---- Main discovery view ----
  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">
                Discovery Queue
              </h1>
              <p className="text-sm text-muted-foreground">
                Rate games to personalize your recommendations
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleSkipAll}
            disabled={acting || loading}
          >
            <X className="mr-1.5 h-4 w-4" />
            Skip All
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              Game {currentIndex + 1} of {queue.length}
            </span>
            <span className="text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Game card */}
        <div key={currentGame.id} className="game-card animate-scale-in overflow-hidden">
          {/* Banner image - 16:9 */}
          <div className="relative aspect-video w-full overflow-hidden bg-secondary">
            {currentGame.banner_url || currentGame.cover_url ? (
              <Image
                src={currentGame.banner_url || currentGame.cover_url || ''}
                alt={currentGame.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 896px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-card to-accent/20">
                <Gamepad2 className="h-16 w-16 text-muted-foreground/40" />
              </div>
            )}
            {/* Gradient overlay for readability */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

            {/* Genre badge on banner */}
            {currentGame.genre && (
              <div className="absolute left-4 top-4">
                <Badge className="glass border-border/60 bg-card/60 text-foreground backdrop-blur-md">
                  {currentGame.genre}
                </Badge>
              </div>
            )}

            {/* Price badge on banner */}
            <div className="absolute right-4 top-4">
              <Badge className="border-border/60 bg-primary/80 text-primary-foreground backdrop-blur-md">
                {formatPrice(currentGame.price)}
              </Badge>
            </div>
          </div>

          {/* Game info */}
          <div className="space-y-5 p-6">
            {/* Title + developer */}
            <div>
              <h2 className="mb-1 text-2xl font-bold text-foreground">
                {currentGame.title}
              </h2>
              {currentGame.developer && (
                <p className="text-sm text-muted-foreground">
                  by{' '}
                  <span className="font-medium text-foreground/80">
                    {currentGame.developer}
                  </span>
                </p>
              )}
            </div>

            {/* Rating */}
            {currentGame.rating_count > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {renderStars(currentGame.rating_average)}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {currentGame.rating_average.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({currentGame.rating_count.toLocaleString()}{' '}
                  {currentGame.rating_count === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}

            {/* Description excerpt */}
            {excerpt && (
              <p className="leading-relaxed text-muted-foreground">{excerpt}</p>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-accent to-primary text-primary-foreground hover:opacity-90"
                onClick={() => handleAction('wishlisted')}
                disabled={acting}
              >
                <Heart className="h-5 w-5" />
                Add to Wishlist
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="gap-2"
                onClick={() => handleAction('not_interested')}
                disabled={acting}
              >
                <X className="h-5 w-5" />
                Not Interested
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={() => handleAction('viewed')}
                disabled={acting}
              >
                Next
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer hint / next peek */}
        {currentIndex + 1 < queue.length && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ArrowRight className="h-4 w-4" />
            <span>
              Next up:{' '}
              <span className="font-medium text-foreground/80">
                {queue[currentIndex + 1].title}
              </span>
            </span>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
