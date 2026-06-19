-- Row Level Security.
-- Public-read on display tables; votes insert-only by the authenticated owner.
-- All writes from the collection/recompute pipeline use the service-role key,
-- which bypasses RLS — so no write policies are needed for those tables.

alter table channels         enable row level security;
alter table dimensions       enable row level security;
alter table channel_stats    enable row level security;
alter table statements       enable row level security;
alter table slates           enable row level security;
alter table votes            enable row level security;
alter table statement_scores enable row level security;
alter table channel_ratings  enable row level security;
alter table profiles         enable row level security;

-- ---------- Public read ----------
create policy "public read channels"        on channels         for select using (true);
create policy "public read dimensions"      on dimensions       for select using (true);
create policy "public read channel_stats"   on channel_stats    for select using (true);
create policy "public read channel_ratings" on channel_ratings  for select using (true);
create policy "public read slates"          on slates           for select using (true);

-- Statements are readable, but the API serves them anonymized; raw read is
-- allowed (text only, no brand link is exposed by the anon API path).
create policy "public read statements"      on statements       for select using (true);

-- ---------- Votes: a user may insert their own and read their own ----------
create policy "insert own vote" on votes
  for insert with check (auth.uid() = user_id);
create policy "read own votes" on votes
  for select using (auth.uid() = user_id);

-- ---------- Profiles: read all, update own ----------
create policy "public read profiles" on profiles for select using (true);
create policy "update own profile"   on profiles for update using (auth.uid() = id);
