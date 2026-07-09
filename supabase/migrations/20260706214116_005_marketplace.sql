/*
# GameVault Initial Schema - Part 5: Marketplace

Creates marketplace and transaction tables.

## Tables Created:
- `listings` - Marketplace listings for game assets
- `listing_offers` - Offers on listings
- `orders` - Purchase transactions
- `transactions` - Financial transaction records
- `royalties` - Royalty payments to creators/publishers
*/

-- Listings (marketplace)
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES owned_assets(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price numeric(10,2) NOT NULL,
  status text DEFAULT 'active',
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (status IN ('active', 'sold', 'cancelled', 'pending'))
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listings_select_all" ON listings;
CREATE POLICY "listings_select_all" ON listings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "listings_insert_own" ON listings;
CREATE POLICY "listings_insert_own" ON listings FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = seller_id AND
    EXISTS (SELECT 1 FROM owned_assets WHERE owned_assets.id = listings.asset_id AND owned_assets.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "listings_update_own" ON listings;
CREATE POLICY "listings_update_own" ON listings FOR UPDATE
  TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "listings_delete_own" ON listings;
CREATE POLICY "listings_delete_own" ON listings FOR DELETE
  TO authenticated USING (auth.uid() = seller_id);

-- Listing offers
CREATE TABLE IF NOT EXISTS listing_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_price numeric(10,2) NOT NULL,
  status text DEFAULT 'pending',
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn'))
);

ALTER TABLE listing_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_offers_select_related" ON listing_offers;
CREATE POLICY "listing_offers_select_related" ON listing_offers FOR SELECT
  TO authenticated USING (
    auth.uid() = buyer_id OR 
    EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_offers.listing_id AND listings.seller_id = auth.uid())
  );

DROP POLICY IF EXISTS "listing_offers_insert_own" ON listing_offers;
CREATE POLICY "listing_offers_insert_own" ON listing_offers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "listing_offers_update_own" ON listing_offers;
CREATE POLICY "listing_offers_update_own" ON listing_offers FOR UPDATE
  TO authenticated USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  game_id uuid REFERENCES games(id) ON DELETE SET NULL,
  order_type text NOT NULL,
  status text DEFAULT 'pending',
  total_amount numeric(10,2) NOT NULL,
  platform_fee numeric(10,2) DEFAULT 0,
  royalty_amount numeric(10,2) DEFAULT 0,
  seller_amount numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CHECK (order_type IN ('primary', 'resale')),
  CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'refunded'))
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "orders_insert_own" ON orders;
CREATE POLICY "orders_insert_own" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "orders_update_own" ON orders;
CREATE POLICY "orders_update_own" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text DEFAULT 'completed',
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Royalties
CREATE TABLE IF NOT EXISTS royalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  game_id uuid REFERENCES games(id) ON DELETE SET NULL,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  percentage numeric(5,2),
  status text DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE royalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "royalties_select_recipient" ON royalties;
CREATE POLICY "royalties_select_recipient" ON royalties FOR SELECT
  TO authenticated USING (auth.uid() = recipient_user_id);
