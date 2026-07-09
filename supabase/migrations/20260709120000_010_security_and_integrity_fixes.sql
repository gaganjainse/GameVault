/*
# Security & Data Integrity Fixes (Audit Remediation)

Addresses findings from the July 2026 technical audit:

1. C3 — Adds a real `role` column to `profiles` and an `is_admin()` helper,
   so admin surfaces can actually be gated instead of "any logged-in user."
2. C3 — Adds the missing UPDATE policy on `moderation_reports` (previously had
   none at all, so the resolve/action buttons could not work for anyone).
3. C4 — Adds triggers that atomically maintain `likes_count`, `comments_count`,
   `reposts_count`, `followers_count`, `following_count`, and `posts_count`
   at the database level, replacing the old client-only counters that were
   never persisted and reset on every page refresh.
4. C1 / C2 / H3 — Locks down direct client writes to the financial columns on
   `orders` (RLS only ever governs rows, not columns, so the old "own row"
   UPDATE policy let a buyer rewrite their own total_amount/status) and adds
   a SECURITY DEFINER `checkout_cart()` function that re-derives prices
   server-side from `games`/`listings` and completes a purchase atomically,
   so the client can no longer supply its own price or mark an order
   "completed" directly.

Note: this migration makes checkout tamper-proof and atomic, but does not by
itself add real payment collection (a card charge) — that still requires
wiring in a payment processor (e.g. Stripe) with its own account/keys and
calling checkout_cart() only after the processor confirms payment.
*/

-- ============================================================
-- 1. Admin role
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role IN ('admin', 'moderator') FROM profiles WHERE id = auth.uid()), false);
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Only admins/moderators may change anyone's role, and never their own (prevents self-promotion)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (
    (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()))
    OR (is_admin() AND auth.uid() != id)
  );

-- ============================================================
-- 2. moderation_reports — add the missing UPDATE policy
-- ============================================================

DROP POLICY IF EXISTS "reports_update_admin" ON moderation_reports;
CREATE POLICY "reports_update_admin" ON moderation_reports FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "reports_select_admin_or_own" ON moderation_reports;
DROP POLICY IF EXISTS "reports_select_own" ON moderation_reports;
CREATE POLICY "reports_select_admin_or_own" ON moderation_reports FOR SELECT
  TO authenticated USING (auth.uid() = reporter_id OR is_admin());

DROP POLICY IF EXISTS "admin_actions_insert_admin" ON admin_actions;
CREATE POLICY "admin_actions_insert_admin" ON admin_actions FOR INSERT
  TO authenticated WITH CHECK (is_admin() AND auth.uid() = admin_id);

DROP POLICY IF EXISTS "admin_actions_select_admin" ON admin_actions;
CREATE POLICY "admin_actions_select_admin" ON admin_actions FOR SELECT
  TO authenticated USING (is_admin());

-- ============================================================
-- 3. Counter triggers (posts, comments, likes, follows)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF NEW.comment_id IS NOT NULL THEN
      UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    ELSIF NEW.video_id IS NOT NULL THEN
      UPDATE videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    ELSIF OLD.comment_id IS NOT NULL THEN
      UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
    ELSIF OLD.video_id IS NOT NULL THEN
      UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.video_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_like_count ON likes;
CREATE TRIGGER trg_like_count
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION handle_like_count();

CREATE OR REPLACE FUNCTION handle_comment_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF NEW.video_id IS NOT NULL THEN
      UPDATE videos SET comments_count = comments_count + 1 WHERE id = NEW.video_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    ELSIF OLD.video_id IS NOT NULL THEN
      UPDATE videos SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.video_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_count ON comments;
CREATE TRIGGER trg_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION handle_comment_count();

CREATE OR REPLACE FUNCTION handle_post_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET posts_count = GREATEST(posts_count - 1, 0) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_count ON posts;
CREATE TRIGGER trg_post_count
AFTER INSERT OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION handle_post_count();

CREATE OR REPLACE FUNCTION handle_repost_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.post_type = 'repost' AND NEW.original_post_id IS NOT NULL THEN
    UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = NEW.original_post_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_repost_count ON posts;
CREATE TRIGGER trg_repost_count
AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION handle_repost_count();

CREATE OR REPLACE FUNCTION handle_follow_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_follow_count ON follows;
CREATE TRIGGER trg_follow_count
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION handle_follow_count();

-- ============================================================
-- 4. Lock down orders financial columns + atomic checkout RPC
-- ============================================================

-- Client may no longer freely UPDATE orders at all; cancellation gets its own
-- narrow policy, everything else must go through checkout_cart()/admin tooling.
DROP POLICY IF EXISTS "orders_update_own" ON orders;
CREATE POLICY "orders_buyer_can_cancel_pending" ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id AND status = 'pending')
  WITH CHECK (status = 'cancelled');

CREATE POLICY "orders_admin_full_update" ON orders FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Client may no longer INSERT orders directly (checkout_cart() does this as
-- the function owner) — closes the "insert a completed order with any price"
-- path used by the old app/cart/page.tsx.
DROP POLICY IF EXISTS "orders_insert_own" ON orders;

CREATE OR REPLACE FUNCTION checkout_cart(p_item_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item record;
  v_price numeric(10,2);
  v_platform_fee numeric(10,2);
  v_seller_amount numeric(10,2);
  v_seller_id uuid;
  v_order_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOR v_item IN
    SELECT ci.* FROM cart_items ci
    WHERE ci.id = ANY(p_item_ids) AND ci.user_id = v_user_id
  LOOP
    v_seller_id := NULL;
    v_platform_fee := 0;
    v_seller_amount := 0;

    IF v_item.item_type = 'resale' THEN
      SELECT l.price, l.seller_id INTO v_price, v_seller_id
      FROM listings l WHERE l.id = v_item.listing_id AND l.status = 'active';

      IF v_price IS NULL THEN
        RAISE EXCEPTION 'Listing is no longer available';
      END IF;

      v_platform_fee := round(v_price * 0.10, 2);
      v_seller_amount := v_price - v_platform_fee;
    ELSE
      SELECT g.price INTO v_price FROM games g WHERE g.id = v_item.game_id AND g.is_active = true;
      IF v_price IS NULL THEN
        RAISE EXCEPTION 'Game is no longer available';
      END IF;
    END IF;

    INSERT INTO orders (
      buyer_id, seller_id, listing_id, game_id, order_type,
      status, total_amount, platform_fee, seller_amount, completed_at
    ) VALUES (
      v_user_id, v_seller_id, v_item.listing_id, v_item.game_id, v_item.item_type,
      'completed', v_price, v_platform_fee, v_seller_amount, now()
    ) RETURNING id INTO v_order_id;

    INSERT INTO owned_assets (user_id, game_id, asset_id, purchase_price, is_installed, is_listed, play_time_hours)
    VALUES (v_user_id, v_item.game_id, gen_random_uuid()::text, v_price, false, false, 0)
    ON CONFLICT (user_id, game_id) DO NOTHING;

    IF v_item.item_type = 'resale' AND v_item.listing_id IS NOT NULL THEN
      UPDATE listings SET status = 'sold', updated_at = now()
      WHERE id = v_item.listing_id AND status = 'active';
    END IF;

    DELETE FROM cart_items WHERE id = v_item.id;

    v_results := v_results || jsonb_build_object('order_id', v_order_id, 'game_id', v_item.game_id, 'amount', v_price);
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No valid cart items found to check out';
  END IF;

  RETURN jsonb_build_object('success', true, 'orders', v_results);
END;
$$;

GRANT EXECUTE ON FUNCTION checkout_cart(uuid[]) TO authenticated;
