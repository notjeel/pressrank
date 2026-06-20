-- PressRank initial schema
-- Generalized beyond India/YouTube: any news-spreading channel on any medium.

create extension if not exists "pgcrypto";

-- ---------- Channels ----------
create table if not exists channels (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  handle            text,
  medium            text not null check (medium in ('youtube','instagram','tv','web','other')),
  entity_type       text not null default 'org' check (entity_type in ('org','individual')),
  content_type      text check (content_type in ('hardnews','explainer','commentary','satire','opinion')),
  language          text,
  country           text,
  logo_url          text,
  youtube_channel_id text unique,
  official_url      text,
  verified          boolean not null default false,
  -- collection bookkeeping
  enriched_at       timestamptz,
  stats_fetched_at  timestamptz,
  statements_fetched_at timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists channels_medium_idx on channels(medium);

-- ---------- Rating dimensions ----------
create table if not exists dimensions (
  id    serial primary key,
  key   text unique not null,
  label text not null,
  -- the narrow, low-temperature question shown to voters for this dimension
  question text not null,
  sort  int not null default 0
);

insert into dimensions (key, label, question, sort) values
  ('neutrality',     'Neutrality',          'Which of these is worded most neutrally?', 1),
  ('factual',        'Factual precision',   'Which is most precise about what is actually known vs. speculation?', 2),
  ('sourcing',       'Sourcing',            'Which is best sourced / most specific about where it comes from?', 3),
  ('non_godi_media', 'Non-Godi Media',     'Which statement is most independent of government narrative or establishment propaganda?', 4),
  ('non_sensational','Calm (non-sensational)','Which is the least sensational / clickbait-driven?', 5)
on conflict (key) do nothing;

-- ---------- Reach stats (contextual only, from APIs) ----------
create table if not exists channel_stats (
  id          bigserial primary key,
  channel_id  uuid not null references channels(id) on delete cascade,
  subs        bigint,
  views       bigint,
  followers   bigint,
  fetched_at  timestamptz not null default now()
);
create index if not exists channel_stats_channel_idx on channel_stats(channel_id, fetched_at desc);

-- ---------- Statements (the rated atom; provenance-pinned + hashed) ----------
create table if not exists statements (
  id           uuid primary key default gen_random_uuid(),
  channel_id   uuid not null references channels(id) on delete cascade,
  text         text not null,
  context      text,                 -- surrounding context to keep the excerpt fair
  source_url   text,
  source_ref   text,                 -- video_id / timestamp / article ref
  content_hash text not null,        -- sha256 of normalized source text, set on ingest
  harvested_at timestamptz not null default now(),
  active       boolean not null default true,
  unique (channel_id, content_hash)
);
create index if not exists statements_channel_idx on statements(channel_id) where active;

-- ---------- Slates (a screen of statements + one question) ----------
create table if not exists slates (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('pairwise','topk')),
  dimension_id  int not null references dimensions(id),
  statement_ids uuid[] not null,
  max_pick      int not null default 3,
  created_at    timestamptz not null default now()
);

-- ---------- Votes (append-only; never updated) ----------
create table if not exists votes (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  slate_id             uuid not null references slates(id) on delete cascade,
  selected_statement_ids uuid[] not null,
  weight               real not null default 1.0,
  created_at           timestamptz not null default now()
);
create index if not exists votes_slate_idx on votes(slate_id);
create index if not exists votes_user_idx on votes(user_id, created_at desc);

-- ---------- Per-statement scores (per dimension) ----------
create table if not exists statement_scores (
  statement_id uuid not null references statements(id) on delete cascade,
  dimension_id int not null references dimensions(id),
  shown        int not null default 0,
  selected     int not null default 0,
  score        real not null default 0,   -- shrinkage-adjusted selection rate
  sigma        real not null default 1,   -- uncertainty
  updated_at   timestamptz not null default now(),
  primary key (statement_id, dimension_id)
);

-- ---------- Channel ratings (the leaderboard source) ----------
create table if not exists channel_ratings (
  channel_id   uuid not null references channels(id) on delete cascade,
  dimension_id int not null references dimensions(id),
  rating       real not null default 0,   -- 0..100 display scale
  sigma        real not null default 1,
  n_statements int not null default 0,
  exposure     int not null default 0,    -- total times this channel's statements were shown
  ranked       boolean not null default false, -- meets min thresholds for public display
  updated_at   timestamptz not null default now(),
  primary key (channel_id, dimension_id)
);

-- ---------- User profiles (reputation for vote weighting) ----------
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  reputation   real not null default 0,
  created_at   timestamptz not null default now()
);

-- auto-create a profile row on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
