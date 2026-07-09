'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase/client'
import { Listing, Game, Profile, OwnedAsset } from '@/lib/types/database'
import {
  Tag,
  DollarSign,
  Shield,
  TrendingUp,
  Percent,
  ShoppingBag,
  ChevronLeft,
  Eye,
  Clock,
  CheckCircle,
  Loader2,
  Info,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface ListingDetails extends Listing {
  games: Game
  owned_assets: OwnedAsset
}

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [listing, setListing] = useState<ListingDetails | null>(null)
  const [seller, setSeller] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)

  useEffect(() => {
    const id = params.id as string
    fetchListing(id)
  }, [params.id])

  const fetchListing = async (id: string) => {
    const { data, error } = await supabase
      .from('listings')
      .select('*, games(*), owned_assets(*)')
      .eq('id', id)
      .maybeSingle()

    if (data) {
      setListing(data as ListingDetails)

      // Increment views
      await supabase
        .from('listings')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', id)

      // Fetch seller profile
      const { data: sellerData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.seller_id)
        .maybeSingle()

      if (sellerData) setSeller(sellerData as Profile)
    }
    setLoading(false)
  }

  const handlePurchase = async () => {
    if (!user || !listing) {
      router.push('/login')
      return
    }

    if (listing.seller_id === user.id) {
      toast.error('You cannot buy your own listing')
      return
    }

    setPurchasing(true)

    const game = listing.games
    const price = Number(listing.price)
    const platformFee = price * 0.1
    const royaltyAmount = price * (game.royalty_percentage / 100)
    const sellerAmount = price - platformFee - royaltyAmount

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: listing.seller_id,
        listing_id: listing.id,
        game_id: game.id,
        order_type: 'resale',
        status: 'completed',
        total_amount: price,
        platform_fee: platformFee,
        royalty_amount: royaltyAmount,
        seller_amount: sellerAmount,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (orderError) {
      toast.error('Failed to create order')
      setPurchasing(false)
      return
    }

    // Transfer ownership
    await supabase
      .from('owned_assets')
      .update({ user_id: user.id, is_listed: false, purchase_price: price, purchase_date: new Date().toISOString() })
      .eq('id', listing.owned_assets?.id || listing.asset_id)

    // Update listing status
    await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listing.id)

    // Record ownership history
    await supabase
      .from('asset_ownership_history')
      .insert({
        asset_id: listing.owned_assets?.id || listing.asset_id,
        from_user_id: listing.seller_id,
        to_user_id: user.id,
      })

    toast.success('Game purchased and added to your vault!')
    router.push('/vault')
    setPurchasing(false)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="lg:col-span-2 h-96" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!listing) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Listing not found</h1>
          <Button asChild><Link href="/marketplace">Browse Marketplace</Link></Button>
        </div>
      </AppLayout>
    )
  }

  const game = listing.games
  const listPrice = Number(listing.price)
  const originalPrice = Number(game.price)
  const platformFee = listPrice * 0.1
  const royaltyFee = listPrice * (game.royalty_percentage / 100)
  const sellerEarnings = listPrice - platformFee - royaltyFee
  const discount = originalPrice > 0 ? Math.round((1 - listPrice / originalPrice) * 100) : 0

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Game Info */}
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  <div className="w-32 h-44 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <Image
                      src={game.cover_url || 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg'}
                      alt={game.title}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-warning/20 text-warning">
                        <Tag className="h-3 w-3 mr-1" />
                        Resale
                      </Badge>
                      {game.genre && <Badge variant="outline">{game.genre}</Badge>}
                    </div>
                    <h1 className="text-2xl font-bold mb-1">{game.title}</h1>
                    <p className="text-sm text-muted-foreground mb-3">{game.developer}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {listing.views_count || 0} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Listed {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seller Info */}
            {seller && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>Seller</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/profile/${seller.username}`} className="flex items-center gap-4 hover:bg-secondary/30 -m-4 p-4 rounded-lg transition-colors">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={seller.avatar_url || ''} />
                      <AvatarFallback>{seller.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{seller.display_name || seller.username}</p>
                      <p className="text-sm text-muted-foreground">@{seller.username}</p>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Game Details */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>About This Game</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{game.description || 'No description available.'}</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href={`/game/${game.slug}`}>View Game Details</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Purchase Card */}
          <div>
            <Card className="sticky top-24 bg-card/80 backdrop-blur-lg border-border/50">
              <CardContent className="p-6">
                <div className="mb-4">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-display font-bold text-primary">${listPrice.toFixed(2)}</span>
                    {discount > 0 && (
                      <span className="text-lg text-muted-foreground line-through">${originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                  {discount > 0 && (
                    <Badge className="text-success border-success" variant="outline">{discount}% OFF</Badge>
                  )}
                </div>

                {listing.status !== 'active' ? (
                  <Badge className="w-full justify-center py-2 text-sm">
                    {listing.status === 'sold' ? 'Sold' : 'Unavailable'}
                  </Badge>
                ) : listing.seller_id === user?.id ? (
                  <Badge className="w-full justify-center py-2 bg-warning/20 text-warning">
                    <Info className="h-4 w-4 mr-2" />
                    This is your listing
                  </Badge>
                ) : (
                  <>
                    <Button
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg py-6 mb-4"
                      onClick={handlePurchase}
                      disabled={purchasing}
                    >
                      {purchasing ? (
                        <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Purchasing...</>
                      ) : (
                        <><ShoppingBag className="h-5 w-5 mr-2" /> Buy Now</>
                      )}
                    </Button>

                    <Separator className="my-4" />

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Listing Price</span>
                        <span>${listPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Platform Fee (10%)
                        </span>
                        <span>-${platformFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-accent">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Creator Royalty ({game.royalty_percentage}%)
                        </span>
                        <span>-${royaltyFee.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-success font-medium">
                        <span>Seller Receives</span>
                        <span>${sellerEarnings.toFixed(2)}</span>
                      </div>
                    </div>

                    <Alert className="mt-4 bg-primary/5 border-primary/20">
                      <Shield className="h-4 w-4 text-primary" />
                      <AlertDescription className="text-xs">
                        Ownership transfers instantly. The game will appear in your vault after purchase.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
