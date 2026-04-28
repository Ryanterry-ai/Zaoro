# TruArtz Fashion Store

A full Next.js 14 e-commerce store cloned from truartz.framer.website.

## Stack
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Zustand (cart state)
- Razorpay (checkout)

## Setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with your credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Admin Panel

Visit [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

Default credentials (change in .env.local):
- Email: admin@truartz.com  
- Password: truartz_admin_2026

## Deploying to Vercel

1. Push to GitHub
2. Import repo in vercel.com
3. Add env vars: ADMIN_EMAIL, ADMIN_PASSWORD
4. Deploy

## Data Files

All content lives in `/data/*.json`:
- `products.json` — products
- `collections.json` — collections
- `navigation.json` — menus
- `settings.json` — site config
- `blogs.json` — blog posts

Edit these files and redeploy to update content.
