/*
# GameVault Competitive Features Migration

## Overview
Adds 16 new tables and several columns to support features extracted from Steam, Epic Games, and itch.io.

## New Tables
1. game_reviews - User reviews with 1-5 star ratings, helpful/funny votes
2. review_votes - Votes on reviews (helpful or funny)
3. game_tag_mappings - Maps games to existing tags table
4. game_screenshots - Screenshot gallery for game store pages
5. devlogs - Developer update posts for games
6. game_jams - Game jam events with phases
7. game_jam_submissions - Games submitted to jams
8. game_jam_ratings - Multi-criteria ratings for jam entries
9. curators - Curator profiles
10. curator_lists - Curated game collections
11. curator_list_games - Games in curator lists
12. discovery_queue_items - Per-user discovery queue state
13. cart_items - Shopping cart items
14. free_game_promotions - Time-limited free game offers
15. bundles - Game bundles with pricing
16. bundle_games - Games included in bundles

## Modified Tables
- posts: Add original_post_id for proper repost linking
- games: Add trailer_url, rating_average, rating_count, is_featured, minimum_price
- profiles: Add is_curator boolean

## Security
- RLS enabled on all new tables
- Owner-scoped CRUD policies using auth.uid()
- Public read on community/content tables
- Owner-only access for cart_items and discovery_queue_items
*/

-- ============================================================
-- COLUMN ADDITIONS TO EXISTING TABLES
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'original_post_id') THEN
    ALTER TABLE posts ADD COLUMN original_post_id uuid REFERENCES posts(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'trailer_url') THEN
    ALTER TABLE games ADD COLUMN trailer_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'rating_average') THEN
    ALTER TABLE games ADD COLUMN rating_average numeric DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'rating_count') THEN
    ALTER TABLE games ADD COLUMN rating_count integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'is_featured') THEN
    ALTER TABLE games ADD COLUMN is_featured boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'minimum_price') THEN
    ALTER TABLE games ADD COLUMN minimum_price numeric;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_curator') THEN
    ALTER TABLE profiles ADD COLUMN is_curator boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- 1. GAME REVIEWS (Steam-style)
-- ============================================================

CREATE TABLE IF NOT EXISTS game_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text,
  is_recommended boolean DEFAULT true,
  helpful_count integer DEFAULT 0,
  funny_count integer DEFAULT 0,
  playtime_hours_at_review numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, game_id)
);

ALTER TABLE game_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_game_reviews" ON game_reviews;
CREATE POLICY "select_game_reviews" ON game_reviews FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_game_review" ON game_reviews;
CREATE POLICY "insert_own_game_review" ON game_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_game_review" ON game_reviews;
CREATE POLICY "update_own_game_review" ON game_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_game_review" ON game_reviews;
CREATE POLICY "delete_own_game_review" ON game_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_game_reviews_game_id ON game_reviews(game_id);
CREATE INDEX IF NOT EXISTS idx_game_reviews_user_id ON game_reviews(user_id);

-- ============================================================
-- 2. REVIEW VOTES
-- ============================================================

CREATE TABLE IF NOT EXISTS review_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES game_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('helpful', 'funny')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id, vote_type)
);

ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_review_votes" ON review_votes;
CREATE POLICY "select_review_votes" ON review_votes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_review_vote" ON review_votes;
CREATE POLICY "insert_own_review_vote" ON review_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_review_vote" ON review_votes;
CREATE POLICY "delete_own_review_vote" ON review_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_review_votes_review_id ON review_votes(review_id);

-- ============================================================
-- 3. GAME TAG MAPPINGS (uses existing tags table)
-- ============================================================

CREATE TABLE IF NOT EXISTS game_tag_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(game_id, tag_id)
);

ALTER TABLE game_tag_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_game_tag_mappings" ON game_tag_mappings;
CREATE POLICY "select_game_tag_mappings" ON game_tag_mappings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_game_tag_mappings" ON game_tag_mappings;
CREATE POLICY "insert_game_tag_mappings" ON game_tag_mappings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_game_tag_mappings" ON game_tag_mappings;
CREATE POLICY "delete_game_tag_mappings" ON game_tag_mappings FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_game_tag_mappings_game_id ON game_tag_mappings(game_id);
CREATE INDEX IF NOT EXISTS idx_game_tag_mappings_tag_id ON game_tag_mappings(tag_id);

-- ============================================================
-- 4. GAME SCREENSHOTS
-- ============================================================

