# Global Air Export — Wig Export Management System

## Project Overview
Static web app for managing wig export orders. No build step — edit HTML/CSS/JS files directly.

## Tech Stack
- **Frontend:** Vanilla HTML + CSS + JavaScript (Bootstrap 5 via CDN)
- **Backend:** Supabase (PostgreSQL + Row-Level Security + Auth)
- **Hosting:** GitHub Pages (branch: main)

## File Structure
```
index.html          # Login page (unauthenticated entry point)
dashboard.html      # Orders overview dashboard
order.html          # Create / edit a single order
customers.html      # Customer list and management
settings.html       # Agents & suppliers lookup tables
css/style.css       # Shared styles
js/config.js        # Supabase client + shared helpers
supabase-schema.sql # DB schema (run once in Supabase SQL Editor)
```

## Key Patterns

### Authentication
Every page except `index.html` calls `requireAuth()` at the top of its `<script>`:
```js
const session = await requireAuth();
if (!session) return; // already redirected to index.html
```

### Supabase Client
The client is `sb` (defined in `js/config.js`). Use Supabase JS v2 API:
```js
const { data, error } = await sb.from('orders').select('*').eq('status', 'active');
```

### Shared Helpers (`js/config.js`)
| Helper | Purpose |
|--------|---------|
| `requireAuth()` | Redirects to login if no active session |
| `getCurrentUser()` | Returns current Supabase auth user |
| `signOut()` | Signs out and redirects to `index.html` |
| `getLookupValues(category)` | Fetches active `lookup_values` rows by category |
| `getActiveRecords(table)` | Fetches active rows from any table, ordered by `name` |
| `showToast(msg, type)` | Shows a Bootstrap toast; `type` is `'success'` \| `'danger'` \| `'warning'` |

## Supabase Project
- URL: `https://xfkenicbdgwfsfjqadcq.supabase.co`
- Auth: Email/password enabled
- Schema: `supabase-schema.sql` (run once in Supabase SQL Editor)

## Development
- No npm, no build process. Serve locally with `python -m http.server` or any static server.
- Supabase anon key is public by design — security is enforced via RLS policies.
- All pages include `js/config.js` before their page-specific scripts.
- UI language is Hebrew (RTL) — preserve `dir="rtl"` on `<body>` and Bootstrap RTL classes.
