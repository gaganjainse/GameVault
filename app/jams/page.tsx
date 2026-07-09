'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Database } from '@/lib/types/database'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import { Trophy, Calendar, Users, Clock, Gamepad2, Plus, Star, ChevronRight, Sparkles } from 'lucide-react'

type GameJam = {
  id: string
  title: string
  slug: string
  description: string | null
  theme: string | null
  banner_url: string | null
  rules: string | null
  submission_start: string | null
  submission_end: string | null
  rating_start: string | null
  rating_end: string | null
  host_id: string
  status: string
  created_at: string
}

type Profile = Database['public']['Tables']['profiles']['Row']

interface JamWithHost extends GameJam {
  profiles: Profile | null
  submission_count: number
}

// Countdown hook: returns time remaining until target date
function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState<string>('')

  useEffect(() => {
    if (!target) {
      setRemaining('')
      return
    }
    const end = new Date(target).getTime()
    const tick = () => {
      const now = Date.now()
      const diff = end - now
      if (diff <= 0) {
        setRemaining('Ended')
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / (1000 * 60)) % 60)
      const seconds = Math.floor((diff / 1000) % 60)
      if (days > 0) {
        setRemaining(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setRemaining(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setRemaining(`${minutes}m ${seconds}s`)
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [target])

  return remaining
}

// Determine which countdown target applies for a jam based on status
function getCountdownTarget(jam: GameJam): string | null {
  const now = Date.now()
  if (jam.status === 'submitting' && jam.submission_end) {
    return new Date(jam.submission_end).getTime() > now ? jam.submission_end : null
  }
  if (jam.status === 'rating' && jam.rating_end) {
    return new Date(jam.rating_end).getTime() > now ? jam.rating_end : null
  }
  if (jam.status === 'upcoming' && jam.submission_start) {
    return new Date(jam.submission_start).getTime() > now ? jam.submission_start : null
  }
  return null
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  submitting: { label: 'Submitting', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  rating: { label: 'Rating', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  upcoming: { label: 'Upcoming', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  completed: { label: 'Completed', className: 'bg-muted/40 text-muted-foreground border-border/50' },
}

export default function JamsPage() {
  const { profile } = useAuth()
  const [jams, setJams] = useState<JamWithHost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJams()
  }, [])

  const fetchJams = async () => {
    try {
      const { data, error } = await (supabase
        .from('game_jams') as any)
        .select(`
          *,
          profiles:host_id (*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch submission counts for each jam
      const jamsWithCounts = await Promise.all(
        (data || []).map(async (jam: any) => {
          const { count } = await supabase
            .from('game_jam_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('jam_id', jam.id)
          return { ...jam, submission_count: count || 0 }
        })
      )

      // Sort by status priority: submitting -> rating -> upcoming -> completed
      const statusOrder: Record<string, number> = {
        submitting: 0,
        rating: 1,
        upcoming: 2,
        completed: 3,
      }
      jamsWithCounts.sort((a: any, b: any) => {
        const orderA = statusOrder[a.status] ?? 99
        const orderB = statusOrder[b.status] ?? 99
        if (orderA !== orderB) return orderA - orderB
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      setJams(jamsWithCounts as JamWithHost[])
    } catch (error) {
      console.error('Error fetching jams:', error)
      toast.error('Failed to load game jams')
    } finally {
      setLoading(false)
    }
  }

  const activeJams = jams.filter((j) => j.status === 'submitting' || j.status === 'rating')
  const upcomingJams = jams.filter((j) => j.status === 'upcoming')
  const pastJams = jams.filter((j) => j.status === 'completed')

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/30">
              <Trophy className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Game Jams</h1>
              <p className="text-muted-foreground">Create, compete, and celebrate game jams</p>
            </div>
          </div>
          {profile?.is_creator && (
            <Button asChild className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <Link href="/jams/create">
                <Plus className="h-4 w-4 mr-2" />
                Host a Jam
              </Link>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="mt-8 space-y-12">
            {[...Array(3)].map((_, sectionIdx) => (
              <div key={sectionIdx}>
                <Skeleton className="h-7 w-48 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-card/50 border-border/50 overflow-hidden">
                      <Skeleton className="aspect-video w-full" />
                      <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : jams.length === 0 ? (
          <Card className="bg-card/50 border-border/50 p-12 text-center mt-8">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No game jams yet</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to host a game jam and challenge the community
            </p>
            {profile?.is_creator && (
              <Button asChild className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                <Link href="/jams/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Host a Jam
                </Link>
              </Button>
            )}
          </Card>
        ) : (
          <div className="mt-8 space-y-12">
            {/* Active Jams */}
            {activeJams.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <h2 className="text-xl font-semibold">Active Jams</h2>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {activeJams.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeJams.map((jam) => (
                    <JamCard key={jam.id} jam={jam} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Jams */}
            {upcomingJams.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  <h2 className="text-xl font-semibold">Upcoming Jams</h2>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {upcomingJams.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingJams.map((jam) => (
                    <JamCard key={jam.id} jam={jam} />
                  ))}
                </div>
              </section>
            )}

            {/* Past Jams */}
            {pastJams.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold">Past Jams</h2>
                  <Badge className="bg-muted/40 text-muted-foreground border-border/50">
                    {pastJams.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastJams.map((jam) => (
                    <JamCard key={jam.id} jam={jam} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function JamCard({ jam }: { jam: JamWithHost }) {
  const countdown = useCountdown(getCountdownTarget(jam))
  const statusConfig = STATUS_CONFIG[jam.status] || STATUS_CONFIG.completed
  const placeholder = 'https://images.pexels.com/photos/1670988/pexels-photo-1670988.jpeg'

  return (
    <Link href={`/jams/${jam.slug}`} className="group block h-full">
      <Card className="game-card overflow-hidden h-full group cursor-pointer">
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={jam.banner_url || placeholder}
            alt={jam.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <Badge className={`absolute top-3 left-3 ${statusConfig.className}`}>
            {jam.status === 'submitting' && <Clock className="h-3 w-3 mr-1" />}
            {jam.status === 'rating' && <Star className="h-3 w-3 mr-1" />}
            {jam.status === 'upcoming' && <Calendar className="h-3 w-3 mr-1" />}
            {jam.status === 'completed' && <Trophy className="h-3 w-3 mr-1" />}
            {statusConfig.label}
          </Badge>
          {jam.theme && (
            <Badge className="absolute bottom-3 left-3 bg-black/70 text-white border-none">
              <Sparkles className="h-3 w-3 mr-1" />
              {jam.theme}
            </Badge>
          )}
        </div>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {jam.title}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Gamepad2 className="h-3.5 w-3.5" />
            Hosted by {jam.profiles?.display_name || jam.profiles?.username || 'Unknown'}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {jam.submission_count} {jam.submission_count === 1 ? 'entry' : 'entries'}
            </span>
            {countdown && (
              <span className="text-xs font-medium text-primary flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {countdown}
              </span>
            )}
          </div>
          <div className="flex items-center justify-end pt-1 border-t border-border/40">
            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
              View Jam
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

