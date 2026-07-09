'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase/client'
import { Livestream, Profile } from '@/lib/types/database'
import { Radio, Users, Eye, Video as VideoIcon } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface StreamWithProfile extends Livestream {
  profiles: Profile
}

export default function LivestreamsPage() {
  const [liveStreams, setLiveStreams] = useState<StreamWithProfile[]>([])
  const [recentStreams, setRecentStreams] = useState<StreamWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStreams()
  }, [])

  const fetchStreams = async () => {
    const { data: live } = await supabase
      .from('livestreams')
      .select('*, profiles(*)')
      .eq('is_live', true)
      .order('viewers_count', { ascending: false })

    if (live) setLiveStreams(live as StreamWithProfile[])

    const { data: recent } = await supabase
      .from('livestreams')
      .select('*, profiles(*)')
      .eq('is_live', false)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(12)

    if (recent) setRecentStreams(recent as StreamWithProfile[])
    setLoading(false)
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Radio className="h-8 w-8 text-destructive" />
          <h1 className="text-3xl font-bold">Live Streams</h1>
        </div>
        <p className="text-muted-foreground mb-6">Watch live gameplay from creators around the world</p>

        <Tabs defaultValue="live">
          <TabsList className="mb-6">
            <TabsTrigger value="live">
              <Radio className="h-4 w-4 mr-2" />
              Live Now
              {liveStreams.length > 0 && (
                <Badge className="ml-2 bg-destructive">{liveStreams.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent">
              <VideoIcon className="h-4 w-4 mr-2" />
              Recently Ended
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="game-card overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : liveStreams.length === 0 ? (
              <Card className="bg-card/50 border-border/50 p-12 text-center">
                <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No live streams right now</h3>
                <p className="text-muted-foreground mb-6">Check back later or browse recent streams</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveStreams.map((stream) => (
                  <StreamCard key={stream.id} stream={stream} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="game-card overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                  </Card>
                ))}
              </div>
            ) : recentStreams.length === 0 ? (
              <Card className="bg-card/50 border-border/50 p-12 text-center">
                <VideoIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No recent streams</h3>
                <p className="text-muted-foreground">Streams will appear here after they end</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentStreams.map((stream) => (
                  <StreamCard key={stream.id} stream={stream} ended />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}

function StreamCard({ stream, ended }: { stream: StreamWithProfile; ended?: boolean }) {
  return (
    <Link href={`/stream/${stream.id}`}>
      <Card className="game-card overflow-hidden group cursor-pointer h-full">
        <div className="aspect-video relative">
          <img
            src={stream.thumbnail_url || 'https://images.pexels.com/photos/1670988/pexels-photo-1670988.jpeg'}
            alt={stream.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {!ended && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-destructive rounded-full">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-medium text-white">LIVE</span>
            </div>
          )}
          {ended && (
            <Badge className="absolute top-2 left-2 bg-black/70">Ended</Badge>
          )}
          {stream.viewers_count != null && !ended && (
            <span className="absolute top-2 right-2 px-2 py-1 bg-black/80 rounded text-xs flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {stream.viewers_count.toLocaleString()}
            </span>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold line-clamp-2 mb-1">{stream.title}</h3>
          <p className="text-sm text-muted-foreground">{stream.profiles?.display_name || stream.profiles?.username}</p>
          {ended && stream.ended_at && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Users className="h-3 w-3" />
              Ended {formatDistanceToNow(new Date(stream.ended_at), { addSuffix: true })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
