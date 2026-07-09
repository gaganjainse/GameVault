'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import {
  ShoppingCart,
  Trash2,
  ArrowRight,
  ShoppingBag,
  Wallet,
  Shield,
  Tag,
  ChevronRight,
  Home,
} from 'lucide-react'

interface GameInfo {
  id: string
  title: string
  slug: string
  cover_url: string | null
  price: number
  developer: string | null
}

interface CartItemWithDetails {
  id: string
  user_id: string
  game_id: string | null
  listing_id: string | null
  price: number
  item_type: string
  added_at: string
  games: GameInfo | null
  listings: {
    id: string
    price: number
    seller_id: string
    asset_id: string
    owned_assets: {
      games: GameInfo | null
    } | null
  } | null
}

export default function CartPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItemWithDetails[]>([])
  const [loadingCart, setLoadingCart] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  const fetchCartItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('cart_items')
      .select(
        `
        id, user_id, game_id, listing_id, price, item_type, added_at,
        games:game_id (id, title, slug, cover_url, price, developer),
        listings:listing_id (
          id, price, seller_id, asset_id,
          owned_assets!asset_id (
            games:game_id (id, title, slug, cover_url, price, developer)
          )
        )
      `
      )
      .eq('user_id', user?.id)
      .order('added_at', { ascending: false })

    if (error) {
      toast.error('Failed to load cart')
    } else if (data) {
      setCartItems(data as unknown as CartItemWithDetails[])
    }
    setLoadingCart(false)
  }, [user])

  useEffect(() => {
    if (user) {
      fetchCartItems()
    }
  }, [user, fetchCartItems])

  const resolveGame = (item: CartItemWithDetails): GameInfo | null => {
    if (item.item_type === 'resale') {
      return item.listings?.owned_assets?.games ?? null
    }
    return item.games
  }

  const handleRemove = async (itemId: string) => {
    const { error } = await supabase.from('cart_items').delete().eq('id', itemId)
    if (error) {
      toast.error('Failed to remove item')
    } else {
      setCartItems((prev) => prev.filter((i) => i.id !== itemId))
      toast.success('Item removed from cart')
    }
  }

  const handleCheckout = async () => {
    if (!user || cartItems.length === 0) return
    setCheckingOut(true)
    try {
      // Checkout is handled entirely server-side by the checkout_cart()
      // Postgres function: it re-derives each item's price from `games`/
      // `listings` (ignoring whatever price the client sends), and creates
      // the order + owned_asset + listing update + cart cleanup atomically
      // in a single transaction. The client can no longer set an order's
      // price or mark it "completed" directly (see migration 010).
      //
      // Note: this closes the price/status-tampering hole and makes
      // checkout all-or-nothing, but a real payment charge (Stripe/Razorpay
      // etc.) should still confirm payment before this RPC is called.
      const { data, error } = await supabase.rpc('checkout_cart', {
        p_item_ids: cartItems.map((item) => item.id),
      })

      if (error) throw error
      if (!data?.success) throw new Error('Checkout did not complete')

      setCartItems([])
      toast.success('Checkout complete! Your games are now in your vault.')
      router.push('/vault')
    } catch {
      toast.error('Checkout failed. Please try again.')
    } finally {
      setCheckingOut(false)
    }
  }

  // Loading / redirecting state
  if (loading || (!loading && !user)) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Skeleton className="h-4 w-40 mb-4" />
            <Skeleton className="h-9 w-32 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="bg-card/50 border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-20 w-32 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price), 0)
  const platformFee = subtotal * 0.1
  const total = subtotal + platformFee

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
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
              <BreadcrumbPage>Cart</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Shopping Cart</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          {cartItems.length > 0
            ? `${cartItems.length} item${cartItems.length > 1 ? 's' : ''} in your cart`
            : 'Review your items before checkout'}
        </p>

        {loadingCart ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="bg-card/50 border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-20 w-32 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : cartItems.length === 0 ? (
          /* Empty state */
          <Card className="bg-card/50 border-border/50 p-12 text-center max-w-lg mx-auto">
            <ShoppingBag className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8">
              Discover amazing games from indie developers and the community
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
          /* Cart with items */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const game = resolveGame(item)
                const isResale = item.item_type === 'resale'
                return (
                  <Card key={item.id} className="bg-card/50 border-border/50">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-4">
                        {/* Cover image */}
                        <Link
                          href={game ? `/game/${game.slug}` : '#'}
                          className="flex-shrink-0"
                        >
                          <div className="relative w-24 h-16 sm:w-32 sm:h-20 rounded-lg overflow-hidden bg-muted">
                            <Image
                              src={
                                game?.cover_url ||
                                'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg'
                              }
                              alt={game?.title || 'Unknown game'}
                              fill
                              className="object-cover"
                              sizes="128px"
                            />
                          </div>
                        </Link>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Link
                              href={game ? `/game/${game.slug}` : '#'}
                              className="font-semibold truncate hover:text-primary transition-colors"
                            >
                              {game?.title || 'Unknown Game'}
                            </Link>
                            {isResale ? (
                              <Badge
                                variant="secondary"
                                className="bg-primary/20 text-primary"
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                Resale
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-accent/20 text-accent"
                              >
                                Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {game?.developer || 'Unknown developer'}
                          </p>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-lg text-primary">
                            ${Number(item.price).toFixed(2)}
                          </p>
                        </div>

                        {/* Remove button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(item.id)}
                          className="flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Continue shopping */}
              <div className="pt-2">
                <Button variant="ghost" asChild>
                  <Link href="/marketplace" className="text-muted-foreground">
                    <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
                    Continue Shopping
                  </Link>
                </Button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="bg-card/50 border-border/50 sticky top-6">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Wallet className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Order Summary</h2>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Items ({cartItems.length})
                      </span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Subtotal
                      </span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Platform Fee (10%)
                      </span>
                      <span>${platformFee.toFixed(2)}</span>
                    </div>
                  </div>

                  <Separator className="my-4 bg-border/50" />

                  <div className="flex justify-between items-center mb-6">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-2xl text-primary">
                      ${total.toFixed(2)}
                    </span>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={checkingOut}
                    size="lg"
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  >
                    {checkingOut ? (
                      <>Processing...</>
                    ) : (
                      <>
                        Checkout
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    <span>Secure checkout · Instant delivery</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
