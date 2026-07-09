'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Users,
  Calendar,
  Shield,
  Repeat,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Monitor,
  ThumbsUp,
  Laugh,
  Plus,
  Play,
  Search,
  Home,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

type GameWithExtras = {
  id: string
  title: string
  slug: string
  description: string | null
  developer: string | null
  publisher: string | null
  cover_url: string | null
  banner_url: string | null
  genre: string | null
  release_date: string | null
  price: number
  royalty_percentage: number
  is_resellable: boolean
  downloads_count: number
  trailer_url: string | null
  rating_average: number
  rating_count: number
  is_featured: boolean
  minimum_price: number | null
}

type Screenshot = {
  id: string
  image_url: string
  caption: string | null
  sort_order: number
}

type Review = {
  id: string
  user_id: string
  rating: number
  title: string | null
  content: string | null
  is_recommended: boolean
  helpful_count: number
  funny_count: number
  playtime_hours_at_review: number
  created_at: string
  profiles: { username: string; avatar_url: string | null; display_name: string | null } | null
}

type Devlog = {
  id: string
  title: string
  content: string
  media_url: string | null
  views_count: number
  created_at: string
}

type RelatedGame = {
  id: string
  title: string
  slug: string
  cover_url: string | null
  price: number
  genre: string | null
  rating_average: number
  rating_count: number
}

