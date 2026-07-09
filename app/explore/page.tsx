'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Game } from '@/lib/types/database'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Home,
  SlidersHorizontal,
  X,
  Star,
  Download,
  TrendingUp,
  Check,
  Loader2,
  Gamepad2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface Tag {
  id: string
  name: string
  slug: string
  category: string | null
}

type SortOption =
  | 'relevance'
  | 'new'
  | 'top_rated'
  | 'most_downloaded'
  | 'price_low'
  | 'price_high'

type PriceRange = 'all' | 'free' | 'under10' | '10to30' | '30plus'

const PAGE_SIZE = 12

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof Star }[] = [
  { value: 'relevance', label: 'Relevance', icon: TrendingUp },
  { value: 'new', label: 'New Releases', icon: Star },
  { value: 'top_rated', label: 'Top Rated', icon: Star },
  { value: 'most_downloaded', label: 'Most Downloaded', icon: Download },
  { value: 'price_low', label: 'Price: Low to High', icon: TrendingUp },
  { value: 'price_high', label: 'Price: High to Low', icon: TrendingUp },
]

const PRICE_OPTIONS: { value: PriceRange; label: string }[] = [
  { value: 'all', label: 'Any Price' },
  { value: 'free', label: 'Free' },
  { value: 'under10', label: 'Under $10' },
  { value: '10to30', label: '$10 – $30' },
  { value: '30plus', label: '$30+' },
]

const CATEGORY_LABELS: Record<string, string> = {
  genre: 'Genres',
  theme: 'Themes',
  feature: 'Features',
  type: 'Types',
  style: 'Styles',
}

const CATEGORY_ORDER = ['genre', 'theme', 'feature', 'type', 'style']

