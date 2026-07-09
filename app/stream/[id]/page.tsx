'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase/client'
import { Livestream, Profile } from '@/lib/types/database'
import { useAuth } from '@/lib/auth/auth-context'
import {
  Radio,
  Eye,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Send,
  Gift,
  MoreHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface StreamWithProfile extends Livestream {
  profiles: Profile
}

interface ChatMessage {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: Profile
}

export default function StreamWatchPage() {
  const params = useParams()
  const { user, profile } = useAuth()
  const [stream, setStream] = useState<StreamWithProfile | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [gameTitle, setGameTitle] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = params.id as string
    fetchStream(id)

    // Simulate real-time chat with polling
    const interval = setInterval(() => {
      fetchMessages(id)
    }, 3000)

    return () => clearInterval(interval)
  }, [params.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchStream = async (id: string) => {
    const { data, error } = await supabase
      .from('livestreams')
      .select('*, profiles(*)')
      .eq('id', id)
      .maybeSingle()

    if (data) {
      setStream(data as StreamWithProfile)
      await fetchMessages(id)

      // Check if following
      if (user && data.user_id !== user.id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', data.user_id)
          .maybeSingle()
        setIsFollowing(!!followData)
      }

      // Fetch game title
      if (data.game_id) {
        const { data: gameData } = await supabase
          .from('games')
          .select('title')
          .eq('id', data.game_id)
          .maybeSingle()
        setGameTitle(gameData?.title || null)
      }
    }
    setLoading(false)
  }

  const fetchMessages = async (streamId: string) => {
    const { data } = await supabase
      .from('live_chat_messages')
      .select('*, profiles(*)')
      .eq('livestream_id', streamId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (data) setMessages(data as ChatMessage[])
  }

  const handleFollow = async () => {
    if (!user || !stream) {
      toast.error('Sign in to follow')
      return
    }

    setFollowLoading(true)
    if (isFollowing) {
      await supabase.from('follows').delete().match({ follower_id: user.id, following_id: stream.user_id })
      setIsFollowing(false)
      toast.success('Unfollowed')
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: stream.user_id })
      setIsFollowing(true)
      toast.success('Following!')
    }
    setFollowLoading(false)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !stream) return

    const { error } = await supabase.from('live_chat_messages').insert({
      livestream_id: stream.id,
      content: newMessage,
      user_id: user.id,
    })

    if (!error) {
      setNewMessage('')
      await fetchMessages(stream.id)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!stream) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Stream not found</h1>
          <Button asChild><Link href="/livestreams">Browse Streams</Link></Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Stream */}
          <div className="lg:col-span-3 space-y-4">
            {/* Stream Player */}
            <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
              {stream.stream_url ? (
                <video src={stream.stream_url} className="w-full h-full object-contain" autoPlay />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-destructive/10 to-accent/10">
                  <div className="text-center">
                    <Radio className="h-16 w-16 text-destructive mx-auto mb-4 animate-pulse" />
                    <p className="text-xl font-semibold mb-1">{stream.title}</p>
                    <p className="text-muted-foreground">Stream preview</p>
                  </div>
                </div>
              )}

              {/* Live Badge */}
              {stream.is_live && (
                <Badge className="absolute top-4 left-4 bg-destructive animate-pulse">
                  <Radio className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              )}

              {/* Viewer Count */}
              <Badge className="absolute top-4 right-4 bg-black/80">
                <Eye className="h-3 w-3 mr-1" />
                {stream.viewers_count?.toLocaleString() || 0} watching
              </Badge>
            </div>

            {/* Stream Info */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Link href={`/profile/${stream.profiles?.username}`}>
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={stream.profiles?.avatar_url || ''} />
                    <AvatarFallback>{stream.profiles?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link href={`/profile/${stream.profiles?.username}`} className="hover:underline">
                    <h1 className="text-xl font-bold">{stream.title}</h1>
                  </Link>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{stream.profiles?.display_name || stream.profiles?.username}</span>
                    <span>•</span>
                    <span>{stream.profiles?.followers_count?.toLocaleString() || 0} followers</span>
                  </div>
                  {gameTitle && (
                    <Badge variant="outline" className="mt-2">Playing: {gameTitle}</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm">
                  <Follow isFollowing={isFollowing} onClick={handleFollow} disabled={followLoading} />
                </Button>
                <Button variant="secondary" size="sm">
                  <Gift className="h-4 w-4 mr-1" />
                  Gift
                </Button>
                <Button variant="secondary" size="sm">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stream Description */}
            {stream.description && (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <p className="text-muted-foreground">{stream.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Started {stream.started_at ? formatDistanceToNow(new Date(stream.started_at), { addSuffix: true }) : 'recently'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-[calc(100vh-12rem)] flex flex-col bg-card/50 border-border/50">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Live Chat
                </h3>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">No messages yet. Start the conversation!</p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="flex gap-2">
                        <Link href={`/profile/${msg.profiles?.username}`}>
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={msg.profiles?.avatar_url || ''} />
                            <AvatarFallback className="text-xs">{msg.profiles?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm text-primary">{msg.profiles?.username}: </span>
                          <span className="text-sm break-words">{msg.content}</span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                {user ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Send a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} size="icon" disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button asChild className="w-full" variant="secondary">
                    <Link href="/login">Sign in to chat</Link>
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function Follow({ isFollowing, onClick, disabled }: { isFollowing: boolean; onClick: () => void; disabled?: boolean }) {
  return isFollowing ? (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <Heart className="h-4 w-4 mr-1 text-destructive fill-destructive" />
      Following
    </Button>
  ) : (
    <Button size="sm" onClick={onClick} disabled={disabled}>
      <Heart className="h-4 w-4 mr-1" />
      Follow
    </Button>
  )
}
