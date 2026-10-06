# LearnAI

A free, no-sign-up site for learning AI step by step. Learners follow an animated roadmap of 11 courses (75 lessons). Each lesson has a short plain-English explanation, key ideas, hand-picked free resources, a two-question check, and code that runs right in the browser.

## How it works

- **Content** lives in `content/` as JSON: `stages.json` plus one file per course in `content/courses/`.
- **Database**: `npm run seed` validates the content and loads it into a SQLite database (`data/learnai.db`) with four tables: `stages`, `courses`, `lessons`, `resources`. It uses Node's built-in `node:sqlite`, so there are no native dependencies.
- **Site**: Next.js (App Router). Every page is pre-rendered from the database at build time.
- **Code runner**: Python runs with [Pyodide](https://pyodide.org) in a Web Worker (NumPy, pandas, scikit-learn and matplotlib load on demand, and plots show inline). JavaScript runs in a separate worker with no network access. Runs that exceed the time limit are stopped.
- **Progress** is stored in the browser's localStorage.
- **Accounts** (optional): sign up / log in with a username and password at `/register` and `/login`. Passwords are hashed with scrypt; sessions are random tokens in an httpOnly cookie. Users live in Postgres (Neon, Vercel Postgres, ...); set `DATABASE_URL` or `POSTGRES_URL`. Tables are created on first use. No email verification. Progress is not yet synced to accounts.

## Develop

Requires Node 22.13 or newer.

```bash
npm install
npm run dev        # seeds the database, then starts http://localhost:3000
npm run validate   # checks the content files only
npm run build      # seed + production build
```

## Add or edit a course

1. Add or edit a file in `content/courses/`. Each lesson needs `slug`, `title`, `summary`, `minutes`, `body` (paragraphs; `**bold**` and `` `code` `` are supported), `keyIdeas`, `quiz`, `code` (or `null`) and `resources`.
2. Run `npm run validate`, then `npm run dev` to preview.

Runnable Python may only use the standard library, NumPy, pandas, scikit-learn and matplotlib, with no network access. Examples that need an API key or a GPU set `"runnable": false` and add a `note`.