const DEFAULT_COVER =
  'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg'

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ExplorePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // ---- Filter state (initialized from URL params for shareable links) ----
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(
    parseTagsParam(searchParams.get('tags'))
  )
  const [sort, setSort] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'relevance'
  )
  const [priceRange, setPriceRange] = useState<PriceRange>(
    (searchParams.get('price') as PriceRange) || 'all'
  )
  const [freeOnly, setFreeOnly] = useState(searchParams.get('free') === '1')
  const [resellableOnly, setResellableOnly] = useState(
    searchParams.get('resellable') === '1'
  )

  // ---- Data state ----
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, Tag[]>>({})
  const [tagsLoading, setTagsLoading] = useState(true)
  const [games, setGames] = useState<Game[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // Mobile filter panel visibility
  const [showFilters, setShowFilters] = useState(false)

  // ---- Fetch tags once ----
  useEffect(() => {
    fetchTags()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchTags = async () => {
    setTagsLoading(true)
    const { data, error } = await supabase
      .from('tags')
      .select('id, name, slug, category')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      toast.error('Failed to load tags', { description: error.message })
      setTagsLoading(false)
      return
    }

    const grouped: Record<string, Tag[]> = {}
    ;(data as Tag[] | null)?.forEach((tag) => {
      const cat = tag.category || 'other'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(tag)
    })
    setTagsByCategory(grouped)
    setTagsLoading(false)
  }

  // ---- Build & run the games query whenever filters change ----
  const fetchGames = useCallback(
    async (reset: boolean) => {
      const offset = reset ? 0 : games.length
      const limit = PAGE_SIZE

      // Base query
      let query = supabase
        .from('games')
        .select('*', { count: 'exact' })
        .eq('is_active', true)

      // Text search
      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`)
      }

      // Price range
      if (priceRange === 'free') {
        query = query.eq('price', 0)
      } else if (priceRange === 'under10') {
        query = query.gte('price', 0.01).lt('price', 10)
      } else if (priceRange === '10to30') {
        query = query.gte('price', 10).lt('price', 30)
      } else if (priceRange === '30plus') {
        query = query.gte('price', 30)
      }

      // Free only toggle
      if (freeOnly) {
        query = query.eq('price', 0)
      }

      // Resellable only toggle
      if (resellableOnly) {
        query = query.eq('is_resellable', true)
      }

      // Sort
      switch (sort) {
        case 'new':
          query = query.order('release_date', { ascending: false, nullsFirst: false })
          break
        case 'top_rated':
          query = query.order('rating_average', { ascending: false, nullsFirst: false })
          break
        case 'most_downloaded':
          query = query.order('downloads_count', { ascending: false })
          break
        case 'price_low':
          query = query.order('price', { ascending: true })
          break
        case 'price_high':
          query = query.order('price', { ascending: false })
          break
        default:
          // Relevance: featured first, then popularity
          query = query
            .order('is_featured', { ascending: false })
            .order('downloads_count', { ascending: false })
            .order('rating_average', { ascending: false, nullsFirst: false })
      }

      // Tag filtering via game_tag_mappings (AND semantics: must have every selected tag)
      if (selectedTags.length > 0) {
        const { data: mappingData, error: mappingError } = await supabase
          .from('game_tag_mappings')
          .select('game_id')
          .in('tag_id', selectedTags)

        if (mappingError) {
          toast.error('Failed to filter by tags', {
            description: mappingError.message,
          })
          if (reset) {
            setGames([])
            setTotalCount(0)
            setHasMore(false)
            setLoading(false)
          } else {
            setLoadingMore(false)
          }
          return
        }

        // Count how many of the selected tags each game has; keep only games
        // that have ALL selected tags (intersection / Steam-style narrowing).
        const countMap = new Map<string, number>()
        ;(mappingData as { game_id: string }[] | null)?.forEach((row) => {
          countMap.set(row.game_id, (countMap.get(row.game_id) || 0) + 1)
        })
        const matchingIds = Array.from(countMap.entries())
          .filter(([, c]) => c >= selectedTags.length)
          .map(([id]) => id)

        if (matchingIds.length === 0) {
          setGames([])
          setTotalCount(0)
          setHasMore(false)
          setLoading(false)
          setLoadingMore(false)
          return
        }

        query = query.in('id', matchingIds)
      }

      // Pagination via range
      const { data, count, error } = await query.range(offset, offset + limit - 1)

      if (error) {
        toast.error('Failed to load games', { description: error.message })
        if (reset) {
          setGames([])
          setTotalCount(0)
          setHasMore(false)
          setLoading(false)
        } else {
          setLoadingMore(false)
        }
        return
      }

      const page = (data as Game[] | null) ?? []
      const total = count ?? 0

      setGames((prev) => (reset ? page : [...prev, ...page]))
      setTotalCount(total)
      setHasMore((reset ? page.length : games.length + page.length) < total)

      setLoading(false)
      setLoadingMore(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, selectedTags, sort, priceRange, freeOnly, resellableOnly, games.length]
  )

  // Re-fetch (reset) whenever any filter changes
  useEffect(() => {
    setLoading(true)
    fetchGames(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedTags, sort, priceRange, freeOnly, resellableOnly])

  // Sync filters to URL (shareable) — no re-render loop because state is only
  // initialized from searchParams, never re-derived from it.
  useEffect(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','))
    if (sort !== 'relevance') params.set('sort', sort)
    if (priceRange !== 'all') params.set('price', priceRange)
    if (freeOnly) params.set('free', '1')
    if (resellableOnly) params.set('resellable', '1')

    const qs = params.toString()
    router.replace(qs ? `/explore?${qs}` : '/explore', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedTags, sort, priceRange, freeOnly, resellableOnly])

  // ---- Handlers ----
  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearch('')
  }

  const clearAllFilters = () => {
    setSelectedTags([])
    setSort('relevance')
    setPriceRange('all')
    setFreeOnly(false)
    setResellableOnly(false)
    setSearch('')
    setSearchInput('')
  }

  const loadMore = () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    fetchGames(false)
  }

  // ---- Derived ----
  const activeFilterCount =
    selectedTags.length +
    (sort !== 'relevance' ? 1 : 0) +
    (priceRange !== 'all' ? 1 : 0) +
    (freeOnly ? 1 : 0) +
    (resellableOnly ? 1 : 0) +
    (search.trim() ? 1 : 0)

  const orderedCategories = useMemo(() => {
    const cats = Object.keys(tagsByCategory)
    return [
      ...CATEGORY_ORDER.filter((c) => cats.includes(c)),
      ...cats.filter((c) => !CATEGORY_ORDER.includes(c)).sort(),
    ]
  }, [tagsByCategory])

  // ===========================================================================
  // Render
  // ===========================================================================
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
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
              <BreadcrumbPage>Explore</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header + search */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Gamepad2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Explore Games</h1>
              <p className="text-muted-foreground text-sm">
                Browse the catalog with Steam-style tag filtering.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search games by title..."
              className="pl-10 pr-10"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>

        {/* Mobile filter toggle */}
        <div className="lg:hidden mb-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 h-5 min-w-5 px-1.5 justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ============================== Filter sidebar ============================== */}
          <aside
            className={`lg:w-72 lg:flex-shrink-0 ${
              showFilters ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="lg:sticky lg:top-20 space-y-5">
              <Card className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </h2>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-7 text-xs"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Sort */}
                <FilterSection title="Sort by">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FilterSection>

                {/* Price range */}
                <FilterSection title="Price">
                  <div className="flex flex-wrap gap-2">
                    {PRICE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPriceRange(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          priceRange === opt.value
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:bg-accent'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </FilterSection>

                {/* Toggles */}
                <FilterSection title="Quick filters">
                  <div className="space-y-2">
                    <ToggleRow
                      label="Free only"
                      active={freeOnly}
                      onClick={() => setFreeOnly((v) => !v)}
                    />
                    <ToggleRow
                      label="Resellable only"
                      active={resellableOnly}
                      onClick={() => setResellableOnly((v) => !v)}
                    />
                  </div>
                </FilterSection>
              </Card>

              {/* Tags grouped by category */}
              <Card className="p-4 space-y-4">
                <h2 className="font-semibold">Tags</h2>
                {tagsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <div className="flex flex-wrap gap-2">
                          {[...Array(4)].map((_, j) => (
                            <Skeleton key={j} className="h-7 w-16 rounded-full" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : orderedCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tags available.</p>
                ) : (
                  orderedCategories.map((category) => (
                    <FilterSection
                      key={category}
                      title={CATEGORY_LABELS[category] || capitalize(category)}
                    >
                      <div className="flex flex-wrap gap-2">
                        {tagsByCategory[category].map((tag) => {
                          const active = selectedTags.includes(tag.id)
                          return (
                            <button
                              key={tag.id}
                              onClick={() => toggleTag(tag.id)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
                                active
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background border-border hover:bg-accent'
                              }`}
                            >
                              {active && <Check className="h-3 w-3" />}
                              {tag.name}
                            </button>
                          )
                        })}
                      </div>
                    </FilterSection>
                  ))
                )}
              </Card>
            </div>
          </aside>

          {/* ============================== Results ============================== */}
          <div className="flex-1 min-w-0">
            {/* Result count + active tag summary */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-sm text-muted-foreground">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading games…
                  </span>
                ) : (
                  <>
                    Showing <span className="font-medium text-foreground">{games.length}</span>
                    {' '}of{' '}
                    <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span>
                    {' '}games
                  </>
                )}
              </p>
            </div>

            {/* Active tag chips */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {selectedTags.map((tagId) => {
                  const tag = Object.values(tagsByCategory)
                    .flat()
                    .find((t) => t.id === tagId)
                  if (!tag) return null
                  return (
                    <Badge
                      key={tagId}
                      variant="secondary"
                      className="cursor-pointer gap-1"
                      onClick={() => toggleTag(tagId)}
                    >
                      {tag.name}
                      <X className="h-3 w-3" />
                    </Badge>
                  )
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTags([])}
                  className="h-6 text-xs"
                >
                  Clear tags
                </Button>
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(PAGE_SIZE)].map((_, i) => (
                  <GameCardSkeleton key={i} />
                ))}
              </div>
            ) : games.length === 0 ? (
              <EmptyState onReset={clearAllFilters} />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {games.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>

                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <Button
                      onClick={loadMore}
                      disabled={loadingMore}
                      variant="outline"
                      size="lg"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading…
                        </>
                      ) : (
                        <>Load more</>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  )
}

function ToggleRow({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full text-sm py-1.5 group"
    >
      <span className={active ? 'text-foreground font-medium' : 'text-muted-foreground'}>
        {label}
      </span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          active ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            active ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}

function GameCard({ game }: { game: Game }) {
  const priceLabel =
    game.price <= 0 ? (
      <span className="font-display font-bold text-primary">Free</span>
    ) : (
      <span className="font-display font-bold text-primary">
        ${game.price.toFixed(2)}
      </span>
    )

  return (
    <Link href={`/game/${game.slug}`} className="group">
      <Card className="game-card overflow-hidden cursor-pointer h-full flex flex-col">
        <div className="aspect-[3/4] relative overflow-hidden">
          <Image
            src={game.cover_url || DEFAULT_COVER}
            alt={game.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          {game.genre && (
            <Badge className="absolute top-3 right-3">{game.genre}</Badge>
          )}
          {game.is_featured && (
            <Badge className="absolute top-3 left-3 bg-primary">
              Featured
            </Badge>
          )}
          {game.rating_average > 0 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/70 rounded px-1.5 py-0.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium text-white">
                {game.rating_average.toFixed(1)}
              </span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-semibold text-lg leading-tight text-white line-clamp-2">
              {game.title}
            </h3>
            <p className="text-sm text-white/70">{game.developer}</p>
          </div>
        </div>
        <CardContent className="p-3 flex items-center justify-between">
          {priceLabel}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Download className="h-3 w-3" />
            {(game.downloads_count || 0).toLocaleString()}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}

function GameCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="p-3 flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-10" />
      </div>
    </Card>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <Card className="bg-card/50 border-border/50 p-12 text-center">
      <Gamepad2 className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
      <p className="text-lg font-medium mb-1">No games found</p>
      <p className="text-muted-foreground text-sm mb-4">
        Try adjusting your filters or search terms.
      </p>
      <Button variant="outline" size="sm" onClick={onReset}>
        Reset filters
      </Button>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTagsParam(param: string | null): string[] {
  if (!param) return []
  return param
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
