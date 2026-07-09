'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import {
  User,
  Bell,
  Shield,
  Eye,
  Wallet,
  Link as LinkIcon,
  Camera,
  Save,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)

  // Profile form state
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [location, setLocation] = useState(profile?.location || '')
  const [websiteUrl, setWebsiteUrl] = useState(profile?.website_url || '')

  // Settings state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [privacyLevel, setPrivacyLevel] = useState('public')

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle()

    if (data) {
      setEmailNotifications(data.email_notifications ?? true)
      setPushNotifications(data.push_notifications ?? true)
      setDarkMode(data.dark_mode ?? true)
      setPrivacyLevel(data.privacy_level || 'public')
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchSettings()
    }
  }, [user, fetchSettings])

  const handleSaveProfile = async () => {
    if (!user) return

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        bio: bio,
        location: location,
        website_url: websiteUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to save profile')
    } else {
      await refreshProfile()
      toast.success('Profile updated')
    }
    setSaving(false)
  }

  const handleSaveSettings = async () => {
    if (!user) return

    setSaving(true)
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        dark_mode: darkMode,
        privacy_level: privacyLevel,
      })

    if (error) {
      toast.error('Failed to save settings')
    } else {
      toast.success('Settings updated')
    }
    setSaving(false)
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Settings</h1>
          <p className="text-muted-foreground">Sign in to manage your settings</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your profile details and public information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                      {profile?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm">
                      <Camera className="h-4 w-4 mr-2" />
                      Change Avatar
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" value={profile?.username || ''} disabled />
                    <p className="text-xs text-muted-foreground">Usernames cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={profile?.username || ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://your-website.com"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell the community about yourself..."
                      className="h-20"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Control how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Browser push notifications</p>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </div>

                <Separator />

                <div className="space-y-4">
                  <p className="font-medium">Notification Types</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">New followers</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Post likes and comments</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Purchase confirmations</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Resale activity</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Promotional updates</span>
                      <Switch />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={saving}>
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Control who can see your content and activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Profile Visibility</p>
                    <p className="text-sm text-muted-foreground">Who can view your profile</p>
                  </div>
                  <select
                    value={privacyLevel}
                    onChange={(e) => setPrivacyLevel(e.target.value)}
                    className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="public">Public</option>
                    <option value="followers">Followers Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show Vault on Profile</p>
                      <p className="text-sm text-muted-foreground">Display your owned games</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show Activity Status</p>
                      <p className="text-sm text-muted-foreground">When you&apos;re online or playing</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Allow Direct Messages</p>
                      <p className="text-sm text-muted-foreground">From all users or followers only</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <div className="space-y-4">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    Your account details and email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm">{user.email}</p>
                  </div>
                  <div>
                    <Label>Account Created</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label>Account Type</Label>
                    <div className="flex gap-2 mt-1">
                      <Badge>Standard</Badge>
                      {profile?.is_creator && <Badge className="bg-accent/20 text-accent">Creator</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Two-Factor Authentication
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Connected Accounts
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-destructive/10 border-destructive/20">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    These actions are irreversible. Please proceed with caution.
                  </p>
                  <Button variant="destructive" className="w-full">
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
