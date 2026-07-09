'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase/client'
import { Profile, Post, Video, OwnedAsset, Game } from '@/lib/types/database'
import {
  Users,
  Gamepad2,
  Video as VideoIcon,
  Settings,
  MapPin,
  Link as LinkIcon,
  Calendar,
  UserPlus,
  UserMinus,
  MessageSquare,
  Share2,
  Heart,
  MessageCircle,
  Repeat,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'

interface ProfileWithStats extends Profile {
  is_following?: boolean
}

interface PostWithProfile extends Post {
  profiles: Profile
}

interface VideoWithProfile extends Video {
  profiles: Profile
}

interface AssetWithGame extends OwnedAsset {
  games: Game
}

export default function ProfilePage() {
  const params = useParams()
  const { user: currentUser, profile: currentProfile } = useAuth()
  const [profile, setProfile] = useState<ProfileWithStats | null>(null)
  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [videos, setVideos] = useState<VideoWithProfile[]>([])
  const [assets, setAssets] = useState<AssetWithGame[]>([])
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const isOwnProfile = currentUser && profile && currentUser.id === profile.id

  useEffect(() => {
    const username = params.username as string
    fetchProfile(username)
  }, [params.username])

  const fetchProfile = async (username: string) => {
    // Fetch profile
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle()

    if (!profileData) {
      setLoading(false)
      return
    }

    setProfile(profileData as ProfileWithStats)

    // Check if following
    if (currentUser) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', profileData.id)
        .maybeSingle()

      setProfile(prev => prev ? { ...prev, is_following: !!followData } : prev)
    }

    // Fetch posts
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .eq('user_id', profileData.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (postsData) setPosts(postsData as PostWithProfile[])

    // Fetch videos
    const { data: videosData } = await supabase
      .from('videos')
      .select('*, profiles(*)')
      .eq('user_id', profileData.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (videosData) setVideos(videosData as VideoWithProfile[])

    // Fetch assets (if own profile)
    if (currentUser?.id === profileData.id) {
      const { data: assetsData } = await supabase
        .from('owned_assets')
        .select('*, games(*)')
        .order('created_at', { ascending: false })

      if (assetsData) setAssets(assetsData as AssetWithGame[])
    }

    setLoading(false)
  }

  const handleFollow = async () => {
    if (!currentUser || !profile) return

    setFollowLoading(true)

    if (profile.is_following) {
      await supabase
        .from('follows')
        .delete()
        .match({ follower_id: currentUser.id, following_id: profile.id })

      setProfile(prev => prev ? { ...prev, is_following: false, followers_count: prev.followers_count - 1 } : prev)
      toast.success('Unfollowed')
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: currentUser.id, following_id: profile.id })

      setProfile(prev => prev ? { ...prev, is_following: true, followers_count: prev.followers_count + 1 } : prev)
      toast.success('Following')
    }

    setFollowLoading(false)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-48 w-full rounded-xl mb-6" />
          <div className="flex items-start gap-4 -mt-16">
            <Skeleton className="h-32 w-32 rounded-full border-4 border-background" />
            <div className="pt-20">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">User not found</h1>
          <Button asChild>
            <Link href="/explore">Explore Creators</Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Banner */}
        <div className="relative h-48 md:h-64 rounded-xl overflow-hidden mb-6">
          {profile.banner_url ? (
            <Image src={profile.banner_url} alt="Banner" fill sizes="(max-width: 768px) 100vw, 1024px" className="object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20" />
          )}
        </div>

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start gap-4 -mt-16 md:-mt-20 px-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Info */}
          <div className="flex-1 pt-4 md:pt-20">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold">{profile.display_name || profile.username}</h1>
              {profile.is_verified && (
                <Badge className="w-fit bg-primary/20 text-primary">
                  <Gamepad2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
              {profile.is_creator && (
                <Badge className="w-fit bg-accent/20 text-accent">
                  Creator
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mb-2">@{profile.username}</p>

            {/* Bio */}
            {profile.bio && (
              <p className="mb-4">{profile.bio}</p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website_url && (
                <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                  <LinkIcon className="h-4 w-4" />
                  <span>{profile.website_url.replace(/https?:\/\//, '')}</span>
                </a>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Joined {format(new Date(profile.created_at), 'MMMM yyyy')}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-sm">
              <Link href={`/profile/${profile.username}/followers`} className="hover:text-primary">
                <span className="font-semibold">{profile.followers_count.toLocaleString()}</span>
                <span className="text-muted-foreground ml-1">Followers</span>
              </Link>
              <Link href={`/profile/${profile.username}/following`} className="hover:text-primary">
                <span className="font-semibold">{profile.following_count.toLocaleString()}</span>
                <span className="text-muted-foreground ml-1">Following</span>
              </Link>
              <div>
                <span className="font-semibold">{profile.vault_count}</span>
                <span className="text-muted-foreground ml-1">Games</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4 md:mt-20 w-full md:w-auto">
            {isOwnProfile ? (
              <>
                <Button variant="outline" asChild className="flex-1 md:flex-none">
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-1" />
                    Edit Profile
                  </Link>
                </Button>
                <Button variant="outline" asChild className="flex-1 md:flex-none">
                  <Link href="/vault">
                    <Wallet className="h-4 w-4 mr-1" />
                    My Vault
                  </Link>
                </Button>
              </>
            ) : currentUser ? (
              <>
                <Button
                  onClick={handleFollow}
                  disabled={followLoading}
                  variant={profile.is_following ? 'outline' : 'default'}
                  className="flex-1 md:flex-none"
                >
                  {profile.is_following ? (
                    <>
                      <UserMinus className="h-4 w-4 mr-1" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Follow
                    </>
                  )}
                </Button>
                <Button variant="outline" asChild className="flex-1 md:flex-none">
                  <Link href={`/messages?user=${profile.id}`}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Message
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild className="flex-1 md:flex-none">
                <Link href="/login">Follow</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="posts" className="mt-6">
          <TabsList>
            <TabsTrigger value="posts">
              <Gamepad2 className="h-4 w-4 mr-2" />
              Posts ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="videos">
              <VideoIcon className="h-4 w-4 mr-2" />
              Videos ({videos.length})
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="vault">
                <Wallet className="h-4 w-4 mr-2" />
                My Vault ({assets.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="posts" className="mt-6 space-y-4">
            {posts.length === 0 ? (
              <Card className="bg-card/50 border-border/50 p-12 text-center">
                <p className="text-muted-foreground">No posts yet</p>
              </Card>
            ) : (
              posts.map(post => (
                <Card key={post.id} className="bg-card/50 border-border/50">
                  <CardContent className="p-4">
                    <p className="whitespace-pre-wrap mb-3">{post.content}</p>
                    {post.media_url && (
                      <div className="relative w-full h-96 rounded-lg overflow-hidden">
                        <Image src={post.media_url} alt="Post" fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {post.likes_count}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {post.comments_count}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="videos" className="mt-6">
            {videos.length === 0 ? (
              <Card className="bg-card/50 border-border/50 p-12 text-center">
                <p className="text-muted-foreground">No videos yet</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videos.map(video => (
                  <Link key={video.id} href={`/video/${video.id}`}>
                    <Card className="game-card overflow-hidden">
                      <div className="aspect-video relative">
                        <Image src={video.thumbnail_url || ''} alt={video.title} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                        <Badge className="absolute bottom-2 right-2">{video.duration || '0:00'}</Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold line-clamp-2">{video.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {video.views_count.toLocaleString()} views • {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="vault" className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {assets.map(asset => (
                  <Link key={asset.id} href="/vault">
                    <Card className="vault-card overflow-hidden">
                      <div className="aspect-[3/4] relative">
                        <Image src={asset.games?.cover_url || ''} alt={asset.games?.title} fill sizes="(max-width: 768px) 50vw, 200px" className="object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="font-medium text-sm line-clamp-1">{asset.games?.title}</p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  )
}
