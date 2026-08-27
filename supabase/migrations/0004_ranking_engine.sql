-- 0004 — Ranking-engine upgrade.
-- Every statement here is ADDITIVE and idempotent: no drops, no deletes, no
-- data loss. Safe to run repeatedly against an existing database.

-- ---------------------------------------------------------------------------
-- 1. Slates get a soft-delete flag and a denormalized vote counter.
--    `active=false` replaces the old hard DELETE of broken/expired slates, so
--    the votes that reference them (and their evidence) are never destroyed.
--    `vote_count` lets the Arena serve LEAST-EXPOSED slates first, which is
--    what actually moves channels past the ranking thresholds.
-- ---------------------------------------------------------------------------
alter table slates add column if not exists active     boolean not null default true;
alter table slates add column if not exists vote_count integer not null default 0;

-- Backfill the counter from the votes already on record.
update slates s
set vote_count = v.c
from (select slate_id, count(*)::int as c from votes group by slate_id) v
where v.slate_id = s.id and s.vote_count is distinct from v.c;

-- Keep it in sync automatically. Votes are append-only, but the delete branch
-- keeps the counter honest if a slate row is ever cascaded away.
create or replace function bump_slate_vote_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update slates set vote_count = vote_count + 1 where id = new.slate_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update slates set vote_count = greatest(0, vote_count - 1) where id = old.slate_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_vote_change on votes;
create trigger on_vote_change
  after insert or delete on votes
  for each row execute function bump_slate_vote_count();

-- Serving index: "cheapest unseen slate of this kind/dimension".
create index if not exists slates_serve_idx
  on slates (kind, dimension_id, vote_count)
  where active;

-- ---------------------------------------------------------------------------
-- 2. Statement scores record the chance baseline they were measured against.
--    A statement seen only in 2-way slates has a 50% chance baseline; one seen
--    in 7-way slates has ~43%. Storing `expected` makes the score auditable
--    and lets the rollup pool evidence correctly.
-- ---------------------------------------------------------------------------
alter table statement_scores add column if not exists expected  real    not null default 0;
alter table statement_scores add column if not exists raw_shown integer not null default 0;

-- ---------------------------------------------------------------------------
-- 3. Channel ratings: surfacing + auditability.
--    `provisional` = has real evidence but has not yet cleared the ranking bar,
--    so the leaderboard can show it (clearly labelled) instead of an empty page.
-- ---------------------------------------------------------------------------
alter table channel_ratings add column if not exists provisional boolean not null default false;
alter table channel_ratings add column if not exists n_votes     integer not null default 0;
alter table channel_ratings add column if not exists chance      real    not null default 0.5;

create index if not exists channel_ratings_board_idx
  on channel_ratings (dimension_id, ranked, rating desc);

-- ---------------------------------------------------------------------------
-- 4. Recompute audit log — one row per recompute run. Lets you prove the
--    leaderboard moved because votes moved, not because code changed.
-- ---------------------------------------------------------------------------
create table if not exists recompute_runs (
  id                bigserial primary key,
  votes_processed   integer not null default 0,
  votes_skipped     integer not null default 0,
  statements_scored integer not null default 0,
  channels_ranked   integer not null default 0,
  channels_provisional integer not null default 0,
  total_votes       integer not null default 0,
  tier              text    not null default 'launch',
  min_statements    integer not null default 1,
  min_exposure      integer not null default 2,
  duration_ms       integer not null default 0,
  created_at        timestamptz not null default now()
);

alter table recompute_runs enable row level security;
drop policy if exists "public read recompute_runs" on recompute_runs;
create policy "public read recompute_runs" on recompute_runs for select using (true);