CREATE TABLE IF NOT EXISTS game_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE game_screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_game_screenshots" ON game_screenshots;
CREATE POLICY "select_game_screenshots" ON game_screenshots FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_game_screenshots" ON game_screenshots;
CREATE POLICY "insert_game_screenshots" ON game_screenshots FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_game_screenshots" ON game_screenshots;
CREATE POLICY "delete_game_screenshots" ON game_screenshots FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_game_screenshots_game_id ON game_screenshots(game_id);

-- ============================================================
-- 5. DEVLOGS (itch.io-style developer updates)
-- ============================================================

CREATE TABLE IF NOT EXISTS devlogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  media_url text,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE devlogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_devlogs" ON devlogs;
CREATE POLICY "select_devlogs" ON devlogs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_devlog" ON devlogs;
CREATE POLICY "insert_own_devlog" ON devlogs FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "update_own_devlog" ON devlogs;
CREATE POLICY "update_own_devlog" ON devlogs FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "delete_own_devlog" ON devlogs;
CREATE POLICY "delete_own_devlog" ON devlogs FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_devlogs_game_id ON devlogs(game_id);

-- ============================================================
-- 6. GAME JAMS (itch.io-style)
-- ============================================================

CREATE TABLE IF NOT EXISTS game_jams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  theme text,
  banner_url text,
  rules text,
  submission_start timestamptz,
  submission_end timestamptz,
  rating_start timestamptz,
  rating_end timestamptz,
  host_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'submitting', 'rating', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE game_jams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_game_jams" ON game_jams;
CREATE POLICY "select_game_jams" ON game_jams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_game_jam" ON game_jams;
CREATE POLICY "insert_own_game_jam" ON game_jams FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "update_own_game_jam" ON game_jams;
CREATE POLICY "update_own_game_jam" ON game_jams FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "delete_own_game_jam" ON game_jams;
CREATE POLICY "delete_own_game_jam" ON game_jams FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- ============================================================
-- 7. GAME JAM SUBMISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS game_jam_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jam_id uuid NOT NULL REFERENCES game_jams(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  submitter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(jam_id, game_id)
);

ALTER TABLE game_jam_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_jam_submissions" ON game_jam_submissions;
CREATE POLICY "select_jam_submissions" ON game_jam_submissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_jam_submission" ON game_jam_submissions;
CREATE POLICY "insert_own_jam_submission" ON game_jam_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitter_id);

DROP POLICY IF EXISTS "delete_own_jam_submission" ON game_jam_submissions;
CREATE POLICY "delete_own_jam_submission" ON game_jam_submissions FOR DELETE TO authenticated USING (auth.uid() = submitter_id);

CREATE INDEX IF NOT EXISTS idx_jam_submissions_jam_id ON game_jam_submissions(jam_id);

-- ============================================================
-- 8. GAME JAM RATINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS game_jam_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES game_jam_submissions(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_rating integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  graphics_rating integer CHECK (graphics_rating >= 1 AND graphics_rating <= 5),
  audio_rating integer CHECK (audio_rating >= 1 AND audio_rating <= 5),
  gameplay_rating integer CHECK (gameplay_rating >= 1 AND gameplay_rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(submission_id, rater_id)
);

ALTER TABLE game_jam_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_jam_ratings" ON game_jam_ratings;
CREATE POLICY "select_jam_ratings" ON game_jam_ratings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_jam_rating" ON game_jam_ratings;
CREATE POLICY "insert_own_jam_rating" ON game_jam_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = rater_id);

DROP POLICY IF EXISTS "update_own_jam_rating" ON game_jam_ratings;
CREATE POLICY "update_own_jam_rating" ON game_jam_ratings FOR UPDATE TO authenticated USING (auth.uid() = rater_id) WITH CHECK (auth.uid() = rater_id);

DROP POLICY IF EXISTS "delete_own_jam_rating" ON game_jam_ratings;
CREATE POLICY "delete_own_jam_rating" ON game_jam_ratings FOR DELETE TO authenticated USING (auth.uid() = rater_id);

CREATE INDEX IF NOT EXISTS idx_jam_ratings_submission_id ON game_jam_ratings(submission_id);

-- ============================================================
-- 9. CURATORS (Steam-style)
-- ============================================================

CREATE TABLE IF NOT EXISTS curators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tagline text,
  description text,
  follower_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE curators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_curators" ON curators;
