-- Migration to add yearly leaderboard snapshots for auto archiving.

create table if not exists yearly_leaderboard_snapshots (
  id            bigserial primary key,
  archive_year  int not null,
  channel_id    uuid not null references channels(id) on delete cascade,
  dimension_id  int not null references dimensions(id),
  rating        real not null,
  sigma         real not null,
  n_statements  int not null,
  exposure      int not null,
  created_at    timestamptz not null default now(),
  unique (archive_year, channel_id, dimension_id)
);

create index if not exists yearly_snapshots_year_idx on yearly_leaderboard_snapshots(archive_year);

-- Enable RLS (read-only for public, writes for service-role only)
alter table yearly_leaderboard_snapshots enable row level security;

create policy "Allow public read access to snapshots" 
  on yearly_leaderboard_snapshots
  for select 
  to public
  using (true);
