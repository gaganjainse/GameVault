'use client'

import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Notification, Profile } from '@/lib/types/database'
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  ShoppingBag,
  DollarSign,
  Repeat,
  Gamepad2,
  Check,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface NotificationWithProfile extends Notification {
  profiles?: Profile
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setNotifications(data)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) fetchNotifications()
  }, [user, fetchNotifications])

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user?.id)

    fetchNotifications()
  }

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user?.id)
      .eq('is_read', false)

    fetchNotifications()
    toast.success('All notifications marked as read')
  }

  const deleteNotification = async (id: string) => {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id)

    fetchNotifications()
    toast.success('Notification deleted')
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="h-4 w-4 text-destructive" />
      case 'comment': return <MessageCircle className="h-4 w-4 text-primary" />
      case 'follow': return <UserPlus className="h-4 w-4 text-accent" />
      case 'purchase': return <ShoppingBag className="h-4 w-4 text-success" />
      case 'sale': return <DollarSign className="h-4 w-4 text-warning" />
      case 'resale': return <Repeat className="h-4 w-4 text-primary" />
      case 'game': return <Gamepad2 className="h-4 w-4 text-accent" />
      default: return <Bell className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getNotificationLink = (notif: NotificationWithProfile) => {
    switch (notif.reference_type) {
      case 'post': return `/feed?post=${notif.reference_id}`
      case 'profile': return `/profile/${notif.content?.split('@')[1]?.split(' ')[0] || ''}`
      case 'game': return `/game/${notif.reference_id}`
      case 'order': return `/orders`
      case 'listing': return `/listing/${notif.reference_id}`
      default: return '/notifications'
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Notifications</h1>
          <p className="text-muted-foreground">Sign in to view your notifications</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="flex-1 h-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card className="bg-card/50 border-border/50 p-12 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">You have no notifications</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <Link key={notif.id} href={getNotificationLink(notif)}>
                <Card className={`bg-card/50 border-border/50 ${!notif.is_read ? 'border-l-2 border-l-primary' : ''} hover:bg-card/70 transition-colors`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        {getNotificationIcon(notif.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{notif.title}</p>
                        {notif.content && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{notif.content}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
