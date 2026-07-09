'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase/client'
import { OwnedAsset, Game } from '@/lib/types/database'
import {
  Download,
  Play,
  Clock,
  DollarSign,
  Tag,
  Package,
  MoreVertical,
  Shield,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface AssetWithGame extends OwnedAsset {
  games: Game
}

export default function VaultPage() {
  const { user } = useAuth()
  const [assets, setAssets] = useState<AssetWithGame[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (user) {
      fetchAssets()
    }
  }, [user])

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from('owned_assets')
      .select('*, games(*)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAssets(data as AssetWithGame[])
    }
    setLoading(false)
  }

  const filteredAssets = assets.filter(asset => {
    if (filter === 'installed') return asset.is_installed
    if (filter === 'listed') return asset.is_listed
    return true
  })

  const totalValue = assets.reduce((sum, asset) => sum + Number(asset.purchase_price), 0)

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Your Vault</h1>
          <p className="text-muted-foreground mb-8">Sign in to view your game collection</p>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-3xl font-bold">{assets.length}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-3xl font-bold text-primary">${totalValue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Installed</p>
                  <p className="text-3xl font-bold">{assets.filter(a => a.is_installed).length}</p>
                </div>
                <Download className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Listed for Sale</p>
                  <p className="text-3xl font-bold">{assets.filter(a => a.is_listed).length}</p>
                </div>
                <Tag className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">My Vault</h1>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="installed">Installed</TabsTrigger>
              <TabsTrigger value="listed">For Sale</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="vault-card overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <Card className="bg-card/50 border-border/50 p-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No games in your vault</h3>
            <p className="text-muted-foreground mb-6">Start building your collection by purchasing games</p>
            <Button asChild>
              <Link href="/marketplace">Browse Marketplace</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => (
              <VaultCard key={asset.id} asset={asset} onRefresh={fetchAssets} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function VaultCard({ asset, onRefresh }: { asset: AssetWithGame; onRefresh: () => void }) {
  const { games: game } = asset

  const handleInstall = async (assetId: string) => {
    const { error } = await supabase
      .from('owned_assets')
      .update({ is_installed: true })
      .eq('id', assetId)
    if (error) {
      toast.error('Failed to install')
    } else {
      toast.success(`${game.title} installed!`)
      onRefresh()
    }
  }

  const handlePlay = async (assetId: string) => {
    const { error } = await supabase
      .from('owned_assets')
      .update({ last_played_at: new Date().toISOString(), play_time_hours: Number(asset.play_time_hours || 0) + 0.1 })
      .eq('id', assetId)
    if (error) {
      toast.error('Failed to update play time')
    } else {
      toast.success(`Now playing ${game.title}!`)
    }
  }

  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])

  const fetchOwnershipHistory = async (assetId: string) => {
    const { data, error } = await supabase
      .from('asset_ownership_history')
      .select('*, from_user:profiles!from_user_id(*), to_user:profiles!to_user_id(*)')
      .eq('asset_id', assetId)
      .order('transferred_at', { ascending: true })

    if (error) {
      toast.error('Failed to load ownership history')
      return
    }
    setHistoryData(data || [])
    setHistoryOpen(true)
  }

  return (
    <Card className="vault-card overflow-hidden">
      <div className="aspect-video relative">
        <Image
          src={game.cover_url || 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg'}
          alt={game.title}
          fill
          className="object-cover"
          sizes="300px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Status badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {asset.is_installed && (
            <Badge className="bg-success/20 text-success">
              <Download className="h-3 w-3 mr-1" />
              Installed
            </Badge>
          )}
          {asset.is_listed && (
            <Badge className="bg-warning/20 text-warning">
              <Tag className="h-3 w-3 mr-1" />
              Listed
            </Badge>
          )}
        </div>

        {/* Dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-8 w-8 bg-black/50 hover:bg-black/70">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/game/${game.slug}`}>View Game Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fetchOwnershipHistory(asset.id)}>
              View Ownership History
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Ownership History Dialog */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ownership History — {game.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {historyData.length > 0 ? (
                historyData.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{h.from_user?.username || 'Unknown'}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{h.to_user?.username || 'Unknown'}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(h.transferred_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No previous owners. You are the first!</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-1">{game.title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{game.developer}</p>

        {/* Asset Info */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span className="font-mono text-xs">{asset.asset_id.slice(0, 12)}...</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(asset.purchase_date), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{Number(asset.play_time_hours || 0).toFixed(1)}h played</span>
          </div>
          <div className="flex items-center gap-2 text-primary font-medium">
            <DollarSign className="h-4 w-4" />
            <span>${asset.purchase_price}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {asset.is_installed ? (
            <Button className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90" onClick={() => handlePlay(asset.id)}>
              <Play className="h-4 w-4 mr-2" />
              Play
            </Button>
          ) : (
            <Button className="flex-1" variant="secondary" onClick={() => handleInstall(asset.id)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
          {game.is_resellable && !asset.is_listed && (
            <Button variant="outline" asChild>
              <Link href={`/resell/${asset.id}`}>
                <Tag className="h-4 w-4 mr-2" />
                List for Sale
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