CREATE POLICY "select_curators" ON curators FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_curator" ON curators;
CREATE POLICY "insert_own_curator" ON curators FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_curator" ON curators;
CREATE POLICY "update_own_curator" ON curators FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_curator" ON curators;
CREATE POLICY "delete_own_curator" ON curators FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 10. CURATOR LISTS
-- ============================================================

CREATE TABLE IF NOT EXISTS curator_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curator_id uuid NOT NULL REFERENCES curators(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE curator_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_curator_lists" ON curator_lists;
CREATE POLICY "select_curator_lists" ON curator_lists FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_curator_list" ON curator_lists;
CREATE POLICY "insert_own_curator_list" ON curator_lists FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM curators c WHERE c.id = curator_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "update_own_curator_list" ON curator_lists;
CREATE POLICY "update_own_curator_list" ON curator_lists FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM curators c WHERE c.id = curator_id AND c.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM curators c WHERE c.id = curator_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_own_curator_list" ON curator_lists;
CREATE POLICY "delete_own_curator_list" ON curator_lists FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM curators c WHERE c.id = curator_id AND c.user_id = auth.uid())
);

-- ============================================================
-- 11. CURATOR LIST GAMES
-- ============================================================

CREATE TABLE IF NOT EXISTS curator_list_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES curator_lists(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  blurb text,
  added_at timestamptz DEFAULT now(),
  UNIQUE(list_id, game_id)
);

ALTER TABLE curator_list_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_curator_list_games" ON curator_list_games;
CREATE POLICY "select_curator_list_games" ON curator_list_games FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_curator_list_game" ON curator_list_games;
CREATE POLICY "insert_own_curator_list_game" ON curator_list_games FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM curator_lists cl JOIN curators c ON c.id = cl.curator_id WHERE cl.id = list_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_own_curator_list_game" ON curator_list_games;
CREATE POLICY "delete_own_curator_list_game" ON curator_list_games FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM curator_lists cl JOIN curators c ON c.id = cl.curator_id WHERE cl.id = list_id AND c.user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_curator_list_games_list_id ON curator_list_games(list_id);

-- ============================================================
-- 12. DISCOVERY QUEUE (Steam-style)
-- ============================================================

CREATE TABLE IF NOT EXISTS discovery_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'wishlisted', 'not_interested', 'viewed', 'purchased')),
  queued_at timestamptz DEFAULT now(),
  acted_at timestamptz,
  UNIQUE(user_id, game_id)
);

ALTER TABLE discovery_queue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_discovery_queue" ON discovery_queue_items;
CREATE POLICY "select_own_discovery_queue" ON discovery_queue_items FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_discovery_queue" ON discovery_queue_items;
CREATE POLICY "insert_own_discovery_queue" ON discovery_queue_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_discovery_queue" ON discovery_queue_items;
CREATE POLICY "update_own_discovery_queue" ON discovery_queue_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_discovery_queue" ON discovery_queue_items;
CREATE POLICY "delete_own_discovery_queue" ON discovery_queue_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_discovery_queue_user_id ON discovery_queue_items(user_id);

-- ============================================================
-- 13. CART ITEMS (Steam/Epic-style shopping cart)
-- ============================================================

CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('primary', 'resale')),
  added_at timestamptz DEFAULT now()
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cart_items" ON cart_items;
CREATE POLICY "select_own_cart_items" ON cart_items FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_cart_items" ON cart_items;
CREATE POLICY "insert_own_cart_items" ON cart_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cart_items" ON cart_items;
CREATE POLICY "delete_own_cart_items" ON cart_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- ============================================================
-- 14. FREE GAME PROMOTIONS (Epic-style)
-- ============================================================

CREATE TABLE IF NOT EXISTS free_game_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  original_price numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE free_game_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_free_game_promotions" ON free_game_promotions;
CREATE POLICY "select_free_game_promotions" ON free_game_promotions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_free_game_promotions" ON free_game_promotions;
CREATE POLICY "insert_free_game_promotions" ON free_game_promotions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_free_game_promotions" ON free_game_promotions;
CREATE POLICY "update_free_game_promotions" ON free_game_promotions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_free_game_promotions" ON free_game_promotions;
CREATE POLICY "delete_free_game_promotions" ON free_game_promotions FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_free_promotions_active ON free_game_promotions(is_active);

-- ============================================================
-- 15. BUNDLES (itch.io-style)
-- ============================================================

CREATE TABLE IF NOT EXISTS bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  price numeric NOT NULL,
  cover_url text,
  creator_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_bundles" ON bundles;
