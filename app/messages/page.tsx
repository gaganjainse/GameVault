'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Profile, Message } from '@/lib/types/database'
import { Search, Send, Plus, Phone, Video, MoreVertical, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'

interface ConversationWithParticipants {
  id: string
  updated_at: string
  conversation_participants: { user_id: string; profiles: Profile }[]
  messages: { content: string; created_at: string; sender_id: string }[]
}

export default function MessagesPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get('user')
  const [conversations, setConversations] = useState<ConversationWithParticipants[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<(Message & { profiles: Profile })[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConversations = useCallback(async () => {
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user?.id)

    if (participants && participants.length > 0) {
      const conversationIds = participants.map(p => p.conversation_id)

      const { data } = await supabase
        .from('conversations')
        .select(`
          id,
          updated_at,
          conversation_participants!inner (
            user_id,
            profiles (*)
          ),
          messages (
            content,
            created_at,
            sender_id
          )
        `)
        .in('id', conversationIds)
        .order('updated_at', { ascending: false })

      if (data) {
        setConversations(data as unknown as ConversationWithParticipants[])
      }
    }
    setLoading(false)
  }, [user])

  const startNewConversation = useCallback(async (userId: string) => {
    // Create new conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single()

    if (convError || !conv) return

    // Add participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user?.id },
      { conversation_id: conv.id, user_id: userId },
    ])

    setSelectedConversation(conv.id)
    fetchConversations()
  }, [user, fetchConversations])

  useEffect(() => {
    if (user) {
      fetchConversations()
      if (targetUserId) {
        startNewConversation(targetUserId)
      }
    }
  }, [user, targetUserId, fetchConversations, startNewConversation])

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(*)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data as unknown as (Message & { profiles: Profile })[])
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return

    setSending(true)
    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversation,
      content: newMessage,
      sender_id: user.id,
    })

    if (!error) {
      setNewMessage('')
      fetchMessages(selectedConversation)
      fetchConversations()
    }
    setSending(false)
  }

  const getOtherParticipant = (conv: ConversationWithParticipants) => {
    return conv.conversation_participants.find(p => p.user_id !== user?.id)?.profiles
  }

  const getLastMessage = (conv: ConversationWithParticipants) => {
    return conv.messages?.[conv.messages.length - 1]
  }

  const formatMessageTime = (date: string) => {
    const d = new Date(date)
    if (isToday(d)) return format(d, 'h:mm a')
    if (isYesterday(d)) return 'Yesterday'
    return format(d, 'MMM d')
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Messages</h1>
          <p className="text-muted-foreground">Sign in to view your messages</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-10rem)]">
          {/* Conversations List */}
          <Card className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col bg-card/50 border-border/50`}>
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search conversations" className="pl-10" />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No conversations yet</p>
                  <p className="text-sm mt-1">Start chatting with other users!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {conversations.map((conv) => {
                    const otherUser = getOtherParticipant(conv)
                    const lastMsg = getLastMessage(conv)

                    return (
                      <button
                        key={conv.id}
                        onClick={() => {
                          setSelectedConversation(conv.id)
                          fetchMessages(conv.id)
                        }}
                        className={`w-full p-4 flex gap-3 hover:bg-card/70 transition-colors ${selectedConversation === conv.id ? 'bg-primary/10' : ''}`}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={otherUser?.avatar_url || ''} />
                          <AvatarFallback>{otherUser?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{otherUser?.display_name || otherUser?.username}</p>
                            <span className="text-xs text-muted-foreground">
                              {lastMsg && formatMessageTime(lastMsg.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{lastMsg?.content}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          {selectedConversation ? (
            <Card className="col-span-1 md:col-span-2 flex flex-col bg-card/50 border-border/50">
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  {(() => {
                    const conv = conversations.find(c => c.id === selectedConversation)
                    const otherUser = conv ? getOtherParticipant(conv) : null
                    return (
                      <>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={otherUser?.avatar_url || ''} />
                          <AvatarFallback>{otherUser?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{otherUser?.display_name || otherUser?.username || 'Chat'}</p>
                          <p className="text-xs text-muted-foreground">@{otherUser?.username}</p>
                        </div>
                      </>
                    )
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon"><Phone className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon"><Video className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary'} rounded-2xl px-4 py-2`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="hidden md:flex col-span-2 items-center justify-center bg-card/50 border-border/50">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium mb-2">Select a conversation</p>
                <p className="text-sm">Choose from your existing conversations or start a new one</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
