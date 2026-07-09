'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase/client'
import { Video, Profile, Comment } from '@/lib/types/database'
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  MoreHorizontal,
  Eye,
  Clock,
  MessageCircle,
  Send,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/lib/auth/auth-context'
import { toast } from 'sonner'

interface VideoWithProfile extends Video {
  profiles: Profile
}

export default function VideoWatchPage() {
  const params = useParams()
  const { user } = useAuth()
  const [video, setVideo] = useState<VideoWithProfile | null>(null)
  const [comments, setComments] = useState<(Comment & { profiles: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [relatedVideos, setRelatedVideos] = useState<VideoWithProfile[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchVideo = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('videos')
      .select('*, profiles(*)')
      .eq('id', id)
      .maybeSingle()

    if (data) {
      setVideo(data as VideoWithProfile)
      setLikeCount(data.likes_count || 0)

      // Increment views
      await supabase
        .from('videos')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', id)

      // Check if user liked this video
      if (user) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('video_id', id)
          .maybeSingle()
        setIsLiked(!!likeData)

        // Check if subscribed to creator
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', data.user_id)
          .maybeSingle()
        setIsSubscribed(!!followData)
      }

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, profiles(*)')
        .eq('video_id', id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (commentsData) setComments(commentsData as (Comment & { profiles: Profile })[])

      // Fetch related videos
      const { data: relatedData } = await supabase
        .from('videos')
        .select('*, profiles(*)')
        .neq('id', id)
        .limit(6)

      if (relatedData) setRelatedVideos(relatedData as VideoWithProfile[])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    const id = params.id as string
    fetchVideo(id)
  }, [params.id, fetchVideo])

  const handleLike = async () => {
    if (!user || !video) {
      toast.error('Sign in to like videos')
      return
    }

    setActionLoading(true)
    if (isLiked) {
      await supabase.from('likes').delete().match({ video_id: video.id, user_id: user.id })
      setIsLiked(false)
      setLikeCount(c => c - 1)
      await supabase.from('videos').update({ likes_count: likeCount - 1 }).eq('id', video.id)
    } else {
      await supabase.from('likes').insert({ video_id: video.id, user_id: user.id })
      setIsLiked(true)
      setLikeCount(c => c + 1)
      await supabase.from('videos').update({ likes_count: likeCount + 1 }).eq('id', video.id)
    }
    setActionLoading(false)
  }

  const handleSubscribe = async () => {
    if (!user || !video) {
      toast.error('Sign in to subscribe')
      return
    }

    setActionLoading(true)
    if (isSubscribed) {
      await supabase.from('follows').delete().match({ follower_id: user.id, following_id: video.user_id })
      setIsSubscribed(false)
      toast.success('Unsubscribed')
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: video.user_id })
      setIsSubscribed(true)
      toast.success('Subscribed!')
    }
    setActionLoading(false)
  }

  const handleComment = async () => {
    if (!newComment.trim() || !user || !video) return

    const { error } = await supabase.from('comments').insert({
      video_id: video.id,
      content: newComment,
      user_id: user.id,
    })

    if (!error) {
      setNewComment('')
      fetchVideo(video.id)
      toast.success('Comment posted')
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto">
          <Skeleton className="aspect-video w-full rounded-xl mb-4" />
          <Skeleton className="h-8 w-3/4 mb-4" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!video) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Video not found</h1>
          <Button asChild><Link href="/explore">Explore Videos</Link></Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video */}
          <div className="lg:col-span-2">
            {/* Video Player */}
            <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4 relative">
              {video.video_url ? (
                <video
                  src={video.video_url}
                  controls
                  className="w-full h-full object-contain"
                  poster={video.thumbnail_url || ''}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <div className="w-0 h-0 border-l-[24px] border-l-primary border-t-[14px] border-t-transparent border-b-[14px] border-b-transparent ml-2" />
                    </div>
                    <p className="text-muted-foreground">Video preview</p>
                  </div>
                </div>
              )}
            </div>

            {/* Video Info */}
            <h1 className="text-xl md:text-2xl font-bold mb-3">{video.title}</h1>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <Link href={`/profile/${video.profiles?.username}`} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={video.profiles?.avatar_url || ''} />
                    <AvatarFallback>{video.profiles?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{video.profiles?.display_name || video.profiles?.username}</div>
                    <div className="text-xs text-muted-foreground">
                      {video.profiles?.followers_count?.toLocaleString() || 0} followers
                    </div>
                  </div>
                </Link>
                <Button variant={isSubscribed ? 'outline' : 'secondary'} size="sm" onClick={handleSubscribe} disabled={actionLoading}>
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant={isLiked ? 'secondary' : 'default'} size="sm" onClick={handleLike} disabled={actionLoading}>
                  <ThumbsUp className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                  {likeCount}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => toast.info('Dislikes are private')}>
                  <ThumbsDown className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm">
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
                <Button variant="secondary" size="sm">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {video.views_count?.toLocaleString() || 0} views
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
              </div>
            </div>

            {/* Comments */}
            <Separator className="my-6" />

            <h2 className="text-lg font-semibold mb-4">{video.comments_count || comments.length} Comments</h2>

            {/* Add Comment */}
            {user && (
              <div className="flex gap-3 mb-6">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleComment} disabled={!newComment.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Comment List */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Link href={`/profile/${comment.profiles?.username}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.profiles?.avatar_url || ''} />
                      <AvatarFallback>{comment.profiles?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.profiles?.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-foreground">
                        <ThumbsUp className="h-3 w-3" />
                        {comment.likes_count}
                      </button>
                      <button className="hover:text-foreground">Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar - Related Videos */}
          <div className="space-y-4">
            <h3 className="font-semibold">Related Videos</h3>
            {relatedVideos.map((related) => (
              <Link key={related.id} href={`/video/${related.id}`}>
                <div className="flex gap-3 group">
                  <div className="w-40 aspect-video rounded-lg overflow-hidden relative flex-shrink-0">
                    <Image src={related.thumbnail_url || ''} alt={related.title} fill sizes="160px" className="object-cover" />
                    <Badge className="absolute bottom-1 right-1 text-xs">{related.duration || '0:00'}</Badge>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {related.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">{related.profiles?.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {related.views_count?.toLocaleString() || 0} views
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
