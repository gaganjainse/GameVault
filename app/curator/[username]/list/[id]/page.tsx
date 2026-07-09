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

interface ListDetail extends CuratorList {
  curators: Curator | null
}

interface ListGameWithGame {
  id: string
  blurb: string | null
  added_at: string
  games: Game
}

export default function CuratorListDetailPage() {
  const params = useParams()
  const username = params.username as string
  const listId = params.id as string
  const { user } = useAuth()

  const [list, setList] = useState<ListDetail | null>(null)
  const [curatorProfile, setCuratorProfile] = useState<Profile | null>(null)
  const [games, setGames] = useState<ListGameWithGame[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchListData = async () => {
      setLoading(true)
      try {
        // Fetch the list joined with its curator
        const { data: listData, error: listError } = await supabase
          .from('curator_lists')
          .select('*, curators(*)')
          .eq('id', listId)
          .maybeSingle()

        if (listError) throw listError
        if (!listData) {
          setLoading(false)
          return
        }

        const raw = listData as unknown as Record<string, unknown>
        const normalized: ListDetail = {
          ...(listData as unknown as CuratorList),
          curators: (raw.curators as unknown as Curator) ?? null,
        }
        setList(normalized)

        // Fetch the curator's profile via username in the URL (authoritative)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle()

        if (profileError) {
          console.warn('Could not load curator profile:', profileError.message)
        }
        if (profileData) {
          setCuratorProfile(profileData as unknown as Profile)
        }

        // Fetch the games in the list with blurbs
        const { data: gamesData, error: gamesError } = await supabase
          .from('curator_list_games')
          .select('id, blurb, added_at, games(*)')
          .eq('list_id', listId)
          .order('added_at', { ascending: false })

        if (gamesError) throw gamesError

        setGames((gamesData || []) as unknown as ListGameWithGame[])
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load list'
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }

    if (listId && username) {
      fetchListData()
    }
  }, [listId, username])

  const formatPrice = (price: number) =>
    price === 0 ? 'Free' : `$${price.toFixed(2)}`

  const renderStars = (rating: number) => {
    const rounded = Math.round(rating)
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rounded
            ? 'fill-warning text-warning'
            : 'fill-none text-muted-foreground/40'
        }`}
      />
    ))
  }

  const displayName =
    curatorProfile?.display_name ?? curatorProfile?.username ?? username
  const curatorFollowerCount = list?.curators?.follower_count ?? 0

  // ---- Loading state ----
  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl">
          <Skeleton className="mb-6 h-4 w-72" />
          <Skeleton className="mb-8 h-40 w-full rounded-2xl" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="game-card">
                <CardContent className="flex gap-4 p-4">
                  <Skeleton className="h-32 w-24 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-9 w-32" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  // ---- Not found ----
  if (!list) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md pt-20 text-center">
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 radial-gradient blur-2xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <Gamepad2 className="h-10 w-10 text-muted-foreground/60" />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold">List not found</h1>
          <p className="mb-6 text-muted-foreground">
            We couldn&apos;t find this list. It may have been removed.
          </p>
          <Link href={`/curator/${username}`}>
            <Button className="gap-2" variant="outline">
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back to {displayName}
            </Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
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
          <Link
            href={`/curator/${username}`}
            className="max-w-[140px] truncate transition-colors hover:text-foreground"
          >
            {displayName}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="max-w-[200px] truncate font-medium text-foreground">
            {list.title}
          </span>
        </nav>

        {/* List header */}
        <div className="relative mb-8 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-card to-accent/15" />
          <div className="absolute -right-24 -top-24 h-64 w-64 radial-gradient blur-3xl" />
          <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
            {list.cover_image_url ? (
              <Image
                src={list.cover_image_url}
                alt={list.title}
                width={128}
                height={128}
                className="h-32 w-32 shrink-0 rounded-xl border border-border/50 object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl bg-primary/15 shadow-lg">
                <Bookmark className="h-12 w-12 text-primary/70" />
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-3xl font-bold gradient-text">
                {list.title}
              </h1>
              {list.description && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {list.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Badge
                  variant="secondary"
                  className="gap-1.5 border-border/40 bg-secondary/60"
                >
                  <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                  {games.length} {games.length === 1 ? 'game' : 'games'}
                </Badge>
                <Link href={`/curator/${username}`}>
                  <Badge
                    variant="secondary"
                    className="gap-1.5 border-border/40 bg-secondary/60 transition-colors hover:border-primary/40"
                  >
                    <Users className="h-3.5 w-3.5 text-accent" />
                    by {displayName}
                  </Badge>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Curator mini-card */}
        {curatorProfile && (
          <Link href={`/curator/${username}`} className="mb-8 block">
            <Card className="game-card group flex-row items-center">
              <CardContent className="flex w-full items-center gap-4 p-4">
                <Avatar className="h-12 w-12 border border-border/50">
                  {curatorProfile.avatar_url ? (
                    <AvatarImage
                      src={curatorProfile.avatar_url}
                      alt={displayName}
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary/20 text-sm font-semibold text-primary">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
                    {displayName}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {curatorFollowerCount.toLocaleString()} followers
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Section title */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            Games in this list
          </h2>
        </div>

        {/* Empty state */}
        {games.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center pt-8 text-center">
            <div className="relative mb-6 inline-block">
              <div className="absolute inset-0 radial-gradient blur-2xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                <Gamepad2 className="h-10 w-10 text-muted-foreground/60" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-bold">No games yet</h2>
            <p className="text-sm text-muted-foreground">
              {displayName} hasn&apos;t added any games to this list.
            </p>
          </div>
        ) : (
          /* Game rows */
          <div className="space-y-4">
            {games.map((lg, idx) => {
              const game = lg.games
              return (
                <Card key={lg.id} className="game-card animate-scale-in">
                  <CardContent className="flex flex-col gap-5 p-4 sm:flex-row sm:items-start">
                    {/* Rank + cover */}
                    <div className="flex shrink-0 items-start gap-4">
                      <span className="mt-1 w-8 text-center text-2xl font-black text-muted-foreground/30">
                        {idx + 1}
                      </span>
                      <Link
                        href={`/game/${game.slug}`}
                        className="group/cover relative block h-32 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary"
                      >
                        {game.cover_url ? (
                          <Image
                            src={game.cover_url}
                            alt={game.title}
                            fill
                            sizes="96px"
                            className="object-cover transition-transform duration-300 group-hover/cover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-card to-accent/15">
                            <Gamepad2 className="h-7 w-7 text-muted-foreground/40" />
                          </div>
                        )}
                      </Link>
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <Link href={`/game/${game.slug}`}>
                        <h3 className="text-lg font-bold text-foreground transition-colors hover:text-primary">
                          {game.title}
                        </h3>
                      </Link>

                      {(game.developer || game.publisher) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {game.developer}
                          {game.developer && game.publisher ? ' • ' : ''}
                          {game.publisher}
                        </p>
                      )}

                      {/* Curator blurb */}
                      {lg.blurb && (
                        <p className="mt-3 rounded-lg border-l-2 border-primary/50 bg-primary/5 px-4 py-3 text-sm italic leading-relaxed text-foreground/90">
                          &ldquo;{lg.blurb}&rdquo;
                        </p>
                      )}

                      {/* Rating + price */}
                      <div className="mt-4 flex flex-wrap items-center gap-4">
                        {game.rating_count > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-0.5">
                              {renderStars(game.rating_average)}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {game.rating_average.toFixed(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({game.rating_count.toLocaleString()})
                            </span>
                          </div>
                        )}
                        <Badge
                          variant="secondary"
                          className="border-border/40 bg-secondary/60"
                        >
                          {formatPrice(game.price)}
                        </Badge>
                        {game.genre && (
                          <Badge
                            variant="outline"
                            className="border-border/40 text-muted-foreground"
                          >
                            {game.genre}
                          </Badge>
                        )}
                      </div>

                      {/* Action */}
                      <div className="mt-4">
                        <Link href={`/game/${game.slug}`}>
                          <Button
                            size="sm"
                            className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
                          >
                            Visit Store Page
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Back link */}
        <div className="mt-10 flex justify-center">
          <Link href={`/curator/${username}`}>
            <Button variant="outline" className="gap-2">
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back to {displayName}&apos;s Lists
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
