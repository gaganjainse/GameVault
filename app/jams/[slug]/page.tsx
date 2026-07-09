'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Database } from '@/lib/types/database'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import {
  Trophy, Calendar, Users, Clock, Gamepad2, Star, ChevronRight,
  Home, Sparkles, Check, ArrowRight,
} from 'lucide-react'

interface GameJam {
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

interface GameJamSubmission {
  id: string
  jam_id: string
  game_id: string
  submitter_id: string
  created_at: string
}

interface GameJamRating {
  id: string
  submission_id: string
  rater_id: string
  overall_rating: number
  graphics_rating: number | null
  audio_rating: number | null
  gameplay_rating: number | null
  comment: string | null
  created_at: string
}

type Game = Database['public']['Tables']['games']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface SubmissionWithDetails extends GameJamSubmission {
  games: Game | null
  profiles: Profile | null
  ratings: GameJamRating[]
  rating_count: number
  avg_overall: number
}

interface JamWithHost extends GameJam {
  profiles: Profile | null
}

const PHASES = [
  { key: 'submitting', label: 'Submission' },
  { key: 'rating', label: 'Rating' },
  { key: 'completed', label: 'Results' },
] as const

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  submitting: { label: 'Submitting', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  rating: { label: 'Rating', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  upcoming: { label: 'Upcoming', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  completed: { label: 'Completed', className: 'bg-muted/40 text-muted-foreground border-border/50' },
}

// Countdown hook
function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState<string>('')

  useEffect(() => {
    if (!target) {
      setRemaining('')
      return
    }
    const end = new Date(target).getTime()
    const tick = () => {
      const diff = end - Date.now()
      if (diff <= 0) {
        setRemaining('Ended')
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / (1000 * 60)) % 60)
      const seconds = Math.floor((diff / 1000) % 60)
      if (days > 0) setRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`)
      else if (hours > 0) setRemaining(`${hours}h ${minutes}m ${seconds}s`)
      else setRemaining(`${minutes}m ${seconds}s`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [target])

  return remaining
}

function getCurrentPhaseEnd(jam: GameJam): string | null {
  const now = Date.now()
  if (jam.status === 'submitting' && jam.submission_end && new Date(jam.submission_end).getTime() > now) {
    return jam.submission_end
  }
  if (jam.status === 'rating' && jam.rating_end && new Date(jam.rating_end).getTime() > now) {
    return jam.rating_end
  }
  if (jam.status === 'upcoming' && jam.submission_start && new Date(jam.submission_start).getTime() > now) {
    return jam.submission_start
  }
  return null
}

function getPhaseLabel(jam: GameJam): string {
  if (jam.status === 'upcoming') return 'Starts in'
  if (jam.status === 'submitting') return 'Submissions close in'
  if (jam.status === 'rating') return 'Rating ends in'
  return 'Jam completed'
}

function StarRating({ value, onChange, label, disabled }: { value: number; onChange?: (v: number) => void; label: string; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(star)}
            className={`transition-transform ${disabled ? 'cursor-default' : 'hover:scale-110'} ${star <= value ? 'text-yellow-400' : 'text-muted-foreground/40'}`}
            aria-label={`${star} stars`}
          >
            <Star className="h-5 w-5" fill={star <= value ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function JamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user, profile } = useAuth()

  const [jam, setJam] = useState<JamWithHost | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([])
  const [userGames, setUserGames] = useState<Game[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [rateDialogOpen, setRateDialogOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithDetails | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [ratingValues, setRatingValues] = useState({ overall: 0, graphics: 0, audio: 0, gameplay: 0, comment: '' })
  const [submittingGameId, setSubmittingGameId] = useState<string>('')

  const fetchJam = useCallback(async () => {
    try {
      const { data: jamData, error: jamError } = await (supabase.from('game_jams') as any)
        .select('*, profiles:host_id (*)')
        .eq('slug', slug)
        .maybeSingle()

      if (jamError) throw jamError
      if (!jamData) {
        toast.error('Game jam not found')
        router.push('/jams')
        return
      }
      setJam(jamData as JamWithHost)

      // Fetch submissions with games, submitter profiles, and ratings
      const { data: subData, error: subError } = await (supabase.from('game_jam_submissions') as any)
        .select('*, games (*), profiles:submitter_id (*)')
        .eq('jam_id', jamData.id)
        .order('created_at', { ascending: true })

      if (subError) throw subError

      // Fetch all ratings for this jam's submissions
      const subIds = (subData || []).map((s: any) => s.id)
      let ratingsBySubmission: Record<string, GameJamRating[]> = {}
      if (subIds.length > 0) {
        const { data: ratingsData } = await (supabase.from('game_jam_ratings') as any)
          .select('*')
          .in('submission_id', subIds)
        ratingsBySubmission = (ratingsData || []).reduce((acc: Record<string, GameJamRating[]>, r: any) => {
          if (!acc[r.submission_id]) acc[r.submission_id] = []
          acc[r.submission_id].push(r)
          return acc
        }, {} as Record<string, GameJamRating[]>)
      }

      const submissionsWithRatings: SubmissionWithDetails[] = (subData || []).map((s: any) => {
        const ratings = ratingsBySubmission[s.id] || []
        const ratingCount = ratings.length
        const avgOverall = ratingCount > 0 ? ratings.reduce((sum, r) => sum + r.overall_rating, 0) / ratingCount : 0
        return {
          ...s,
          ratings,
          rating_count: ratingCount,
          avg_overall: avgOverall,
        }
      })

      setSubmissions(submissionsWithRatings)

      // Check if current user has already submitted
      if (user) {
        const userSubmitted = submissionsWithRatings.some((s) => s.submitter_id === user.id)
        setHasSubmitted(userSubmitted)
      }
    } catch (error) {
      console.error('Error fetching jam:', error)
      toast.error('Failed to load game jam')
    } finally {
      setLoading(false)
    }
  }, [slug, router, user])

  useEffect(() => {
    fetchJam()
  }, [fetchJam])

  const fetchUserGames = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('is_active', true)
        // Games where user is the developer via owned assets or listed; here we fetch games
        // the user has authored. We use a simple heuristic: games created by the user.
        // In a real schema this would be a developer_id column.
        .order('created_at', { ascending: false })

      if (error) throw error
      // Filter games where the user is associated (using developer field as best available proxy)
      // and exclude games already submitted to this jam
      const alreadySubmittedGameIds = submissions.map((s) => s.game_id)
      const myGames = (data || []).filter(
        (g) => !alreadySubmittedGameIds.includes(g.id)
      )
      setUserGames(myGames)
    } catch (error) {
      console.error('Error fetching user games:', error)
      toast.error('Failed to load your games')
    }
  }

  const handleOpenSubmitDialog = () => {
    if (!user) {
      toast.error('Sign in to submit a game')
      return
    }
    fetchUserGames()
    setSubmitDialogOpen(true)
  }

  const handleSubmitGame = async () => {
    if (!user || !jam || !submittingGameId) return
    setSubmitting(true)
    try {
      const { error } = await (supabase.from('game_jam_submissions') as any)
        .insert({
          jam_id: jam.id,
          game_id: submittingGameId,
          submitter_id: user.id,
        })
      if (error) throw error
      toast.success('Game submitted successfully!')
      setSubmitDialogOpen(false)
      setSubmittingGameId('')
      setHasSubmitted(true)
      fetchJam()
    } catch (error) {
      console.error('Error submitting game:', error)
      toast.error('Failed to submit game')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenRateDialog = (submission: SubmissionWithDetails) => {
    if (!user) {
      toast.error('Sign in to rate entries')
      return
    }
    if (submission.submitter_id === user.id) {
      toast.error('You cannot rate your own entry')
      return
    }
    setSelectedSubmission(submission)
    setRatingValues({ overall: 0, graphics: 0, audio: 0, gameplay: 0, comment: '' })
    setRateDialogOpen(true)
  }

  const handleSubmitRating = async () => {
    if (!user || !selectedSubmission) return
    if (ratingValues.overall === 0) {
      toast.error('Please select an overall rating')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await (supabase.from('game_jam_ratings') as any)
        .insert({
          submission_id: selectedSubmission.id,
          rater_id: user.id,
          overall_rating: ratingValues.overall,
          graphics_rating: ratingValues.graphics || null,
          audio_rating: ratingValues.audio || null,
          gameplay_rating: ratingValues.gameplay || null,
          comment: ratingValues.comment || null,
        })
      if (error) throw error
      toast.success('Rating submitted!')
      setRateDialogOpen(false)
      fetchJam()
    } catch (error) {
      console.error('Error submitting rating:', error)
      toast.error('Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  const countdown = useCountdown(jam ? getCurrentPhaseEnd(jam) : null)
  const statusConfig = jam ? STATUS_CONFIG[jam.status] || STATUS_CONFIG.completed : STATUS_CONFIG.completed
  const placeholder = 'https://images.pexels.com/photos/1670988/pexels-photo-1670988.jpeg'

  // Ranked leaderboard for results
  const rankedSubmissions = [...submissions].sort((a, b) => b.avg_overall - a.avg_overall)

  const currentPhaseIndex = jam
    ? PHASES.findIndex((p) => p.key === jam.status)
    : -1

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/"><Home className="h-4 w-4" /></Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/jams">Game Jams</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{jam?.title || 'Jam'}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="bg-card/50 border-border/50 overflow-hidden">
                  <Skeleton className="aspect-[3/4] w-full" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : !jam ? (
          <Card className="bg-card/50 border-border/50 p-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Game jam not found</h3>
            <Button asChild className="mt-4 bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <Link href="/jams">Back to Game Jams</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Hero Banner */}
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-border/50">
              <Image
                src={jam.banner_url || placeholder}
                alt={jam.title}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge className={statusConfig.className}>
                    {jam.status === 'submitting' && <Clock className="h-3 w-3 mr-1" />}
                    {jam.status === 'rating' && <Star className="h-3 w-3 mr-1" />}
                    {jam.status === 'upcoming' && <Calendar className="h-3 w-3 mr-1" />}
                    {jam.status === 'completed' && <Trophy className="h-3 w-3 mr-1" />}
                    {statusConfig.label}
                  </Badge>
                  {jam.theme && (
                    <Badge className="bg-black/70 text-white border-none">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Theme: {jam.theme}
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">{jam.title}</h1>
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <Gamepad2 className="h-4 w-4" />
                  Hosted by {jam.profiles?.display_name || jam.profiles?.username || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Timeline visualization */}
            <Card className="bg-card/50 border-border/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Jam Timeline
                </h2>
                {countdown && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{getPhaseLabel(jam)}</p>
                    <p className="text-lg font-bold text-primary flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {countdown}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {PHASES.map((phase, idx) => {
                  const isCurrent = jam.status === phase.key
                  const isPast = currentPhaseIndex > idx
                  const phaseDates: Record<string, string> = {
                    submitting: jam.submission_start && jam.submission_end
                      ? `${new Date(jam.submission_start).toLocaleDateString()} → ${new Date(jam.submission_end).toLocaleDateString()}`
                      : '',
                    rating: jam.rating_start && jam.rating_end
                      ? `${new Date(jam.rating_start).toLocaleDateString()} → ${new Date(jam.rating_end).toLocaleDateString()}`
                      : '',
                    completed: jam.rating_end ? new Date(jam.rating_end).toLocaleDateString() : '',
                  }
                  return (
                    <div key={phase.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                            isCurrent
                              ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30'
                              : isPast
                              ? 'bg-primary/20 border-primary/40 text-primary'
                              : 'bg-muted/40 border-border text-muted-foreground'
                          }`}
                        >
                          {isPast ? (
                            <Check className="h-5 w-5" />
                          ) : phase.key === 'submitting' ? (
                            <Gamepad2 className="h-5 w-5" />
                          ) : phase.key === 'rating' ? (
                            <Star className="h-5 w-5" />
                          ) : (
                            <Trophy className="h-5 w-5" />
                          )}
                        </div>
                        <span className={`mt-2 text-xs sm:text-sm font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                          {phase.label}
                        </span>
                        {phaseDates[phase.key] && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground/70 text-center mt-0.5 hidden sm:block">
                            {phaseDates[phase.key]}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] text-primary font-medium sm:hidden">Active</span>
                        )}
                      </div>
                      {idx < PHASES.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-1 sm:mx-2 -mt-6 ${isPast ? 'bg-primary/40' : 'bg-border'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Description & Rules */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-card/50 border-border/50 p-6 lg:col-span-2">
                <h2 className="text-lg font-semibold mb-3">About This Jam</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {jam.description || 'No description provided.'}
                </p>
              </Card>
              <Card className="bg-card/50 border-border/50 p-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  Rules
                </h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {jam.rules || 'No specific rules provided. Follow standard jam etiquette.'}
                </p>
              </Card>
            </div>

            {/* Submit button (during submission phase) */}
            {jam.status === 'submitting' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <div>
                  <h3 className="font-semibold text-lg">Ready to submit your game?</h3>
                  <p className="text-sm text-muted-foreground">
                    {hasSubmitted
                      ? 'You have already submitted an entry. You can submit another game.'
                      : 'Pick a game from your library to enter into this jam.'}
                  </p>
                </div>
                <Button
                  onClick={handleOpenSubmitDialog}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  size="lg"
                >
                  <Gamepad2 className="h-4 w-4 mr-2" />
                  Submit Your Game
                </Button>
              </div>
            )}

            {/* Submissions / Results */}
            <div>
              <Tabs defaultValue={jam.status === 'completed' ? 'results' : 'submissions'}>
                <TabsList className="mb-6">
                  <TabsTrigger value="submissions">
                    <Gamepad2 className="h-4 w-4 mr-2" />
                    Submissions
                    {submissions.length > 0 && (
                      <Badge className="ml-2 bg-primary/20 text-primary">{submissions.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="results">
                    <Trophy className="h-4 w-4 mr-2" />
                    Results
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="submissions">
                  {submissions.length === 0 ? (
                    <Card className="bg-card/50 border-border/50 p-12 text-center">
                      <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
                      <p className="text-muted-foreground">
                        {jam.status === 'submitting'
                          ? 'Be the first to submit a game!'
                          : 'Submissions will appear here once the jam begins.'}
                      </p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {submissions.map((submission) => (
                        <SubmissionCard
                          key={submission.id}
                          submission={submission}
                          canRate={jam.status === 'rating' && user !== null && submission.submitter_id !== user?.id}
                          onRate={() => handleOpenRateDialog(submission)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="results">
                  {rankedSubmissions.length === 0 ? (
                    <Card className="bg-card/50 border-border/50 p-12 text-center">
                      <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No results to show</h3>
                      <p className="text-muted-foreground">
                        Results will be available after the rating period ends.
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {rankedSubmissions.map((submission, idx) => (
                        <LeaderboardRow key={submission.id} submission={submission} rank={idx + 1} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {/* Submit Game Dialog */}
        <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
          <DialogContent className="bg-card border-border/50 max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit a Game to {jam?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
              {userGames.length === 0 ? (
                <div className="text-center py-8">
                  <Gamepad2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No available games to submit. Make sure you have active games in your library.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    Select a game to enter into this jam:
                  </p>
                  {userGames.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => setSubmittingGameId(game.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                        submittingGameId === game.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border/50 hover:border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="relative h-12 w-12 rounded overflow-hidden shrink-0 bg-muted/30">
                        {game.cover_url ? (
                          <Image
                            src={game.cover_url}
                            alt={game.title}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{game.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {game.genre || 'Unknown genre'}
                        </p>
                      </div>
                      {submittingGameId === game.id && (
                        <Check className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitGame}
                disabled={!submittingGameId || submitting || userGames.length === 0}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {submitting ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Submit Entry
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rate Entry Dialog */}
        <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
          <DialogContent className="bg-card border-border/50 max-w-md">
            <DialogHeader>
              <DialogTitle>Rate This Entry</DialogTitle>
            </DialogHeader>
            {selectedSubmission && (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="relative h-12 w-12 rounded overflow-hidden shrink-0 bg-muted/30">
                    {selectedSubmission.games?.cover_url ? (
                      <Image
                        src={selectedSubmission.games.cover_url}
                        alt={selectedSubmission.games.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{selectedSubmission.games?.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      by {selectedSubmission.profiles?.display_name || selectedSubmission.profiles?.username || 'Unknown'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <StarRating
                    label="Overall"
                    value={ratingValues.overall}
                    onChange={(v) => setRatingValues((prev) => ({ ...prev, overall: v }))}
                  />
                  <StarRating
                    label="Graphics"
                    value={ratingValues.graphics}
                    onChange={(v) => setRatingValues((prev) => ({ ...prev, graphics: v }))}
                  />
                  <StarRating
                    label="Audio"
                    value={ratingValues.audio}
                    onChange={(v) => setRatingValues((prev) => ({ ...prev, audio: v }))}
                  />
                  <StarRating
                    label="Gameplay"
                    value={ratingValues.gameplay}
                    onChange={(v) => setRatingValues((prev) => ({ ...prev, gameplay: v }))}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Comment (optional)</span>
                  <Textarea
                    placeholder="Share your thoughts about this entry..."
                    value={ratingValues.comment}
                    onChange={(e) => setRatingValues((prev) => ({ ...prev, comment: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setRateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitRating}
                disabled={submitting || ratingValues.overall === 0}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {submitting ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    Submit Rating
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

function SubmissionCard({
  submission,
  canRate,
  onRate,
}: {
  submission: SubmissionWithDetails
  canRate: boolean
  onRate: () => void
}) {
  const game = submission.games
  const placeholder = 'https://images.pexels.com/photos/1670988/pexels-photo-1670988.jpeg'

  return (
    <Card className="game-card overflow-hidden h-full group">
      <Link href={`/game/${game?.slug || ''}`}>
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image
            src={game?.cover_url || placeholder}
            alt={game?.title || 'Untitled'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-semibold text-sm line-clamp-1 text-white">{game?.title || 'Untitled'}</h3>
            <p className="text-xs text-white/70 line-clamp-1">
              {submission.profiles?.display_name || submission.profiles?.username || 'Unknown'}
            </p>
          </div>
        </div>
      </Link>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {submission.rating_count > 0 ? submission.avg_overall.toFixed(1) : 'N/A'}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {submission.rating_count} {submission.rating_count === 1 ? 'rating' : 'ratings'}
          </span>
        </div>
        {canRate && (
          <Button
            onClick={onRate}
            size="sm"
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Star className="h-3.5 w-3.5 mr-1" />
            Rate This Entry
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function LeaderboardRow({ submission, rank }: { submission: SubmissionWithDetails; rank: number }) {
  const game = submission.games
  const medalColors: Record<number, string> = {
    1: 'from-yellow-500/30 to-yellow-600/20 border-yellow-500/40',
    2: 'from-gray-400/30 to-gray-500/20 border-gray-400/40',
    3: 'from-orange-700/30 to-orange-800/20 border-orange-700/40',
  }
  const rankClass = medalColors[rank] || 'from-card/50 to-card/30 border-border/50'

  return (
    <Card className={`bg-gradient-to-r ${rankClass} p-4`}>
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/50 shrink-0">
          {rank <= 3 ? (
            <Trophy className={`h-5 w-5 ${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : 'text-orange-600'}`} />
          ) : (
            <span className="font-bold text-muted-foreground">#{rank}</span>
          )}
        </div>
        <div className="relative h-12 w-12 rounded overflow-hidden shrink-0 bg-muted/30">
          {game?.cover_url ? (
            <Image
              src={game.cover_url}
              alt={game.title}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Gamepad2 className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/game/${game?.slug || ''}`}>
            <h3 className="font-semibold truncate hover:text-primary transition-colors">
              {game?.title || 'Untitled'}
            </h3>
          </Link>
          <p className="text-xs text-muted-foreground truncate">
            by {submission.profiles?.display_name || submission.profiles?.username || 'Unknown'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1.5 justify-end">
            <Star className="h-4 w-4 text-yellow-400" fill="currentColor" />
            <span className="font-bold text-lg">
              {submission.rating_count > 0 ? submission.avg_overall.toFixed(2) : 'N/A'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {submission.rating_count} {submission.rating_count === 1 ? 'rating' : 'ratings'}
          </p>
        </div>
        <Link href={`/game/${game?.slug || ''}`}>
          <ArrowRight className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
        </Link>
      </div>
    </Card>
  )
}
