'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase/client'
import { Post, Profile, Comment } from '@/lib/types/database'
import {
  Heart,
  MessageCircle,
  Share2,
  Repeat,
  Send,
  Image as ImageIcon,
  Gamepad2,
  MoreHorizontal,
  Bookmark,
  Trash2,
  Link2,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface PostWithProfile extends Post {
  profiles: Profile
}

interface CommentWithProfile extends Comment {
  profiles: Profile
}

export default function FeedPage() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set())
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [postComments, setPostComments] = useState<Record<string, CommentWithProfile[]>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchPosts()
  }, [user])

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      setPosts(data as PostWithProfile[])

      if (user) {
        // Fetch user's likes
        const { data: likes } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id)
          .not('post_id', 'is', null)

        const likedSet = new Set(likes?.map(l => l.post_id) || [])
        setLikedPosts(likedSet)
      }
    }
    setLoading(false)
  }

  const handlePost = async () => {
    if (!newPostContent.trim() || !user) return

    setPosting(true)
    const { error } = await supabase.from('posts').insert({
      content: newPostContent,
      user_id: user.id,
    })

    if (error) {
      toast.error('Failed to post')
    } else {
      setNewPostContent('')
      fetchPosts()
      toast.success('Posted!')
    }
    setPosting(false)
  }

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error('Sign in to like posts')
      return
    }

    const isLiked = likedPosts.has(postId)

    // Optimistic update
    setLikedPosts(prev => {
      const next = new Set(prev)
      if (isLiked) next.delete(postId)
      else next.add(postId)
      return next
    })

    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) }
        : p
    ))

    const { error } = isLiked
      ? await supabase.from('likes').delete().match({ post_id: postId, user_id: user.id })
      : await supabase.from('likes').insert({ post_id: postId, user_id: user.id })

    if (error) {
      toast.error('Failed to update like')
      // Rollback optimistic updates
      setLikedPosts(prev => {
        const next = new Set(prev)
        if (isLiked) next.add(postId)
        else next.delete(postId)
        return next
      })
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, likes_count: p.likes_count + (isLiked ? 1 : -1) }
          : p
      ))
    }
  }

  const handleRepost = async (postId: string) => {
    if (!user) {
      toast.error('Sign in to repost')
      return
    }

    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, reposts_count: p.reposts_count + 1 } : p
    ))

    const { error } = await supabase.from('posts').insert({
      content: '',
      user_id: user.id,
      post_type: 'repost',
      visibility: 'public',
      original_post_id: postId,
    })

    if (error) {
      toast.error('Failed to repost')
      // Rollback optimistic update
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, reposts_count: p.reposts_count - 1 } : p
      ))
    } else {
      toast.success('Reposted!')
    }
  }

  const handleShare = async (postId: string) => {
    const url = `${window.location.origin}/feed?post=${postId}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleDelete = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) {
      toast.error('Failed to delete post')
    } else {
      setPosts(prev => prev.filter(p => p.id !== postId))
      toast.success('Post deleted')
    }
  }

  const toggleComments = async (postId: string) => {
    const isExpanded = expandedComments.has(postId)
    if (isExpanded) {
      setExpandedComments(prev => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })
    } else {
      setExpandedComments(prev => new Set(prev).add(postId))
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (data) {
        setPostComments(prev => ({ ...prev, [postId]: data as CommentWithProfile[] }))
      }
    }
  }

  const handleComment = async (postId: string) => {
    const content = commentInputs[postId]
    if (!content?.trim() || !user) return

    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      content,
      user_id: user.id,
    })

    if (error) {
      toast.error('Failed to comment')
    } else {
      setCommentInputs(prev => ({ ...prev, [postId]: '' }))
      // Refresh comments
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (data) {
        setPostComments(prev => ({ ...prev, [postId]: data as CommentWithProfile[] }))
      }

      // Update comment count
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ))
      toast.success('Comment posted')
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Your Feed</h1>

        {/* Create Post */}
        <Card className="mb-6 bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex gap-3">
              <Avatar>
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>
                  {profile?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Input
                  placeholder="What's on your mind?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="border-0 bg-secondary/50 focus-visible:ring-0"
                />
              </div>
            </div>
          </CardHeader>
          <CardFooter className="pt-0 justify-between">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => toast.info('Image uploads coming soon!')}>
                <ImageIcon className="h-4 w-4 mr-1" />
                Image
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toast.info('Video uploads coming soon!')}>
                <Gamepad2 className="h-4 w-4 mr-1" />
                Game
              </Button>
            </div>
            <Button onClick={handlePost} disabled={posting || !newPostContent.trim()}>
              <Send className="h-4 w-4 mr-1" />
              Post
            </Button>
          </CardFooter>
        </Card>

        {/* Posts */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-card/50 border-border/50">
                <CardHeader>
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="bg-card/50 border-border/50 p-12 text-center">
            <p className="text-muted-foreground">No posts yet. Be the first to post!</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isLiked={likedPosts.has(post.id)}
                isBookmarked={bookmarkedPosts.has(post.id)}
                commentsExpanded={expandedComments.has(post.id)}
                comments={postComments[post.id] || []}
                commentInput={commentInputs[post.id] || ''}
                onLike={handleLike}
                onRepost={handleRepost}
                onShare={handleShare}
                onDelete={handleDelete}
                onToggleComments={toggleComments}
                onComment={handleComment}
                onCommentInputChange={(val) => setCommentInputs(prev => ({ ...prev, [post.id]: val }))}
                isOwn={user?.id === post.user_id}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function PostCard({
  post,
  isLiked,
  isBookmarked,
  commentsExpanded,
  comments,
  commentInput,
  onLike,
  onRepost,
  onShare,
  onDelete,
  onToggleComments,
  onComment,
  onCommentInputChange,
  isOwn,
  currentUserId,
}: {
  post: PostWithProfile
  isLiked: boolean
  isBookmarked: boolean
  commentsExpanded: boolean
  comments: CommentWithProfile[]
  commentInput: string
  onLike: (id: string) => void
  onRepost: (id: string) => void
  onShare: (id: string) => void
  onDelete: (id: string) => void
  onToggleComments: (id: string) => void
  onComment: (id: string) => void
  onCommentInputChange: (val: string) => void
  isOwn: boolean
  currentUserId?: string
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  return (
    <Card className="bg-card/50 border-border/50 hover:border-border transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Link href={`/profile/${post.profiles?.username}`} className="flex gap-3 items-start">
            <Avatar>
              <AvatarImage src={post.profiles?.avatar_url || ''} />
              <AvatarFallback>
                {post.profiles?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{post.profiles?.display_name || post.profiles?.username}</span>
                {post.profiles?.is_verified && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-primary/20 text-primary">Verified</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{post.profiles?.username}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onShare(post.id)}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                {isOwn && (
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="whitespace-pre-wrap">{post.content}</p>
        {post.media_url && (
          <div className="mt-3 rounded-lg overflow-hidden relative w-full h-96">
            <Image src={post.media_url} alt="Post media" fill sizes="(max-width: 768px) 100vw, 672px" className="object-cover" />
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 ${isLiked ? 'text-destructive' : ''}`}
          onClick={() => onLike(post.id)}
        >
          <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-destructive' : ''}`} />
          {post.likes_count}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => onToggleComments(post.id)}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          {post.comments_count}
        </Button>
        <Button variant="ghost" size="sm" className="flex-1" onClick={() => onRepost(post.id)}>
          <Repeat className="h-4 w-4 mr-1" />
          {post.reposts_count}
        </Button>
        <Button variant="ghost" size="sm" className="flex-1" onClick={() => onShare(post.id)}>
          <Share2 className="h-4 w-4" />
        </Button>
      </CardFooter>

      {/* Comments Section */}
      {commentsExpanded && (
        <div className="px-6 pb-4 border-t border-border/50 pt-4">
          {currentUserId && (
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Write a comment..."
                value={commentInput}
                onChange={(e) => onCommentInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onComment(post.id)}
                className="flex-1"
              />
              <Button size="sm" onClick={() => onComment(post.id)} disabled={!commentInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Link href={`/profile/${comment.profiles?.username}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.profiles?.avatar_url || ''} />
                      <AvatarFallback className="text-xs">
                        {comment.profiles?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/profile/${comment.profiles?.username}`} className="font-medium text-sm hover:underline">
                        {comment.profiles?.display_name || comment.profiles?.username}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(post.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
