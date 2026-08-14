# 🎮 GameVault

> **A social gaming marketplace.** Discover and buy games, follow creators, post to
> a social feed, watch livestreams and video uploads, and resell owned digital assets.

![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript) ![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs) ![License](https://img.shields.io/badge/License-GPL--3.0--or--later-blue?style=for-the-badge) ![CI](https://github.com/gaganjainse/GameVault/actions/workflows/ci.yml.yml/badge.svg)

- **License:** GPL-3.0-or-later
- **Owner:** Gagan Jain ([@gaganjainse](https://github.com/gaganjainse))
- **Stack:** Next.js 15 (App Router) + React 19 + TypeScript · Supabase (Postgres + RLS + Auth) · Tailwind + shadcn/ui

---

## Quick start

```bash
npm install

# .env.local (values from Supabase → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

npm run dev            # http://localhost:3000
```

Run every file in `supabase/migrations/` against your Supabase project (in order)
via the SQL editor or `supabase db push`.

## Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Database / Auth:** Supabase (Postgres, Row Level Security, Auth)
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Fonts:** Inter & Orbitron, self-hosted via `@fontsource`

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint (ESLint) |
| `npx tsc --noEmit` | Type-check without emitting |

## Status

CI green. Security: [SECURITY.md](SECURITY.md).

## Documentation index

- **Compiled reading:** [shesh-docs](https://github.com/gaganjainse/shesh-docs)

## License

GPL-3.0-or-later — see [LICENSE](LICENSE).
