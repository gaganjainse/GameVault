'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase/client'
import {
  Users,
  Flag,
  ShoppingBag,
  AlertTriangle,
  Shield,
  DollarSign,
  BarChart3,
  Clock,
  TrendingUp,
  Eye,
  CheckCircle,
  XCircle,
  Gift,
  FileText,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'

interface Stats {
  totalUsers: number
  totalGames: number
  totalRevenue: number
  pendingReports: number
}

export default function AdminDashboard() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalGames: 0, totalRevenue: 0, pendingReports: 0 })
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [allGames, setAllGames] = useState<any[]>([])
  const [creatorGames, setCreatorGames] = useState<any[]>([])
  const [activePromotions, setActivePromotions] = useState<any[]>([])
  const [newPromotion, setNewPromotion] = useState({ gameId: '', endDate: '' })
  const [newDevlog, setNewDevlog] = useState({ gameId: '', title: '', content: '' })

  const fetchAdminData = useCallback(async () => {
    const [usersRes, gamesRes, ordersRes, reportsRes, recentUsersRes, allGamesRes, promotionsRes, creatorGamesRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('games').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total_amount').eq('status', 'completed'),
      supabase.from('moderation_reports').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('games').select('id, title, price, developer').eq('is_active', true).order('title'),
      supabase.from('free_game_promotions').select('*, games(title)').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('games').select('id, title').ilike('developer', profile?.display_name || '').eq('is_active', true),
    ])

    const revenue = ordersRes.data?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0

    setStats({
      totalUsers: usersRes.count || 0,
      totalGames: gamesRes.count || 0,
      totalRevenue: revenue,
      pendingReports: reportsRes.count || 0,
    })
    setReports(reportsRes.data || [])
    setRecentUsers(recentUsersRes.data || [])
    setOrders(ordersRes.data || [])
    setAllGames(allGamesRes.data || [])
    setActivePromotions(promotionsRes.data || [])
    setCreatorGames(creatorGamesRes.data || [])
    setLoading(false)
  }, [profile])

  useEffect(() => {
    if (user) fetchAdminData()
  }, [user, fetchAdminData])

  const handleCreatePromotion = async () => {
    if (!newPromotion.gameId || !newPromotion.endDate) {
      toast.error('Please select a game and end date')
      return
    }
    const game = allGames.find(g => g.id === newPromotion.gameId)
    const { error } = await supabase
      .from('free_game_promotions')
      .insert({
        game_id: newPromotion.gameId,
        start_date: new Date().toISOString(),
        end_date: new Date(newPromotion.endDate).toISOString(),
        original_price: game?.price || 0,
        is_active: true,
      })
    if (error) {
      toast.error('Failed to create promotion')
      return
    }
    toast.success('Free game promotion created!')
    setNewPromotion({ gameId: '', endDate: '' })
    fetchAdminData()
  }

  const handleEndPromotion = async (promoId: string) => {
    const { error } = await supabase
      .from('free_game_promotions')
      .update({ is_active: false })
      .eq('id', promoId)
    if (error) {
      toast.error('Failed to end promotion')
      return
    }
    toast.success('Promotion ended')
    fetchAdminData()
  }

  const handlePostDevlog = async () => {
    if (!user || !newDevlog.gameId || !newDevlog.title || !newDevlog.content) return
    const { error } = await supabase
      .from('devlogs')
      .insert({
        game_id: newDevlog.gameId,
        author_id: user.id,
        title: newDevlog.title,
        content: newDevlog.content,
      })
    if (error) {
      toast.error('Failed to publish devlog')
      return
    }
    toast.success('Devlog published!')
    setNewDevlog({ gameId: '', title: '', content: '' })
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
          <p className="text-muted-foreground">Sign in to access admin features</p>
        </div>
      </AppLayout>
    )
  }

  // Server-side middleware already redirects non-admins away from /admin;
  // this is a client-side backstop (e.g. while the profile is still loading)
  // so the dashboard never renders for a signed-in non-admin account.
  if (!loading && profile && !['admin', 'moderator'].includes(profile.role)) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
          <p className="text-muted-foreground">You don&apos;t have permission to view this page.</p>
        </div>
      </AppLayout>
    )
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={Users} color="primary" />
          <StatCard title="Active Games" value={stats.totalGames.toLocaleString()} icon={ShoppingBag} color="accent" />
          <StatCard title="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} icon={DollarSign} color="success" />
          <StatCard title="Pending Reports" value={stats.pendingReports.toString()} icon={Flag} color="warning" />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="free-games">Free Games</TabsTrigger>
            <TabsTrigger value="devlogs">Devlogs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Users
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentUsers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No users yet</p>
                  ) : recentUsers.slice(0, 5).map((u) => (
                    <Link key={u.id} href={`/profile/${u.username}`} className="flex items-center gap-3 hover:bg-secondary/30 -mx-2 px-2 py-1 rounded">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url || ''} />
                        <AvatarFallback>{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{u.display_name || u.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Pending Reports
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reports.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No pending reports</p>
                  ) : reports.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center gap-3">
                      <Badge variant="outline">{r.target_type || 'Unknown'}</Badge>
                      <div className="flex-1">
                        <p className="text-sm">{r.reason || 'No reason provided'}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                {recentUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No users registered yet</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4 pb-4 border-b border-border text-sm font-medium text-muted-foreground">
                      <div>User</div>
                      <div>Joined</div>
                      <div>Status</div>
                      <div className="text-right">Actions</div>
                    </div>
                    {recentUsers.map((u) => (
                      <div key={u.id} className="grid grid-cols-4 gap-4 py-4 border-b border-border/50 items-center">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.avatar_url || ''} />
                            <AvatarFallback className="text-xs">{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{u.display_name || u.username}</p>
                            <p className="text-xs text-muted-foreground">@{u.username}</p>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">{format(new Date(u.created_at), 'MMM d, yyyy')}</div>
                        <Badge variant={u.is_creator ? 'default' : 'secondary'}>
                          {u.is_creator ? 'Creator' : 'Standard'}
                        </Badge>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/profile/${u.username}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <div className="space-y-4">
              {reports.length === 0 ? (
                <Card className="bg-card/50 border-border/50 p-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                  <h3 className="text-lg font-semibold mb-2">No pending reports</h3>
                  <p className="text-muted-foreground">Everything looks clean!</p>
                </Card>
              ) : reports.map((report) => (
                <Card key={report.id} className="bg-card/50 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{report.target_type || 'Unknown'}</Badge>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm">{report.target_id || 'N/A'}</span>
                        </div>
                        <p className="font-medium">{report.reason || 'No reason provided'}</p>
                        <p className="text-sm text-muted-foreground">
                          Reported {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={async () => {
                          await supabase.from('moderation_reports').update({ status: 'resolved' }).eq('id', report.id)
                          toast.success('Report dismissed')
                          fetchAdminData()
                        }}>Dismiss</Button>
                        <Button size="sm" onClick={async () => {
                          await supabase.from('moderation_reports').update({ status: 'actioned' }).eq('id', report.id)
                          toast.success('Action taken')
                          fetchAdminData()
                        }}>Take Action</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>Transaction Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{orders.length}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-primary">${stats.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground">Avg Order Value</p>
                    <p className="text-2xl font-bold">
                      ${orders.length > 0 ? (stats.totalRevenue / orders.length).toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
                <div className="h-48 flex items-center justify-center bg-secondary/20 rounded-lg">
                  <BarChart3 className="h-12 w-12 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Free Games Management */}
          <TabsContent value="free-games" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-accent" /> Free Games Program
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Select Game</label>
                    <select
                      className="w-full p-2 rounded-lg bg-secondary border border-border text-sm"
                      value={newPromotion.gameId}
                      onChange={(e) => setNewPromotion({ ...newPromotion, gameId: e.target.value })}
                    >
                      <option value="">Select a game...</option>
                      {allGames.map((g) => (
                        <option key={g.id} value={g.id}>{g.title} (${g.price})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">End Date</label>
                    <input
                      type="datetime-local"
                      className="p-2 rounded-lg bg-secondary border border-border text-sm"
                      value={newPromotion.endDate}
                      onChange={(e) => setNewPromotion({ ...newPromotion, endDate: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleCreatePromotion} disabled={!newPromotion.gameId}>
                    <Plus className="h-4 w-4 mr-1" /> Create
                  </Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  {activePromotions.map((promo) => (
                    <div key={promo.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div>
                        <span className="font-medium">{promo.games?.title}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          Ends {formatDistanceToNow(new Date(promo.end_date), { addSuffix: true })}
                        </span>
                      </div>
                      <Button size="sm" variant="destructive" onClick={() => handleEndPromotion(promo.id)}>
                        <XCircle className="h-4 w-4 mr-1" /> End
                      </Button>
                    </div>
                  ))}
                  {activePromotions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No active free game promotions.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Devlog Composer */}
          <TabsContent value="devlogs" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Post a Devlog
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Select Game</label>
                  <select
                    className="w-full p-2 rounded-lg bg-secondary border border-border text-sm"
                    value={newDevlog.gameId}
                    onChange={(e) => setNewDevlog({ ...newDevlog, gameId: e.target.value })}
                  >
                    <option value="">Select your game...</option>
                    {creatorGames.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <Input
                    value={newDevlog.title}
                    onChange={(e) => setNewDevlog({ ...newDevlog, title: e.target.value })}
                    placeholder="Devlog title..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Content</label>
                  <Textarea
                    value={newDevlog.content}
                    onChange={(e) => setNewDevlog({ ...newDevlog, content: e.target.value })}
                    placeholder="Share updates about your game..."
                    rows={6}
                  />
                </div>
                <Button onClick={handlePostDevlog} disabled={!newDevlog.gameId || !newDevlog.title || !newDevlog.content}>
                  <Plus className="h-4 w-4 mr-1" /> Publish Devlog
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  icon: React.ElementType
  color: string
}) {
  const colorClasses: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    accent: 'text-accent bg-accent/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-2xl font-bold mb-1">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  )
}
