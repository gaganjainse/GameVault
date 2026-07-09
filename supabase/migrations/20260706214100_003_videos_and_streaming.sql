/*
# GameVault Initial Schema - Part 3: Videos and Streaming

Creates video and livestream tables.

## Tables Created:
- `videos` - Uploaded video content
- `livestreams` - Live streaming sessions
- `live_chat_messages` - Real-time chat during streams
*/

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  video_url text NOT NULL,
  duration integer,
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  visibility text DEFAULT 'public',
  game_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "videos_select_all" ON videos;
CREATE POLICY "videos_select_all" ON videos FOR SELECT
  TO authenticated USING (visibility = 'public' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "videos_insert_own" ON videos;
CREATE POLICY "videos_insert_own" ON videos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "videos_update_own" ON videos;
CREATE POLICY "videos_update_own" ON videos FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "videos_delete_own" ON videos;
CREATE POLICY "videos_delete_own" ON videos FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Livestreams table
CREATE TABLE IF NOT EXISTS livestreams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  stream_url text,
  is_live boolean DEFAULT false,
  viewers_count integer DEFAULT 0,
  game_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE livestreams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "livestreams_select_all" ON livestreams;
CREATE POLICY "livestreams_select_all" ON livestreams FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "livestreams_insert_own" ON livestreams;
CREATE POLICY "livestreams_insert_own" ON livestreams FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "livestreams_update_own" ON livestreams;
CREATE POLICY "livestreams_update_own" ON livestreams FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "livestreams_delete_own" ON livestreams;
CREATE POLICY "livestreams_delete_own" ON livestreams FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Live chat messages
CREATE TABLE IF NOT EXISTS live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livestream_id uuid REFERENCES livestreams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE live_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_chat_messages_select_all" ON live_chat_messages;
CREATE POLICY "live_chat_messages_select_all" ON live_chat_messages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "live_chat_messages_insert_own" ON live_chat_messages;
CREATE POLICY "live_chat_messages_insert_own" ON live_chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