export default function GameDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile } = useAuth()
  const [game, setGame] = useState<GameWithExtras | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [owned, setOwned] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [devlogs, setDevlogs] = useState<Devlog[]>([])
  const [relatedGames, setRelatedGames] = useState<RelatedGame[]>([])
  const [activeScreenshot, setActiveScreenshot] = useState(0)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, title: '', content: '', is_recommended: true })

  useEffect(() => {
    const slug = params.slug as string
    fetchGame(slug)
  }, [params.slug, user])

  const fetchGame = async (slug: string) => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      toast.error('Failed to load game')
      setLoading(false)
      return
    }

    if (!data) {
      setLoading(false)
      return
    }

    setGame(data as GameWithExtras)

    const tasks: Promise<void>[] = []

    if (user) {
      tasks.push((async () => {
        const { data: ownership } = await supabase
          .from('owned_assets')
          .select('id, play_time_hours')
          .eq('user_id', user.id)
          .eq('game_id', data.id)
          .maybeSingle()
        setOwned(!!ownership)
      })())

      tasks.push((async () => {
        const { data: wish } = await supabase
          .from('wishlist')
          .select('id')
          .eq('user_id', user.id)
          .eq('game_id', data.id)
          .maybeSingle()
        setIsWishlisted(!!wish)
      })())
    }

    tasks.push((async () => {
      const { data: shots, error: e } = await supabase
        .from('game_screenshots')
        .select('*')
        .eq('game_id', data.id)
        .order('sort_order', { ascending: true })
      if (!e && shots) setScreenshots(shots as Screenshot[])
    })())

    tasks.push((async () => {
      const { data: revData, error: e } = await supabase
        .from('game_reviews')
        .select('*, profiles(username, avatar_url, display_name)')
        .eq('game_id', data.id)
        .order('helpful_count', { ascending: false })
        .limit(10)
      if (!e && revData) setReviews(revData as Review[])
    })())

    tasks.push((async () => {
      const { data: devData, error: e } = await supabase
        .from('devlogs')
        .select('*')
        .eq('game_id', data.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (!e && devData) setDevlogs(devData as Devlog[])
    })())

    tasks.push((async () => {
      // Get related games based on shared tags
      const { data: tagMappings } = await supabase
        .from('game_tag_mappings')
        .select('tag_id')
        .eq('game_id', data.id)

      if (tagMappings && tagMappings.length > 0) {
        const tagIds = tagMappings.map(t => t.tag_id)
        const { data: relatedMappings } = await supabase
          .from('game_tag_mappings')
          .select('game_id, games(id, title, slug, cover_url, price, genre, rating_average, rating_count)')
          .in('tag_id', tagIds)
          .neq('game_id', data.id)
          .limit(6)

        if (relatedMappings) {
          const seen = new Set<string>()
          const unique = relatedMappings
            .filter((m: any) => {
              if (!m.games || seen.has(m.games.id)) return false
              seen.add(m.games.id)
              return true
            })
            .map((m: any) => m.games) as RelatedGame[]
          setRelatedGames(unique.slice(0, 6))
        }
      }
    })())

    await Promise.all(tasks)
    setLoading(false)
  }

  const handlePurchase = async () => {
    if (!user || !game) {
      router.push('/login')
      return
    }
    setPurchasing(true)

    const assetId = `GV-${game.slug.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        game_id: game.id,
        order_type: 'primary',
        status: 'completed',
        total_amount: game.price,
        platform_fee: game.price * 0.1,
        royalty_amount: game.price * (game.royalty_percentage / 100),
        seller_amount: game.price * 0.9,
      })
      .select()
      .single()

    if (orderError) {
      toast.error('Failed to create order')
      setPurchasing(false)
      return
    }

    const { error: assetError } = await supabase
      .from('owned_assets')
      .insert({
        user_id: user.id,
        game_id: game.id,
        asset_id: assetId,
        purchase_price: game.price,
        purchase_date: new Date().toISOString(),
      })

    if (assetError) {
      toast.error('Failed to add to vault')
      setPurchasing(false)
      return
    }

    setOwned(true)
    toast.success('Game added to your vault!')
    router.push('/vault')
    setPurchasing(false)
  }

  const handleAddToCart = async () => {
    if (!user || !game) {
      router.push('/login')
      return
    }
    const { error } = await supabase
      .from('cart_items')
      .insert({
        user_id: user.id,
        game_id: game.id,
        price: game.price,
        item_type: 'primary',
      })
    if (error) {
      toast.error('Failed to add to cart')
    } else {
      toast.success('Added to cart!')
    }
  }

  const handleWishlist = async () => {
    if (!user || !game) {
      router.push('/login')
      return
    }
    if (isWishlisted) {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('game_id', game.id)
      if (error) { toast.error('Failed to remove'); return }
      setIsWishlisted(false)
      toast.success('Removed from wishlist')
    } else {
      const { error } = await supabase
        .from('wishlist')
        .insert({ user_id: user.id, game_id: game.id })
      if (error) { toast.error('Failed to add'); return }
      setIsWishlisted(true)
      toast.success('Added to wishlist!')
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/game/${game?.slug}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied!')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleVote = async (reviewId: string, voteType: 'helpful' | 'funny') => {
    if (!user) { router.push('/login'); return }
    const { error } = await supabase
      .from('review_votes')
      .insert({ review_id: reviewId, user_id: user.id, vote_type: voteType })
    if (error) {
      if (error.code === '23505') {
        toast.info('You already voted on this review')
      } else {
        toast.error('Failed to vote')
      }
      return
    }
    // Optimistically update
    setReviews(prev => prev.map(r =>
      r.id === reviewId
        ? { ...r, [voteType === 'helpful' ? 'helpful_count' : 'funny_count']: r[voteType === 'helpful' ? 'helpful_count' : 'funny_count'] + 1 }
        : r
    ))
    toast.success('Vote recorded!')
  }

  const handleSubmitReview = async () => {
    if (!user || !game) return
    if (!newReview.content.trim()) {
      toast.error('Please write a review')
      return
    }
    const { data: ownership } = await supabase
      .from('owned_assets')
      .select('play_time_hours')
      .eq('user_id', user.id)
      .eq('game_id', game.id)
      .maybeSingle()

    if (!ownership) {
      toast.error('You need to own this game to review it')
      return
    }

    const { error } = await supabase
      .from('game_reviews')
      .insert({
        user_id: user.id,
        game_id: game.id,
        rating: newReview.rating,
        title: newReview.title || null,
        content: newReview.content,
        is_recommended: newReview.is_recommended,
        playtime_hours_at_review: ownership.play_time_hours || 0,
      })

    if (error) {
      if (error.code === '23505') {
        toast.error('You already reviewed this game')
      } else {
        toast.error('Failed to submit review')
      }
      return
    }

    toast.success('Review posted!')
    setReviewDialogOpen(false)
    setNewReview({ rating: 5, title: '', content: '', is_recommended: true })
    fetchGame(game.slug)
  }

  const getRatingBadge = (rating: number, count: number) => {
    const pct = (rating / 5) * 100
    if (count < 10) return { label: 'Need More Reviews', color: 'text-muted-foreground' }
    if (pct >= 95) return { label: 'Overwhelmingly Positive', color: 'text-success' }
    if (pct >= 80) return { label: 'Very Positive', color: 'text-success' }
    if (pct >= 70) return { label: 'Mostly Positive', color: 'text-primary' }
    if (pct >= 40) return { label: 'Mixed', color: 'text-warning' }
    return { label: 'Mostly Negative', color: 'text-destructive' }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-96 w-full rounded-xl mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!game) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Game not found</h1>
          <Button asChild>
            <Link href="/marketplace">Browse Marketplace</Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  const ratingBadge = getRatingBadge(game.rating_average, game.rating_count)

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/" className="hover:text-foreground flex items-center gap-1">
            <Home className="h-3 w-3" /> Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/marketplace" className="hover:text-foreground">Marketplace</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{game.title}</span>
        </nav>

        {/* Hero Banner */}
        <div className="relative h-64 md:h-96 rounded-xl overflow-hidden mb-8">
          {game.banner_url && (
            <Image
              src={game.banner_url}
              alt={game.title}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end gap-6">
              <div className="relative w-32 h-44 rounded-lg overflow-hidden shadow-xl border-2 border-border flex-shrink-0">
                {game.cover_url && (
                  <Image src={game.cover_url} alt={game.title} fill className="object-cover" sizes="128px" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-5xl font-bold mb-2 font-display">{game.title}</h1>
                <p className="text-lg text-muted-foreground mb-2">{game.developer}</p>
                <div className="flex flex-wrap gap-2">
                  {game.genre && <Badge>{game.genre}</Badge>}
                  {game.is_resellable && (
                    <Badge variant="outline" className="text-primary border-primary">
                      <Repeat className="h-3 w-3 mr-1" /> Resellable
                    </Badge>
                  )}
                  {game.rating_count > 0 && (
                    <Badge variant="outline" className={ratingBadge.color}>
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      {ratingBadge.label}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Screenshot Carousel */}
        {screenshots.length > 0 && (
          <div className="mb-8">
            <div className="relative h-48 md:h-64 rounded-xl overflow-hidden">
              <Image
                src={screenshots[activeScreenshot]?.image_url || ''}
                alt={screenshots[activeScreenshot]?.caption || game.title}
                fill
                className="object-cover"
                sizes="100vw"
              />
              {screenshots.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveScreenshot((prev) => (prev - 1 + screenshots.length) % screenshots.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/60 backdrop-blur hover:bg-background/80"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setActiveScreenshot((prev) => (prev + 1) % screenshots.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/60 backdrop-blur hover:bg-background/80"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {screenshots.map((shot, i) => (
                <button
                  key={shot.id}
                  onClick={() => setActiveScreenshot(i)}
                  className={`relative w-32 h-18 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === activeScreenshot ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <Image src={shot.image_url} alt={shot.caption || ''} fill className="object-cover" sizes="128px" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Tabs */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="about">
              <TabsList className="w-full">
                <TabsTrigger value="about" className="flex-1">About</TabsTrigger>
                <TabsTrigger value="reviews" className="flex-1">
                  Reviews {game.rating_count > 0 && `(${game.rating_count})`}
                </TabsTrigger>
                <TabsTrigger value="devlogs" className="flex-1">Devlogs</TabsTrigger>
                <TabsTrigger value="ownership" className="flex-1">Ownership</TabsTrigger>
              </TabsList>

              {/* About Tab */}
              <TabsContent value="about" className="mt-6">
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-6">
                    <p className="text-muted-foreground leading-relaxed">
                      {game.description || 'No description available for this game.'}
                    </p>
                    <Separator className="my-6" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <DetailItem icon={Gamepad2} label="Developer" value={game.developer || 'Unknown'} />
                      <DetailItem icon={Monitor} label="Publisher" value={game.publisher || 'Unknown'} />
                      <DetailItem icon={Calendar} label="Release Date" value={game.release_date ? format(new Date(game.release_date), 'MMM d, yyyy') : 'TBA'} />
                      <DetailItem icon={Users} label="Owners" value={game.downloads_count?.toLocaleString() || '0'} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-6">
                {/* Rating Summary */}
                {game.rating_count > 0 && (
                  <Card className="bg-card/50 border-border/50 mb-4">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-primary">{game.rating_average.toFixed(1)}</div>
                          <div className="flex items-center gap-1 justify-center mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < Math.round(game.rating_average) ? 'text-warning fill-warning' : 'text-muted'}`} />
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{game.rating_count} reviews</div>
                        </div>
                        <div className="flex-1">
                          <Badge className={ratingBadge.color + ' bg-current/10'}>{ratingBadge.label}</Badge>
                          {owned && (
                            <Button size="sm" className="ml-2" onClick={() => setReviewDialogOpen(true)}>
                              <Plus className="h-4 w-4 mr-1" /> Write a Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {reviews.length === 0 ? (
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-6 text-center">
                      <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
                      <p className="text-muted-foreground mb-4">
                        {owned ? 'Be the first to review this game!' : 'Own this game to write the first review!'}
                      </p>
                      {owned && (
                        <Button onClick={() => setReviewDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-1" /> Write a Review
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <Card key={review.id} className="bg-card/50 border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={review.profiles?.avatar_url || ''} />
                              <AvatarFallback>{review.profiles?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-medium text-sm">{review.profiles?.display_name || review.profiles?.username}</span>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'text-warning fill-warning' : 'text-muted'}`} />
                                  ))}
                                </div>
                                <Badge variant={review.is_recommended ? 'default' : 'destructive'} className="text-xs">
                                  {review.is_recommended ? 'Recommended' : 'Not Recommended'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {review.playtime_hours_at_review.toFixed(1)} hrs on record
                                </span>
                              </div>
                              {review.title && <h4 className="font-semibold mb-1">{review.title}</h4>}
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{review.content}</p>
                              <div className="flex items-center gap-4 mt-3">
                                <button
                                  onClick={() => handleVote(review.id, 'helpful')}
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <ThumbsUp className="h-3 w-3" /> Helpful ({review.helpful_count})
                                </button>
                                <button
                                  onClick={() => handleVote(review.id, 'funny')}
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <Laugh className="h-3 w-3" /> Funny ({review.funny_count})
                                </button>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Devlogs Tab */}
              <TabsContent value="devlogs" className="mt-6">
                {devlogs.length === 0 ? (
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">No devlogs yet for this game.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {devlogs.map((devlog) => (
                      <Card key={devlog.id} className="bg-card/50 border-border/50">
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2">{devlog.title}</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{devlog.content}</p>
                          {devlog.media_url && (
                            <div className="relative h-48 rounded-lg overflow-hidden mt-3">
                              <Image src={devlog.media_url} alt={devlog.title} fill className="object-cover" sizes="100vw" />
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span>{devlog.views_count} views</span>
                            <span>{formatDistanceToNow(new Date(devlog.created_at), { addSuffix: true })}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Ownership Tab */}
              <TabsContent value="ownership" className="mt-6">
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Digital Ownership Model</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10"><Shield className="h-5 w-5 text-primary" /></div>
                        <div>
                          <h4 className="font-medium">Verified Ownership</h4>
                          <p className="text-sm text-muted-foreground">Each purchase is recorded with a unique asset ID. Your ownership is tracked and transferable.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-accent/10"><Repeat className="h-5 w-5 text-accent" /></div>
                        <div>
                          <h4 className="font-medium">Resale Enabled</h4>
                          <p className="text-sm text-muted-foreground">
                            {game.is_resellable ? 'This game can be listed on the marketplace and sold to other players.' : 'This game cannot be resold on the secondary market.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="h-5 w-5 text-success" /></div>
                        <div>
                          <h4 className="font-medium">Royalty System</h4>
                          <p className="text-sm text-muted-foreground">On resale, the creator/publisher receives {game.royalty_percentage}% royalty automatically.</p>
                        </div>
                      </div>
                    </div>
                    <Separator className="my-6" />
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <h4 className="font-medium mb-2">Fee Breakdown</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Game Price</span><span>${game.price.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Platform Fee (10%)</span><span>${(game.price * 0.1).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Creator Royalty (on resale)</span><span>${(game.price * game.royalty_percentage / 100).toFixed(2)}</span></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* More Like This */}
            {relatedGames.length > 0 && (
              <div>
                <h3 className="font-display text-xl font-bold mb-4">More Like This</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {relatedGames.map((rel) => (
                    <Link key={rel.id} href={`/game/${rel.slug}`} className="game-card group">
                      <div className="relative h-32 overflow-hidden">
                        {rel.cover_url && (
                          <Image src={rel.cover_url} alt={rel.title} fill className="object-cover group-hover:scale-105 transition-transform" sizes="200px" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                        {rel.rating_count > 0 && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-xs">
                            <Star className="h-3 w-3 text-warning fill-warning" />
                            <span>{rel.rating_average.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-sm truncate group-hover:text-primary">{rel.title}</h4>
                        <span className="text-sm font-bold text-primary">${rel.price}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Purchase Card */}
          <div>
            <Card className="sticky top-24 bg-card/80 backdrop-blur-lg border-border/50">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="text-sm text-muted-foreground mb-1">Price</div>
                  <div className="text-4xl font-display font-bold text-primary">${game.price.toFixed(2)}</div>
                </div>

                {owned ? (
                  <div className="space-y-3">
                    <Badge className="w-full justify-center py-2 bg-success/20 text-success text-sm">
                      <Shield className="h-4 w-4 mr-2" /> You Own This Game
                    </Badge>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/vault"><Play className="h-4 w-4 mr-2" /> View in Vault</Link>
                    </Button>
                    {game.is_resellable && (
                      <Button asChild variant="outline" className="w-full">
                        <Link href={`/resell/${game.id}`}><Repeat className="h-4 w-4 mr-2" /> List for Resale</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <Button
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg py-6 mb-3"
                      onClick={handlePurchase}
                      disabled={purchasing}
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      {purchasing ? 'Purchasing...' : 'Buy Now'}
                    </Button>

                    <Button variant="outline" className="w-full mb-3" onClick={handleAddToCart}>
                      <Plus className="h-4 w-4 mr-2" /> Add to Cart
                    </Button>

                    {/* Fixed: wishlist + share buttons in a flex container */}
                    <div className="flex gap-2 mb-4">
                      <Button variant="outline" className={`flex-1 ${isWishlisted ? 'text-destructive' : ''}`} onClick={handleWishlist}>
                        <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-destructive' : ''}`} />
                        <span className="ml-1 text-xs">{isWishlisted ? 'Wishlisted' : 'Wishlist'}</span>
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={handleShare}>
                        <Share2 className="h-4 w-4" />
                        <span className="ml-1 text-xs">Share</span>
                      </Button>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Shield className="h-4 w-4" /><span>Verified digital ownership</span>
                      </div>
                      {game.is_resellable && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Repeat className="h-4 w-4" /><span>Can be resold later</span>
                        </div>
                      )}
                      {game.rating_count > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Star className="h-4 w-4" />
                          <span>{game.rating_average.toFixed(1)}/5 from {game.rating_count} reviews</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Write a Review for {game.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setNewReview({ ...newReview, rating: star })}>
                      <Star className={`h-8 w-8 transition-colors ${star <= newReview.rating ? 'text-warning fill-warning' : 'text-muted hover:text-warning'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Title (optional)</label>
                <Input
                  value={newReview.title}
                  onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                  placeholder="Summarize your experience..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Review</label>
                <Textarea
                  value={newReview.content}
                  onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
                  placeholder="What did you like or dislike?"
                  rows={5}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Do you recommend this game?</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={newReview.is_recommended ? 'default' : 'outline'}
                    onClick={() => setNewReview({ ...newReview, is_recommended: true })}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" /> Yes
                  </Button>
                  <Button
                    size="sm"
                    variant={!newReview.is_recommended ? 'destructive' : 'outline'}
                    onClick={() => setNewReview({ ...newReview, is_recommended: false })}
                  >
                    No
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={handleSubmitReview}>Post Review</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
