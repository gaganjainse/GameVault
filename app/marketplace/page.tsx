'use client'

import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase/client'
import { Game, Listing } from '@/lib/types/database'
import {
  Search,
  Filter,
  SortAsc,
  TrendingUp,
  Clock,
  DollarSign,
  Tag,
  Package,
  ExternalLink,
  User,
  ShoppingBag,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface ListingWithDetails extends Listing {
  games: Game
}

export default function MarketplacePage() {
  const [games, setGames] = useState<Game[]>([])
  const [listings, setListings] = useState<ListingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [priceFilter, setPriceFilter] = useState('all')
  const [genreFilter, setGenreFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'primary' | 'resale'>('primary')
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (viewMode === 'primary') {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        toast.error('Failed to load games. Please try again.')
        setError(error.message)
        setGames([])
      } else {
        setGames(data)
      }
    } else {
      const { data, error } = await supabase
        .from('listings')
        .select('*, games(*)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        toast.error('Failed to load resale listings. Please try again.')
        setError(error.message)
        setListings([])
      } else {
        setListings(data as ListingWithDetails[])
      }
    }

    setLoading(false)
  }, [viewMode])

  useEffect(() => {
    fetchData()
  }, [viewMode, fetchData])

  const filteredGames = games
    .filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(search.toLowerCase()) ||
        game.developer?.toLowerCase().includes(search.toLowerCase()) ||
        game.genre?.toLowerCase().includes(search.toLowerCase())

      const matchesPrice = priceFilter === 'all' ||
        (priceFilter === 'under20' && game.price < 20) ||
        (priceFilter === '20to40' && game.price >= 20 && game.price < 40) ||
        (priceFilter === 'over40' && game.price >= 40)

      const matchesGenre = genreFilter === 'all' || game.genre === genreFilter

      return matchesSearch && matchesPrice && matchesGenre
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return (b.downloads_count || 0) - (a.downloads_count || 0)
      if (sortBy === 'price-low') return Number(a.price) - Number(b.price)
      if (sortBy === 'price-high') return Number(b.price) - Number(a.price)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const filteredListings = listings
    .filter(listing => {
      const game = listing.games
      const matchesSearch = !search ||
        game.title.toLowerCase().includes(search.toLowerCase()) ||
        game.developer?.toLowerCase().includes(search.toLowerCase()) ||
        game.genre?.toLowerCase().includes(search.toLowerCase())

      const matchesPrice = priceFilter === 'all' ||
        (priceFilter === 'under20' && listing.price < 20) ||
        (priceFilter === '20to40' && listing.price >= 20 && listing.price < 40) ||
        (priceFilter === 'over40' && listing.price >= 40)

      const matchesGenre = genreFilter === 'all' || game.genre === genreFilter

      return matchesSearch && matchesPrice && matchesGenre
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return (b.views_count || 0) - (a.views_count || 0)
      if (sortBy === 'price-low') return Number(a.price) - Number(b.price)
      if (sortBy === 'price-high') return Number(b.price) - Number(a.price)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const genres = Array.from(new Set(games.map(g => g.genre).filter(Boolean)))

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
          <p className="text-muted-foreground">Discover and purchase games, or find deals on the resale market</p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={viewMode === 'primary' ? 'default' : 'outline'}
            onClick={() => setViewMode('primary')}
            className={viewMode === 'primary' ? 'bg-gradient-to-r from-primary to-accent' : ''}
          >
            <Package className="h-4 w-4 mr-2" />
            New Games
          </Button>
          <Button
            variant={viewMode === 'resale' ? 'default' : 'outline'}
            onClick={() => setViewMode('resale')}
            className={viewMode === 'resale' ? 'bg-gradient-to-r from-primary to-accent' : ''}
          >
            <Tag className="h-4 w-4 mr-2" />
            Resale Market
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={genreFilter} onValueChange={setGenreFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {genres.map(genre => (
                <SelectItem key={genre || 'unknown'} value={genre || 'unknown'}>{genre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priceFilter} onValueChange={setPriceFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Price Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prices</SelectItem>
              <SelectItem value="under20">Under $20</SelectItem>
              <SelectItem value="20to40">$20 - $40</SelectItem>
              <SelectItem value="over40">Over $40</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="game-card overflow-hidden">
                <Skeleton className="aspect-[3/4] w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="bg-card/50 border-border/50 p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button variant="outline" onClick={() => fetchData()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </Card>
        ) : viewMode === 'primary' ? (
          filteredGames.length === 0 ? (
            <Card className="bg-card/50 border-border/50 p-12 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No games found</h3>
              <p className="text-muted-foreground">Try adjusting your filters</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )
        ) : filteredListings.length === 0 ? (
          <Card className="bg-card/50 border-border/50 p-12 text-center">
            <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No listings found</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your filters or check back later for resale opportunities</p>
            <Button variant="outline" onClick={() => setViewMode('primary')}>
              Browse New Games Instead
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function GameCard({ game }: { game: Game }) {
  return (
    <Link href={`/game/${game.slug}`}>
      <Card className="game-card overflow-hidden group cursor-pointer h-full flex flex-col">
        <div className="aspect-[3/4] relative">
          <Image
            src={game.cover_url || 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg'}
            alt={game.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          {game.genre && (
            <Badge className="absolute top-3 right-3">{game.genre}</Badge>
          )}
        </div>

        <CardContent className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">{game.title}</h3>
          <p className="text-sm text-muted-foreground mb-2">{game.developer}</p>

          {game.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{game.description}</p>
          )}

          <div className="mt-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="font-display text-2xl font-bold text-primary">${game.price}</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{game.downloads_count || 0} owners</span>
              </div>
            </div>

            <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Buy Now
            </Button>

            {game.is_resellable && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Resellable on secondary market
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function ListingCard({ listing }: { listing: ListingWithDetails }) {
  const { games: game } = listing

  return (
    <Link href={`/listing/${listing.id}`} onClick={(e) => e.stopPropagation()}>
      <Card className="vault-card overflow-hidden group cursor-pointer h-full flex flex-col">
        <div className="aspect-[3/4] relative">
          <Image
            src={game.cover_url || 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg'}
            alt={game.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <Badge className="absolute top-3 left-3 bg-warning/20 text-warning">
            <Tag className="h-3 w-3 mr-1" />
            Resale
          </Badge>
          {game.genre && (
            <Badge className="absolute top-3 right-3">{game.genre}</Badge>
          )}
        </div>

        <CardContent className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">{game.title}</h3>

          {/* Price comparison */}
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-primary">${listing.price}</span>
              <span className="text-sm text-muted-foreground line-through">${game.price}</span>
            </div>
            {listing.price < game.price && (
              <Badge variant="outline" className="text-success border-success">
                {Math.round((1 - listing.price / game.price) * 100)}% OFF
              </Badge>
            )}
          </div>

          <div className="text-sm text-muted-foreground mb-4 flex-1">
            Listed {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
          </div>

          <Button className="w-full mt-auto" variant="secondary">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Buy Now
          </Button>

          <div className="mt-2 text-xs text-muted-foreground text-center">
            {listing.views_count || 0} views
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
