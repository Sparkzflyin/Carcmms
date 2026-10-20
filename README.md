# GarageLog

A CMMS for your own cars and motorcycles: log vehicles, open work orders, track
parts and costs, and let maintenance schedules open work orders when service
comes due.

**Stack:** Next.js 16 (App Router, Cache Components), Tailwind CSS v4, Supabase
(Postgres + Auth + Storage), deployed on Vercel.

## Setup

1. **Create a Supabase project** at supabase.com (or add Supabase from the
   Vercel Marketplace on your Vercel project).
2. **Run the schema:** in the Supabase SQL Editor, run each file in
   `supabase/migrations/` in order (`0001_…`, then `0002_…`, …). This creates
   the tables, row-level security policies, triggers, and the private `photos`
   storage bucket. When a new migration is added, run just that file.
3. **Environment variables:** copy `.env.example` to `.env.local` and fill in the
   URL and key (or run `vercel link && vercel env pull .env.local`).
4. **Auth URLs:** in Supabase → Authentication → URL Configuration, set the Site
   URL to your deployed URL and add `http://localhost:3000/**` and your
   production URL `/**` to the redirect allow list. (For faster local testing
   you can turn off "Confirm email" under Authentication → Providers → Email.)
5. `npm install && npm run dev`, then open http://localhost:3000.

## Layout

| Path | What |
| --- | --- |
| `src/app/(auth)` | Login / signup pages and auth server actions |
| `src/app/(app)/page.tsx` | Garage: every vehicle with open work orders and service status |
| `src/app/(app)/vehicles` | Add/edit vehicle (VIN decode, custom fields, photo) and vehicle detail |
| `src/app/(app)/work-orders` | All work orders, work order detail (status, parts, labor, notes, photos) |
| `src/app/(app)/work-orders/archive` | Archived (closed) work orders with search by text, WO number, vehicle, parts, notes |
| `src/app/(app)/settings` | Manage custom vehicle fields |
| `src/lib/auth.ts` | `requireUser()`: verifies the session; every page and action goes through it |
| `src/proxy.ts` | Refreshes the Supabase session cookie and redirects signed-out visitors |
| `supabase/migrations` | Database schema, RLS, triggers, storage policies |

## How maintenance reminders work

A schedule has a distance interval, a time interval, or both. The database
function `create_due_maintenance_work_orders()` opens a work order for every due
schedule that doesn't already have an open one. The app calls it when you load
the garage or a vehicle, update the odometer, or add a schedule. When a
scheduled work order is marked **Done**, a trigger records the completion
mileage and date on the schedule so the next interval starts from there.
