# pm

A lightweight internal project & resource management web app.

## Features

- Per-project Gantt view with drag-to-adjust task bars
- Per-person weekly resource view, auto-generated from the same task data
- Magic link authentication
- Role-based permissions (owner / admin / editor / viewer)
- Soft delete with trash recovery

## Tech Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL + Auth + RLS)
- frappe-gantt
- Deployed via Vercel / Netlify

## Local Development

```bash
npm install
npm run dev
```

Required environment variables — see `.env.example`.

## License

Proprietary. Not for redistribution.
