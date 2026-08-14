# GameVault

![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs)
![License](https://img.shields.io/badge/License-GPL--3.0--or--later-blue?style=for-the-badge)

A social gaming marketplace: discover and buy games, follow creators, post to a social feed, watch livestreams and video uploads, and resell owned digital assets.

## Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Database / Auth:** Supabase (Postgres, Row Level Security, Auth)
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Fonts:** Inter & Orbitron, self-hosted via `@fontsource`

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com), then run every file in
`supabase/migrations/` against it, in order (via the SQL editor, or the Supabase CLI:
`supabase db push`).

### 3. Configure environment variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both values are in your Supabase project's **Settings → API** page.

### 4. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Project structure

```
app/            Routes (Next.js App Router — one folder per page)
components/     Shared UI (components/ui is the shadcn/ui primitive library)
lib/auth/       Client-side auth context/provider
lib/supabase/   Supabase client (browser) and server client (SSR, cookie-based)
lib/types/      Generated database types
middleware.ts   Server-side route protection (auth + admin gating)
supabase/       SQL migrations — this is the source of truth for the schema, RLS
                policies, and Postgres functions (e.g. checkout_cart)
```

## Notable architecture decisions

- **Checkout is server-verified, not client-trusted.** The `checkout_cart` Postgres
  function (see `supabase/migrations/..._010_security_and_integrity_fixes.sql`)
  re-derives each item's price from the `games`/`listings` tables and creates the
  order, asset grant, and cart cleanup atomically. The client cannot set an order's
  price or mark it "completed" directly — a real payment processor (e.g. Stripe)
  should still confirm payment before this function is called.
- **Route protection happens in `middleware.ts`**, server-side, before a protected
  page's HTML ships — not just client-side after hydration.
- **Social counters (likes, followers, etc.) are maintained by Postgres triggers**,
  not by the client, so they can't drift or reset on refresh.
- **Admin access requires a real `role` column** on `profiles` (`user` / `moderator`
  / `admin`), checked both in middleware and as a client-side backstop.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint the codebase (ESLint) |
| `npx tsc --noEmit` | Type-check without emitting files |

## License

GPL-3.0-or-later — see [LICENSE](LICENSE).
## 📚 Docs

Fleet-wide reading compilation: [shesh-docs](https://github.com/gaganjainse/shesh-docs).
