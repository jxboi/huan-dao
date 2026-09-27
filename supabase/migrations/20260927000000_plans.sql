-- One synced trip per signed-in user. The app stores its TripSettings JSON as-is and runs it
-- through migrate() on load, so the column needs no schema of its own.
create table if not exists public.plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;

-- Riders can only see and change their own plan.
create policy "plans: read own" on public.plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "plans: insert own" on public.plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "plans: update own" on public.plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "plans: delete own" on public.plans for delete to authenticated using ((select auth.uid()) = user_id);
