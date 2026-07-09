export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          location: string | null
          website_url: string | null
          is_creator: boolean
          is_verified: boolean
          followers_count: number
          following_count: number
          posts_count: number
          vault_count: number
          is_curator: boolean
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          location?: string | null
          website_url?: string | null
          is_creator?: boolean
          is_verified?: boolean
          followers_count?: number
          following_count?: number
          posts_count?: number
          vault_count?: number
          is_curator?: boolean
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          location?: string | null
          website_url?: string | null
          is_creator?: boolean
          is_verified?: boolean
          followers_count?: number
          following_count?: number
          posts_count?: number
          vault_count?: number
          is_curator?: boolean
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string | null
          media_url: string | null
          media_type: string | null
          post_type: string
          game_id: string | null
          visibility: string
          likes_count: number
          comments_count: number
          reposts_count: number
          original_post_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          content?: string | null
          media_url?: string | null
          media_type?: string | null
          post_type?: string
          game_id?: string | null
          visibility?: string
          likes_count?: number
          comments_count?: number
          reposts_count?: number
          original_post_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string | null
          media_url?: string | null
          media_type?: string | null
          post_type?: string
          game_id?: string | null
          visibility?: string
          likes_count?: number
          comments_count?: number
          reposts_count?: number
          original_post_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      games: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          developer: string | null
          publisher: string | null
          cover_url: string | null
          banner_url: string | null
          genre: string | null
          release_date: string | null
          price: number
          royalty_percentage: number
          is_resellable: boolean
          is_active: boolean
          downloads_count: number
          trailer_url: string | null
          rating_average: number
          rating_count: number
          is_featured: boolean
          minimum_price: number | null
          download_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          developer?: string | null
          publisher?: string | null
          cover_url?: string | null
          banner_url?: string | null
          genre?: string | null
          release_date?: string | null
          price: number
          royalty_percentage?: number
          is_resellable?: boolean
          is_active?: boolean
          downloads_count?: number
          trailer_url?: string | null
          rating_average?: number
          rating_count?: number
          is_featured?: boolean
          minimum_price?: number | null
          download_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          developer?: string | null
          publisher?: string | null
          cover_url?: string | null
          banner_url?: string | null
          genre?: string | null
          release_date?: string | null
          price?: number
          royalty_percentage?: number
          is_resellable?: boolean
          is_active?: boolean
          downloads_count?: number
          trailer_url?: string | null
          rating_average?: number
          rating_count?: number
          is_featured?: boolean
          minimum_price?: number | null
          download_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      owned_assets: {
        Row: {
          id: string
          user_id: string
          game_id: string
          asset_id: string
          purchase_price: number
          purchase_date: string
          is_installed: boolean
          is_listed: boolean
          last_played_at: string | null
          play_time_hours: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          game_id: string
          asset_id: string
          purchase_price: number
          purchase_date?: string
          is_installed?: boolean
          is_listed?: boolean
          last_played_at?: string | null
          play_time_hours?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string
          asset_id?: string
          purchase_price?: number
          purchase_date?: string
          is_installed?: boolean
          is_listed?: boolean
          last_played_at?: string | null
          play_time_hours?: number
          created_at?: string
        }
      }
      listings: {
        Row: {
          id: string
          asset_id: string
          seller_id: string
          price: number
          status: string
          views_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          asset_id: string
          seller_id: string
          price: number
          status?: string
          views_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          asset_id?: string
          seller_id?: string
          price?: number
          status?: string
          views_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      videos: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          thumbnail_url: string | null
          video_url: string
          duration: number | null
          views_count: number
          likes_count: number
          comments_count: number
          shares_count: number
          visibility: string
          game_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          description?: string | null
          thumbnail_url?: string | null
          video_url: string
          duration?: number | null
          views_count?: number
          likes_count?: number
          comments_count?: number
          shares_count?: number
          visibility?: string
          game_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          video_url?: string
          duration?: number | null
          views_count?: number
          likes_count?: number
          comments_count?: number
          shares_count?: number
          visibility?: string
          game_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      livestreams: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          thumbnail_url: string | null
          stream_url: string | null
          is_live: boolean
          viewers_count: number
          game_id: string | null
          started_at: string | null
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          description?: string | null
          thumbnail_url?: string | null
          stream_url?: string | null
          is_live?: boolean
          viewers_count?: number
          game_id?: string | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          stream_url?: string | null
          is_live?: boolean
          viewers_count?: number
          game_id?: string | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id?: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      likes: {
        Row: {
          id: string
          user_id: string
          post_id: string | null
          comment_id: string | null
          video_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          post_id?: string | null
          comment_id?: string | null
          video_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string | null
          comment_id?: string | null
          video_id?: string | null
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string | null
          video_id: string | null
          user_id: string
          content: string
          likes_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id?: string | null
          video_id?: string | null
          user_id?: string
          content: string
          likes_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string | null
          video_id?: string | null
          user_id?: string
          content?: string
          likes_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          notification_type: string
          title: string
          content: string | null
          reference_id: string | null
          reference_type: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          notification_type: string
          title: string
          content?: string | null
          reference_id?: string | null
          reference_type?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: string
          title?: string
          content?: string | null
          reference_id?: string | null
          reference_type?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          media_url: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id?: string
          content: string
          media_url?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          media_url?: string | null
          read_at?: string | null
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          buyer_id: string
          seller_id: string | null
          listing_id: string | null
          game_id: string | null
          order_type: string
          status: string
          total_amount: number
          platform_fee: number
          royalty_amount: number
          seller_amount: number
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          buyer_id?: string
          seller_id?: string | null
          listing_id?: string | null
          game_id?: string | null
          order_type: string
          status?: string
          total_amount: number
          platform_fee?: number
          royalty_amount?: number
          seller_amount?: number
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          buyer_id?: string
          seller_id?: string | null
          listing_id?: string | null
          game_id?: string | null
          order_type?: string
          status?: string
          total_amount?: number
          platform_fee?: number
          royalty_amount?: number
          seller_amount?: number
          created_at?: string
          completed_at?: string | null
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          email_notifications: boolean
          push_notifications: boolean
          dark_mode: boolean
          language: string
          privacy_level: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          email_notifications?: boolean
          push_notifications?: boolean
          dark_mode?: boolean
          language?: string
          privacy_level?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_notifications?: boolean
          push_notifications?: boolean
          dark_mode?: boolean
          language?: string
          privacy_level?: string
          created_at?: string
          updated_at?: string
        }
      }
      moderation_reports: {
        Row: {
          id: string
          reporter_id: string
          reported_user_id: string | null
          reported_post_id: string | null
          reported_video_id: string | null
          reported_listing_id: string | null
          reason: string
          description: string | null
          status: string
          resolved_by: string | null
          resolution_note: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          reporter_id?: string
          reported_user_id?: string | null
          reported_post_id?: string | null
          reported_video_id?: string | null
          reported_listing_id?: string | null
          reason: string
          description?: string | null
          status?: string
          resolved_by?: string | null
          resolution_note?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_user_id?: string | null
          reported_post_id?: string | null
          reported_video_id?: string | null
          reported_listing_id?: string | null
          reason?: string
          description?: string | null
          status?: string
          resolved_by?: string | null
          resolution_note?: string | null
          created_at?: string
          resolved_at?: string | null
        }
      }
      game_reviews: {
        Row: {
          id: string
          user_id: string
          game_id: string
          rating: number
          title: string | null
          content: string | null
          is_recommended: boolean
          helpful_count: number
          funny_count: number
          playtime_hours_at_review: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          game_id: string
          rating: number
          title?: string | null
          content?: string | null
          is_recommended?: boolean
          helpful_count?: number
          funny_count?: number
          playtime_hours_at_review?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string
          rating?: number
          title?: string | null
          content?: string | null
          is_recommended?: boolean
          helpful_count?: number
          funny_count?: number
          playtime_hours_at_review?: number
          created_at?: string
          updated_at?: string
        }
      }
      review_votes: {
        Row: {
          id: string
          review_id: string
          user_id: string
          vote_type: string
          created_at: string
        }
        Insert: {
          id?: string
          review_id: string
          user_id?: string
          vote_type: string
          created_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          user_id?: string
          vote_type?: string
          created_at?: string
        }
      }
      game_tag_mappings: {
        Row: {
          id: string
          game_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          tag_id?: string
          created_at?: string
        }
      }
      game_screenshots: {
        Row: {
          id: string
          game_id: string
          image_url: string
          caption: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          image_url: string
          caption?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          image_url?: string
          caption?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      devlogs: {
        Row: {
          id: string
          game_id: string
          author_id: string
          title: string
          content: string
          media_url: string | null
          views_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          game_id: string
          author_id?: string
          title: string
          content: string
          media_url?: string | null
          views_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          author_id?: string
          title?: string
          content?: string
          media_url?: string | null
          views_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      game_jams: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          theme: string | null
          banner_url: string | null
          rules: string | null
          submission_start: string | null
          submission_end: string | null
          rating_start: string | null
          rating_end: string | null
          host_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          theme?: string | null
          banner_url?: string | null
          rules?: string | null
          submission_start?: string | null
          submission_end?: string | null
          rating_start?: string | null
          rating_end?: string | null
          host_id?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          theme?: string | null
          banner_url?: string | null
          rules?: string | null
          submission_start?: string | null
          submission_end?: string | null
          rating_start?: string | null
          rating_end?: string | null
          host_id?: string
          status?: string
          created_at?: string
        }
      }
      game_jam_submissions: {
        Row: {
          id: string
          jam_id: string
          game_id: string
          submitter_id: string
          created_at: string
        }
        Insert: {
          id?: string
          jam_id: string
          game_id: string
          submitter_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          jam_id?: string
          game_id?: string
          submitter_id?: string
          created_at?: string
        }
      }
      game_jam_ratings: {
        Row: {
          id: string
          submission_id: string
          rater_id: string
          overall_rating: number
          graphics_rating: number | null
          audio_rating: number | null
          gameplay_rating: number | null
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          rater_id?: string
          overall_rating: number
          graphics_rating?: number | null
          audio_rating?: number | null
          gameplay_rating?: number | null
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          rater_id?: string
          overall_rating?: number
          graphics_rating?: number | null
          audio_rating?: number | null
          gameplay_rating?: number | null
          comment?: string | null
          created_at?: string
        }
      }
      curators: {
        Row: {
          id: string
          user_id: string
          tagline: string | null
          description: string | null
          follower_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          tagline?: string | null
          description?: string | null
          follower_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tagline?: string | null
          description?: string | null
          follower_count?: number
          created_at?: string
        }
      }
      curator_lists: {
        Row: {
          id: string
          curator_id: string
          title: string
          description: string | null
          cover_image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          curator_id: string
          title: string
          description?: string | null
          cover_image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          curator_id?: string
          title?: string
          description?: string | null
          cover_image_url?: string | null
          created_at?: string
        }
      }
      curator_list_games: {
        Row: {
          id: string
          list_id: string
          game_id: string
          blurb: string | null
          added_at: string
        }
        Insert: {
          id?: string
          list_id: string
          game_id: string
          blurb?: string | null
          added_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          game_id?: string
          blurb?: string | null
          added_at?: string
        }
      }
      discovery_queue_items: {
        Row: {
          id: string
          user_id: string
          game_id: string
          status: string
          queued_at: string
          acted_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string
          game_id: string
          status?: string
          queued_at?: string
          acted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string
          status?: string
          queued_at?: string
          acted_at?: string | null
        }
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          game_id: string | null
          listing_id: string | null
          price: number
          item_type: string
          added_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          game_id?: string | null
          listing_id?: string | null
          price: number
          item_type: string
          added_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string | null
          listing_id?: string | null
          price?: number
          item_type?: string
          added_at?: string
        }
      }
      free_game_promotions: {
        Row: {
          id: string
          game_id: string
          start_date: string
          end_date: string
          original_price: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          start_date: string
          end_date: string
          original_price?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          start_date?: string
          end_date?: string
          original_price?: number | null
          is_active?: boolean
          created_at?: string
        }
      }
      bundles: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          price: number
          cover_url: string | null
          creator_id: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          price: number
          cover_url?: string | null
          creator_id?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          price?: number
          cover_url?: string | null
          creator_id?: string
          is_active?: boolean
          created_at?: string
        }
      }
      bundle_games: {
        Row: {
          id: string
          bundle_id: string
          game_id: string
          created_at: string
        }
        Insert: {
          id?: string
          bundle_id: string
          game_id: string
          created_at?: string
        }
        Update: {
          id?: string
          bundle_id?: string
          game_id?: string
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {
      update_game_rating: {
        Args: Record<string, never>
        Returns: unknown
      }
    }
    Enums: {}
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type Game = Database['public']['Tables']['games']['Row']
export type OwnedAsset = Database['public']['Tables']['owned_assets']['Row']
export type Listing = Database['public']['Tables']['listings']['Row']
export type Video = Database['public']['Tables']['videos']['Row']
export type Livestream = Database['public']['Tables']['livestreams']['Row']
export type Follow = Database['public']['Tables']['follows']['Row']
export type Like = Database['public']['Tables']['likes']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type UserSettings = Database['public']['Tables']['user_settings']['Row']
export type ModerationReport = Database['public']['Tables']['moderation_reports']['Row']
