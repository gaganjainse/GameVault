'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase/client'
import { Order, Game } from '@/lib/types/database'
import { ShoppingBag, DollarSign, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'

interface OrderWithGame extends Order {
  games: Game
}

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderWithGame[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, games(*)')
      .eq('buyer_id', user?.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data as OrderWithGame[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) fetchOrders()
  }, [user, fetchOrders])

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Orders</h1>
          <p className="text-muted-foreground mb-8">Sign in to view your order history</p>
          <Button asChild><Link href="/login">Sign In</Link></Button>
        </div>
      </AppLayout>
    )
  }

  const filtered = orders.filter(o => {
    if (filter === 'completed') return o.status === 'completed'
    if (filter === 'pending') return o.status === 'pending'
    if (filter === 'refunded') return o.status === 'refunded'
    return true
  })

  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingBag className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Order History</h1>
        </div>
        <p className="text-muted-foreground mb-6">Track your purchases and transactions</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-3xl font-bold">{orders.length}</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-3xl font-bold text-primary">${totalSpent.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold">{orders.filter(o => o.status === 'completed').length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={filter} onValueChange={setFilter} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="refunded">Refunded</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-card/50 border-border/50">
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card/50 border-border/50 p-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-6">Start building your collection</p>
            <Button asChild><Link href="/marketplace">Browse Marketplace</Link></Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map(order => (
              <Card key={order.id} className="bg-card/50 border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                      <Image
                        src={order.games?.cover_url || 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg'}
                        alt={order.games?.title || 'Game cover'}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{order.games?.title || 'Unknown Game'}</h3>
                        <Badge variant="outline" className="capitalize">{order.order_type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(order.created_at), 'MMM d, yyyy')}
                        </span>
                        <span>${Number(order.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {order.status === 'completed' && (
                        <Badge className="bg-success/20 text-success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                      {order.status === 'pending' && (
                        <Badge className="bg-warning/20 text-warning">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      {order.status === 'refunded' && (
                        <Badge className="bg-destructive/20 text-destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Refunded
                        </Badge>
                      )}
                      {order.games?.slug && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/game/${order.games.slug}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
