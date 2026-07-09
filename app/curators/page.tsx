'use client'

import { useEffect, useState, useMemo } from 'react'
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
import type { Profile } from '@/lib/types/database'

interface Curator {
  id: string
  user_id: string
  tagline: string | null
  description: string | null
  follower_count: number
  created_at: string
}

interface CuratorWithProfile extends Curator {
  profiles: Profile | null
}

export default function CuratorsDirectoryPage() {
  const { user } = useAuth()
  const [curators, setCurators] = useState<CuratorWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchCurators = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('curators')
          .select(
            '*, profiles:profiles!curators_user_id_fkey(username, display_name, avatar_url, bio)'
          )
          .order('follower_count', { ascending: false })

        if (error) throw error

        // Normalize the joined profile shape (Supabase returns an object, not array)
        const normalized = (data || []).map((c) => {
          const raw = c as unknown as Record<string, unknown>
          return {
            ...(c as Curator),
            profiles: (raw.profiles as Profile) ?? null,
          } as CuratorWithProfile
        })

        setCurators(normalized)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load curators'
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }

    fetchCurators()
  }, [])

  const filteredCurators = useMemo(() => {
    if (!search.trim()) return curators
    const q = search.toLowerCase().trim()
    return curators.filter((c) => {
      const name = (c.profiles?.display_name ?? '').toLowerCase()
      const username = (c.profiles?.username ?? '').toLowerCase()
      const tagline = (c.tagline ?? '').toLowerCase()
      return (
        name.includes(q) || username.includes(q) || tagline.includes(q)
      )
    })
  }, [curators, search])

  const formatFollowers = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return `${n}`
  }

  const handleBecomeCurator = () => {
    toast("Coming soon", {
      description: "Curator applications aren't open just yet. Stay tuned!",
    })
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">Curators</span>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 radial-gradient blur-2xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 neon-glow">
                <Bookmark className="h-7 w-7 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Curators</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Find trusted voices and follow the curators whose taste you
                vibe with.
              </p>
            </div>
          </div>
          <Button
            className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
            onClick={handleBecomeCurator}
          >
            <Plus className="h-4 w-4" />
            Become a Curator
          </Button>
        </div>

        {/* Search bar */}
        <div className="relative mb-8">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search curators by name or tagline..."
            className="glass h-12 w-full rounded-xl border-border/50 bg-card/50 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="game-card">
                <CardContent className="flex items-start gap-4 p-5">
                  <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredCurators.length === 0 && (
          <div className="mx-auto flex max-w-md flex-col items-center pt-16 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 radial-gradient blur-2xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                <Gamepad2 className="h-10 w-10 text-muted-foreground/60" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-bold">No curators found</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              {search.trim()
                ? `No curators match "${search}". Try a different search.`
                : 'There are no curators yet. Be the first to curate!'}
            </p>
            {!search.trim() && (
              <Button
                className="gap-2"
                variant="outline"
                onClick={handleBecomeCurator}
              >
                <Plus className="h-4 w-4" />
                Become a Curator
              </Button>
            )}
          </div>
        )}

        {/* Curator grid */}
        {!loading && filteredCurators.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCurators.map((curator) => {
              const profile = curator.profiles
              const name = profile?.display_name ?? profile?.username ?? 'Curator'
              const initials = name.slice(0, 2).toUpperCase()
              return (
                <Card
                  key={curator.id}
                  className="game-card group flex flex-col"
                >
                  <CardContent className="flex flex-1 flex-col p-5">
                    {/* Avatar + name */}
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 border border-border/50">
                        {profile?.avatar_url ? (
                          <AvatarImage
                            src={profile.avatar_url}
                            alt={name}
                          />
                        ) : null}
                        <AvatarFallback className="bg-primary/20 text-sm font-semibold text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <Link href={`/curator/${profile?.username}`}>
                          <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
                            {name}
                          </h3>
                        </Link>
                        {curator.tagline && (
                          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                            {curator.tagline}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {profile?.bio && (
                      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground/80">
                        {profile.bio}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="mt-4 flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className="gap-1.5 border-border/40 bg-secondary/60"
                      >
                        <Users className="h-3.5 w-3.5 text-primary" />
                        {formatFollowers(curator.follower_count)}{' '}
                        {curator.follower_count === 1 ? 'follower' : 'followers'}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() =>
                          toast('Follow is coming soon', {
                            description: 'Following curators is not wired up yet.',
                          })
                        }
                      >
                        <Users className="h-3.5 w-3.5" />
                        Follow
                      </Button>
                      <Link
                        href={`/curator/${profile?.username}`}
                        className="ml-auto"
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-muted-foreground hover:text-foreground"
                        >
                          View
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
