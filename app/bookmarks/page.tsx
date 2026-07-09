'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'
import { Game } from '@/lib/types/database'
import { Bookmark, ShoppingBag, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface WishlistGame {
  id: string
  game_id: string
  created_at: string
  games: Game
}

export default function BookmarksPage() {
  const { user } = useAuth()
  const [wishlist, setWishlist] = useState<WishlistGame[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWishlist = useCallback(async () => {
    const { data, error } = await supabase
      .from('wishlist')
      .select('*, games(*)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setWishlist(data as WishlistGame[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) fetchWishlist()
  }, [user, fetchWishlist])

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('wishlist').delete().eq('id', id)
    if (!error) {
      setWishlist(prev => prev.filter(w => w.id !== id))
      toast.success('Removed from wishlist')
    }
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Wishlist</h1>
          <p className="text-muted-foreground mb-8">Sign in to view your wishlist</p>
          <Button asChild><Link href="/login">Sign In</Link></Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Bookmark className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Wishlist</h1>
        </div>
        <p className="text-muted-foreground mb-6">Games you want to play later</p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[3/4] w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <Card className="bg-card/50 border-border/50 p-12 text-center">
            <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
            <p className="text-muted-foreground mb-6">Bookmark games you want to buy later</p>
            <Button asChild><Link href="/marketplace">Browse Marketplace</Link></Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlist.map(item => (
              <Card key={item.id} className="game-card overflow-hidden group h-full flex flex-col">
                <Link href={`/game/${item.games.slug}`} className="flex-1 flex flex-col">
                  <div className="aspect-[3/4] relative">
                    <Image
                      src={item.games.cover_url || 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg'}
                      alt={item.games.title}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {item.games.genre && (
                      <Badge className="absolute top-3 right-3">{item.games.genre}</Badge>
                    )}
                  </div>
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold mb-1 line-clamp-1">{item.games.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{item.games.developer}</p>
                    <div className="mt-auto">
                      <span className="font-display text-xl font-bold text-primary">${item.games.price}</span>
                    </div>
                  </CardContent>
                </Link>
                <div className="p-4 pt-0 flex gap-2">
                  <Button size="sm" className="flex-1" asChild>
                    <Link href={`/game/${item.games.slug}`}>
                      <ShoppingBag className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRemove(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
