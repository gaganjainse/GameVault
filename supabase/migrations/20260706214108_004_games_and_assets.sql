/*
# GameVault Initial Schema - Part 4: Games and Assets

Creates game catalog and ownership tables.

## Tables Created:
- `games` - Supported games in the catalog
- `owned_assets` - User-owned game assets
- `asset_ownership_history` - Transfer history for assets
- `wishlist` - User wishlisted games
*/

-- Games table (catalog)
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  developer text,
  publisher text,
  cover_url text,
  banner_url text,
  genre text,
  release_date date,
  price numeric(10,2) NOT NULL,
  royalty_percentage numeric(5,2) DEFAULT 15.00,
  is_resellable boolean DEFAULT true,
  is_active boolean DEFAULT true,
  downloads_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "games_select_all" ON games;
CREATE POLICY "games_select_all" ON games FOR SELECT
  TO authenticated USING (is_active = true);

-- Owned assets (vault)
CREATE TABLE IF NOT EXISTS owned_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  asset_id text UNIQUE NOT NULL,
  purchase_price numeric(10,2) NOT NULL,
  purchase_date timestamptz DEFAULT now(),
  is_installed boolean DEFAULT false,
  is_listed boolean DEFAULT false,
  last_played_at timestamptz,
  play_time_hours integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, game_id)
);

ALTER TABLE owned_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owned_assets_select_own" ON owned_assets;
CREATE POLICY "owned_assets_select_own" ON owned_assets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owned_assets_insert_own" ON owned_assets;
CREATE POLICY "owned_assets_insert_own" ON owned_assets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owned_assets_update_own" ON owned_assets;
CREATE POLICY "owned_assets_update_own" ON owned_assets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Asset ownership history
CREATE TABLE IF NOT EXISTS asset_ownership_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES owned_assets(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  transfer_type text NOT NULL,
  transfer_price numeric(10,2),
  transferred_at timestamptz DEFAULT now()
);

ALTER TABLE asset_ownership_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ownership_history_select_own" ON asset_ownership_history;
CREATE POLICY "ownership_history_select_own" ON asset_ownership_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM owned_assets WHERE owned_assets.id = asset_ownership_history.asset_id AND owned_assets.user_id = auth.uid())
    OR to_user_id = auth.uid() OR from_user_id = auth.uid()
  );

-- Wishlist
CREATE TABLE IF NOT EXISTS wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, game_id)
);

ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wishlist_select_own" ON wishlist;
CREATE POLICY "wishlist_select_own" ON wishlist FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlist_insert_own" ON wishlist;
CREATE POLICY "wishlist_insert_own" ON wishlist FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlist_delete_own" ON wishlist;
CREATE POLICY "wishlist_delete_own" ON wishlist FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
