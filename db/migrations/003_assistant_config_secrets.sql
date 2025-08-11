alter table assistant_config
add column if not exists is_secret boolean not null default false;

-- Seed Discord bot token placeholder
insert into assistant_config (key, value_json, is_secret)
values (
  'discord_bot_token',
  jsonb_build_object('token', 'PASTE_YOUR_REAL_TOKEN_HERE'),
  true
)
on conflict (key) do nothing;