CREATE POLICY "select_bundles" ON bundles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_bundle" ON bundles;
CREATE POLICY "insert_own_bundle" ON bundles FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "update_own_bundle" ON bundles;
CREATE POLICY "update_own_bundle" ON bundles FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "delete_own_bundle" ON bundles;
CREATE POLICY "delete_own_bundle" ON bundles FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- ============================================================
-- 16. BUNDLE GAMES
-- ============================================================

CREATE TABLE IF NOT EXISTS bundle_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bundle_id, game_id)
);

ALTER TABLE bundle_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_bundle_games" ON bundle_games;
CREATE POLICY "select_bundle_games" ON bundle_games FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_bundle_game" ON bundle_games;
CREATE POLICY "insert_own_bundle_game" ON bundle_games FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM bundles b WHERE b.id = bundle_id AND b.creator_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_own_bundle_game" ON bundle_games;
CREATE POLICY "delete_own_bundle_game" ON bundle_games FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM bundles b WHERE b.id = bundle_id AND b.creator_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_bundle_games_bundle_id ON bundle_games(bundle_id);

-- ============================================================
-- RATING CALCULATION FUNCTION + TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_game_rating()
RETURNS TRIGGER AS $$
DECLARE
  game_uuid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    game_uuid := OLD.game_id;
  ELSE
    game_uuid := NEW.game_id;
  END IF;

  UPDATE games
  SET rating_average = COALESCE(
    (SELECT AVG(rating) FROM game_reviews WHERE game_id = game_uuid),
    0
  ),
  rating_count = COALESCE(
    (SELECT COUNT(*) FROM game_reviews WHERE game_id = game_uuid),
    0
  )
  WHERE id = game_uuid;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_game_rating ON game_reviews;
CREATE TRIGGER trg_update_game_rating
  AFTER INSERT OR UPDATE OR DELETE ON game_reviews
  FOR EACH ROW EXECUTE FUNCTION update_game_rating();

-- ============================================================
-- SEED: EXPAND TAGS
-- ============================================================

INSERT INTO tags (name, slug, category) VALUES
('Strategy', 'strategy', 'genre'),
('Puzzle', 'puzzle', 'genre'),
('Horror', 'horror', 'genre'),
('Adventure', 'adventure', 'genre'),
('Simulation', 'simulation', 'genre'),
('Sports', 'sports', 'genre'),
('Shooter', 'shooter', 'genre'),
('Platformer', 'platformer', 'genre'),
('Fighting', 'fighting', 'genre'),
('Survival', 'survival', 'genre'),
('Sci-Fi', 'sci-fi', 'theme'),
('Fantasy', 'fantasy', 'theme'),
('Post-Apocalyptic', 'post-apocalyptic', 'theme'),
('Medieval', 'medieval', 'theme'),
('Noir', 'noir', 'theme'),
('Steampunk', 'steampunk', 'theme'),
('Co-op', 'co-op', 'feature'),
('Open World', 'open-world', 'feature'),
('Roguelike', 'roguelike', 'feature'),
('Crafting', 'crafting', 'feature'),
('Stealth', 'stealth', 'feature'),
('Turn-Based', 'turn-based', 'feature'),
('Procedural', 'procedural', 'feature'),
('Single Player', 'single-player', 'feature'),
('Controller Support', 'controller-support', 'feature'),
('Cloud Saves', 'cloud-saves', 'feature'),
('Achievements', 'achievements', 'feature'),
('Free to Play', 'free-to-play', 'feature'),
('Early Access', 'early-access', 'feature')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED: MAP EXISTING GAMES TO TAGS
-- ============================================================

INSERT INTO game_tag_mappings (game_id, tag_id)
SELECT g.id, t.id FROM games g
JOIN tags t ON
  (g.genre = 'Action RPG' AND t.slug IN ('action', 'rpg', 'cyberpunk')) OR
  (g.genre = 'Platformer' AND t.slug IN ('platformer', 'retro', 'indie')) OR
  (g.genre = 'Space Sim' AND t.slug IN ('simulation', 'space', 'sci-fi')) OR
  (g.genre = 'Racing' AND t.slug IN ('racing', 'multiplayer'))
ON CONFLICT (game_id, tag_id) DO NOTHING;

-- ============================================================
-- SEED: SCREENSHOTS FOR EXISTING GAMES
-- ============================================================

