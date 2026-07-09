'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
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
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Trophy, Calendar, Users, Clock, Gamepad2, Plus, Star,
  ChevronRight, Home, Sparkles, Check, ArrowRight,
} from 'lucide-react'

// Generate a URL-safe slug from a title
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // Collapse spaces/underscores to single hyphen
    .replace(/^-+|-+$/g, '') // Trim leading/trailing hyphens
}

// Auto-calculate jam status based on dates relative to now
function calculateStatus(
  submissionStart: string,
  submissionEnd: string,
  ratingStart: string,
  ratingEnd: string
): string {
  const now = Date.now()
  const subStart = new Date(submissionStart).getTime()
  const subEnd = new Date(submissionEnd).getTime()
  const rateStart = new Date(ratingStart).getTime()
  const rateEnd = new Date(ratingEnd).getTime()

  if (now < subStart) return 'upcoming'
  if (now >= subStart && now < subEnd) return 'submitting'
  if (now >= rateStart && now < rateEnd) return 'rating'
  if (now >= rateEnd) return 'completed'
  // Gap between submission_end and rating_start
  if (now >= subEnd && now < rateStart) return 'rating'
  return 'upcoming'
}

interface JamForm {
  title: string
  slug: string
  description: string
  theme: string
  banner_url: string
  rules: string
  submission_start: string
  submission_end: string
  rating_start: string
  rating_end: string
}

const EMPTY_FORM: JamForm = {
  title: '',
  slug: '',
  description: '',
  theme: '',
  banner_url: '',
  rules: '',
  submission_start: '',
  submission_end: '',
  rating_start: '',
  rating_end: '',
}

