'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase/client'
import { OwnedAsset, Game } from '@/lib/types/database'
import {
  Tag,
  DollarSign,
  Info,
  Shield,
  TrendingUp,
  Percent,
  Calculator,
  ArrowRight,
  Loader2,
  ChevronLeft,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'

interface AssetWithGame extends OwnedAsset {
  games: Game
}

export default function ResellPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [asset, setAsset] = useState<AssetWithGame | null>(null)
  const [loading, setLoading] = useState(true)
  const [price, setPrice] = useState('')
  const [listing, setListing] = useState(false)

  const fetchAsset = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('owned_assets')
      .select('*, games(*)')
      .eq('id', id)
      .maybeSingle()

    if (data && user) {
      // Verify ownership
      if (data.user_id !== user.id) {
        router.push('/vault')
        return
      }

      setAsset(data as AssetWithGame)
      setPrice(data.purchase_price.toString())
    }
    setLoading(false)
  }, [user, router])

  useEffect(() => {
    const id = params.id as string
    fetchAsset(id)
  }, [params.id, fetchAsset])

  const handleCreateListing = async () => {
    if (!asset || !user || !price) return

    const listingPrice = parseFloat(price)
    if (isNaN(listingPrice) || listingPrice <= 0) {
      toast.error('Please enter a valid price')
      return
    }

    setListing(true)

    // Update asset
    const { error: updateError } = await supabase
      .from('owned_assets')
      .update({ is_listed: true })
      .eq('id', asset.id)

    if (updateError) {
      toast.error('Failed to update asset')
      setListing(false)
      return
    }

    // Create listing
    const { error: listingError } = await supabase
      .from('listings')
      .insert({
        asset_id: asset.id,
        seller_id: user.id,
        price: listingPrice,
        status: 'active',
      })

    if (listingError) {
      toast.error('Failed to create listing')
      setListing(false)
      return
    }

    toast.success('Listed for sale!')
    router.push('/vault')
  }

  const listPrice = parseFloat(price) || 0
  const platformFeeRate = 0.10
  const royaltyRate = (asset?.games.royalty_percentage || 15) / 100
  const platformFee = listPrice * platformFeeRate
  const royaltyFee = listPrice * royaltyRate
  const sellerEarnings = listPrice - platformFee - royaltyFee

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-10 w-32 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    )
  }

  if (!asset) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Asset not found</h1>
          <Button asChild><Link href="/vault">Back to Vault</Link></Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-2xl font-bold mb-6">List for Resale</h1>

        <div className="grid gap-6">
          {/* Game Info Card */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="w-24 h-32 rounded-lg overflow-hidden relative">
                  <Image
                    src={asset.games.cover_url || 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg'}
                    alt={asset.games.title}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-1">{asset.games.title}</h2>
                  <p className="text-sm text-muted-foreground mb-2">{asset.games.developer}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Asset ID: </span>
                      <span className="font-mono">{asset.asset_id.slice(0, 16)}...</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm mt-2">
                    <div>
                      <span className="text-muted-foreground">Purchased: </span>
                      <span>${asset.purchase_price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Card */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Set Your Price
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="price">Listing Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-10 text-lg font-medium"
                  />
                </div>
              </div>

              <Alert className="bg-secondary/50">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Set a competitive price to attract buyers. Consider the current market value and your purchase price.
                </AlertDescription>
              </Alert>

              {/* Fee Breakdown */}
              <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Fee Breakdown
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Listing Price</span>
                    <span className="font-medium">${listPrice.toFixed(2)}</span>
                  </div>
                  <Separator />
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
                      Creator Royalty ({asset.games.royalty_percentage}%)
                    </span>
                    <span>-${royaltyFee.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold text-success">
                    <span>You Receive</span>
                    <span>${sellerEarnings.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Important Notice */}
              <Alert className="bg-primary/5 border-primary/20">
                <Shield className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> Once listed, your game will be transferred to the buyer upon purchase.
                  You will no longer have access to play or download it.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.back()} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleCreateListing}
              disabled={listing || !price || listPrice <= 0}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {listing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Listing...
                </>
              ) : (
                <>
                  <Tag className="h-4 w-4 mr-2" />
                  List for Sale
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