INSERT INTO game_screenshots (game_id, image_url, caption, sort_order)
SELECT g.id, s.url, s.caption, s.ord
FROM games g
CROSS JOIN (VALUES
  ('https://images.pexels.com/photos/1670988/pexels-photo-1670988.jpeg', 'Gameplay screenshot 1', 0),
  ('https://images.pexels.com/photos/2147784/pexels-photo-2147784.jpeg', 'Gameplay screenshot 2', 1),
  ('https://images.pexels.com/photos/1242348/pexels-photo-1242348.jpeg', 'Gameplay screenshot 3', 2),
  ('https://images.pexels.com/photos/275033/pexels-photo-275033.jpeg', 'Gameplay screenshot 4', 3)
) AS s(url, caption, ord)
WHERE NOT EXISTS (SELECT 1 FROM game_screenshots gs WHERE gs.game_id = g.id);

-- ============================================================
-- SEED: SAMPLE GAME REVIEWS
-- ============================================================

INSERT INTO game_reviews (user_id, game_id, rating, title, content, is_recommended, helpful_count, playtime_hours_at_review)
SELECT p.id, g.id, r.rating, r.title, r.content, r.rec, r.helpful, r.hours
FROM profiles p
CROSS JOIN games g
CROSS JOIN LATERAL (
  VALUES
    (5, 'Absolutely incredible', 'This game blew me away. The world design is top-notch and the combat feels incredibly satisfying. Easily one of the best games I have played this year.', true, 42, 15.5),
    (4, 'Great with minor issues', 'Solid experience overall. The story is engaging and the graphics are stunning. A few bugs here and there but nothing game-breaking.', true, 18, 8.2),
    (3, 'Fun but gets repetitive', 'Enjoyed the first few hours but it starts to feel samey after a while. Could use more variety in mission design.', true, 7, 4.1),
    (2, 'Disappointing', 'Had high hopes but the performance issues and lack of content at launch make it hard to recommend at full price.', false, 12, 2.3)
) AS r(rating, title, content, rec, helpful, hours)
WHERE p.is_creator = true
AND NOT EXISTS (SELECT 1 FROM game_reviews gr WHERE gr.game_id = g.id AND gr.user_id = p.id)
LIMIT 4;

-- ============================================================
-- SEED: SAMPLE GAME JAM
-- ============================================================

INSERT INTO game_jams (title, slug, description, theme, banner_url, rules, submission_start, submission_end, rating_start, rating_end, host_id, status)
SELECT
  'Neon Genesis Jam',
  'neon-genesis-jam',
  'Create a game inspired by neon aesthetics and cyberpunk themes. Show us your most vibrant, electric creations!',
  'Neon Dreams',
  'https://images.pexels.com/photos/2147784/pexels-photo-2147784.jpeg',
  '1. Games must be created during the jam period. 2. Teams of up to 4 people allowed. 3. Use any engine or framework. 4. Must incorporate the theme. 5. Have fun!',
  now() - interval '7 days',
  now() + interval '7 days',
  now() + interval '8 days',
  now() + interval '15 days',
  p.id,
  'submitting'
FROM profiles p
WHERE p.is_creator = true
LIMIT 1
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED: SAMPLE BUNDLE
-- ============================================================

INSERT INTO bundles (title, slug, description, price, cover_url, creator_id, is_active)
SELECT
  'Cyberpunk Collection',
  'cyberpunk-collection',
  'Three neon-soaked experiences for one low price. Dive into the best cyberpunk games on GameVault.',
  49.99,
  'https://images.pexels.com/photos/2147784/pexels-photo-2147784.jpeg',
  p.id,
  true
FROM profiles p
WHERE p.is_creator = true
LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO bundle_games (bundle_id, game_id)
SELECT b.id, g.id
FROM bundles b
CROSS JOIN games g
WHERE b.slug = 'cyberpunk-collection'
AND g.slug IN ('neon-horizon', 'cyber-drift', 'void-runners')
AND NOT EXISTS (SELECT 1 FROM bundle_games bg WHERE bg.bundle_id = b.id AND bg.game_id = g.id);

-- ============================================================
-- SEED: FREE GAME PROMOTION
-- ============================================================

INSERT INTO free_game_promotions (game_id, start_date, end_date, original_price, is_active)
SELECT g.id, now() - interval '1 day', now() + interval '6 days', g.price, true
FROM games g
WHERE g.slug = 'pixel-legends'
AND NOT EXISTS (SELECT 1 FROM free_game_promotions fp WHERE fp.game_id = g.id);

-- ============================================================
-- SEED: FEATURED GAMES
-- ============================================================

UPDATE games SET is_featured = true WHERE slug IN ('neon-horizon', 'cyber-drift', 'void-runners');