const STATUS_PREVIEW: Record<string, { label: string; className: string }> = {
  submitting: { label: 'Submitting', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  rating: { label: 'Rating', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  upcoming: { label: 'Upcoming', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  completed: { label: 'Completed', className: 'bg-muted/40 text-muted-foreground border-border/50' },
}

export default function CreateJamPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()

  const [form, setForm] = useState<JamForm>(EMPTY_FORM)
  const [slugEdited, setSlugEdited] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Access control: only creators can access this page
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast.error('Sign in to host a jam')
        router.push('/login')
        return
      }
      if (profile && !profile.is_creator) {
        toast.error('Only creators can host game jams')
        router.push('/jams')
      }
    }
  }, [authLoading, user, profile, router])

  // Auto-generate slug from title unless the user has manually edited the slug
  useEffect(() => {
    if (!slugEdited) {
      setForm((prev) => ({ ...prev, slug: slugify(prev.title) }))
    }
  }, [form.title, slugEdited])

  const updateField = (field: keyof JamForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const computedStatus = calculateStatus(
    form.submission_start || new Date().toISOString(),
    form.submission_end || new Date().toISOString(),
    form.rating_start || new Date().toISOString(),
    form.rating_end || new Date().toISOString()
  )
  const statusPreview = STATUS_PREVIEW[computedStatus] || STATUS_PREVIEW.upcoming

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Title is required'
    if (!form.slug.trim()) return 'Slug is required'
    if (!form.description.trim()) return 'Description is required'
    if (!form.theme.trim()) return 'Theme is required'
    if (!form.submission_start) return 'Submission start date is required'
    if (!form.submission_end) return 'Submission end date is required'
    if (!form.rating_start) return 'Rating start date is required'
    if (!form.rating_end) return 'Rating end date is required'

    const subStart = new Date(form.submission_start).getTime()
    const subEnd = new Date(form.submission_end).getTime()
    const rateStart = new Date(form.rating_start).getTime()
    const rateEnd = new Date(form.rating_end).getTime()

    if (subEnd <= subStart) return 'Submission end must be after submission start'
    if (rateStart < subEnd) return 'Rating start should be at or after submission end'
    if (rateEnd <= rateStart) return 'Rating end must be after rating start'

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('Sign in to host a jam')
      return
    }

    const validationError = validate()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSubmitting(true)
    try {
      const status = calculateStatus(
        form.submission_start,
        form.submission_end,
        form.rating_start,
        form.rating_end
      )

      // Check slug uniqueness
      const { data: existing } = await supabase
        .from('game_jams')
        .select('id')
        .eq('slug', form.slug)
        .maybeSingle()

      if (existing) {
        toast.error('A jam with this slug already exists. Please choose a different slug.')
        setSubmitting(false)
        return
      }

      const { data, error } = await supabase
        .from('game_jams')
        .insert({
          title: form.title.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          theme: form.theme.trim(),
          banner_url: form.banner_url.trim() || null,
          rules: form.rules.trim() || null,
          submission_start: new Date(form.submission_start).toISOString(),
          submission_end: new Date(form.submission_end).toISOString(),
          rating_start: new Date(form.rating_start).toISOString(),
          rating_end: new Date(form.rating_end).toISOString(),
          host_id: user.id,
          status,
        })
        .select('slug')
        .single()

      if (error) throw error

      toast.success('Game jam created successfully!')
      router.push(`/jams/${data.slug}`)
    } catch (error) {
      console.error('Error creating jam:', error)
      toast.error('Failed to create game jam')
    } finally {
      setSubmitting(false)
    }
  }

  // Show loading while auth state resolves
  if (authLoading) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </AppLayout>
    )
  }

  // If not a creator, render nothing (redirect handled in effect)
  if (!user || (profile && !profile.is_creator)) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto">
          <Card className="bg-card/50 border-border/50 p-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Access restricted</h3>
            <p className="text-muted-foreground mb-6">
              Only verified creators can host game jams.
            </p>
            <Button asChild className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <Link href="/jams">Back to Game Jams</Link>
            </Button>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
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
              <BreadcrumbPage>Create</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/30">
            <Trophy className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Host a Game Jam</h1>
            <p className="text-muted-foreground">Create a jam and challenge the community</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          {/* Basic Info */}
          <Card className="bg-card/50 border-border/50 p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Basic Information
            </h2>
            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">Jam Title <span className="text-destructive">*</span></label>
              <Input
                placeholder="e.g. Winter Wonderland Jam"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">URL Slug <span className="text-destructive">*</span></label>
              <Input
                placeholder="winter-wonderland-jam"
                value={form.slug}
                onChange={(e) => {
                  setSlugEdited(true)
                  updateField('slug', slugify(e.target.value))
                }}
              />
              <p className="text-xs text-muted-foreground">
                Your jam will be available at /jams/{form.slug || 'your-slug'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
              <Textarea
                placeholder="Describe your jam. What's the vibe? What are participants building?"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Theme <span className="text-destructive">*</span></label>
                <Input
                  placeholder="e.g. Only One Level"
                  value={form.theme}
                  onChange={(e) => updateField('theme', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Banner Image URL</label>
                <Input
                  placeholder="https://example.com/banner.jpg"
                  value={form.banner_url}
                  onChange={(e) => updateField('banner_url', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rules</label>
              <Textarea
                placeholder="List any specific rules for participants. Team size, asset rules, engine restrictions, etc."
                value={form.rules}
                onChange={(e) => updateField('rules', e.target.value)}
                rows={4}
              />
            </div>
          </Card>

          {/* Schedule */}
          <Card className="bg-card/50 border-border/50 p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Jam Schedule
            </h2>
            <Separator />

            {/* Submission Phase */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-green-400" />
                <h3 className="font-medium">Submission Phase</h3>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Submissions Open</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Submission Start <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.submission_start}
                    onChange={(e) => updateField('submission_start', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Submission End <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.submission_end}
                    onChange={(e) => updateField('submission_end', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Rating Phase */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <h3 className="font-medium">Rating Phase</h3>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Community Voting</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Rating Start <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.rating_start}
                    onChange={(e) => updateField('rating_start', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Rating End <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.rating_end}
                    onChange={(e) => updateField('rating_end', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Status preview */}
            <Separator />
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Calculated status:</span>
                <Badge className={statusPreview.className}>{statusPreview.label}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Status is auto-determined from the dates above
              </span>
            </div>
          </Card>

          {/* Submit */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              asChild
              className="w-full sm:w-auto"
            >
              <Link href="/jams">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90"
              size="lg"
            >
              {submitting ? (
                <>Creating...</>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Game Jam
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
