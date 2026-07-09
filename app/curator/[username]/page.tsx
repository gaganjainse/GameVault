'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Bookmark,
  Users,
  Star,
  ChevronRight,
  Home,
  ArrowRight,
  Plus,
  Search,
  Gamepad2,
} from 'lucide-react'
import type { Profile, Game } from '@/lib/types/database'

interface Curator {
  id: string
  user_id: string
  tagline: string | null
  description: string | null
  follower_count: number
  created_at: string
}

interface CuratorList {
  id: string
  curator_id: string
  title: string
  description: string | null
  cover_image_url: string | null
  created_at: string
}

interface CuratorListWithGames extends CuratorList {
  curator_list_games: {
    id: string
    blurb: string | null
    games: Game
  }[]
}

interface CuratorDetail extends Curator {
  profiles: Profile | null
}

export default function CuratorProfilePage() {
  const params = useParams()
  const username = params.username as string
  const { user } = useAuth()

  const [curator, setCurator] = useState<CuratorDetail | null>(null)
  const [lists, setLists] = useState<CuratorListWithGames[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCuratorData = async () => {
      setLoading(true)
      try {
        // Fetch profile by username
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle()

        if (profileError) throw profileError
        if (!profileData) {
          setLoading(false)
          return
        }

        // Fetch curator row joined to this profile
        const { data: curatorData, error: curatorError } = await supabase
          .from('curators')
          .select('*')
          .eq('user_id', profileData.id)
          .maybeSingle()

        if (curatorError) throw curatorError
        if (!curatorData) {
          setLoading(false)
          return
        }

        setCurator({
          ...(curatorData as unknown as Curator),
          profiles: profileData as unknown as Profile,
        })

        // Fetch the curator's lists
        const { data: listsData, error: listsError } = await supabase
          .from('curator_lists')
          .select('*')
          .eq('curator_id', curatorData.id)
          .order('created_at', { ascending: false })

        if (listsError) throw listsError

        const fetchedLists = (listsData || []) as unknown as CuratorList[]

        // For each list, fetch its games with blurbs
        const listsWithGames: CuratorListWithGames[] = await Promise.all(
          fetchedLists.map(async (list) => {
            const { data: lgData, error: lgError } = await supabase
              .from('curator_list_games')
              .select('id, blurb, games(*)')
              .eq('list_id', list.id)
              .order('added_at', { ascending: false })

            if (lgError) {
              console.warn(
                `Failed to load games for list ${list.id}:`,
                lgError.message
              )
            }

            return {
              ...list,
              curator_list_games: (lgData || []) as unknown as CuratorListWithGames['curator_list_games'],
            }
          })
        )

        setLists(listsWithGames)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load curator'
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      fetchCuratorData()
    }
  }, [username])

  const formatFollowers = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return `${n}`
  }

  const formatPrice = (price: number) =>
    price === 0 ? 'Free' : `$${price.toFixed(2)}`

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

  const displayName =
    curator?.profiles?.display_name ?? curator?.profiles?.username ?? username

  // ---- Loading state ----
  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-6xl">
          <Skeleton className="mb-6 h-4 w-48" />
          <Skeleton className="mb-8 h-32 w-full rounded-2xl" />
          <div className="space-y-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-4 h-7 w-56" />
                <div className="flex gap-4 overflow-hidden pb-4">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <Skeleton
                      key={j}
                      className="h-64 w-44 shrink-0 rounded-xl"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  // ---- Not found ----
  if (!curator) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md pt-20 text-center">
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 radial-gradient blur-2xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <Gamepad2 className="h-10 w-10 text-muted-foreground/60" />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold">Curator not found</h1>
          <p className="mb-6 text-muted-foreground">
            We couldn&apos;t find a curator with the username{' '}
            <span className="font-medium text-foreground">@{username}</span>.
          </p>
          <Link href="/curators">
            <Button className="gap-2" variant="outline">
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back to Curators
            </Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            href="/curators"
            className="transition-colors hover:text-foreground"
          >
            Curators
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{displayName}</span>
        </nav>

        {/* Curator header */}
        <div className="relative mb-10 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-card to-accent/15" />
          <div className="absolute -right-24 -top-24 h-64 w-64 radial-gradient blur-3xl" />
          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
            <Avatar className="h-24 w-24 border-2 border-border/60 shadow-lg">
              {curator.profiles?.avatar_url ? (
                <AvatarImage
                  src={curator.profiles.avatar_url}
                  alt={displayName}
                />
              ) : null}
              <AvatarFallback className="bg-primary/20 text-2xl font-bold text-primary">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold gradient-text">
                  {displayName}
                </h1>
                {curator.profiles?.is_verified && (
                  <Badge className="gap-1 border-primary/40 bg-primary/20 text-primary">
                    <Star className="h-3 w-3 fill-primary" />
                    Verified
                  </Badge>
                )}
              </div>
              {curator.tagline && (
                <p className="mt-2 text-base font-medium text-foreground/80">
                  {curator.tagline}
                </p>
              )}
              {(curator.description ||
                curator.profiles?.bio) && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {curator.description ?? curator.profiles?.bio}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">
                    {formatFollowers(curator.follower_count)}
                  </span>
                  <span className="text-muted-foreground">followers</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Bookmark className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-foreground">
                    {lists.length}
                  </span>
                  <span className="text-muted-foreground">
                    {lists.length === 1 ? 'list' : 'lists'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
                onClick={() =>
                  toast('Follow is coming soon', {
                    description: 'Following curators is not wired up yet.',
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Follow
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  toast('Coming soon', {
                    description: 'Sharing curators is coming soon.',
                  })
                }
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Lists as shelves */}
        {lists.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center pt-12 text-center">
            <div className="relative mb-6 inline-block">
              <div className="absolute inset-0 radial-gradient blur-2xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                <Bookmark className="h-10 w-10 text-muted-foreground/60" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-bold">No lists yet</h2>
            <p className="text-sm text-muted-foreground">
              {displayName} hasn&apos;t published any lists. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {lists.map((list) => (
              <section key={list.id}>
                {/* List header */}
                <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      {list.cover_image_url ? (
                        <Image
                          src={list.cover_image_url}
                          alt={list.title}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-lg border border-border/50 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15">
                          <Bookmark className="h-6 w-6 text-primary/70" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold text-foreground">
                          {list.title}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {list.curator_list_games.length}{' '}
                          {list.curator_list_games.length === 1
                            ? 'game'
                            : 'games'}
                        </p>
                      </div>
                    </div>
                    {list.description && (
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground/80">
                        {list.description}
                      </p>
                    )}
                  </div>
                  <Link href={`/curator/${username}/list/${list.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground hover:text-foreground"
                    >
                      View all
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>

                {/* Shelf of games */}
                {list.curator_list_games.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/40 py-8 text-center text-sm text-muted-foreground">
                    This list is empty.
                  </p>
                ) : (
                  <div className="shelf-scroll">
                    {list.curator_list_games.map((lg) => {
                      const game = lg.games
                      return (
                        <Link
                          key={lg.id}
                          href={`/game/${game.slug}`}
                          className="block w-44"
                        >
                          <div className="game-card group h-full">
                            {/* Cover image */}
                            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-xl bg-secondary">
                              {game.cover_url ? (
                                <Image
                                  src={game.cover_url}
                                  alt={game.title}
                                  fill
                                  sizes="176px"
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-card to-accent/15">
                                  <Gamepad2 className="h-8 w-8 text-muted-foreground/40" />
                                </div>
                              )}
                              {/* Price badge */}
                              <div className="absolute right-2 top-2">
                                <Badge className="border-border/60 bg-card/70 text-foreground backdrop-blur-md">
                                  {formatPrice(game.price)}
                                </Badge>
                              </div>
                            </div>

                            {/* Info */}
                            <div className="space-y-2 p-3">
                              <h3 className="line-clamp-1 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                                {game.title}
                              </h3>

                              {game.rating_count > 0 && (
                                <div className="flex items-center gap-1">
                                  {renderStars(game.rating_average)}
                                </div>
                              )}

                              {/* Curator blurb */}
                              {lg.blurb && (
                                <p className="line-clamp-3 text-xs italic leading-relaxed text-muted-foreground/80">
                                  &ldquo;{lg.blurb}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
