'use client'

import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase/client'
import { Profile } from '@/lib/types/database'
import { useAuth } from '@/lib/auth/auth-context'
import { Search, Users, Radio, UserPlus, UserMinus, Gamepad2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function CreatorsPage() {
  const { user } = useAuth()
  const [creators, setCreators] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({})

  const fetchCreators = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('followers_count', { ascending: false })
      .limit(50)

    if (!error && data) {
      setCreators(data as Profile[])

      if (user) {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)

        const map: Record<string, boolean> = {}
        follows?.forEach(f => { map[f.following_id] = true })
        setFollowStates(map)
      }
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchCreators()
  }, [fetchCreators])

  const handleFollow = async (creator: Profile) => {
    if (!user) {
      toast.error('Sign in to follow creators')
      return
    }

    const isFollowing = followStates[creator.id]
    setFollowStates(prev => ({ ...prev, [creator.id]: !isFollowing }))

    if (isFollowing) {
      await supabase.from('follows').delete().match({ follower_id: user.id, following_id: creator.id })
      toast.success(`Unfollowed @${creator.username}`)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: creator.id })
      toast.success(`Following @${creator.username}`)
    }
  }

  const filtered = creators.filter(c =>
    c.username?.toLowerCase().includes(search.toLowerCase()) ||
    c.display_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Creators</h1>
        </div>
        <p className="text-muted-foreground mb-6">Discover and follow top gaming creators</p>

        <div className="relative max-w-xl mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="p-6 text-center">
                <Skeleton className="w-20 h-20 rounded-full mx-auto mb-4" />
                <Skeleton className="h-5 w-24 mx-auto mb-2" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card/50 border-border/50 p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No creators found</h3>
            <p className="text-muted-foreground">Try adjusting your search</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(creator => (
              <Card key={creator.id} className="p-6 text-center hover:bg-card/70 transition-colors">
                <Link href={`/profile/${creator.username}`}>
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={creator.avatar_url || ''} />
                      <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                        {creator.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <h3 className="font-semibold">{creator.display_name || creator.username}</h3>
                  <p className="text-sm text-muted-foreground mb-2">@{creator.username}</p>
                  {creator.is_creator && (
                    <Badge className="mb-2 bg-accent/20 text-accent">
                      <Gamepad2 className="h-3 w-3 mr-1" />
                      Creator
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground mb-4">
                    {(creator.followers_count || 0).toLocaleString()} followers
                  </p>
                </Link>
                {user?.id !== creator.id && (
                  <Button
                    variant={followStates[creator.id] ? 'outline' : 'default'}
                    size="sm"
                    className="w-full"
                    onClick={() => handleFollow(creator)}
                  >
                    {followStates[creator.id] ? (
                      <><UserMinus className="h-4 w-4 mr-1" /> Following</>
                    ) : (
                      <><UserPlus className="h-4 w-4 mr-1" /> Follow</>
                    )}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
