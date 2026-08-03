# School Facility Complaint Monitoring System

A responsive React and Supabase web application for reporting, assigning, tracking, resolving, and evaluating school facility concerns. Supabase provides authentication, PostgreSQL, private photo storage, Row Level Security, Realtime, and trusted Edge Functions. There is no Express server, MySQL database, custom JWT, or local upload folder.

## Features

- Student registration, email verification, login, recovery, persistent sessions, and password changes
- Student, maintenance, and administrator portals with server-authorized role routing
- Database-generated complaint numbers (`CMP-YYYY-00001`) and priority-based SLA deadlines
- Private before/progress/after evidence with signed URLs and 5 MB image validation
- Validated complaint workflow, automatic history, notifications, assignments, and audit records
- Realtime dashboard, complaint, assignment, timeline, and notification updates
- Admin users, categories, locations, SLA summary, and CSV exports
- One-per-complaint student ratings and feedback
- Full RLS, storage policies, indexes, constraints, triggers, and privileged Edge Functions

## Local setup

Requirements: Node.js 20+, npm, a Supabase account, and optionally the Supabase CLI.

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard). Wait for database provisioning.
2. Open **Project Settings → API**. Copy the Project URL and publishable/anon key. Never use the service-role key in the frontend.
3. Copy `.env.example` to `.env` and set:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

The public site renders without configuration, but sign-in and data features require valid Supabase values.

## Database and storage setup

The initial migration creates every table, enum, constraint, index, helper, trigger, RLS policy, Realtime publication entry, and the private `complaint-photos` bucket with its storage policies.

With the Supabase CLI:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase db seed
```

Alternatively, paste `supabase/migrations/202607290001_initial_schema.sql` into the dashboard SQL Editor, run it once, then run `supabase/seed.sql`.

The migration creates the bucket automatically. In **Storage**, confirm `complaint-photos` is private, its limit is 5 MB, and allowed MIME types are JPEG, PNG, and WebP. Do not switch it to public.

## Create development users and the first administrator

Public sign-up always creates a `student` profile. Passwords remain exclusively in Supabase Auth and never appear in SQL.

1. Register the student normally in the application.
2. Create administrator and maintenance users under **Authentication → Users → Add user**, using unique emails and secure temporary passwords.
3. In SQL Editor, promote only the intended verified accounts:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'admin@your-school.edu';

   update public.profiles
   set role = 'maintenance', specialization = 'Electrical'
   where email = 'maintenance@your-school.edu';
   ```

Only use this bootstrap SQL for the first admin. Afterwards deploy and use the authenticated admin Edge Functions. There are deliberately no sample passwords in seed files.

To create sample complaints, sign in as the student and submit them through the app. This gives records valid Auth UUIDs and exercises the exact RLS path used in production. Assign them from the admin portal; notifications are generated automatically.

## Authentication configuration

Under **Authentication → URL Configuration**:

- Set Site URL to the production Vercel URL (use `http://localhost:5173` during local-only development).
- Add `http://localhost:5173/login`, `http://localhost:5173/reset-password`, and their production equivalents to Redirect URLs.
- Keep email confirmation enabled for production.

Configure SMTP under **Authentication → Email** for reliable production delivery. Password reset links return to `/reset-password`.

## Deploy Edge Functions

The frontend never receives the service-role key. Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into hosted functions.

```bash
supabase functions deploy admin-create-user
supabase functions deploy admin-update-user-role
supabase functions deploy admin-reset-user-password
supabase functions deploy send-complaint-notification
supabase functions deploy generate-complaint-report
```

All functions validate the bearer token. Administrative functions then confirm the caller has an active admin profile before using the server-only client.

## Deploy to Vercel

1. Import this folder/repository into Vercel.
2. Keep Framework Preset as **Vite**, Build Command as `npm run build`, and Output Directory as `dist`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in **Project Settings → Environment Variables** for Production and Preview.
4. Deploy, add the resulting URL to Supabase Auth Redirect URLs, and redeploy if the environment changed.

`vercel.json` sends client-side routes to `index.html`.

## Verify RLS before launch

Create one account for each role, then test in separate private browser sessions:

- Student A cannot query or open Student B's complaint UUID, history, feedback, or photos.
- A student insert always receives their own `reporter_id`, `submitted` status, database complaint number, and SLA.
- Students cannot change role, priority, assigned staff, protected statuses, or notification content.
- Maintenance can only see assigned complaints/reporters and can only upload progress/after images.
- Maintenance cannot self-assign or open an unassigned complaint UUID.
- Admin can review, verify/reject, assign, close/reopen, manage lookup data, and access audit records.
- Invalid workflow jumps (such as `submitted → resolved`) fail even when sent directly through the REST API.
- Private storage object URLs fail; signed URLs work only for users who can access that complaint.
- Feedback fails for open/other-user complaints and a second feedback record fails.

For targeted REST testing, use the user access token with the project's publishable key. Never test browser code with a service-role key because it bypasses RLS.

## Project structure

```text
src/
  components/{common,dashboard}/
  context/       Auth session and authorized profile
  hooks/         Auth and Realtime hooks
  layouts/       Public and role-aware application shells
  lib/           Validated Supabase client
  pages/{public,auth,dashboard,complaints,notifications,profile,admin}/
  routes/        Protected and role-protected routing
  services/      Auth, complaints, storage, and notifications
  types/         Shared TypeScript domain interfaces
  utils/         Safe errors, dates, badges, and SLA formatting
supabase/
  migrations/    PostgreSQL schema, functions, RLS, and storage
  functions/     Trusted administrative/report operations
  seed.sql       Lookup data and safe user setup guidance
```

## Production notes

- User content is rendered as text; the app never uses `dangerouslySetInnerHTML`.
- `complaint-photos` signed URLs expire after one hour.
- Frontend errors are intentionally generic; inspect Supabase logs for operational details.
- CSV export runs over data already restricted by RLS. Use `generate-complaint-report` for privileged/private report processing.
- Excel can open the CSV export directly. Branded PDF rendering should be performed by the protected report Edge Function when required by school policy.
