create table if not exists assistant_config (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Optional seed. Run once.
insert into assistant_config (key, value_json) values (
  'assistant_prefs',
  jsonb_build_object(
    'control_keywords', jsonb_build_array(
      'recap', 'stuch', 'stuck', 'ship-it', 'fast-path', 'deep-review',
      'name-mode', 'full-review-mode', 'time+simplicity',
      'autosync-on', 'autosync-off', 'silence', 'verbose',
      'fix-forward', 'rollback'
    ),
    'modes', jsonb_build_object(
      'time+simplicity', true,
      'name-mode', true,
      'full-review-mode', true,
      'autosync', true,
      'single-step', true,
      'fix-forward', true,
      'proactive-check-mode', true,
      'no-circles-mode', true,
      'silence', false,
      'verbose', false
    ),
    'command_keywords', jsonb_build_array(
      'recap', 'stuck', 'ship-it', 'fast-path', 'deep-review',
      'autosync-on', 'autosync-off', 'silence', 'verbose',
      'fix-forward', 'rollback'
    ),
    'utility_commands', jsonb_build_array(
      'status-modes', 'modes-short'
    ),
    'implicit_triggers', jsonb_build_array(
      'review:repo', 'pause-and-check-all', 'normalize-names',
      'reset-to-last-good', 'repo-auto-review'
    )
  )
)
on conflict (key) do update
set value_json = excluded.value_json,
    updated_at = now();