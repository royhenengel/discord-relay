create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists bot_config (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger trg_bot_config_updated_at
before update on bot_config
for each row execute function set_updated_at();

create table if not exists bot_stats (
  id uuid primary key default gen_random_uuid(),
  metric text not null,
  value_num double precision,
  value_json jsonb default '{}'::jsonb,
  period_start timestamptz not null,
  period_end timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists idx_bot_stats_metric_period
  on bot_stats (metric, period_start, period_end);
create trigger trg_bot_stats_updated_at
before update on bot_stats
for each row execute function set_updated_at();

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  action text not null,
  detail_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_log_source_created
  on activity_log (source, created_at desc);

create table if not exists relay_config (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  channel_id text not null,
  feature text not null,
  config_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_relay_config_scope
  on relay_config (guild_id, channel_id, feature);
create trigger trg_relay_config_updated_at
before update on relay_config
for each row execute function set_updated_at();

create table if not exists memory_index (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  entity_id text,
  kind text not null,
  key text not null,
  value_text text,
  value_json jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists idx_memory_index_lookup
  on memory_index (scope, entity_id, kind, key);
create trigger trg_memory_index_updated_at
before update on memory_index
for each row execute function set_updated_at();

create table if not exists tasks_queue (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  job_type text not null,
  payload_json jsonb not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  error_text text
);
create index if not exists idx_tasks_queue_status_created
  on tasks_queue (status, created_at desc);